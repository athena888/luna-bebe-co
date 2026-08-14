// Manual IndexNow submission: reads the LIVE sitemap and submits every URL.
// Run after a deploy that changes many pages:  npm run indexnow
// (Portal product/catalog saves already ping automatically via lib/indexnow.ts;
// this is the run-it-yourself blast for everything else.)
const HOST = 'petitelavande.com'
const KEY = process.env.INDEXNOW_KEY || '62f21e010db55da6a7b1725da6787cc4'

const sitemap = await fetch(`https://${HOST}/sitemap.xml`).then(r => r.text())
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
if (!urlList.length) {
  console.error('No URLs found in sitemap — aborting')
  process.exit(1)
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList,
  }),
})
console.log(`Submitted ${urlList.length} URLs → HTTP ${res.status} ${res.status === 200 || res.status === 202 ? '(ok)' : '(check key/quota)'}`)
