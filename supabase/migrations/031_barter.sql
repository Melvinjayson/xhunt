-- XP transfer ledger
CREATE TABLE xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  to_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL CHECK (amount > 0),
  transaction_type TEXT NOT NULL DEFAULT 'transfer',
  reference_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON xp_transactions(to_user_id, created_at DESC);
CREATE INDEX ON xp_transactions(from_user_id, created_at DESC);

-- P2P barter listings
CREATE TABLE barter_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  listing_type TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  offering JSONB NOT NULL DEFAULT '{}',
  ask_xp INT,
  ask_description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON barter_listings(status, created_at DESC);
CREATE INDEX ON barter_listings(user_id);

-- Trade proposals
CREATE TABLE barter_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES barter_listings(id) ON DELETE CASCADE,
  proposer_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  offer_xp INT,
  offer_description TEXT,
  offer_details JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(listing_id, proposer_id)
);

-- Org perk cost field
ALTER TABLE reward_configs ADD COLUMN IF NOT EXISTS perk_xp_cost INT;

ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE barter_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE barter_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xp_tx_own" ON xp_transactions
  FOR SELECT USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "barter_listing_public_read" ON barter_listings
  FOR SELECT USING (status = 'active');

CREATE POLICY "barter_listing_own_all" ON barter_listings
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "barter_proposal_own" ON barter_proposals
  FOR ALL USING (proposer_id = auth.uid());

CREATE POLICY "barter_proposal_listing_owner" ON barter_proposals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM barter_listings WHERE id = listing_id AND user_id = auth.uid())
  );

-- Atomic XP transfer function
CREATE OR REPLACE FUNCTION transfer_xp(
  from_id UUID,
  to_id UUID,
  amount INT,
  note TEXT DEFAULT NULL
) RETURNS TABLE(new_from_balance INT, new_to_balance INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (SELECT xp_balance FROM user_profiles WHERE id = from_id) < amount THEN
    RAISE EXCEPTION 'Insufficient XP balance';
  END IF;
  UPDATE user_profiles SET xp_balance = xp_balance - amount WHERE id = from_id;
  UPDATE user_profiles SET xp_balance = xp_balance + amount WHERE id = to_id;
  INSERT INTO xp_transactions(from_user_id, to_user_id, amount, transaction_type, note)
    VALUES (from_id, to_id, amount, 'transfer', note);
  RETURN QUERY SELECT
    (SELECT xp_balance FROM user_profiles WHERE id = from_id)::INT,
    (SELECT xp_balance FROM user_profiles WHERE id = to_id)::INT;
END;
$$;
