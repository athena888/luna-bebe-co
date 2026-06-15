// Master switch for the Petite Lavande shop checkout (custom boxes + gift cards).
// Closed by default while inventory isn't ready; set NEXT_PUBLIC_STORE_OPEN=true
// (in the petite-lavande Vercel project) and redeploy to reopen.
export function storeCheckoutEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STORE_OPEN === 'true'
}

export const STORE_CLOSED_MESSAGE =
  'Our boutique is launching soon — online checkout is temporarily closed. Thank you for your patience.'
