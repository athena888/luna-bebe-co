// Legal business identity — one source for the Terms, Privacy, Contact and
// Shipping pages so the name and mailing address can never drift apart.
//
// SERVER-ONLY: BUSINESS_ADDRESS is not NEXT_PUBLIC_, so it is undefined in the
// browser. Only import this from server components. The address is the same
// configured CAN-SPAM address the outreach footers use; when it is unset, no
// address line renders (we never fall back to an invented one).

export const LEGAL_NAME = 'Petite Lavande LLC'

/** Configured business mailing address on one line, or '' when unset. */
export function businessAddress(): string {
  return (process.env.BUSINESS_ADDRESS ?? '').replace(/[\r\n]+/g, ', ').trim()
}
