'use client'

import { useState } from 'react'
import { SiteImageUploader } from '@/components/portal/SiteImageUploader'
import { ScrimControl } from '@/components/portal/ScrimControl'
import { BackgroundBox } from '@/components/portal/BackgroundBox'
import HomeContentPage from '@/app/portal/home-content/page'
import StoryPortal from '@/app/portal/story/page'
import SocialPortalPage from '@/app/portal/social/page'
import JournalPortal from '@/app/portal/journal/page'
import { GiftGuidesEditor } from '@/components/portal/GiftGuidesEditor'

type PageId = 'home' | 'story' | 'build' | 'boxes' | 'guides' | 'corporate' | 'giftcards' | 'global' | 'social' | 'journal' | 'signin'

const TABS: { id: PageId; label: string }[] = [
  { id: 'home',       label: 'Homepage' },
  { id: 'story',      label: 'Story' },
  { id: 'build',      label: 'Build Your Box' },
  { id: 'boxes',      label: 'Boxes Page' },
  { id: 'guides',     label: 'Gift Guides' },
  { id: 'corporate',  label: 'Corporate' },
  { id: 'giftcards',  label: 'Gift Cards' },
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
    <div className="flex min-h-screen">
      {/* Left page selector */}
      <aside className="w-44 shrink-0 border-r border-cream-300 bg-cream-50 py-8 px-3">
        <p className="font-sans text-[9px] tracking-[0.35em] uppercase text-bark-400 mb-3 px-2">Page</p>
        <nav className="flex flex-col gap-0.5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg font-sans text-sm transition-colors ${
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
              <SlotRow
                slotKey="build.products_bg"
                label="Products area background"
                context="Background behind the product category list on the Build Your Box page"
                ratio="16:9"
                hint="Soft, light — cards sit on top · ~2000×1125 (16:9)"
                where="Behind the product category list on /build"
                scrim={{ hex: '#FAF9F8', opacity: 0.80, label: 'Colour overlay', note: 'cream wash over the photo so the product cards stay readable' }}
              />
            </div>
          </div>
        )}

        {active === 'boxes' && (
          <div className="p-8 max-w-3xl">
            <SectionHeading title="Boxes Page" note="The /boxes ready-made gift sets page." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SlotRow
                slotKey="boxes.info_bg"
                label="Info panel background"
                context="Background behind the title, item list, and price panel on every box card"
                ratio="9:16"
                hint="Portrait, soft & light · ~1000×1800. Shared across all box cards."
                where="Behind the text panel on every box card on /boxes"
              />
              <SlotRow
                slotKey="boxes.custom_cta_bg"
                label="Build-your-own CTA — Desktop"
                context="Background behind the Prefer to choose yourself CTA on desktop"
                ratio="21:9"
                hint="Desktop crop · ~2000×860 (21:9). Keep subject centered."
                where="Behind the &ldquo;Prefer to choose yourself?&rdquo; CTA at the bottom of /boxes on desktop"
                scrim={{ hex: '#FAF9F8', opacity: 0.70, label: 'Colour overlay', note: 'tint over the photo so the CTA text stays readable' }}
              />
              <SlotRow
                slotKey="boxes.custom_cta_bg.mobile"
                label="Build-your-own CTA — Mobile"
                context="Background behind the Prefer to choose yourself CTA on mobile"
                ratio="9:16"
                hint="Mobile crop · ~1080×1920. Portrait — shown on phones instead of the desktop image."
                where="Behind the &ldquo;Prefer to choose yourself?&rdquo; CTA at the bottom of /boxes on phones"
              />
            </div>
          </div>
        )}

        {active === 'corporate' && (
          <div className="p-8 max-w-3xl">
            <SectionHeading title="Corporate & Team Gifting" note="The /corporate page." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SlotRow
                slotKey="corporate.hero_bg"
                label="Hero background — Desktop"
                context="Background behind the corporate page hero on desktop"
                ratio="21:9"
                hint="Desktop crop · ~2000×860 (21:9). Keep subject centered."
                where="Behind the hero heading on /corporate on desktop"
                scrim={{ hex: '#FAF9F8', opacity: 0.40, label: 'Hero colour overlay', note: 'tint over the hero photo — raise for legibility, lower to show more photo' }}
              />
              <SlotRow
                slotKey="corporate.hero_bg.mobile"
                label="Hero background — Mobile"
                context="Background behind the corporate page hero on mobile"
                ratio="9:16"
                hint="Mobile crop · ~1080×1920. Portrait — shown on phones instead of the desktop image."
                where="Behind the hero heading on /corporate on phones"
              />
              <SlotRow
                slotKey="corporate.points_bg"
                label="Three-points band background"
                context="Background behind the One-less-thing / Traceable / Simple-to-run band"
                ratio="21:9"
                hint="Shown full width, uncropped — the band height follows the image. Use a wide image with room for text · ~2000×860. White text overlays it."
                where="Behind the dark 'One less thing / Traceable / Simple to run' band"
                scrim={{ hex: '#181716', opacity: 0, label: 'Colour overlay', note: 'off by default so the whole image shows — raise to darken the photo' }}
              />
              <SlotRow
                slotKey="corporate.form_bg"
                label="Lead form background"
                context="Background behind the Tell us about your team contact form"
                ratio="16:9"
                hint="Soft, light — form sits on top · ~2000×1130"
                where="Behind the 'Tell us about your team' contact form"
                scrim={{ hex: '#FAF9F8', opacity: 0.85, label: 'Colour overlay', note: 'tint over the photo so the form stays readable' }}
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
