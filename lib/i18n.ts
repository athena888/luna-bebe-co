import { supabaseAdmin } from './supabase'

// Spanish (es-US) locale infrastructure. Four hard rules, enforced here and
// in every consumer:
//  1. English speakers always see English — the default never changes.
//  2. Never redirect on IP/geo/Accept-Language; the banner only suggests.
//  3. Every Spanish page is a real server-rendered URL under /es/.
//  4. Register is es-US, cálido y elegante; French product names stay French.
// Everything ships behind SPANISH_ACTIVE, off until SPANISH_REVIEW.md is
// approved by the native reviewer (translations.approved gates per-entity).

// Server flag OR the NEXT_PUBLIC variant (client components need the latter;
// both are set per-environment, so preview builds carry Spanish while
// production stays dark until launch).
export const SPANISH_ACTIVE = process.env.SPANISH_ACTIVE === 'true' || process.env.NEXT_PUBLIC_SPANISH_ACTIVE === 'true'

export type Locale = 'en' | 'es'

// ——— UI dictionary (checkout strings, banner, switcher, shared chrome) ———
// Drafts pending native review — the flag keeps all of it dark until then.
export const ES_UI = {
  'banner.question': '¿Prefieres español?',
  'banner.cta': 'Ver en español',
  'banner.dismiss': 'No, gracias',
  'switcher.en': 'English',
  'switcher.es': 'Español',
  'nav.boxes': 'Canastillas',
  'nav.build': 'Arma tu canastilla',
  'nav.giftcards': 'Tarjetas de regalo',
  'nav.story': 'Nuestra historia',
  'checkout.title': 'Finalizar compra',
  'checkout.contact': 'Información de contacto',
  'checkout.shipping': 'Dirección de envío',
  'checkout.gift': '🎁 Es un regalo — enviar directamente a quien lo recibe',
  'checkout.recipientEmail': 'Correo de quien lo recibe (opcional)',
  'checkout.occasion': 'Ocasión (opcional)',
  'checkout.pay': 'Proceder al pago',
  'checkout.promo': '¿Tienes un código?',
  'checkout.apply': 'Aplicar',
  'checkout.freeShipping': 'Envío gratis',
  'checkout.summary': 'Tu pedido',
  'product.addToBox': 'Agregar a tu canastilla',
  'product.preorder': 'Reservar ahora',
  'product.soldOut': 'Agotado',
  'product.waitlist.title': 'Entérate primero cuando regrese',
  'product.waitlist.sub': 'Avisamos por correo en orden de registro, antes de publicarlo.',
  'product.waitlist.cta': 'Avísame',
  'footer.join': 'Únete a nuestra lista — 10% en tu primera canastilla',
  'footer.emailPlaceholder': 'Correo electrónico*',
  'footer.thanks': 'Gracias — ya estás en la lista.',
} as const

export type UiKey = keyof typeof ES_UI

/** UI string for a locale — English callers pass their existing literal. */
export function ui(key: UiKey, locale: Locale, english: string): string {
  if (locale !== 'es' || !SPANISH_ACTIVE) return english
  return ES_UI[key] ?? english
}

// ——— Entity translations (products, collections, site copy) ———

export interface TranslationRow {
  entity_type: string
  entity_id: string
  field: string
  value: string
  approved: boolean
}

/**
 * Approved Spanish values for a set of entities. Missing/unapproved fields
 * simply aren't in the map — callers fall back to English per field. The
 * fallback rule (page excluded from Spanish sitemap/hreflang until complete)
 * is enforced by translationCoverage().
 */
export async function getTranslations(entityType: string, entityIds: string[], opts?: { includeUnapproved?: boolean }): Promise<Map<string, Record<string, string>>> {
  const map = new Map<string, Record<string, string>>()
  if (!entityIds.length) return map
  try {
    let q = supabaseAdmin
      .from('translations').select('entity_id, field, value, approved')
      .eq('entity_type', entityType).eq('locale', 'es').in('entity_id', entityIds)
    if (!opts?.includeUnapproved) q = q.eq('approved', true)
    const { data } = await q
    for (const r of (data ?? []) as TranslationRow[]) {
      const cur = map.get(r.entity_id) ?? {}
      cur[r.field] = r.value
      map.set(r.entity_id, cur)
    }
  } catch { /* §44 not run — everything falls back to English */ }
  return map
}

/** Store a draft translation (approved=false until the reviewer's pass). */
export async function upsertTranslation(entityType: string, entityId: string, field: string, value: string, approved = false): Promise<void> {
  await supabaseAdmin.from('translations').upsert(
    { entity_type: entityType, entity_id: entityId, locale: 'es', field, value, approved, updated_at: new Date().toISOString() },
    { onConflict: 'entity_type,entity_id,locale,field' }
  )
}

/** Coverage report for the portal: which entities are fully translated
 *  (approved) vs falling back. Complete = every required field approved. */
export async function translationCoverage(entityType: string, required: string[], entityIds: string[]): Promise<{ complete: string[]; fallingBack: string[] }> {
  const t = await getTranslations(entityType, entityIds)
  const complete: string[] = []
  const fallingBack: string[] = []
  for (const id of entityIds) {
    const fields = t.get(id) ?? {}
    ;(required.every(f => fields[f]) ? complete : fallingBack).push(id)
  }
  return { complete, fallingBack }
}

/**
 * Fields a product needs before /es/productos/<id> is a real translation
 * rather than an English fallback. Below this bar the page still renders (the
 * route is reachable and the description falls back to English), but it must
 * not be listed in the sitemap, must not be advertised as an es-US alternate,
 * and must not be indexed — otherwise it is a near-duplicate of the English
 * page sitting on a Spanish URL.
 */
export const ES_PRODUCT_REQUIRED = ['description']

/** Single-id form of translationCoverage() for the two product routes. */
export async function esProductComplete(id: string): Promise<boolean> {
  const { complete } = await translationCoverage('product', ES_PRODUCT_REQUIRED, [id])
  return complete.length > 0
}
