-- Track perk claims (separate from reward_events since no mission is involved)
CREATE TABLE perk_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES barter_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  xp_paid INT NOT NULL CHECK (xp_paid > 0),
  claimed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(listing_id, user_id)
);
CREATE INDEX ON perk_claims(user_id, claimed_at DESC);
CREATE INDEX ON perk_claims(listing_id);

ALTER TABLE perk_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perk_claims_own" ON perk_claims FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "perk_claims_service_insert" ON perk_claims FOR INSERT WITH CHECK (true);

-- Function: claim a perk listing (deducts XP, records claim)
CREATE OR REPLACE FUNCTION claim_perk(
  claimer_id UUID,
  p_listing_id UUID
) RETURNS TABLE(new_balance INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_ask_xp INT;
BEGIN
  SELECT ask_xp INTO v_ask_xp
    FROM barter_listings
    WHERE id = p_listing_id AND listing_type = 'perk' AND status = 'active';

  IF NOT FOUND OR v_ask_xp IS NULL THEN
    RAISE EXCEPTION 'Perk listing not found or has no XP cost';
  END IF;

  IF (SELECT xp_balance FROM user_profiles WHERE id = claimer_id) < v_ask_xp THEN
    RAISE EXCEPTION 'Insufficient XP balance';
  END IF;

  UPDATE user_profiles SET xp_balance = xp_balance - v_ask_xp WHERE id = claimer_id;

  INSERT INTO perk_claims(listing_id, user_id, xp_paid)
    VALUES (p_listing_id, claimer_id, v_ask_xp);

  INSERT INTO xp_transactions(from_user_id, to_user_id, amount, transaction_type, reference_id)
    VALUES (claimer_id, claimer_id, v_ask_xp, 'perk_redemption', p_listing_id);

  RETURN QUERY SELECT (SELECT xp_balance FROM user_profiles WHERE id = claimer_id)::INT;
END;
$$;
