// The one researched sentence that opens a first-touch email.
//
// Built DETERMINISTICALLY from stored evidence rather than written by a model.
// Three reasons that matters:
//   1. It cannot hallucinate — every sentence restates a signal we actually
//      observed, with a source URL on file.
//   2. It costs nothing, which matters because enrichment already spends the
//      API budget and drafting runs on every prospect.
//   3. It is unit-testable, so "no invented company facts" is enforced by the
//      test suite rather than by a prompt instruction.
//
// The sentence must earn its place: if we have no real evidence, we return null
// and the prospect does NOT get a first-touch draft. An opening that says
// nothing is worse than no email, because it proves we did not look.

import { SIGNAL_WEIGHTS, type Segment } from './icp.ts'
import type { ScoringSignal } from './scoring.ts'

export interface OpeningInput {
  company: string
  segment: Segment
  signals: ScoringSignal[]
  sizeBand?: string | null
}

/**
 * Signal types ranked by how much they justify the email, best first. Only
 * types in this list can produce an opening — generic corroboration like
 * `careers_page` or `office_locations` proves nothing about gifting and is
 * deliberately excluded.
 */
const OPENING_PRIORITY: Array<{ type: string; render: (company: string) => string }> = [
  {
    type: 'corporate_gifting_page',
    render: c => `I saw ${c} already runs a corporate gifting programme, which is usually where new-baby gifts end up falling to someone in the middle of a busy week.`,
  },
  {
    type: 'client_gifting_program',
    render: c => `I noticed ${c} already sends gifts to mark client moments, so this may be a gap you have already run into.`,
  },
  {
    type: 'new_parent_support',
    render: c => `I noticed ${c} lists new-parent support among its benefits — which usually means a steady handful of babies arriving each year.`,
  },
  {
    type: 'parental_leave_benefit',
    render: c => `I noticed ${c} publishes a paid parental leave policy, which usually means a steady handful of babies arriving each year.`,
  },
  {
    type: 'milestone_gifting',
    render: c => `I saw ${c} marks employee milestones, and a new baby tends to be the one that is hardest to get right.`,
  },
  {
    type: 'employee_recognition',
    render: c => `I saw ${c} runs an employee recognition programme — new babies tend to be the milestone that falls outside the usual framework.`,
  },
  {
    type: 'employee_experience_team',
    render: c => `I noticed ${c} has a dedicated employee experience team, which is usually who ends up owning new-parent gifts.`,
  },
  {
    type: 'family_office',
    render: c => `I saw ${c} works as a family office, where the relationships run across generations and the family moments matter as much as the portfolio.`,
  },
  {
    type: 'hnw_family_model',
    render: c => `I noticed ${c} builds its practice around families rather than accounts, which is usually where a new grandchild or child becomes something worth marking.`,
  },
  {
    type: 'concierge_service',
    render: c => `I saw ${c} positions around concierge-level client service, where the small personal gestures tend to carry disproportionate weight.`,
  },
  {
    type: 'client_experience_positioning',
    render: c => `I noticed ${c} leads with client experience rather than product, which is usually where a well-judged personal gift earns its keep.`,
  },
  {
    type: 'platform_team',
    render: c => `I saw ${c} runs a dedicated platform team supporting portfolio founders, which is usually who ends up marking the personal milestones too.`,
  },
  {
    type: 'portfolio_services',
    render: c => `I noticed ${c} provides hands-on support to its portfolio companies beyond the cheque.`,
  },
  {
    type: 'founder_community',
    render: c => `I saw ${c} invests in its founder community, where the personal moments tend to matter as much as the board ones.`,
  },
  {
    type: 'family_law_practice',
    render: c => `I noticed ${c}'s family law practice, where clients are often going through exactly the life changes a new baby sits alongside.`,
  },
  {
    type: 'fertility_adoption_practice',
    render: c => `I saw ${c} works on adoption and fertility matters, where a birth is the moment the whole engagement has been building toward.`,
  },
  {
    type: 'private_client_practice',
    render: c => `I noticed ${c}'s private client practice, where the relationships tend to run for decades and across generations.`,
  },
  {
    type: 'estate_planning_practice',
    render: c => `I saw ${c} does a lot of estate and succession work, where a new arrival in the family is often what prompts the next conversation.`,
  },
  {
    type: 'people_hr_function',
    render: c => `I noticed ${c} has a proper People function rather than HR bolted onto operations, which usually means someone owns the new-parent moment.`,
  },
]

/**
 * Compose the opening from the strongest available signal.
 * Returns null when nothing substantive was found — the caller must then skip
 * the first touch rather than sending a hollow one.
 */
export function buildOpening(input: OpeningInput): string | null {
  const t = relevantType(input)
  if (!t) return null
  return OPENING_PRIORITY.find(c => c.type === t)!.render(input.company.trim())
}

/**
 * The opening must belong to the SEGMENT'S motion, not merely be the strongest
 * signal on file. A wealth firm with an employee-recognition programme once
 * produced "I saw CV Advisors runs an employee recognition programme" attached
 * to a body pitching CLIENT gifting — two different arguments in one email.
 *
 * SIGNAL_WEIGHTS defines which evidence counts for a segment, so it is also the
 * correct filter for which evidence may open the email.
 */
function relevantType(input: OpeningInput): string | null {
  const weights = SIGNAL_WEIGHTS[input.segment] ?? {}
  const have = new Set(input.signals.map(s => String(s.signal_type)))
  for (const candidate of OPENING_PRIORITY) {
    if (!have.has(candidate.type)) continue
    if (!(candidate.type in weights)) continue   // wrong motion for this segment
    return candidate.type
  }
  return null
}

/** The signal type an opening was derived from — stored for auditability. */
export function openingSource(input: OpeningInput): string | null {
  return relevantType(input)
}

/** Signal types that can never justify a first touch on their own. */
export const NON_JUSTIFYING_SIGNALS = [
  'careers_page', 'office_locations', 'headcount_evidence',
  'employee_benefits_page', 'workplace_experience', 'talent_network',
] as const
