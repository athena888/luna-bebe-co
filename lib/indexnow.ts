// IndexNow — instant URL-change pings to Bing/Yandex/etc. (Google ignores it,
// but Bing is verified for this site). Fire-and-forget by design: indexing
// pings must NEVER fail a portal save. Key lives in INDEXNOW_KEY (Vercel env)
// and is publicly served from /<key>.txt (public/), as the protocol requires.

const HOST = 'petitelavande.com'

/** Submit changed URLs (absolute or path-only). No-op without INDEXNOW_KEY.
 *  Returns the HTTP status (200 = ok, 202 = accepted) or null on skip/error. */
export async function submitToIndexNow(urls: string[]): Promise<number | null> {
  const key = process.env.INDEXNOW_KEY
  if (!key || !urls.length) return null
  const urlList = [...new Set(urls)]
    .map(u => (u.startsWith('http') ? u : `https://${HOST}${u.startsWith('/') ? u : `/${u}`}`))
    .slice(0, 10000)
  try {
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key,
        keyLocation: `https://${HOST}/${key}.txt`,
        urlList,
      }),
    })
    if (res.status >= 400) console.error(`indexnow: HTTP ${res.status} for ${urlList.length} url(s)`)
    return res.status
  } catch (e) {
    console.error('indexnow submit failed:', e)
    return null
  }
}
