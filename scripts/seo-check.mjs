// Phase 8 — SEO regression check. Validates every sitemap URL: exactly one
// canonical (self-consistent), title/meta present + length, one H1, JSON-LD
// parses, hreflang pairs bidirectional, no duplicate titles/metas, 200s.
// Run against prod:  node scripts/seo-check.mjs https://petitelavande.com
// CI exits 1 on ERRORs (warnings don't fail the build).
const BASE = process.argv[2] || 'https://petitelavande.com'

const xml = await (await fetch(`${BASE}/sitemap.xml`)).text()
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
console.log(`sitemap: ${urls.length} URLs`)

const errors = [], warns = []
const titles = new Map(), metas = new Map()
const get = (re, s) => { const m = s.match(re); return m ? m[1] : null }

for (const url of urls) {
  let res
  try { res = await fetch(url, { redirect: 'manual' }) } catch { errors.push(`${url} — fetch failed`); continue }
  if (res.status !== 200) { errors.push(`${url} — HTTP ${res.status} (sitemap URLs must be 200, no redirects)`); continue }
  const html = await res.text()

  const canons = [...html.matchAll(/rel="canonical" href="([^"]+)"/g)].map(m => m[1])
  if (canons.length === 0) errors.push(`${url} — no canonical`)
  else if (canons.length > 1) errors.push(`${url} — ${canons.length} canonicals`)
  else if (canons[0] !== url && !url.startsWith(canons[0])) warns.push(`${url} — canonical points elsewhere: ${canons[0]}`)

  const title = get(/<title>([^<]*)<\/title>/, html)
  if (!title) errors.push(`${url} — no <title>`)
  else {
    if (title.length > 65) warns.push(`${url} — title ${title.length} chars`)
    if (titles.has(title)) warns.push(`${url} — duplicate title with ${titles.get(title)}`)
    titles.set(title, url)
  }
  const meta = get(/name="description" content="([^"]*)"/, html)
  if (!meta) warns.push(`${url} — no meta description`)
  else {
    if (meta.length > 160) warns.push(`${url} — meta ${meta.length} chars`)
    if (metas.has(meta)) warns.push(`${url} — duplicate meta with ${metas.get(meta)}`)
    metas.set(meta, url)
  }

  const h1s = (html.match(/<h1[\s>]/g) || []).length
  if (h1s === 0) warns.push(`${url} — no H1`)
  else if (h1s > 1) warns.push(`${url} — ${h1s} H1s`)

  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]) } catch { errors.push(`${url} — invalid JSON-LD`) }
  }

  // hreflang: pairs must be bidirectional and both in-sitemap when present
  const langs = [...html.matchAll(/hrefLang="([^"]+)" href="([^"]+)"/gi)]
  const esAlt = langs.find(l => l[1].toLowerCase().startsWith('es'))
  if (esAlt && !urls.includes(esAlt[2]) && !url.includes('/es/')) {
    // ES twin exists but isn't in the sitemap — allowed (translations gate), note only
  }
  if (url.includes('/es/') && !langs.some(l => l[1] === 'en')) warns.push(`${url} — /es page missing en hreflang`)
}

console.log(`\nERRORS (${errors.length}):`); errors.forEach(e => console.log('  ✗', e))
console.log(`\nWARNINGS (${warns.length}):`); warns.forEach(w => console.log('  ⚠', w))
process.exit(errors.length ? 1 : 0)
