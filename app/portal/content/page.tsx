'use client'

import { useState } from 'react'
import { SiteImageUploader } from '@/components/portal/SiteImageUploader'
import { ScrimControl } from '@/components/portal/ScrimControl'
import { BackgroundBox } from '@/components/portal/BackgroundBox'
import HomeContentPage from '@/app/portal/home-content/page'
import StoryPortal from '@/app/portal/story/page'
import SocialPortalPage from '@/app/portal/social/page'
import JournalPortal from '@/app/portal/journal/page'
import ProductsPortal from '@/app/portal/products/page'
import BoxesPortal from '@/app/portal/boxes/page'
import CardStylesPortal from '@/app/portal/card-styles/page'
import { GiftGuidesEditor } from '@/components/portal/GiftGuidesEditor'

type PageId = 'home' | 'story' | 'build' | 'guides' | 'giftcards' | 'corporate' | 'press' | 'track' | 'legal' | 'global' | 'social' | 'journal' | 'signin' | 'products' | 'prebuilt' | 'cardstyles'

const TABS: { id: PageId; label: string }[] = [
  { id: 'home',       label: 'Homepage' },
  { id: 'story',      label: 'Story' },
  { id: 'products',   label: 'Products' },
  { id: 'prebuilt',   label: 'Prebuilt Boxes' },
  { id: 'cardstyles', label: 'Card Styles' },
  { id: 'build',      label: 'Build Your Box' },
  { id: 'guides',     label: 'Gift Guides' },
  { id: 'giftcards',  label: 'Gift Cards' },
  { id: 'corporate',  label: 'Corporate' },
  { id: 'press',      label: 'Press Kit' },
  { id: 'track',      label: 'Track Order' },
  { id: 'legal',      label: 'Legal' },
  { id: 'global',     label: 'Global' },
  { id: 'social',     label: 'Social Feed' },
  { id: 'journal',    label: 'Journal' },
  { id: 'signin',     label: 'Sign In' },
]

function SectionHeading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-5 pb-3 border-b border-cream-300">
      <h2 className="font-serif text-xl text-bark-600">{title}</h2>
      {note && <p className="font-sans text-xs text-bark-400 mt-1">{note}</p>}
    </div>
  )
}

function SlotRow({ slotKey, label, context, ratio, hint, where, scrim }: {
  slotKey: string; label: string; context: string; ratio: string; hint?: string; where: string
  // When set, shows a colour + opacity overlay control beneath the uploader.
  scrim?: { hex: string; opacity: number; label?: string; note?: string }
}) {
  return (
    <div className="bg-white border border-cream-200 rounded-lg p-4">
      <p className="font-sans text-sm font-medium text-bark-600 mb-0.5">{label}</p>
      <p className="font-sans text-[11px] text-bark-400 mb-3 leading-relaxed">{where}</p>
      <SiteImageUploader slotKey={slotKey} context={context} ratio={ratio} hint={hint} compact />
      {scrim && <ScrimControl scrimKey={slotKey} defaultScrim={{ hex: scrim.hex, opacity: scrim.opacity }} label={scrim.label} note={scrim.note} />}
    </div>
  )
}

export default function ContentPage() {
  const [active, setActive] = useState<PageId>('home')

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Page selector — left column on desktop, horizontal scrollable chip
          row on phones (a fixed side column left no room for the editors). */}
      <aside className="w-full md:w-44 shrink-0 border-b md:border-b-0 md:border-r border-cream-300 bg-cream-50 py-3 md:py-8 px-3">
        <p className="hidden md:block font-sans text-[9px] tracking-[0.35em] uppercase text-bark-400 mb-3 px-2">Page</p>
        <nav className="flex flex-row md:flex-col gap-1 md:gap-0.5 overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`shrink-0 md:w-full text-left px-3 py-2 md:py-2.5 rounded-lg font-sans text-sm whitespace-nowrap transition-colors ${
                active === t.id ? 'bg-bark-600/10 text-bark-700 font-medium' : 'text-bark-500 hover:bg-cream-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Right: content for selected page — inline editors manage their own padding */}
      <div className="flex-1 min-w-0">

        {active === 'home' && <HomeContentPage />}
        {active === 'story' && <StoryPortal />}
        {active === 'products' && <ProductsPortal />}
        {active === 'prebuilt' && <BoxesPortal />}
        {active === 'cardstyles' && <CardStylesPortal />}
        {active === 'guides' && <GiftGuidesEditor />}
        {active === 'social' && <SocialPortalPage />}
        {active === 'journal' && <JournalPortal />}

        {active === 'build' && (
          <div className="p-8 max-w-3xl">
            <SectionHeading title="Build Your Box" note="The /build product selector page." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SlotRow
                slotKey="build.header_bg"
                label="Hero background — Desktop"
                context="Background behind the Build Your Box hero section on desktop"
                ratio="16:9"
                hint="Desktop crop · ~1920×1080. Keep subject centered — mobile will use the portrait version below."
                where="Fills the entire screen at the top of /build on desktop"
                scrim={{ hex: '#181716', opacity: 0.75, label: 'Colour overlay', note: 'darkens the bottom so the white hero text stays readable' }}
              />
              <SlotRow
                slotKey="build.header_bg.mobile"
                label="Hero background — Mobile"
                context="Background behind the Build Your Box hero section on mobile"
                ratio="9:16"
                hint="Mobile crop · ~1080×1920. Portrait — shown on phones instead of the desktop image above."
                where="Fills the entire screen at the top of /build on phones"
              />
            </div>
          </div>
        )}

        {active === 'giftcards' && (
          <div className="p-8 max-w-3xl">
            <SectionHeading title="Gift Cards" note="The /gift-cards page." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SlotRow
                slotKey="giftcards.header_bg"
                label="Header background — Desktop"
                context="Background behind the Gift Cards page header on desktop"
                ratio="21:9"
                hint="Desktop crop · ~2000×860 (21:9). Keep subject centered."
                where="Behind the header on /gift-cards on desktop"
                scrim={{ hex: '#FAF9F8', opacity: 0.55, label: 'Colour overlay', note: 'tint over the photo so the header text stays readable' }}
              />
              <SlotRow
                slotKey="giftcards.header_bg.mobile"
                label="Header background — Mobile"
                context="Background behind the Gift Cards page header on mobile"
                ratio="9:16"
                hint="Mobile crop · ~1080×1920. Portrait — shown on phones instead of the desktop image."
                where="Behind the header on /gift-cards on phones"
              />
              <SlotRow
                slotKey="giftcard.visual"
                label="Gift card artwork"
                context="The gift card artwork shown in the live preview"
                ratio="3:2"
                hint="Gift card art · ~1200×800"
                where="The card image in the live gift-card preview"
              />
            </div>
          </div>
        )}

        {active === 'corporate' && (
          <div className="p-8 max-w-3xl">
            <SectionHeading title="Corporate" note="The /corporate team-gifting page — one background per section, desktop + mobile. Text is edited in code for now." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SlotRow
                slotKey="corporate.hero_bg"
                label="Hero — Desktop"
                context="Background behind the When your people become parents hero on the corporate page"
                ratio="21:9"
                hint="Wide & soft · ~2000×860 (21:9)"
                where="Behind the &ldquo;When your people become parents&rdquo; hero at the top of /corporate"
                scrim={{ hex: '#FAF9F8', opacity: 0.40, label: 'Colour overlay', note: 'light wash over the photo so the hero text stays readable' }}
              />
              <SlotRow
                slotKey="corporate.hero_bg.mobile"
                label="Hero — Mobile"
                context="Background behind the corporate hero on mobile"
                ratio="4:5"
                hint="Taller phone crop · ~1000×1250"
                where="Behind the corporate hero on phones"
              />
              <SlotRow
                slotKey="corporate.points_bg"
                label="Three-points band — Desktop"
                context="Background behind the dark three-points band on the corporate page"
                ratio="21:9"
                hint="Shown full width, uncropped — the band height follows the image. Use a wide image with room for text · ~2000×860"
                where="Behind the dark &ldquo;One less thing / Traceable / Simple to run&rdquo; band (white text)"
              />
              <SlotRow
                slotKey="corporate.points_bg.mobile"
                label="Three-points band — Mobile"
                context="Background behind the three-points band on mobile"
                ratio="4:5"
                hint="Taller phone crop · ~1000×1250 — phones otherwise crop the wide image"
                where="The photo above the olive points panel on phones"
              />
              <SlotRow
                slotKey="corporate.form_bg"
                label="Lead form — Desktop"
                context="Background behind the corporate inquiry form"
                ratio="21:9"
                hint="Wide & soft — the form card sits on top · ~2000×860"
                where="Behind the &ldquo;Tell us about your team&rdquo; form at the bottom of /corporate"
                scrim={{ hex: '#FAF9F8', opacity: 0.55, label: 'Colour overlay', note: 'tint behind the form card — raise for legibility' }}
              />
              <SlotRow
                slotKey="corporate.form_bg.mobile"
                label="Lead form — Mobile"
                context="Background behind the corporate inquiry form on mobile"
                ratio="4:5"
                hint="Taller phone crop · ~1000×1250"
                where="Behind the inquiry form on phones"
              />
              <SlotRow
                slotKey="gifts.corporate.card"
                label="Gifting-hub card image"
                context="Corporate card image on the Gifting Ideas hub"
                ratio="4:5"
                hint="Portrait card · ~1000×1250"
                where="The Corporate shortcut card on the /gift-guides hub"
              />
            </div>
          </div>
        )}

        {active === 'press' && (
          <div className="p-8 max-w-3xl">
            <SectionHeading title="Press Kit" note="The public /press page — one background per section, desktop + mobile. Press photos themselves are tagged in the Lookbook image library." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SlotRow
                slotKey="press.hero_bg"
                label="Hero — Desktop"
                context="Background behind the Press Kit header"
                ratio="21:9"
                hint="Wide & soft — title and contact sit on top · ~2000×860"
                where="Behind the Press Kit title, one-liner and contact line"
                scrim={{ hex: '#FBF7F0', opacity: 0.70, label: 'Colour overlay', note: 'tint for text legibility over the photo' }}
              />
              <SlotRow
                slotKey="press.hero_bg.mobile"
                label="Hero — Mobile"
                context="Background behind the press header on mobile"
                ratio="4:5"
                hint="Taller phone crop · ~1000×1250"
                where="Behind the press header on phones"
              />
              <SlotRow
                slotKey="press.images_bg"
                label="Image grid — Desktop"
                context="Background behind the downloadable press photo grid"
                ratio="21:9"
                hint="Very soft — the photo cards sit on top · ~2000×860"
                where="Behind the press photo grid and download button"
                scrim={{ hex: '#FBF7F0', opacity: 0.88, label: 'Colour overlay', note: 'keep high so the press photos stay the focus' }}
              />
              <SlotRow
                slotKey="press.images_bg.mobile"
                label="Image grid — Mobile"
                context="Background behind the press photo grid on mobile"
                ratio="4:5"
                hint="Taller phone crop · ~1000×1250"
                where="Behind the photo grid on phones"
              />
              <SlotRow
                slotKey="press.linesheet_bg"
                label="Line sheet — Desktop"
                context="Background behind the tier and price line sheet"
                ratio="21:9"
                hint="Very soft — the white table sits on top · ~2000×860"
                where="Behind the line sheet at the bottom of /press"
                scrim={{ hex: '#FBF7F0', opacity: 0.88, label: 'Colour overlay', note: 'keep high so prices stay readable' }}
              />
              <SlotRow
                slotKey="press.linesheet_bg.mobile"
                label="Line sheet — Mobile"
                context="Background behind the line sheet on mobile"
                ratio="4:5"
                hint="Taller phone crop · ~1000×1250"
                where="Behind the line sheet on phones"
              />
            </div>
          </div>
        )}

        {active === 'track' && (
          <div className="p-8 max-w-3xl">
            <SectionHeading title="Track Order" note="The /track order-lookup page. Text is edited in code — this controls the background photo behind the form." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SlotRow
                slotKey="track.bg"
                label="Page background"
                context="Background behind the order tracking form"
                ratio="21:9"
                hint="Wide & soft — the form sits on top · ~2000×860"
                where="Fills the /track page behind the email + order-reference form"
                scrim={{ hex: '#FAF9F8', opacity: 0.85, label: 'Colour overlay', note: 'cream wash over the photo so the form stays readable' }}
              />
              <SlotRow
                slotKey="track.bg.mobile"
                label="Page background — Mobile"
                context="Background behind the order tracking form on mobile"
                ratio="9:16"
                hint="Mobile crop · ~1080×1920. Portrait — shown on phones instead of the desktop image."
                where="Behind the tracking form on phones"
              />
            </div>
          </div>
        )}

        {active === 'legal' && (
          <div className="p-8 max-w-3xl">
            <SectionHeading title="Legal pages" note="Privacy Policy, Terms of Service and Returns share ONE background — upload it once here and all three pages use it." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SlotRow
                slotKey="legal.bg"
                label="Page background"
                context="Background behind the legal pages (privacy, terms, returns)"
                ratio="21:9"
                hint="Wide & soft — the text sits on top · ~2000×860"
                where="Behind Privacy Policy, Terms of Service and Returns"
                scrim={{ hex: '#FAF9F8', opacity: 0.85, label: 'Colour overlay', note: 'cream wash over the photo so the legal text stays readable' }}
              />
              <SlotRow
                slotKey="legal.bg.mobile"
                label="Page background — Mobile"
                context="Background behind the legal pages on mobile"
                ratio="9:16"
                hint="Mobile crop · ~1080×1920. Portrait — shown on phones instead of the desktop image."
                where="Behind the legal pages on phones"
              />
            </div>
          </div>
        )}

        {active === 'global' && (
          <div className="p-8 max-w-3xl">
            <SectionHeading title="Global" note="Images that appear on every page." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SlotRow
                slotKey="footer.bg"
                label="Footer background — Desktop"
                context="Background behind the site footer on desktop"
                ratio="21:9"
                hint="Desktop crop · ~2000×860 (21:9). Keep subject centered."
                where="Behind the footer on every page on desktop"
                scrim={{ hex: '#F4F2EF', opacity: 0.30, label: 'Colour overlay', note: 'light wash over the photo so the footer text stays readable' }}
              />
              <SlotRow
                slotKey="footer.bg.mobile"
                label="Footer background — Mobile"
                context="Background behind the site footer on mobile"
                ratio="9:16"
                hint="Mobile crop · ~1080×1920. Portrait — shown on phones instead of the desktop image."
                where="Behind the footer on every page on phones"
              />
              <SlotRow
                slotKey="global.logo"
                label="Logo / seal"
                context="The Petite Lavande circular seal logo"
                ratio="1:1"
                hint="Transparent PNG · ~600×600"
                where="Shown in the site header & footer"
              />
              <SlotRow
                slotKey="global.og_image"
                label="Social-share image"
                context="The OG image shown when the site is shared on social media"
                ratio="1.91:1"
                hint="Link preview · 1200×630"
                where="Link preview when the site is shared on social"
              />
            </div>
          </div>
        )}

        {active === 'signin' && (
          <div className="p-8 max-w-3xl">
            <SectionHeading title="Sign In" note="Shows on the customer sign-in page (/account) and the admin login. Upload a photo and tune the colour overlay over it." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BackgroundBox appliesTo="the customer sign-in form at /account (and the admin login)">
                <SlotRow
                  slotKey="signin.bg"
                  label="Sign-in background"
                  context="Background behind the admin sign-in form"
                  ratio="16:9"
                  hint="Soft lifestyle image · ~1920×1080"
                  where="Behind the sign-in form on the admin login page"
                />
                <ScrimControl scrimKey="signin.bg" defaultScrim={{ hex: '#181716', opacity: 0.45 }} label="Background colour overlay" note="dark tint over the photo — raise it if the gold logo & form get hard to read" />
              </BackgroundBox>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
