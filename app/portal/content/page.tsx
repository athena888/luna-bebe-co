'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { SiteImageUploader } from '@/components/portal/SiteImageUploader'

type PageId = 'home' | 'story' | 'shop' | 'build' | 'boxes' | 'corporate' | 'giftcards' | 'global' | 'social' | 'journal'

const TABS: { id: PageId; label: string }[] = [
  { id: 'home',       label: 'Homepage' },
  { id: 'story',      label: 'Story' },
  { id: 'shop',       label: 'Shop' },
  { id: 'build',      label: 'Build Your Box' },
  { id: 'boxes',      label: 'Boxes Page' },
  { id: 'corporate',  label: 'Corporate' },
  { id: 'giftcards',  label: 'Gift Cards' },
  { id: 'global',     label: 'Global' },
  { id: 'social',     label: 'Social Feed' },
  { id: 'journal',    label: 'Journal' },
]

function EditorLink({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link href={href} className="group flex items-start justify-between gap-4 bg-white border border-cream-300 rounded-xl p-5 hover:border-bark-400 transition-colors">
      <div>
        <p className="font-serif text-lg text-bark-600 group-hover:text-bark-800 transition-colors">{label}</p>
        <p className="font-sans text-xs text-bark-400 mt-1 leading-relaxed">{description}</p>
      </div>
      <ArrowUpRight size={16} className="text-bark-400 group-hover:text-bark-600 shrink-0 mt-1 transition-colors" />
    </Link>
  )
}

function SectionHeading({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-5 pb-3 border-b border-cream-300">
      <h2 className="font-serif text-xl text-bark-600">{title}</h2>
      {note && <p className="font-sans text-xs text-bark-400 mt-1">{note}</p>}
    </div>
  )
}

function SlotRow({ slotKey, label, context, ratio, hint, where }: {
  slotKey: string; label: string; context: string; ratio: string; hint?: string; where: string
}) {
  return (
    <div className="bg-white border border-cream-200 rounded-lg p-4">
      <p className="font-sans text-sm font-medium text-bark-600 mb-0.5">{label}</p>
      <p className="font-sans text-[11px] text-bark-400 mb-3 leading-relaxed">{where}</p>
      <SiteImageUploader slotKey={slotKey} context={context} ratio={ratio} hint={hint} compact />
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

      {/* Right: content for selected page */}
      <div className="flex-1 p-8 max-w-3xl">

        {active === 'home' && (
          <>
            <SectionHeading title="Homepage" note="Text copy, box selections, and all homepage photos — managed together." />
            <EditorLink
              href="/portal/home-content"
              label="Open Homepage Editor"
              description="Hero photos, perks bar, occasion cards, box carousel, editorial strip, reviews, and the final CTA — all text and image fields in one place."
            />
          </>
        )}

        {active === 'story' && (
          <>
            <SectionHeading title="Story Page" note="Hero, founder letter, brand values, and the prose sections — text and images together." />
            <EditorLink
              href="/portal/story"
              label="Open Story Editor"
              description="Edit the founder letter, brand values, section headings, and all Story page photos from a single editor."
            />
          </>
        )}

        {active === 'shop' && (
          <>
            <SectionHeading title="Shop Page" note="The /shop catalog page." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SlotRow
                slotKey="shop.header_bg"
                label="Header background"
                context="Background behind the Shop page header"
                ratio="21:9"
                hint="Wide & soft · ~2000×860"
                where="Behind the title at the top of /shop"
              />
            </div>
          </>
        )}

        {active === 'build' && (
          <>
            <SectionHeading title="Build Your Box" note="The /build product selector page." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SlotRow
                slotKey="build.header_bg"
                label="Hero background"
                context="Background behind the Build Your Box hero section"
                ratio="16:9"
                hint="Full-screen hero · ~2400×1350 (16:9). Covers the entire viewport on desktop and portrait mobile — keep your subject centered."
                where="Fills the entire screen at the top of /build"
              />
              <SlotRow
                slotKey="build.products_bg"
                label="Products area background"
                context="Background behind the product category list on the Build Your Box page"
                ratio="16:9"
                hint="Soft, light — cards sit on top · ~2000×1125 (16:9)"
                where="Behind the product category list on /build"
              />
            </div>
          </>
        )}

        {active === 'boxes' && (
          <>
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
                label="Build-your-own CTA background"
                context="Background behind the Prefer to choose yourself CTA section on the boxes page"
                ratio="21:9"
                hint="Wide & soft · ~2000×860"
                where="Behind the &ldquo;Prefer to choose yourself?&rdquo; CTA at the bottom of /boxes"
              />
            </div>
          </>
        )}

        {active === 'corporate' && (
          <>
            <SectionHeading title="Corporate & Team Gifting" note="The /corporate page." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SlotRow
                slotKey="corporate.hero_bg"
                label="Hero background"
                context="Background behind the When your people become parents hero on the corporate page"
                ratio="21:9"
                hint="Wide & soft · ~2000×860"
                where="Behind the hero heading on /corporate"
              />
            </div>
          </>
        )}

        {active === 'giftcards' && (
          <>
            <SectionHeading title="Gift Cards" note="The /gift-cards page." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SlotRow
                slotKey="giftcards.header_bg"
                label="Header background"
                context="Background behind the Gift Cards page header"
                ratio="21:9"
                hint="Wide & soft · ~2000×860"
                where="Behind the header on /gift-cards"
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
          </>
        )}

        {active === 'social' && (
          <>
            <SectionHeading title="Social Feed" note="Photos, videos, and Instagram/TikTok embeds shown on the Story page." />
            <EditorLink
              href="/portal/social"
              label="Open Social Feed"
              description="Upload photos or videos, embed Instagram or TikTok posts, show or hide individual items, manage captions and display order."
            />
          </>
        )}

        {active === 'journal' && (
          <>
            <SectionHeading title="Journal" note="Blog-style articles shown on /journal." />
            <EditorLink
              href="/portal/journal"
              label="Open Journal"
              description="Create, edit, publish, or draft journal posts. Supports subheadings (##) and bullet lists. Each post has a title, slug, excerpt, and meta description."
            />
          </>
        )}

        {active === 'global' && (
          <>
            <SectionHeading title="Global" note="Images that appear on every page." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SlotRow
                slotKey="footer.bg"
                label="Footer background"
                context="Background behind the site footer"
                ratio="21:9"
                hint="Wide & soft · ~2000×860"
                where="Behind the footer on every page"
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
          </>
        )}

      </div>
    </div>
  )
}
