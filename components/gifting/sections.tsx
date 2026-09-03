import Link from 'next/link'
import { SlotPhoto, PhotoPending } from './SlotPhoto'
import { Cta, Eyebrow, Lede, SectionTitle } from './primitives'
import type { SiteImage } from '@/lib/site-images'
import type { Companion } from '@/lib/gifting'

type Img = SiteImage | null | undefined
type Images = Record<string, SiteImage>

const img = (images: Images, key: string): Img => images[key] ?? null

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — the core differentiator.
//
// This is the single most important brand-conversion block on the site: it is
// the only thing here that a beige baby-gift competitor cannot also say. It
// sits after the product decision and the first proof, because a visitor has
// to want something before they care why it's different.
export function DifferentiatorSection({ images, href = '/new-mama-gifts' }: { images: Images; href?: string }) {
  return (
    <section className="bg-[color:var(--color-ink)]">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <SlotPhoto
          image={img(images, 'gift.mama_and_baby')}
          mobileImage={img(images, 'gift.mama_and_baby.mobile')}
          alt="One piece chosen for the baby and one chosen for the mother, photographed together"
          className="w-full pl-ratio-45 lg:aspect-auto lg:min-h-[34rem]"
          sizes="(max-width: 1023px) 100vw, 50vw"
          fallback={<PhotoPending label="Photo pending · gift.mama_and_baby" />}
        />
        <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-14 sm:py-20">
          <Eyebrow tone="light">The difference</Eyebrow>
          <SectionTitle tone="light" className="mt-4">
            Most baby gifts are for the baby.
            <span className="block italic text-[color:var(--color-dusty-rose)]">This one remembers her, too.</span>
          </SectionTitle>
          <Lede tone="light" className="mt-5 max-w-md">
            Beautiful little things for baby, paired with a small moment chosen just for Mama —
            the one thing she opens that week that is actually hers.
          </Lede>
          <div className="mt-8">
            <Cta href={href} variant="light">Shop Mama + baby</Cta>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 — the basket lives on.
//
// Commercially this is the highest-leverage section on the page: the seagrass
// baskets are already bought and sitting in inventory, and this is what turns
// that cost into part of what the customer believes they are paying for.
// No sustainability, waste or environmental claim is made here — only what the
// basket does after the ribbon comes off.
export function BasketReuseSection({ images, href = '/boxes' }: { images: Images; href?: string }) {
  return (
    <section className="pl-paper">
      <div className="relative max-w-6xl mx-auto px-6 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center">
        <SlotPhoto
          image={img(images, 'gift.basket_reuse')}
          mobileImage={img(images, 'gift.basket_reuse.mobile')}
          alt="The woven seagrass basket in a nursery weeks later, holding books and a rolled muslin"
          className="w-full pl-ratio-45 sm:pl-ratio-32"
          sizes="(max-width: 1023px) 90vw, 55vw"
          fallback={<PhotoPending label="Photo pending · gift.basket_reuse" />}
        />
        <div>
          <Eyebrow>Beyond the unboxing</Eyebrow>
          <SectionTitle className="mt-4">The wrapping becomes part of the gift.</SectionTitle>
          <Lede className="mt-5">
            After the ribbon comes undone, the woven basket stays — ready for books, little blankets,
            toys, and the everyday pieces of nursery life.
          </Lede>
          <div className="mt-7">
            <Cta href={href} variant="secondary">Explore basket gifts</Cta>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 — little companions.
//
// The beginning of an original Petite Lavande character world: the dolls are
// companions with a temperament, not toy SKUs in a grid. Deliberately no
// material, origin or manufacturing claim appears anywhere in this block — the
// copy is about who the companion is, which is the one thing we can say
// truthfully without a certificate.
export function CompanionStoryCard({ companion }: { companion: Companion }) {
  const heading = (
    <h3 className="font-playfair text-[1.25rem] text-[color:var(--color-ink)]">
      {companion.href
        ? <Link href={companion.href} className="hover:text-[color:var(--color-burgundy)] transition-colors">{companion.name}</Link>
        : companion.name}
    </h3>
  )
  return (
    <div className="border-t border-[color:var(--color-oat)] pt-5">
      {heading}
      {companion.line && (
        <p className="font-sans text-[14px] leading-relaxed text-[color:var(--color-ink-soft)] mt-1.5">{companion.line}</p>
      )}
    </div>
  )
}

export function LittleCompanionsSection({ images, companions, href = '/boxes' }: {
  images: Images
  companions: Companion[]
  href?: string
}) {
  return (
    <section className="bg-[color:var(--color-cream-white)] border-y border-[color:var(--color-oat)]">
      <div className="max-w-6xl mx-auto px-6 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div className="order-2 lg:order-1">
          <Eyebrow>Meet the little companions</Eyebrow>
          <SectionTitle className="mt-4">Small friends for very big stories.</SectionTitle>
          <Lede className="mt-5">
            Every companion arrives with a temperament of their own, and stays long after the
            newborn weeks are over.
          </Lede>
          {companions.length > 0 && (
            <div className="mt-8 space-y-5">
              {companions.map(c => <CompanionStoryCard key={c.name} companion={c} />)}
            </div>
          )}
          <div className="mt-8">
            <Cta href={href} variant="secondary">Meet the companions</Cta>
          </div>
        </div>
        <SlotPhoto
          image={img(images, 'gift.companions')}
          mobileImage={img(images, 'gift.companions.mobile')}
          alt="A crochet companion set in a small storybook scene"
          className="order-1 lg:order-2 w-full aspect-square lg:pl-ratio-32"
          sizes="(max-width: 1023px) 90vw, 45vw"
          fallback={<PhotoPending label="Photo pending · gift.companions" />}
        />
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 — the tactile material world.
//
// Close-ups, not icons. Three frames of real texture with a line each. The
// headings say what the piece is FOR; none of them makes a fibre, certification
// or origin claim, because those belong at product level where `products.organic`
// actually records one.
const MATERIAL_STORIES = [
  { slot: 'gift.material', title: 'Soft', line: 'Textiles chosen for delicate beginnings.', alt: 'Close-up of cotton weave' },
  { slot: 'gift.material.2', title: 'Keepsake', line: 'Pieces worth keeping past the newborn weeks.', alt: 'Close-up of embroidery and ribbon' },
  { slot: 'gift.material.3', title: 'Packed with care', line: 'Finished with your message and prepared to give.', alt: 'Close-up of woven seagrass and card stock' },
] as const

export function MaterialStory({ images }: { images: Images }) {
  return (
    <section className="pl-paper">
      <div className="relative max-w-6xl mx-auto px-6 py-14 sm:py-20">
        <div className="max-w-xl">
          <Eyebrow>Chosen by hand</Eyebrow>
          <SectionTitle className="mt-4">Chosen for how it feels.</SectionTitle>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mt-10">
          {MATERIAL_STORIES.map(m => (
            <div key={m.slot}>
              <SlotPhoto
                image={img(images, m.slot)}
                alt={m.alt}
                className="w-full pl-ratio-32"
                sizes="(max-width: 639px) 88vw, 30vw"
                fallback={<PhotoPending label={`Photo pending · ${m.slot}`} />}
              />
              <h3 className="pl-eyebrow text-[color:var(--color-ink)] mt-4">{m.title}</h3>
              <p className="font-sans text-[14px] leading-relaxed text-[color:var(--color-ink-soft)] mt-2">{m.line}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 — how easy it is to send.
//
// Pure friction removal: the three things a gift buyer is quietly unsure about,
// answered before they have to ask. Every step describes something the checkout
// actually does.
const STEPS = [
  { n: '01', title: 'Choose', line: 'Find the gift that fits the moment.' },
  { n: '02', title: 'Write your message', line: 'Add the words you want her to read — we hand-finish the card.' },
  { n: '03', title: 'We prepare it', line: 'We pack it by hand, tie the ribbon, and send it on its way.' },
] as const

export function HowGiftingWorks({ images, shipDirectNote }: { images: Images; shipDirectNote?: string }) {
  return (
    <section className="bg-[color:var(--color-cream-white)] border-y border-[color:var(--color-oat)]">
      <div className="max-w-6xl mx-auto px-6 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <SlotPhoto
          image={img(images, 'gift.packing')}
          mobileImage={img(images, 'gift.packing.mobile')}
          alt="Hands tying the ribbon and setting the card into a finished gift basket"
          className="w-full pl-ratio-45 lg:pl-ratio-32"
          sizes="(max-width: 1023px) 90vw, 45vw"
          fallback={<PhotoPending label="Photo pending · gift.packing" />}
        />
        <div>
          <Eyebrow>Sending it is the easy part</Eyebrow>
          <SectionTitle className="mt-4">
            You choose the gift.
            <span className="block">We make it feel personal.</span>
          </SectionTitle>
          <ol className="mt-8 space-y-6">
            {STEPS.map(s => (
              <li key={s.n} className="flex gap-5">
                <span className="font-playfair text-[1.5rem] leading-none text-[color:var(--color-dusty-rose)] shrink-0 pt-0.5">{s.n}</span>
                <span>
                  <span className="block pl-eyebrow text-[color:var(--color-ink)]">{s.title}</span>
                  <span className="block font-sans text-[14px] leading-relaxed text-[color:var(--color-ink-soft)] mt-1.5">{s.line}</span>
                </span>
              </li>
            ))}
          </ol>
          {shipDirectNote && (
            <p className="font-sans text-[13px] leading-relaxed text-[color:var(--color-ink-soft)] mt-7 pt-6 border-t border-[color:var(--color-oat)]">
              {shipDirectNote}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 11 — the founder's note.
//
// Placed here rather than near the top: a founder story before products makes a
// visitor read an autobiography to find out what is for sale. Condensed to a
// short note, with the full story one link away.
export function FounderNote({ heading, body, href = '/story' }: {
  heading: string
  body: string
  href?: string
}) {
  return (
    <section className="pl-paper">
      <div className="relative max-w-2xl mx-auto px-6 py-14 sm:py-20 text-center">
        <Eyebrow className="justify-center">A note from the founder</Eyebrow>
        <SectionTitle className="mt-4">{heading}</SectionTitle>
        <Lede className="mt-6">{body}</Lede>
        <div className="mt-8">
          <Cta href={href} variant="quiet">Our story</Cta>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 12 — corporate gifting.
//
// Kept visually sober: an office manager deciding on a company gift should not
// have to scroll past pastels to take it seriously.
export function CorporateGiftBanner({ href = '/corporate' }: { href?: string }) {
  return (
    <section className="bg-[color:var(--color-ink)]">
      <div className="max-w-5xl mx-auto px-6 py-12 sm:py-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <SectionTitle tone="light" className="text-[1.6rem] sm:text-[2rem]">
            Welcoming someone new to the team?
          </SectionTitle>
          <Lede tone="light" className="mt-3 max-w-md">
            A beautiful way to celebrate new parents, clients, and colleagues.
          </Lede>
        </div>
        <Cta href={href} variant="light" className="shrink-0 self-start sm:self-auto">
          Corporate gifting
        </Cta>
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Build Your Own — kept, but demoted. Cold ad traffic should never be asked to
// assemble a gift out of ten decisions; this is the door for the visitor who
// already knows exactly what they want.
export function BuildYourOwnFooterNote({ href = '/build' }: { href?: string }) {
  return (
    <section className="bg-[color:var(--color-cream-white)] border-t border-[color:var(--color-oat)]">
      <div className="max-w-5xl mx-auto px-6 py-8 text-center">
        <p className="font-sans text-[14px] text-[color:var(--color-ink-soft)]">
          Know exactly what you want?{' '}
          <Link href={href} className="text-[color:var(--color-ink)] underline underline-offset-4 decoration-[color:var(--color-oat)] hover:decoration-[color:var(--color-ink)] transition-colors">
            Build your own gift →
          </Link>
        </p>
      </div>
    </section>
  )
}
