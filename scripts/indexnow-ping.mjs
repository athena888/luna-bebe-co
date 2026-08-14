// Submit every sitemap URL to IndexNow (Bing, Seznam, Yandex, …).
// Run manually after a deploy:  npm run indexnow
// Key file lives at public/<KEY>.txt (served from the site root), which is
// how IndexNow verifies we own the host.

const HOST = 'petitelavande.com'
const KEY = '181324090eb5ecf18848ef249e7d325a'
const SITEMAP = `https://${HOST}/sitemap.xml`

const xml = await (await fetch(SITEMAP)).text()
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map(m => m[1].trim())
  .filter(u => u.startsWith(`https://${HOST}`))

if (!urls.length) {
  console.error(`No URLs found in ${SITEMAP} — aborting`)
  process.exit(1)
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: urls,
  }),
})

console.log(`Submitted ${urls.length} URLs from ${SITEMAP}`)
console.log(`IndexNow response: ${res.status} ${res.statusText}`)
if (!res.ok) console.log(await res.text())
