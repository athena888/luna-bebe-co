import Link from 'next/link'

// Shared atoms for the gifting pages. One eyebrow, one heading scale, one
// button — so twelve sections read as one document instead of twelve blocks.

// `responsive` = ink on phones, parchment from `lg` — for the hero, whose copy
// sits on a parchment panel on phones and on the photograph on desktop. It is a
// tone rather than a className override so the two colours can never be applied
// at once and left to Tailwind's source order to resolve.
type Tone = 'ink' | 'light' | 'sage' | 'responsive'

export function Eyebrow({ children, tone = 'ink', className = '' }: {
  children: React.ReactNode
  tone?: Tone
  className?: string
}) {
  const color = {
    light: 'text-[color:var(--color-parchment)]/85',
    sage: 'text-[color:var(--color-soft-sage)]',
    ink: 'text-[color:var(--color-ink-soft)]',
    responsive: 'text-[color:var(--color-ink-soft)] lg:text-[color:var(--color-parchment)]/85',
  }[tone]
  return <p className={`pl-eyebrow ${color} ${className}`}>{children}</p>
}

/** Section heading. `as` keeps the document outline honest — one h1 per page. */
export function SectionTitle({ children, as: Tag = 'h2', tone = 'ink', className = '' }: {
  children: React.ReactNode
  as?: 'h1' | 'h2' | 'h3'
  tone?: 'ink' | 'light'
  className?: string
}) {
  const color = tone === 'light' ? 'text-[color:var(--color-parchment)]' : 'text-[color:var(--color-ink)]'
  return (
    <Tag className={`font-playfair leading-[1.08] text-[2rem] sm:text-[2.75rem] ${color} ${className}`}>
      {children}
    </Tag>
  )
}

export function Lede({ children, tone = 'ink', className = '' }: {
  children: React.ReactNode
  tone?: 'ink' | 'light'
  className?: string
}) {
  const color = tone === 'light' ? 'text-[color:var(--color-parchment)]/90' : 'text-[color:var(--color-ink-soft)]'
  return <p className={`font-sans text-[15px] sm:text-base leading-relaxed ${color} ${className}`}>{children}</p>
}

type CtaProps = {
  href: string
  children: React.ReactNode
  /** 'primary' is the one obvious action. Never two primaries in one view.
   *  The two `hero…` variants flip from ink-on-parchment to parchment-on-photo
   *  at `lg`, because the homepage hero's copy sits on a panel on phones and on
   *  the photograph on desktop. They are variants rather than `!important`
   *  overrides so only one colour is ever emitted per breakpoint. */
  variant?: 'primary' | 'secondary' | 'quiet' | 'light' | 'heroPrimary' | 'heroSecondary'
  className?: string
  prefetch?: boolean
}

const CTA_BASE = 'inline-flex items-center justify-center font-sans text-[12px] tracking-[0.16em] uppercase font-semibold transition-colors'

export function Cta({ href, children, variant = 'primary', className = '', prefetch }: CtaProps) {
  const styles = {
    primary: 'bg-[color:var(--color-ink)] text-[color:var(--color-parchment)] px-8 py-4 hover:bg-[color:var(--color-burgundy)]',
    secondary: 'border border-[color:var(--color-ink)] text-[color:var(--color-ink)] px-8 py-4 hover:bg-[color:var(--color-ink)] hover:text-[color:var(--color-parchment)]',
    light: 'bg-[color:var(--color-parchment)] text-[color:var(--color-ink)] px-8 py-4 hover:bg-white',
    quiet: 'text-[color:var(--color-ink)] border-b border-[color:var(--color-oat)] pb-1 hover:border-[color:var(--color-ink)]',
    heroPrimary: 'px-8 py-4 bg-[color:var(--color-ink)] text-[color:var(--color-parchment)] hover:bg-[color:var(--color-burgundy)] lg:bg-[color:var(--color-parchment)] lg:text-[color:var(--color-ink)] lg:hover:bg-white',
    heroSecondary: 'px-8 py-4 border border-[color:var(--color-ink)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-ink)] hover:text-[color:var(--color-parchment)] lg:border-[color:var(--color-parchment)] lg:text-[color:var(--color-parchment)] lg:hover:bg-[color:var(--color-parchment)] lg:hover:text-[color:var(--color-ink)]',
  }[variant]
  return (
    <Link href={href} prefetch={prefetch} className={`${CTA_BASE} ${styles} ${className}`}>
      {children}
    </Link>
  )
}

/** The three proof lines under a hero. Only claims the system can honour. */
export function ProofLine({ items, tone = 'ink', className = '' }: {
  items: string[]
  tone?: 'ink' | 'light' | 'responsive'
  className?: string
}) {
  const color = {
    light: 'text-[color:var(--color-parchment)]/80',
    ink: 'text-[color:var(--color-ink-soft)]',
    responsive: 'text-[color:var(--color-ink-soft)] lg:text-[color:var(--color-parchment)]/80',
  }[tone]
  return (
    <ul className={`flex flex-wrap items-center gap-x-5 gap-y-1.5 ${color} ${className}`}>
      {items.map(item => (
        <li key={item} className="font-sans text-[12px] tracking-[0.04em] flex items-center gap-2">
          <span aria-hidden="true" className="w-1 h-1 bg-[color:var(--color-dusty-rose)] shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  )
}

/** Price, formatted from real cents. A range only when the product has one. */
export function PriceLabel({ low, high, className = '' }: { low: number; high: number; className?: string }) {
  const fmt = (c: number) => (c % 100 === 0 ? `$${Math.round(c / 100)}` : `$${(c / 100).toFixed(2)}`)
  return (
    <span className={`font-sans ${className}`}>
      {low === high ? fmt(low) : `${fmt(low)}–${fmt(high)}`}
    </span>
  )
}
