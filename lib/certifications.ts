// Built-in certification types a product can display. We render clean text
// badges (not trademarked logo files) to stay legally safe; the actual
// certificate image is uploaded per product and shown in the tap modal.
export interface CertDef {
  key: string
  label: string        // short badge text
  full: string         // full name for the modal
  blurb: string        // one-line explanation
  region: string
}

export const CERTIFICATIONS: CertDef[] = [
  {
    key: 'gots',
    label: 'GOTS',
    full: 'Global Organic Textile Standard',
    blurb: 'Certified organic fibers, processed to strict environmental and social criteria.',
    region: 'International',
  },
  {
    key: 'oeko-tex',
    label: 'OEKO-TEX 100',
    full: 'OEKO-TEX® Standard 100',
    blurb: 'Every component tested for harmful substances — safe for a baby’s skin.',
    region: 'International',
  },
  {
    key: 'cpsia',
    label: 'CPSIA / ASTM',
    full: 'CPSIA & ASTM F963 Compliant',
    blurb: 'Meets U.S. children’s product safety standards (lead, phthalates, small parts).',
    region: 'United States',
  },
  {
    key: 'ce',
    label: 'CE / EN71',
    full: 'CE — EN71 Safety',
    blurb: 'Conforms to European toy/textile safety standards EN71-1,2,3.',
    region: 'Europe',
  },
]

export const CERT_BY_KEY: Record<string, CertDef> = Object.fromEntries(
  CERTIFICATIONS.map(c => [c.key, c])
)

export interface ProductCert {
  key: string
  certificateUrl?: string | null   // uploaded certificate image/PDF shown in the tap modal
  iconUrl?: string | null          // uploaded logo image shown in the badge (global, set once)
}
