// B2B outreach targeting config — plain data, no model calls.
// One combo (city × industry set) per week; the whole daily batch comes from
// that combo. Volume is OUTREACH_DAILY_CAP (50 sends/day, 60 fetched).
// Company-size band across every industry: ~100–1000 employees.
// Combos never mix within a day. After each full 8-week rotation, the 3
// worst combos by reply rate get replaced (see weekly summary; replacements
// are a human edit to ROTATION, reviewed like any code change).

export type PitchTrack =
  | 'EMPLOYEE_GIFTING'
  | 'CLIENT_GIFTING'
  | 'PARTNER'
  | 'REFERRAL_PARTNER'

/** BOTH = split the weekly batch 50/50 between EMPLOYEE_GIFTING and
 *  CLIENT_GIFTING, tagged separately in metrics. */
export type TrackAssignment = PitchTrack | 'BOTH'

export interface IndustryConfig {
  key: string
  label: string
  track: TrackAssignment
  /** Who to reach — guidance for the prospector and the qualifier prompt. */
  persona: string
}

export const INDUSTRIES: Record<string, IndustryConfig> = {
  tech_50_500: {
    key: 'tech_50_500',
    label: 'Tech companies (100–1000 employees)',
    track: 'EMPLOYEE_GIFTING',
    persona: 'People Ops / HR',
  },
  law_firms: {
    key: 'law_firms',
    label: 'Law firms',
    track: 'BOTH',
    persona: 'HR / People lead or firm administrator',
  },
  accounting_consulting: {
    key: 'accounting_consulting',
    label: 'Accounting & consulting firms',
    track: 'EMPLOYEE_GIFTING',
    persona: 'Office manager / HR',
  },
  wealth_mgmt: {
    key: 'wealth_mgmt',
    label: 'Wealth management',
    track: 'CLIENT_GIFTING',
    persona: 'Advisor / practice manager',
  },
  biotech_pharma: {
    key: 'biotech_pharma',
    label: 'Biotech & pharma',
    track: 'EMPLOYEE_GIFTING',
    persona: 'People Ops',
  },
  agencies: {
    key: 'agencies',
    label: 'Marketing & creative agencies',
    track: 'BOTH',
    persona: 'Ops / studio manager',
  },
  luxury_realestate: {
    key: 'luxury_realestate',
    label: 'Luxury real estate',
    track: 'CLIENT_GIFTING',
    persona: 'Broker / team lead',
  },
  corp_gifting_agencies: {
    key: 'corp_gifting_agencies',
    label: 'Corporate gifting agencies',
    track: 'PARTNER',
    persona: 'Sourcing / procurement',
  },
  birth_professionals: {
    key: 'birth_professionals',
    label: 'Birth professionals (doulas, midwives, OB-GYN practices)',
    track: 'REFERRAL_PARTNER',
    persona: 'Practice owner',
  },
  hospital_hr: {
    key: 'hospital_hr',
    label: 'Hospital HR',
    track: 'EMPLOYEE_GIFTING',
    persona: 'HR benefits',
  },
}

export interface CityConfig {
  key: string
  label: string
  state: string
  /** Words that must NEVER appear in rendered email bodies (city ban). */
  banWords: string[]
}

export const CITIES: Record<string, CityConfig> = {
  seattle_bellevue: { key: 'seattle_bellevue', label: 'Seattle / Bellevue', state: 'WA', banWords: ['Seattle', 'Bellevue'] },
  sf_bay_area: { key: 'sf_bay_area', label: 'SF Bay Area', state: 'CA', banWords: ['San Francisco', 'Bay Area', 'Oakland', 'San Jose'] },
  austin: { key: 'austin', label: 'Austin', state: 'TX', banWords: ['Austin'] },
  nyc: { key: 'nyc', label: 'New York City', state: 'NY', banWords: ['New York', 'NYC', 'Manhattan', 'Brooklyn'] },
  miami_ftlauderdale: { key: 'miami_ftlauderdale', label: 'Miami / Fort Lauderdale', state: 'FL', banWords: ['Miami', 'Fort Lauderdale', 'Lauderdale'] },
  boston: { key: 'boston', label: 'Boston', state: 'MA', banWords: ['Boston', 'Cambridge'] },
  dc_nova: { key: 'dc_nova', label: 'DC / Northern Virginia', state: 'DC/VA', banWords: ['Washington', 'D.C.', 'DC', 'Arlington', 'Alexandria', 'Virginia'] },
  dallas: { key: 'dallas', label: 'Dallas', state: 'TX', banWords: ['Dallas'] },
  salt_lake_provo: { key: 'salt_lake_provo', label: 'Salt Lake City / Provo', state: 'UT', banWords: ['Salt Lake', 'Provo', 'Utah'] },
  chicago: { key: 'chicago', label: 'Chicago', state: 'IL', banWords: ['Chicago'] },
}

export interface WeekCombo {
  week: number // 1-based position in the rotation
  city: keyof typeof CITIES
  industries: Array<keyof typeof INDUSTRIES>
}

/** The 8-week rotation. Loops after W8. */
export const ROTATION: WeekCombo[] = [
  // Small professional firms lead the rotation. They publish named partner
  // emails; large tech companies publish team pages with no address at all
  // (a 2026-08-22 crawl of 74 enterprise domains produced 31 named people but
  // only 3 reachable addresses). A one-box minimum makes these firms viable.
  { week: 1, city: 'nyc', industries: ['law_firms', 'wealth_mgmt'] },
  { week: 2, city: 'dc_nova', industries: ['law_firms', 'accounting_consulting'] },
  { week: 3, city: 'miami_ftlauderdale', industries: ['wealth_mgmt', 'luxury_realestate'] },
  { week: 4, city: 'boston', industries: ['biotech_pharma', 'law_firms'] },
  { week: 5, city: 'seattle_bellevue', industries: ['tech_50_500'] },
  { week: 6, city: 'sf_bay_area', industries: ['tech_50_500'] },
  { week: 7, city: 'austin', industries: ['tech_50_500', 'agencies'] },
  { week: 8, city: 'salt_lake_provo', industries: ['tech_50_500'] },
]

/** Monday (UTC) the rotation clock starts. Weeks tick over Mon 00:00 UTC so a
 *  day's 25 sends can never straddle two combos. */
export const ROTATION_EPOCH = '2026-08-17' // first Monday after launch

export const DAILY_SEND_CAP = 25
export const SUPPRESSION_DAYS = 90       // never same domain twice in 90 days
export const QUALIFY_CACHE_DAYS = 180    // never re-classify a domain within 180 days
export const MAX_API_CALLS_PER_DAY = 15  // hard cap on Anthropic calls

/** Deterministic combo for a given date (UTC). Same date → same combo, always. */
export function comboForDate(date: Date): WeekCombo {
  const epoch = Date.UTC(
    +ROTATION_EPOCH.slice(0, 4), +ROTATION_EPOCH.slice(5, 7) - 1, +ROTATION_EPOCH.slice(8, 10),
  )
  const days = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - epoch) / 86_400_000)
  const week = Math.floor(days / 7)
  const idx = ((week % ROTATION.length) + ROTATION.length) % ROTATION.length
  return ROTATION[idx]
}

/** City ban check — run on every rendered subject+body before queueing. */
export function violatesCityBan(text: string): string | null {
  for (const city of Object.values(CITIES)) {
    for (const word of city.banWords) {
      // Word-boundary match, case-insensitive; 'DC' stays case-sensitive to
      // avoid false hits inside ordinary words.
      const re = word === 'DC'
        ? new RegExp(`\\b${word}\\b`)
        : new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (re.test(text)) return word
    }
  }
  return null
}
