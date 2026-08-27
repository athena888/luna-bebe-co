// Footer payment-method badges as real card-style marks (Emily 2026-08-27:
// text pills rejected — wants logo badges like the Shopify reference).
// Inline SVG approximations of each brand mark — no third-party image
// requests, nothing to license, works offline. Listed methods must match
// what Stripe hosted checkout actually offers.

const CARD = 'inline-block h-[26px] w-[40px] rounded-[4px] border border-cream-300 bg-white align-middle'

export function PaymentIcons() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" aria-label="Accepted payment methods">
      {/* Visa */}
      <svg className={CARD} viewBox="0 0 40 26" role="img" aria-label="Visa">
        <text x="20" y="17.5" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="11" fontWeight="bold" fontStyle="italic" fill="#1A1F71">VISA</text>
      </svg>
      {/* Mastercard */}
      <svg className={CARD} viewBox="0 0 40 26" role="img" aria-label="Mastercard">
        <circle cx="16" cy="13" r="8" fill="#EB001B" />
        <circle cx="24" cy="13" r="8" fill="#F79E1B" />
        <path d="M20 6.7a8 8 0 0 1 0 12.6 8 8 0 0 1 0-12.6z" fill="#FF5F00" />
      </svg>
      {/* Amex */}
      <svg className={`${CARD} !bg-[#006FCF] !border-[#006FCF]`} viewBox="0 0 40 26" role="img" aria-label="American Express">
        <text x="20" y="16.5" textAnchor="middle" fontFamily="Helvetica, Arial, sans-serif" fontSize="8.5" fontWeight="bold" fill="#ffffff">AMEX</text>
      </svg>
      {/* Apple Pay */}
      <svg className={CARD} viewBox="0 0 40 26" role="img" aria-label="Apple Pay">
        <g transform="translate(7.2,6.2)">
          <path d="M5.06 2.03c.4-.5.68-1.18.6-1.87-.58.03-1.29.39-1.7.88-.37.43-.7 1.13-.61 1.79.65.05 1.3-.33 1.71-.8zm.59.93c-.95-.06-1.75.54-2.2.54-.45 0-1.14-.51-1.88-.5-.97.02-1.86.56-2.36 1.43-1 1.74-.26 4.32.72 5.73.48.69 1.05 1.47 1.8 1.44.72-.03 1-.47 1.86-.47.87 0 1.12.47 1.88.45.78-.01 1.27-.7 1.75-1.4.55-.8.77-1.58.78-1.62-.02-.01-1.5-.58-1.51-2.3-.01-1.44 1.17-2.13 1.23-2.16-.67-.99-1.72-1.1-2.07-1.14z" fill="#000" transform="scale(0.9)" />
        </g>
        <text x="18" y="17.5" fontFamily="Helvetica, Arial, sans-serif" fontSize="10" fontWeight="600" fill="#000">Pay</text>
      </svg>
      {/* Google Pay */}
      <svg className={CARD} viewBox="0 0 40 26" role="img" aria-label="Google Pay">
        <text x="8" y="17.5" fontFamily="Helvetica, Arial, sans-serif" fontSize="11" fontWeight="bold" fill="#4285F4">G</text>
        <text x="17" y="17.5" fontFamily="Helvetica, Arial, sans-serif" fontSize="10" fontWeight="500" fill="#5F6368">Pay</text>
      </svg>
    </div>
  )
}
