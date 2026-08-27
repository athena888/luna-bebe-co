// MX check for the send drain. The old check answered "no MX" for ANY DNS
// failure and the drain then failed the row PERMANENTLY — so one flaky
// resolver in the serverless runtime (2026-08-27) marked 88 approved,
// grade-A/B drafts as undeliverable although every domain (PagerDuty,
// Cloudflare, Klaviyo…) has MX records. Three answers now, not two:
//   'yes'     — MX records exist → send.
//   'no'      — the resolver positively says the name/records don't exist
//               (ENOTFOUND / ENODATA) → would bounce, terminal.
//   'unknown' — timeout, SERVFAIL, network, anything else → NOT evidence about
//               the domain; the row stays queued and is retried next tick.
import { resolveMx } from 'node:dns/promises'

export type MxVerdict = 'yes' | 'no' | 'unknown'

/** Only a positive "does not exist" answer is a verdict about the domain. */
export function classifyMxError(code: string | undefined): MxVerdict {
  return code === 'ENOTFOUND' || code === 'ENODATA' ? 'no' : 'unknown'
}

export async function mxVerdict(domain: string, timeoutMs = 4000): Promise<MxVerdict> {
  if (!domain) return 'no'
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('MX lookup timed out'), { code: 'ETIMEOUT' })), timeoutMs)
  })
  try {
    const records = await Promise.race([resolveMx(domain), timeout])
    return records.length > 0 ? 'yes' : 'no'
  } catch (e) {
    return classifyMxError((e as { code?: string })?.code)
  } finally {
    if (timer) clearTimeout(timer)
  }
}
