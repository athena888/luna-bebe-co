import { supabaseAdmin } from './supabase'

export interface CertDef {
  key: string
  name: string       // short badge label
  full_name: string  // full official name
  blurb: string      // customer-facing one-liner
  region: string
  icon_url?: string | null
  valid_until?: string | null
}

export interface ProductCert {
  key: string
  certificateUrl?: string | null  // actual certificate doc shown in modal
  iconUrl?: string | null          // overrides library icon (usually unused)
}

let _cache: CertDef[] | null = null
let _cacheAt = 0

/** Fetch all cert types from the library (DB). Cached for 30s in server memory. */
export async function getCertLibrary(): Promise<CertDef[]> {
  const now = Date.now()
  if (_cache && now - _cacheAt < 30_000) return _cache

  let data: unknown[] = []
  try {
    const res = await supabaseAdmin.from('cert_library').select('*').order('sort_order')
    data = res.data ?? []
  } catch {
    data = []
  }
  _cache = data as CertDef[]
  _cacheAt = now
  return _cache
}

export function invalidateCertCache() { _cache = null }

export async function getCertByKey(key: string): Promise<CertDef | null> {
  const all = await getCertLibrary()
  return all.find(c => c.key === key) ?? null
}

/** Resolve an array of ProductCerts against the library, injecting meta. */
export async function resolveCerts(certs: ProductCert[]): Promise<(ProductCert & CertDef)[]> {
  if (!certs.length) return []
  const library = await getCertLibrary()
  const byKey = new Map(library.map(c => [c.key, c]))
  return certs
    .map(c => {
      const def = byKey.get(c.key)
      if (!def) return null
      return { ...def, ...c, iconUrl: c.iconUrl ?? def.icon_url ?? null }
    })
    .filter(Boolean) as (ProductCert & CertDef)[]
}

/** Slugify a cert name into a key. */
export function certSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || `cert-${Date.now()}`
}
