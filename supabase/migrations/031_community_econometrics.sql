-- 031: Community Econometrics — Pooled Resources, Upvoting, Crowd Sourcing
--
-- Models collective contribution with econometric distribution:
-- participants pool effort toward shared goals; rewards distribute based on
-- contribution weight, quality (upvotes + validation), timing, and trust score.

-- ─── Community Pools ─────────────────────────────────────────────────────────
-- A pool aggregates participant contributions toward a shared target.
-- When the pool closes, rewards distribute according to the chosen formula.
CREATE TABLE IF NOT EXISTS community_pools (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  mission_id      UUID REFERENCES missions(id) ON DELETE SET NULL,
  created_by      UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  name            TEXT NOT NULL,
  description     TEXT,
  pool_type       TEXT NOT NULL
                    CHECK (pool_type IN (
                      'crowdfunded_mission',  -- org sponsors pool; participants complete tasks for share
                      'validation_pool',      -- participants stake points to validate outcomes
                      'recognition_fund',     -- community treasury recognizing top contributors
                      'skill_pool'            -- collective skill-swap time bank
                    )),

  -- Resource target (in value_points)
  target_amount   INTEGER NOT NULL DEFAULT 0,
  current_amount  INTEGER NOT NULL DEFAULT 0,
  total_pool      INTEGER NOT NULL DEFAULT 0,  -- org-provided reward pool to distribute

  -- Distribution econometrics
  distribution_method TEXT NOT NULL DEFAULT 'weighted'
                    CHECK (distribution_method IN ('equal','weighted','quadratic','trust_weighted')),
  distribution_rule   JSONB NOT NULL DEFAULT '{}',
  -- rule fields: { timing_bonus: 0.20, trust_floor: 0.70, quality_cap: 0.50 }
  min_contribution INTEGER NOT NULL DEFAULT 1,

  -- State
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','active','distributing','closed','cancelled')),
  contributors_count INTEGER NOT NULL DEFAULT 0,
  completion_pct  NUMERIC(5,2) GENERATED ALWAYS AS (
                    CASE WHEN target_amount > 0
                    THEN LEAST(ROUND((current_amount::NUMERIC / target_amount) * 100, 2), 100.00)
                    ELSE 0 END
                  ) STORED,

  closes_at       TIMESTAMPTZ,
  distributed_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Pool Contributions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pool_contributions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id                 UUID NOT NULL REFERENCES community_pools(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tenant_id               UUID REFERENCES tenants(id) ON DELETE SET NULL,
  contribution_ledger_id  UUID REFERENCES contribution_ledger(id) ON DELETE SET NULL,

  amount                  INTEGER NOT NULL CHECK (amount > 0),
  impact_weight           NUMERIC(4,2) NOT NULL DEFAULT 1.0,

  -- Snapshot fields filled at distribution time
  computed_weight         NUMERIC(14,6),
  trust_score_snapshot    INTEGER NOT NULL DEFAULT 0,
  upvote_weight_snapshot  NUMERIC(12,4) NOT NULL DEFAULT 0,
  timing_rank             INTEGER,

  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','validated','rejected')),
  contributed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at    TIMESTAMPTZ,

  UNIQUE (pool_id, user_id)
);

-- ─── Pool Distributions (immutable payout log) ────────────────────────────────
CREATE TABLE IF NOT EXISTS pool_distributions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id             UUID NOT NULL REFERENCES community_pools(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  amount_distributed  INTEGER NOT NULL CHECK (amount_distributed >= 0),
  distribution_share  NUMERIC(10,6) NOT NULL CHECK (distribution_share BETWEEN 0 AND 1),
  calculated_weight   NUMERIC(14,6),
  calculation_method  TEXT NOT NULL,
  calculation_inputs  JSONB NOT NULL DEFAULT '{}',

  distributed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Community Upvotes ────────────────────────────────────────────────────────
-- Trust-weighted upvotes; voter's trust score determines vote weight.
-- Upvote weight feeds into distribution quality_score for pool contributions.
CREATE TABLE IF NOT EXISTS community_upvotes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type       TEXT NOT NULL
                      CHECK (target_type IN (
                        'contribution',
                        'pool_contribution',
                        'crowd_task_completion',
                        'barter_listing',
                        'outcome',
                        'mission'
                      )),
  target_id         UUID NOT NULL,
  voter_id          UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  voter_trust_score INTEGER NOT NULL DEFAULT 0 CHECK (voter_trust_score BETWEEN 0 AND 100),
  weight            NUMERIC(8,4) NOT NULL DEFAULT 1.0,
  -- weight = MAX(voter_trust_score / 100, 0.10) — low-trust votes still count minimally

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (target_type, target_id, voter_id)
);

-- ─── Crowd Tasks ─────────────────────────────────────────────────────────────
-- Micro-tasks within a collective mission. Many participants can complete
-- the same task; completions are validated via community upvoting.
CREATE TABLE IF NOT EXISTS crowd_tasks (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id              UUID REFERENCES missions(id) ON DELETE CASCADE,
  pool_id                 UUID REFERENCES community_pools(id) ON DELETE SET NULL,
  tenant_id               UUID REFERENCES tenants(id) ON DELETE SET NULL,
  created_by              UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,

  title                   TEXT NOT NULL,
  description             TEXT,
  task_type               TEXT NOT NULL DEFAULT 'open'
                            CHECK (task_type IN (
                              'survey',           -- fill out a structured form
                              'data_collection',  -- gather and submit data points
                              'content_review',   -- review/rate existing content
                              'skill_contribution',-- contribute a skill or artifact
                              'community_vote',   -- cast a weighted vote
                              'open'              -- freestyle contribution
                            )),
  instructions            TEXT,
  required_fields         JSONB DEFAULT '[]',

  max_participants        INTEGER,   -- NULL = unlimited
  required_completions    INTEGER NOT NULL DEFAULT 1,
  current_participants    INTEGER NOT NULL DEFAULT 0,
  current_completions     INTEGER NOT NULL DEFAULT 0,

  reward_per_completion   INTEGER NOT NULL DEFAULT 0,      -- points per validated completion
  validation_threshold    INTEGER NOT NULL DEFAULT 2,      -- upvotes needed for auto-validation
  auto_validate_after     INTEGER NOT NULL DEFAULT 3,      -- days before auto-validation triggers

  status                  TEXT NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open','in_progress','completed','cancelled')),
  deadline                TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Crowd Task Completions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crowd_task_completions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id               UUID NOT NULL REFERENCES crowd_tasks(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  pool_contribution_id  UUID REFERENCES pool_contributions(id) ON DELETE SET NULL,

  proof_text            TEXT,
  proof_url             TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}',

  upvote_count          INTEGER NOT NULL DEFAULT 0,
  upvote_weight         NUMERIC(12,4) NOT NULL DEFAULT 0,
  validation_count      INTEGER NOT NULL DEFAULT 0,
  rejection_count       INTEGER NOT NULL DEFAULT 0,

  status          TEXT NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('submitted','validated','rejected')),
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at    TIMESTAMPTZ,

  UNIQUE (task_id, user_id)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pools_tenant       ON community_pools(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pools_status       ON community_pools(status);
CREATE INDEX IF NOT EXISTS idx_pools_mission      ON community_pools(mission_id) WHERE mission_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pool_contribs_pool ON pool_contributions(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_contribs_user ON pool_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_pool_contribs_time ON pool_contributions(contributed_at);

CREATE INDEX IF NOT EXISTS idx_pool_dist_pool     ON pool_distributions(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_dist_user     ON pool_distributions(user_id);

CREATE INDEX IF NOT EXISTS idx_upvotes_target     ON community_upvotes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_upvotes_voter      ON community_upvotes(voter_id);
CREATE INDEX IF NOT EXISTS idx_upvotes_created    ON community_upvotes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crowd_tasks_pool   ON crowd_tasks(pool_id) WHERE pool_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crowd_tasks_tenant ON crowd_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crowd_tasks_status ON crowd_tasks(status);

CREATE INDEX IF NOT EXISTS idx_completions_task   ON crowd_task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_completions_user   ON crowd_task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_completions_status ON crowd_task_completions(status);

-- ─── Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE community_pools       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_contributions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_distributions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_upvotes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowd_tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowd_task_completions ENABLE ROW LEVEL SECURITY;

-- Pools: open pools visible to all; tenant members see their org's pools
CREATE POLICY "pools_select" ON community_pools FOR SELECT USING (
  status IN ('open','active','distributing','closed') OR
  created_by = (auth.jwt() ->> 'sub')::UUID OR
  tenant_id IN (
    SELECT tenant_id FROM user_profiles WHERE id = (auth.jwt() ->> 'sub')::UUID
  )
);
CREATE POLICY "pools_insert" ON community_pools FOR INSERT WITH CHECK (
  created_by = (auth.jwt() ->> 'sub')::UUID
);
CREATE POLICY "pools_update" ON community_pools FOR UPDATE USING (
  created_by = (auth.jwt() ->> 'sub')::UUID
);

-- Pool contributions: own contributions always visible; pool owner sees all
CREATE POLICY "pool_contributions_select" ON pool_contributions FOR SELECT USING (
  user_id = (auth.jwt() ->> 'sub')::UUID OR
  pool_id IN (
    SELECT id FROM community_pools WHERE created_by = (auth.jwt() ->> 'sub')::UUID
  )
);
CREATE POLICY "pool_contributions_insert" ON pool_contributions FOR INSERT WITH CHECK (
  user_id = (auth.jwt() ->> 'sub')::UUID
);
CREATE POLICY "pool_contributions_update" ON pool_contributions FOR UPDATE USING (
  user_id = (auth.jwt() ->> 'sub')::UUID OR
  pool_id IN (
    SELECT id FROM community_pools WHERE created_by = (auth.jwt() ->> 'sub')::UUID
  )
);

-- Distributions: both parties see
CREATE POLICY "pool_distributions_select" ON pool_distributions FOR SELECT USING (
  user_id = (auth.jwt() ->> 'sub')::UUID OR
  pool_id IN (
    SELECT id FROM community_pools WHERE created_by = (auth.jwt() ->> 'sub')::UUID
  )
);
CREATE POLICY "pool_distributions_insert" ON pool_distributions FOR INSERT WITH CHECK (TRUE);

-- Upvotes: everyone can read vote counts; own votes visible
CREATE POLICY "upvotes_select" ON community_upvotes FOR SELECT USING (TRUE);
CREATE POLICY "upvotes_insert" ON community_upvotes FOR INSERT WITH CHECK (
  voter_id = (auth.jwt() ->> 'sub')::UUID
);
CREATE POLICY "upvotes_delete" ON community_upvotes FOR DELETE USING (
  voter_id = (auth.jwt() ->> 'sub')::UUID
);

-- Crowd tasks: open tasks visible to all
CREATE POLICY "crowd_tasks_select" ON crowd_tasks FOR SELECT USING (
  status IN ('open','in_progress','completed') OR
  created_by = (auth.jwt() ->> 'sub')::UUID
);
CREATE POLICY "crowd_tasks_insert" ON crowd_tasks FOR INSERT WITH CHECK (
  created_by = (auth.jwt() ->> 'sub')::UUID
);
CREATE POLICY "crowd_tasks_update" ON crowd_tasks FOR UPDATE USING (
  created_by = (auth.jwt() ->> 'sub')::UUID
);

-- Completions: own completions visible; task owner sees all
CREATE POLICY "completions_select" ON crowd_task_completions FOR SELECT USING (
  user_id = (auth.jwt() ->> 'sub')::UUID OR
  task_id IN (
    SELECT id FROM crowd_tasks WHERE created_by = (auth.jwt() ->> 'sub')::UUID
  )
);
CREATE POLICY "completions_insert" ON crowd_task_completions FOR INSERT WITH CHECK (
  user_id = (auth.jwt() ->> 'sub')::UUID
);
CREATE POLICY "completions_update" ON crowd_task_completions FOR UPDATE USING (
  user_id = (auth.jwt() ->> 'sub')::UUID OR
  task_id IN (
    SELECT id FROM crowd_tasks WHERE created_by = (auth.jwt() ->> 'sub')::UUID
  )
);

-- ─── updated_at triggers ─────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'community_pools_updated_at') THEN
    CREATE TRIGGER community_pools_updated_at
      BEFORE UPDATE ON community_pools FOR EACH ROW EXECUTE FUNCTION _set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'crowd_tasks_updated_at') THEN
    CREATE TRIGGER crowd_tasks_updated_at
      BEFORE UPDATE ON crowd_tasks FOR EACH ROW EXECUTE FUNCTION _set_updated_at();
  END IF;
END $$;
