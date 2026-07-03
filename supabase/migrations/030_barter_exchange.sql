-- 030: Barter Exchange System
-- Peer-to-peer trade of points, badges, skill sessions, and recognition assets.
-- Any participant can list what they offer and what they want; others make counter-offers;
-- accepted offers execute atomically and are logged as barter_transactions.

-- ─── Barter listings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS barter_listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,

  -- What the lister is offering
  offer_type      TEXT NOT NULL CHECK (offer_type IN ('points','badge','skill_session','coupon','benefit')),
  offer_value     JSONB NOT NULL DEFAULT '{}',
  -- Schema by type:
  --   points        : { "amount": 500 }
  --   badge         : { "badge_label": "Week Warrior", "badge_emoji": "⚡", "reward_event_id": "uuid" }
  --   skill_session : { "skill": "UX Design", "hours": 2, "format": "video_call" }
  --   coupon        : { "coupon_code": "DISC20", "reward_event_id": "uuid" }
  --   benefit       : { "description": "Priority application review for any listing" }

  -- What the lister wants in return
  want_type       TEXT NOT NULL CHECK (want_type IN ('points','badge','skill_session','coupon','benefit','open')),
  want_description TEXT NOT NULL,
  want_value      JSONB NOT NULL DEFAULT '{}',

  -- Access constraints
  min_trust_score INTEGER NOT NULL DEFAULT 0 CHECK (min_trust_score BETWEEN 0 AND 100),
  allowed_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,

  -- Lifecycle
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','pending','completed','cancelled','expired')),
  view_count      INTEGER NOT NULL DEFAULT 0,
  offer_count     INTEGER NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Barter offers (counter-proposals) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS barter_offers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES barter_listings(id) ON DELETE CASCADE,
  offerer_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  offer_type  TEXT NOT NULL CHECK (offer_type IN ('points','badge','skill_session','coupon','benefit')),
  offer_value JSONB NOT NULL DEFAULT '{}',
  message     TEXT,

  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','accepted','rejected','withdrawn','expired')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active offer per person per listing
  UNIQUE (listing_id, offerer_id)
);

-- ─── Completed barter transactions (immutable audit log) ────────────────────
CREATE TABLE IF NOT EXISTS barter_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID REFERENCES barter_listings(id) ON DELETE SET NULL,
  offer_id        UUID REFERENCES barter_offers(id) ON DELETE SET NULL,

  initiator_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  responder_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,

  initiator_gave  JSONB NOT NULL DEFAULT '{}',
  responder_gave  JSONB NOT NULL DEFAULT '{}',

  -- Trust reward applied to both parties on completion (+3 reliability delta)
  trust_delta     INTEGER NOT NULL DEFAULT 3,

  status          TEXT NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('completed','disputed','resolved')),
  dispute_raised_at   TIMESTAMPTZ,
  dispute_reason      TEXT,
  dispute_resolved_at TIMESTAMPTZ,
  dispute_resolution  TEXT,

  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Point transfers (gifting, tipping, recognition) ────────────────────────
CREATE TABLE IF NOT EXISTS point_transfers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  to_user_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE SET NULL,

  amount        INTEGER NOT NULL CHECK (amount > 0),
  reason        TEXT,
  mission_id    UUID REFERENCES missions(id) ON DELETE SET NULL,
  transfer_type TEXT NOT NULL DEFAULT 'gift'
                  CHECK (transfer_type IN ('gift','trade','recognition','tip')),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_barter_listings_user_id   ON barter_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_barter_listings_status    ON barter_listings(status);
CREATE INDEX IF NOT EXISTS idx_barter_listings_offer_type ON barter_listings(offer_type);
CREATE INDEX IF NOT EXISTS idx_barter_listings_expires   ON barter_listings(expires_at) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_barter_listings_tenant    ON barter_listings(tenant_id) WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_barter_offers_listing     ON barter_offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_barter_offers_offerer     ON barter_offers(offerer_id);
CREATE INDEX IF NOT EXISTS idx_barter_offers_status      ON barter_offers(status);

CREATE INDEX IF NOT EXISTS idx_barter_tx_initiator       ON barter_transactions(initiator_id);
CREATE INDEX IF NOT EXISTS idx_barter_tx_responder       ON barter_transactions(responder_id);
CREATE INDEX IF NOT EXISTS idx_barter_tx_completed       ON barter_transactions(completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_point_transfers_from      ON point_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_point_transfers_to        ON point_transfers(to_user_id);
CREATE INDEX IF NOT EXISTS idx_point_transfers_created   ON point_transfers(created_at DESC);

-- ─── Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE barter_listings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE barter_offers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE barter_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transfers     ENABLE ROW LEVEL SECURITY;

-- Listings: open listings visible to all; own listings always visible
CREATE POLICY "barter_listings_select" ON barter_listings
  FOR SELECT USING (status = 'open' OR user_id = (auth.jwt() ->> 'sub')::UUID);
CREATE POLICY "barter_listings_insert" ON barter_listings
  FOR INSERT WITH CHECK (user_id = (auth.jwt() ->> 'sub')::UUID);
CREATE POLICY "barter_listings_update" ON barter_listings
  FOR UPDATE USING (user_id = (auth.jwt() ->> 'sub')::UUID);

-- Offers: offerer + listing owner can see
CREATE POLICY "barter_offers_select" ON barter_offers
  FOR SELECT USING (
    offerer_id = (auth.jwt() ->> 'sub')::UUID OR
    listing_id IN (
      SELECT id FROM barter_listings
      WHERE user_id = (auth.jwt() ->> 'sub')::UUID
    )
  );
CREATE POLICY "barter_offers_insert" ON barter_offers
  FOR INSERT WITH CHECK (offerer_id = (auth.jwt() ->> 'sub')::UUID);
CREATE POLICY "barter_offers_update" ON barter_offers
  FOR UPDATE USING (
    offerer_id = (auth.jwt() ->> 'sub')::UUID OR
    listing_id IN (
      SELECT id FROM barter_listings
      WHERE user_id = (auth.jwt() ->> 'sub')::UUID
    )
  );

-- Transactions: both parties can see
CREATE POLICY "barter_transactions_select" ON barter_transactions
  FOR SELECT USING (
    initiator_id = (auth.jwt() ->> 'sub')::UUID OR
    responder_id = (auth.jwt() ->> 'sub')::UUID
  );
CREATE POLICY "barter_transactions_insert" ON barter_transactions
  FOR INSERT WITH CHECK (TRUE); -- server-side only via service role

-- Point transfers: both parties can see; only sender can insert
CREATE POLICY "point_transfers_select" ON point_transfers
  FOR SELECT USING (
    from_user_id = (auth.jwt() ->> 'sub')::UUID OR
    to_user_id   = (auth.jwt() ->> 'sub')::UUID
  );
CREATE POLICY "point_transfers_insert" ON point_transfers
  FOR INSERT WITH CHECK (from_user_id = (auth.jwt() ->> 'sub')::UUID);

-- ─── updated_at triggers ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'barter_listings_updated_at'
  ) THEN
    CREATE TRIGGER barter_listings_updated_at
      BEFORE UPDATE ON barter_listings
      FOR EACH ROW EXECUTE FUNCTION _set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'barter_offers_updated_at'
  ) THEN
    CREATE TRIGGER barter_offers_updated_at
      BEFORE UPDATE ON barter_offers
      FOR EACH ROW EXECUTE FUNCTION _set_updated_at();
  END IF;
END $$;
