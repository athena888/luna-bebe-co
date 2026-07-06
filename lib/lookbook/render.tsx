import path from 'node:path'
import React from 'react'
import { Document, Page, Text, View, Image, Font, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { CatalogTier, CorporateFields, LookbookCopy } from './copy'
import { BRAND_PALETTE } from './images'

// Server-side lookbook PDF (1–2 pages). Brand tokens throughout: cream paper,
// lavender/sage accents, espresso text, Cormorant Garamond headings from the
// vendored font files — registered explicitly, no system-font fallback.
// Layout adapts to empty image slots: missing images simply collapse.

const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts')
Font.register({
  family: 'Cormorant Garamond',
  fonts: [
    { src: path.join(FONT_DIR, 'CormorantGaramond-Regular.ttf'), fontWeight: 400 },
    { src: path.join(FONT_DIR, 'CormorantGaramond-SemiBold.ttf'), fontWeight: 600 },
    { src: path.join(FONT_DIR, 'CormorantGaramond-Italic.ttf'), fontWeight: 400, fontStyle: 'italic' },
  ],
})
// Disable hyphenation — short editorial lines look better ragged.
Font.registerHyphenationCallback(w => [w])

const C = { cream: BRAND_PALETTE.cream, lavender: BRAND_PALETTE.lavender, sage: BRAND_PALETTE.sage, espresso: BRAND_PALETTE.espresso }

const s = StyleSheet.create({
  page: { backgroundColor: C.cream, color: C.espresso, fontFamily: 'Cormorant Garamond', padding: 48 },
  wordmark: { fontSize: 22, fontWeight: 600, letterSpacing: 6, textAlign: 'center', textTransform: 'uppercase' },
  subMark: { fontSize: 8, letterSpacing: 4, textAlign: 'center', textTransform: 'uppercase', color: C.sage, marginTop: 4 },
  rule: { height: 1, backgroundColor: C.lavender, marginVertical: 16, marginHorizontal: 80 },
  tagline: { fontSize: 16, fontStyle: 'italic', textAlign: 'center', marginBottom: 18 },
  hero: { width: '100%', height: 260, objectFit: 'cover', borderRadius: 4, marginBottom: 18 },
  story: { fontSize: 12, lineHeight: 1.6, textAlign: 'center', marginHorizontal: 40 },
  footer: { position: 'absolute', bottom: 30, left: 48, right: 48, textAlign: 'center', fontSize: 9, color: C.sage, letterSpacing: 1 },
  h2: { fontSize: 16, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 },
  tierRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  tierImg: { width: 54, height: 54, objectFit: 'cover', borderRadius: 3 },
  tierName: { fontSize: 13, fontWeight: 600 },
  tierPrice: { fontSize: 12, color: C.sage },
  tierDesc: { fontSize: 10.5, lineHeight: 1.4 },
  corpBox: { backgroundColor: '#FFFFFF', borderRadius: 6, padding: 16, marginTop: 14, borderWidth: 1, borderColor: C.lavender },
  corpBlurb: { fontSize: 10.5, lineHeight: 1.5, marginBottom: 10 },
  table: { flexDirection: 'row', borderTopWidth: 1, borderColor: C.lavender, marginBottom: 8 },
  th: { fontSize: 9, fontWeight: 600, paddingVertical: 4, textTransform: 'uppercase', letterSpacing: 1 },
  td: { fontSize: 9.5, paddingVertical: 3 },
  corpMeta: { fontSize: 9.5, color: C.espresso, marginTop: 2 },
  detail: { width: 150, height: 110, objectFit: 'cover', borderRadius: 4 },
})

export interface RenderInput {
  copy: LookbookCopy
  tiers: CatalogTier[]
  corporate: CorporateFields
  images: { cover?: string; detail?: string; tierImages: Record<string, string> }   // resolved signed URLs
}

const money = (n: number | null) => (n == null ? '—' : `$${n}`)

function LookbookDoc({ copy, tiers, corporate, images }: RenderInput) {
  const shown = tiers.filter(t => t.name)
  const hasCorpPricing = shown.some(t => t.corporate_price_10 != null || t.corporate_price_25 != null || t.corporate_price_50 != null)
  const contact = corporate.contact_line || 'hello@petitelavande.com · petitelavande.com/corporate'

  return (
    <Document title="Petite Lavande — Corporate Lookbook" author="Petite Lavande">
      {/* Cover */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.wordmark}>Petite Lavande</Text>
        <Text style={s.subMark}>Organic newborn &amp; postpartum gift boxes · Seattle</Text>
        <View style={s.rule} />
        {copy.tagline ? <Text style={s.tagline}>{copy.tagline}</Text> : null}
        {images.cover ? <Image style={s.hero} src={images.cover} /> : null}
        {copy.brand_story ? <Text style={s.story}>{copy.brand_story}</Text> : null}
        <Text style={s.footer}>{contact}</Text>
      </Page>

      {/* Collection + corporate program */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.h2}>The Collection</Text>
        {shown.map(t => (
          <View key={t.id} style={s.tierRow} wrap={false}>
            {images.tierImages[t.name] ? <Image style={s.tierImg} src={images.tierImages[t.name]} /> : null}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.tierName}>{t.name}</Text>
                <Text style={s.tierPrice}>${t.price}</Text>
              </View>
              {copy.tier_descriptions[t.name] ? <Text style={s.tierDesc}>{copy.tier_descriptions[t.name]}</Text> : null}
            </View>
          </View>
        ))}

        <View style={s.corpBox} wrap={false}>
          <Text style={[s.h2, { fontSize: 13, marginBottom: 8 }]}>Corporate Gifting</Text>
          {copy.corporate_blurb ? <Text style={s.corpBlurb}>{copy.corporate_blurb}</Text> : null}
          {hasCorpPricing ? (
            <View>
              <View style={s.table}>
                <Text style={[s.th, { flex: 2 }]}>Box</Text>
                <Text style={[s.th, { flex: 1, textAlign: 'right' }]}>10+</Text>
                <Text style={[s.th, { flex: 1, textAlign: 'right' }]}>25+</Text>
                <Text style={[s.th, { flex: 1, textAlign: 'right' }]}>50+</Text>
              </View>
              {shown.map(t => (
                <View key={t.id} style={{ flexDirection: 'row' }}>
                  <Text style={[s.td, { flex: 2 }]}>{t.name}</Text>
                  <Text style={[s.td, { flex: 1, textAlign: 'right' }]}>{money(t.corporate_price_10)}</Text>
                  <Text style={[s.td, { flex: 1, textAlign: 'right' }]}>{money(t.corporate_price_25)}</Text>
                  <Text style={[s.td, { flex: 1, textAlign: 'right' }]}>{money(t.corporate_price_50)}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {corporate.logo_ribbon ? <Text style={s.corpMeta}>Logo gift tag: {corporate.logo_ribbon}</Text> : null}
          {corporate.lead_time ? <Text style={s.corpMeta}>Lead time: {corporate.lead_time}</Text> : null}
        </View>

        {images.detail ? (
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <Image style={s.detail} src={images.detail} />
          </View>
        ) : null}
        <Text style={s.footer}>{contact}</Text>
      </Page>
    </Document>
  )
}

export async function renderLookbookPdf(input: RenderInput): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(<LookbookDoc {...input} />))
}
