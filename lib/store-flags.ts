// Master switch for the MAIN Petite Lavande shop checkout (custom boxes + gift
// cards). Closed by default while inventory isn't ready; set
// NEXT_PUBLIC_STORE_OPEN=true (in the petite-lavande Vercel project) and redeploy
// to reopen.
//
// NOTE: The First Year sub-line is made-to-order (order by order) and has its own
// checkout (/api/first-year/checkout). It is intentionally NOT gated by this flag.
export function storeCheckoutEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STORE_OPEN === 'true'
}

export const STORE_CLOSED_MESSAGE =
  'Our boutique is launching soon — online checkout is temporarily closed. Thank you for your patience.'
