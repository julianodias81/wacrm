/**
 * Starter flow templates.
 *
 * Three pre-canned flows users can clone with one click instead of
 * building from scratch. Each template is a plain JS object describing
 * the same shape `/api/flows` PUT accepts — name, trigger config,
 * entry_node_id, fallback_policy, nodes[] — keyed by a stable
 * `slug`.
 *
 * The clone path (`/api/flows` POST with `template_slug`) creates a
 * NEW flow_row + flow_nodes rows for the user. `node_key`s are kept
 * verbatim (they're stable strings, not UUIDs, so cloning never
 * needs to rewrite edge references).
 *
 * Choosing a single static module over a DB-backed gallery for v1
 * because: (a) the set is small and changes with code releases, not
 * data; (b) keeps templates portable across self-hosted instances
 * without migrations; (c) editing in source is the lowest-friction
 * way to add the next template.
 */

import type {
  CollectInputNodeConfig,
  ConditionNodeConfig,
  HandoffNodeConfig,
  KeywordTriggerConfig,
  SendButtonsNodeConfig,
  SendListNodeConfig,
  SendMessageNodeConfig,
  StartNodeConfig,
} from "./types";

export type FlowTemplateNodeType =
  | "start"
  | "send_message"
  | "send_buttons"
  | "send_list"
  | "collect_input"
  | "condition"
  | "set_tag"
  | "handoff"
  | "end";

export interface FlowTemplateNode {
  node_key: string;
  node_type: FlowTemplateNodeType;
  config:
    | StartNodeConfig
    | SendMessageNodeConfig
    | SendButtonsNodeConfig
    | SendListNodeConfig
    | CollectInputNodeConfig
    | ConditionNodeConfig
    | HandoffNodeConfig
    | Record<string, unknown>;
}

export interface FlowTemplate {
  slug: string;
  name: string;
  description: string;
  /** Used by the gallery to surface a relevant icon. lucide-react name. */
  icon: "MessageSquare" | "HelpCircle" | "UserPlus";
  trigger_type: "keyword" | "first_inbound_message" | "manual";
  trigger_config: KeywordTriggerConfig | Record<string, unknown>;
  entry_node_id: string;
  nodes: FlowTemplateNode[];
}

/** next-intl's `useTranslations`/`getTranslations` return type. Passed in
 *  by the caller (client component or server route) so this module — a
 *  plain data factory, not a component — never has to know which side
 *  of the boundary it's running on. */
export type Translate = (key: string, values?: Record<string, string | number>) => string;

// Every template's user-facing copy (names, messages, button/row labels,
// handoff notes) is resolved from Flows.templates.* at call time so a
// cloned flow's stored content matches the deployment's locale — node
// keys, reply_ids, and trigger keywords stay literal English since
// they're internal identifiers, not copy shown to anyone.

// ============================================================
// 1. Welcome menu — the example from the owner's brief
// ============================================================
function buildWelcomeMenu(t: Translate): FlowTemplate {
  const tt = (key: string) => t(`templates.welcomeMenu.${key}`);
  return {
    slug: "welcome_menu",
    name: tt("name"),
    description: tt("description"),
    icon: "MessageSquare",
    trigger_type: "keyword",
    trigger_config: { keywords: ["support", "help", "hi"], match_type: "contains" },
    entry_node_id: "start",
    nodes: [
      {
        node_key: "start",
        node_type: "start",
        config: { next_node_key: "welcome" },
      },
      {
        node_key: "welcome",
        node_type: "send_buttons",
        config: {
          text: tt("welcomeText"),
          footer_text: tt("welcomeFooter"),
          buttons: [
            {
              reply_id: "existing",
              title: tt("existingBtn"),
              next_node_key: "existing_handoff",
            },
            {
              reply_id: "new",
              title: tt("newBtn"),
              next_node_key: "new_handoff",
            },
          ],
        } as SendButtonsNodeConfig,
      },
      {
        node_key: "existing_handoff",
        node_type: "handoff",
        config: { note: tt("existingHandoffNote") } as HandoffNodeConfig,
      },
      {
        node_key: "new_handoff",
        node_type: "handoff",
        config: { note: tt("newHandoffNote") } as HandoffNodeConfig,
      },
    ],
  };
}

// ============================================================
// 2. FAQ bot — list-message answers, fully automated
// ============================================================
function buildFaqBot(t: Translate): FlowTemplate {
  const tt = (key: string) => t(`templates.faqBot.${key}`);
  return {
    slug: "faq_bot",
    name: tt("name"),
    description: tt("description"),
    icon: "HelpCircle",
    trigger_type: "keyword",
    trigger_config: {
      keywords: ["faq", "question", "info"],
      match_type: "contains",
    },
    entry_node_id: "start",
    nodes: [
      {
        node_key: "start",
        node_type: "start",
        config: { next_node_key: "topics" },
      },
      {
        node_key: "topics",
        node_type: "send_list",
        config: {
          text: tt("topicsText"),
          button_label: tt("topicsButtonLabel"),
          sections: [
            {
              title: tt("sectionCommon"),
              rows: [
                {
                  reply_id: "hours",
                  title: tt("rowHours"),
                  next_node_key: "answer_hours",
                },
                {
                  reply_id: "pricing",
                  title: tt("rowPricing"),
                  next_node_key: "answer_pricing",
                },
                {
                  reply_id: "refunds",
                  title: tt("rowRefunds"),
                  next_node_key: "answer_refunds",
                },
              ],
            },
            {
              title: tt("sectionOther"),
              rows: [
                {
                  reply_id: "human",
                  title: tt("rowHuman"),
                  next_node_key: "human_handoff",
                },
              ],
            },
          ],
        } as SendListNodeConfig,
      },
      {
        node_key: "answer_hours",
        node_type: "send_message",
        config: {
          text: tt("answerHours"),
          next_node_key: "end",
        } as SendMessageNodeConfig,
      },
      {
        node_key: "answer_pricing",
        node_type: "send_message",
        config: {
          text: tt("answerPricing"),
          next_node_key: "end",
        } as SendMessageNodeConfig,
      },
      {
        node_key: "answer_refunds",
        node_type: "send_message",
        config: {
          text: tt("answerRefunds"),
          next_node_key: "end",
        } as SendMessageNodeConfig,
      },
      {
        node_key: "human_handoff",
        node_type: "handoff",
        config: { note: tt("humanHandoffNote") } as HandoffNodeConfig,
      },
      {
        node_key: "end",
        node_type: "end",
        config: {},
      },
    ],
  };
}

// ============================================================
// 3. Lead capture — collect_input chain, ends in a handoff
// ============================================================
function buildLeadCapture(t: Translate): FlowTemplate {
  const tt = (key: string) => t(`templates.leadCapture.${key}`);
  return {
    slug: "lead_capture",
    name: tt("name"),
    description: tt("description"),
    icon: "UserPlus",
    trigger_type: "first_inbound_message",
    trigger_config: {},
    entry_node_id: "start",
    nodes: [
      {
        node_key: "start",
        node_type: "start",
        config: { next_node_key: "intro" },
      },
      {
        node_key: "intro",
        node_type: "send_message",
        config: {
          text: tt("introText"),
          next_node_key: "ask_name",
        } as SendMessageNodeConfig,
      },
      {
        node_key: "ask_name",
        node_type: "collect_input",
        config: {
          prompt_text: tt("askNamePrompt"),
          var_key: "name",
          next_node_key: "ask_email",
        } as CollectInputNodeConfig,
      },
      {
        node_key: "ask_email",
        node_type: "collect_input",
        config: {
          prompt_text: tt("askEmailPrompt"),
          var_key: "email",
          next_node_key: "ask_company",
        } as CollectInputNodeConfig,
      },
      {
        node_key: "ask_company",
        node_type: "collect_input",
        config: {
          prompt_text: tt("askCompanyPrompt"),
          var_key: "company",
          next_node_key: "handoff",
        } as CollectInputNodeConfig,
      },
      {
        node_key: "handoff",
        node_type: "handoff",
        config: { note: tt("handoffNote") } as HandoffNodeConfig,
      },
    ],
  };
}

// ============================================================
// Registry
// ============================================================

function buildTemplates(t: Translate): Record<string, FlowTemplate> {
  return {
    welcome_menu: buildWelcomeMenu(t),
    faq_bot: buildFaqBot(t),
    lead_capture: buildLeadCapture(t),
  };
}

export function getFlowTemplate(slug: string, t: Translate): FlowTemplate | null {
  return buildTemplates(t)[slug] ?? null;
}

export function listFlowTemplates(t: Translate): FlowTemplate[] {
  return Object.values(buildTemplates(t));
}
