'use client'

import { useState, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'

const TEMPLATES = [
  { label: 'Facebook / Instagram ad', source: 'facebook',  medium: 'cpc',          campaign: 'spring-launch' },
  { label: 'TikTok ad',               source: 'tiktok',    medium: 'paid_social',   campaign: 'newborn-box'   },
  { label: 'Email newsletter',         source: 'email',     medium: 'newsletter',    campaign: 'may-promo'     },
  { label: 'Pinterest pin',            source: 'pinterest', medium: 'organic',       campaign: 'gift-ideas'    },
  { label: 'Google ad',               source: 'google',    medium: 'cpc',           campaign: 'baby-gifts'    },
]

function buildUrl(base: string, source: string, medium: string, campaign: string, content: string) {
  const url = new URL(base)
  url.searchParams.set('utm_source', source)
  url.searchParams.set('utm_medium', medium)
  url.searchParams.set('utm_campaign', campaign)
  if (content) url.searchParams.set('utm_content', content)
  return url.toString()
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button
      onClick={copy}
      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-cream-300 text-bark-400 hover:text-bark-600 transition-colors"
      title="Copy link"
    >
      {copied ? <Check size={14} className="text-sage-500" /> : <Copy size={14} />}
    </button>
  )
}

export function UTMLinkBuilder() {
  const [base, setBase] = useState('')
  const [source, setSource] = useState('facebook')
  const [medium, setMedium] = useState('cpc')
  const [campaign, setCampaign] = useState('')
  const [content, setContent] = useState('')

  // Use current site origin so links work regardless of domain
  useEffect(() => {
    setBase(window.location.origin + '/')
  }, [])

  const builtUrl = base ? buildUrl(base, source, medium, campaign || 'my-campaign', content) : ''

  return (
    <div className="bg-cream-50 border border-cream-200 rounded-2xl p-6 mb-8">
      <h2 className="font-serif text-xl text-bark-600 mb-1">UTM Link Builder</h2>
      <p className="font-sans text-xs text-bark-400 leading-relaxed mb-5">
        Paste these tagged URLs into your ads. Every order that comes through will be attributed to the right channel.
      </p>

      {/* Quick templates */}
      <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-3">Quick templates</p>
      <div className="space-y-2 mb-6">
        {TEMPLATES.map(t => {
          const url = base ? buildUrl(base, t.source, t.medium, t.campaign, '') : '…'
          return (
            <div key={t.label} className="flex items-center gap-2">
              <span className="font-sans text-[10px] text-bark-500 w-40 shrink-0">{t.label}</span>
              <code className="flex-1 bg-cream-200/60 text-bark-600 font-mono text-[10px] px-3 py-1.5 rounded-lg truncate">{url}</code>
              <CopyButton text={url} />
            </div>
          )
        })}
      </div>

      {/* Custom builder */}
      <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-3">Custom link</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="block font-sans text-[9px] uppercase tracking-[0.15em] text-bark-400 mb-1">Source</label>
          <input
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="facebook"
            className="w-full border border-cream-300 bg-white px-3 py-2 font-sans text-xs text-bark-600 focus:outline-none focus:border-bark-400"
          />
        </div>
        <div>
          <label className="block font-sans text-[9px] uppercase tracking-[0.15em] text-bark-400 mb-1">Medium</label>
          <input
            value={medium}
            onChange={e => setMedium(e.target.value)}
            placeholder="cpc"
            className="w-full border border-cream-300 bg-white px-3 py-2 font-sans text-xs text-bark-600 focus:outline-none focus:border-bark-400"
          />
        </div>
        <div>
          <label className="block font-sans text-[9px] uppercase tracking-[0.15em] text-bark-400 mb-1">Campaign</label>
          <input
            value={campaign}
            onChange={e => setCampaign(e.target.value)}
            placeholder="spring-launch"
            className="w-full border border-cream-300 bg-white px-3 py-2 font-sans text-xs text-bark-600 focus:outline-none focus:border-bark-400"
          />
        </div>
        <div>
          <label className="block font-sans text-[9px] uppercase tracking-[0.15em] text-bark-400 mb-1">Content (optional)</label>
          <input
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="video-ad-1"
            className="w-full border border-cream-300 bg-white px-3 py-2 font-sans text-xs text-bark-600 focus:outline-none focus:border-bark-400"
          />
        </div>
      </div>
      {builtUrl && (
        <div className="flex items-center gap-2 bg-cream-200/60 rounded-lg px-3 py-2">
          <code className="flex-1 font-mono text-[11px] text-bark-600 break-all">{builtUrl}</code>
          <CopyButton text={builtUrl} />
        </div>
      )}
    </div>
  )
}
