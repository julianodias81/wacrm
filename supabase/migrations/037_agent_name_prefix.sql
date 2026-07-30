-- ============================================================
-- 037_agent_name_prefix.sql — opt-in agent-name title on outbound
-- text messages
--
-- When enabled, plain-text messages a human agent sends from the
-- inbox composer get a `*Agent Name*\n` prefix baked into the Meta
-- payload, which WhatsApp renders as a small bold title line above
-- the message body. There is no native Cloud API field for this —
-- see src/lib/whatsapp/send-message.ts for the text-prefix build.
--
-- Account-level, default OFF. Scoped to whatsapp_config (one row per
-- account, same home as every other WhatsApp-behavior setting) rather
-- than a new table.
--
-- Deliberately does NOT touch:
--   - template/media/interactive sends (send-message.ts only applies
--     the prefix in the plain-text branch)
--   - automations/flows (src/lib/automations/meta-send.ts,
--     src/lib/flows/meta-send.ts call meta-api.ts directly, bypassing
--     this table entirely)
--   - the public /api/v1/messages endpoint (its route deliberately
--     never passes agentDisplayName into sendMessageToConversation)
-- ============================================================

ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS show_agent_name_in_messages boolean NOT NULL DEFAULT false;
