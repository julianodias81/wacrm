import type {
  AutomationStepConfig,
  AutomationStepType,
  AutomationTriggerConfig,
  AutomationTriggerType,
} from '@/types'

export type TemplateSlug =
  | 'welcome_message'
  | 'out_of_office'
  | 'lead_qualifier'
  | 'follow_up_reminder'

export interface TemplateStepSeed {
  step_type: AutomationStepType
  step_config: AutomationStepConfig
  branch?: 'yes' | 'no' | null
  /** Index (within this seed list) of the Condition parent, if nested. */
  parent_index?: number | null
}

export interface AutomationTemplateDefinition {
  slug: TemplateSlug
  name: string
  description: string
  trigger_type: AutomationTriggerType
  trigger_config: AutomationTriggerConfig
  steps: TemplateStepSeed[]
}

/** next-intl's `useTranslations`/`getTranslations` return type — passed
 *  in by the caller (client component or server route) since this module
 *  is a plain data factory, not a component. */
export type Translate = (key: string, values?: Record<string, string | number>) => string

// Names, descriptions, and message text resolve from Automations.templates.*
// at call time so a created automation's stored copy matches the
// deployment's locale. Trigger keywords and step config keys (tag_id,
// mode, unit, etc.) stay literal — they're not copy shown to anyone.

export function buildAutomationTemplates(
  t: Translate,
): Record<TemplateSlug, AutomationTemplateDefinition> {
  const tt = (slug: string, key: string) => t(`templates.${slug}.${key}`)
  return {
    welcome_message: {
      slug: 'welcome_message',
      name: tt('welcomeMessage', 'name'),
      description: tt('welcomeMessage', 'description'),
      // first_inbound_message (added in PR #33) catches both brand-new
      // contacts AND manually-added/imported contacts on their first-ever
      // reply, which is what a user setting up a "welcome" automation
      // almost always wants. new_contact_created would miss the
      // manually-imported case.
      trigger_type: 'first_inbound_message',
      trigger_config: {},
      steps: [
        {
          step_type: 'send_message',
          step_config: { text: tt('welcomeMessage', 'messageText') },
        },
        {
          step_type: 'add_tag',
          step_config: { tag_id: '' },
        },
      ],
    },
    out_of_office: {
      slug: 'out_of_office',
      name: tt('outOfOffice', 'name'),
      description: tt('outOfOffice', 'description'),
      trigger_type: 'new_message_received',
      trigger_config: {},
      steps: [
        {
          step_type: 'condition',
          step_config: {
            subject: 'time_of_day',
            operand: '18:00-09:00',
          },
        },
        {
          step_type: 'send_message',
          step_config: { text: tt('outOfOffice', 'messageText') },
          parent_index: 0,
          branch: 'yes',
        },
      ],
    },
    lead_qualifier: {
      slug: 'lead_qualifier',
      name: tt('leadQualifier', 'name'),
      description: tt('leadQualifier', 'description'),
      trigger_type: 'keyword_match',
      trigger_config: {
        keywords: ['pricing', 'quote', 'buy'],
        match_type: 'contains',
      },
      steps: [
        {
          step_type: 'send_message',
          step_config: { text: tt('leadQualifier', 'messageText') },
        },
        {
          step_type: 'wait',
          step_config: { amount: 10, unit: 'minutes' },
        },
        {
          step_type: 'assign_conversation',
          step_config: { mode: 'round_robin' },
        },
      ],
    },
    follow_up_reminder: {
      slug: 'follow_up_reminder',
      name: tt('followUpReminder', 'name'),
      description: tt('followUpReminder', 'description'),
      trigger_type: 'new_message_received',
      trigger_config: {},
      steps: [
        {
          step_type: 'wait',
          step_config: { amount: 1, unit: 'days' },
        },
        {
          step_type: 'send_message',
          step_config: { text: tt('followUpReminder', 'messageText') },
        },
      ],
    },
  }
}

export function getTemplate(slug: string, t: Translate): AutomationTemplateDefinition | null {
  return buildAutomationTemplates(t)[slug as TemplateSlug] ?? null
}
