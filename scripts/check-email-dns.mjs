#!/usr/bin/env node
/**
 * scripts/check-email-dns.mjs
 * Run: node scripts/check-email-dns.mjs
 *
 * Checks that all DNS records needed for petitelavande.com email are in place.
 * Part 3 (inbound webhook) must NOT be enabled until this script prints all PASS.
 */

import { Resolver } from 'node:dns/promises'

const dns = new Resolver()
dns.setServers(['8.8.8.8', '1.1.1.1']) // Google + Cloudflare — skip local cache

const DOMAIN = 'petitelavande.com'
const GREEN = '\x1b[32m'
const RED   = '\x1b[31m'
const RESET = '\x1b[0m'
const BOLD  = '\x1b[1m'

function pass(label, value) {
  console.log(`${GREEN}✓ PASS${RESET}  ${BOLD}${label}${RESET}`)
  if (value) console.log(`       ${value}`)
}
function fail(label, expected, got) {
  console.log(`${RED}✗ FAIL${RESET}  ${BOLD}${label}${RESET}`)
  console.log(`       Expected: ${expected}`)
  if (got !== undefined) console.log(`       Got:      ${got || '(nothing)'}`)
}

async function checkMX() {
  try {
    const records = await dns.resolveMx(DOMAIN)
    const google = records.some(r => r.exchange.includes('google') || r.exchange.includes('googlemail'))
    if (google) {
      pass('MX — Google Workspace', records.map(r => `${r.priority} ${r.exchange}`).join(', '))
    } else {
      fail('MX — Google Workspace', 'aspmx.l.google.com (and alternates)', records.map(r => r.exchange).join(', '))
    }
  } catch {
    fail('MX — Google Workspace', 'aspmx.l.google.com (and alternates)', '(no MX records found)')
  }
}

async function checkSPF() {
  try {
    const records = await dns.resolveTxt(DOMAIN)
    const spf = records.flat().find(r => r.startsWith('v=spf1'))
    if (spf && spf.includes('_spf.google.com')) {
      pass('SPF TXT', spf)
    } else if (spf) {
      fail('SPF TXT', 'v=spf1 include:_spf.google.com ~all', spf)
    } else {
      fail('SPF TXT', 'v=spf1 include:_spf.google.com ~all', '(no SPF record found)')
    }
  } catch {
    fail('SPF TXT', 'v=spf1 include:_spf.google.com ~all', '(DNS error)')
  }
}

async function checkDKIM() {
  try {
    const records = await dns.resolveTxt(`google._domainkey.${DOMAIN}`)
    const dkim = records.flat().find(r => r.startsWith('v=DKIM1'))
    if (dkim) {
      pass('DKIM (google._domainkey)', dkim.slice(0, 60) + '…')
    } else {
      fail('DKIM (google._domainkey)', 'v=DKIM1; k=rsa; p=<public-key>', records.flat()[0] || '(no DKIM record)')
    }
  } catch {
    fail('DKIM (google._domainkey)', 'v=DKIM1; k=rsa; p=<public-key>', '(no record — not yet configured)')
  }
}

async function checkDMARC() {
  try {
    const records = await dns.resolveTxt(`_dmarc.${DOMAIN}`)
    const dmarc = records.flat().find(r => r.startsWith('v=DMARC1'))
    if (dmarc) {
      const isEnforced = dmarc.includes('p=quarantine') || dmarc.includes('p=reject')
      pass('DMARC TXT', dmarc)
      if (!isEnforced) {
        console.log(`       ${BOLD}Note:${RESET} policy is p=none — tighten to p=quarantine after 2–3 weeks clean sending`)
      }
    } else {
      fail('DMARC TXT', 'v=DMARC1; p=none; (minimum)', '(no DMARC record)')
    }
  } catch {
    fail('DMARC TXT', 'v=DMARC1; p=none; (minimum)', '(DNS error)')
  }
}

console.log(`\n${BOLD}Petite Lavande — Email DNS check for ${DOMAIN}${RESET}\n`)
await checkMX()
await checkSPF()
await checkDKIM()
await checkDMARC()
console.log('\nAll checks done. Fix any FAIL items before enabling Part 3 / Part 4 email features.\n')
