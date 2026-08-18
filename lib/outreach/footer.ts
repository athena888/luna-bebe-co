// CAN-SPAM footer for outbound cold email.
//
// Split out of templates-v3.ts because the unsubscribe signer reaches the
// database, and the copy rules must stay unit-testable without one.
//
// Behaviour is deliberately unchanged from the existing sender: a real postal
// address plus a working one-click opt-out on EVERY send. Returning null means
// "do not send" — shipping commercial email without a physical address is a
// CAN-SPAM violation, so the caller must treat null as a hard stop rather than
// falling back to a footer-less body.

import { unsubscribeUrl } from '../unsubscribe.ts'

export function outreachFooterV3(recipientEmail: string): string | null {
  const address = (process.env.BUSINESS_ADDRESS || '').replace(/[\r\n]+/g, ', ').trim()
  // Unset, or still carrying a bracketed placeholder like "[street]".
  if (!address || /\[.*\]/.test(address)) return null
  // k=o routes the opt-out to the outreach suppression list, not just the
  // customer-flow opt-outs.
  const unsub = `${unsubscribeUrl(recipientEmail)}&k=o`
  return `\n\n—\nPetite Lavande · ${address}\nUnsubscribe: ${unsub}\nOr just reply STOP and we won't email you again.`
}
