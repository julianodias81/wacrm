-- ============================================================
-- 038_conversation_delete.sql — allow deleting a conversation
-- (owner-only), without breaking associated deals.
--
-- Two independent fixes:
--
-- 1. deals.conversation_id had no ON DELETE action (bare
--    REFERENCES conversations(id)), so Postgres defaulted to
--    NO ACTION. Deleting a conversation with an associated deal
--    would fail with 23503. Same class of bug — and same fix —
--    as 004_contact_delete_set_null.sql fixed for
--    deals.contact_id / broadcast_recipients.contact_id: SET NULL
--    preserves the deal's history instead of CASCADE wiping it.
--
-- 2. conversations_delete (017_account_sharing.sql) was gated at
--    'agent', matching every other conversations policy. Nothing
--    calls DELETE on conversations today, but the product
--    requirement is owner-only, so the policy is tightened here
--    to be the actual enforced boundary — not just an app-layer
--    convention a different code path could bypass.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

-- ── deals.conversation_id: NO ACTION → SET NULL ────────────────
ALTER TABLE deals
  ALTER COLUMN conversation_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'deals_conversation_id_fkey'
      AND conrelid = 'deals'::regclass
  ) THEN
    ALTER TABLE deals
      DROP CONSTRAINT deals_conversation_id_fkey;
  END IF;
END $$;

ALTER TABLE deals
  ADD CONSTRAINT deals_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    ON DELETE SET NULL;

-- ── conversations_delete RLS: agent+ → owner-only ──────────────
DROP POLICY IF EXISTS conversations_delete ON conversations;

CREATE POLICY conversations_delete ON conversations
  FOR DELETE USING (is_account_member(account_id, 'owner'));
