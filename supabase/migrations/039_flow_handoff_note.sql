-- Flow "Handoff" nodes can carry an internal note for the agent picking
-- up the conversation. Until now it was only written to flow_run_events
-- (an internal debug log, not shown anywhere in the inbox). Store it on
-- the conversation itself, mirroring the existing ai_handoff_summary
-- column, so it can be surfaced in a banner regardless of whether the
-- account has the AI auto-reply bot configured.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS handoff_note TEXT;
