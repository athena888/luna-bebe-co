import path from 'node:path'
import { readFileSync } from 'node:fs'
import React from 'react'
import { Document, Page, Text, View, Image, Font, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { CatalogTier, CorporateFields, LookbookCopy } from './copy'

// Server-side lookbook PDF (1–2 pages), styled from the WEBSITE's brand system
// rather than a generic print palette: cream-white paper, espresso text, gold
// hairlines, sage/lavender accents, the lavender divider + vintage botanical
// art from /public/decor, and the site's own type stack — Playfair Display for
// headings, Cormorant Garamond for editorial body, Jost for letterspaced
// labels. All fonts are vendored TTFs registered explicitly (no system
// fallbacks). Layout adapts when image slots are empty: the botanical art
// becomes the cover centerpiece when there's no hero photo.

const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts')
const ART_DIR = path.join(process.cwd(), 'assets', 'art')

Font.register({
  family: 'Playfair Display',
  fonts: [
    { src: path.join(FONT_DIR, 'PlayfairDisplay-Regular.ttf'), fontWeight: 400 },
    { src: path.join(FONT_DIR, 'PlayfairDisplay-SemiBold.ttf'), fontWeight: 600 },
    { src: path.join(FONT_DIR, 'PlayfairDisplay-Italic.ttf'), fontWeight: 400, fontStyle: 'italic' },
  ],
})
Font.register({
  family: 'Cormorant Garamond',
  fonts: [
    { src: path.join(FONT_DIR, 'CormorantGaramond-Regular.ttf'), fontWeight: 400 },
    { src: path.join(FONT_DIR, 'CormorantGaramond-SemiBold.ttf'), fontWeight: 600 },
    { src: path.join(FONT_DIR, 'CormorantGaramond-Italic.ttf'), fontWeight: 400, fontStyle: 'italic' },
  ],
})
Font.register({
  family: 'Jost',
  fonts: [
    { src: path.join(FONT_DIR, 'Jost-Regular.ttf'), fontWeight: 400 },
    { src: path.join(FONT_DIR, 'Jost-Medium.ttf'), fontWeight: 500 },
  ],
})
Font.registerHyphenationCallback(w => [w])

// Loaded as Buffers — react-pdf treats string srcs as URLs (a Windows path
// silently fails to fetch and the image is dropped), but {data, format} embeds.
const DIVIDER = { data: readFileSync(path.join(ART_DIR, 'lavender-divider.png')), format: 'png' as const }
const BONNET = { data: readFileSync(path.join(ART_DIR, 'botanical-bonnet.png')), format: 'png' as const }

// Site tokens (app/globals.css @theme)
const C = {
  paper: '#FBF7F0',        // cream-white
  panel: '#FFFFFF',
  espresso: '#4A3B30',
  espressoLight: '#6F5B4D',
  gold: '#BBA99A',
  goldDeep: '#9E8D7E',
  sage: '#6E8868',
  lavender: '#C6B2DC',
  hairline: '#E4DFD8',     // cream-300
}

const s = StyleSheet.create({
  page: { backgroundColor: C.paper, color: C.espresso, fontFamily: 'Cormorant Garamond', paddingTop: 44, paddingBottom: 58, paddingHorizontal: 52 },
  eyebrow: { fontFamily: 'Jost', fontSize: 8, letterSpacing: 4, textTransform: 'uppercase', color: C.goldDeep, textAlign: 'center' },
  wordmark: { fontFamily: 'Playfair Display', fontSize: 30, fontWeight: 600, letterSpacing: 3, textAlign: 'center', marginTop: 6, textTransform: 'uppercase' },
  divider: { width: 190, height: 36, alignSelf: 'center', marginTop: 10, marginBottom: 10 },
  dividerSm: { width: 120, height: 23, alignSelf: 'center', marginVertical: 8 },
  tagline: { fontFamily: 'Playfair Display', fontStyle: 'italic', fontSize: 15, textAlign: 'center', color: C.espressoLight, marginBottom: 16 },
  frame: { borderWidth: 1, borderColor: C.gold, padding: 5, backgroundColor: C.panel, marginBottom: 16 },
  hero: { width: '100%', height: 236, objectFit: 'cover' },
  bonnetCenter: { width: 210, height: 187, alignSelf: 'center', marginVertical: 18 },
  bonnetSmall: { width: 96, height: 85, alignSelf: 'center', marginBottom: 4 },
  story: { fontSize: 12.5, lineHeight: 1.65, textAlign: 'center', marginHorizontal: 34, color: C.espresso },
  footer: { position: 'absolute', bottom: 26, left: 52, right: 52, textAlign: 'center', fontFamily: 'Jost', fontSize: 7.5, letterSpacing: 2, textTransform: 'uppercase', color: C.goldDeep },
  h2: { fontFamily: 'Playfair Display', fontSize: 17, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' },
  tierRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10, borderBottomWidth: 1, borderBottomColor: C.hairline },
  tierImgFrame: { borderWidth: 1, borderColor: C.hairline, padding: 2, backgroundColor: C.panel },
  tierImg: { width: 46, height: 46, objectFit: 'cover' },
  tierName: { fontFamily: 'Playfair Display', fontSize: 12.5, fontWeight: 600 },
  tierPrice: { fontFamily: 'Cormorant Garamond', fontSize: 12.5, fontWeight: 600, color: C.sage },
  tierDesc: { fontSize: 10.5, lineHeight: 1.4, color: C.espressoLight, marginTop: 1 },
  corpBox: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.gold, marginTop: 18, flexDirection: 'row' },
  corpAccent: { width: 4, backgroundColor: C.lavender },
  corpInner: { flex: 1, padding: 16 },
  corpTitle: { fontFamily: 'Playfair Display', fontSize: 12.5, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 7 },
  corpBlurb: { fontSize: 10.5, lineHeight: 1.55, marginBottom: 10 },
  th: { fontFamily: 'Jost', fontSize: 7.5, fontWeight: 500, letterSpacing: 1.5, textTransform: 'uppercase', color: C.goldDeep, paddingVertical: 4 },
  tableHead: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.hairline, borderBottomWidth: 1, borderBottomColor: C.hairline },
  td: { fontSize: 10, paddingVertical: 3 },
  corpMeta: { fontFamily: 'Jost', fontSize: 8, color: C.espressoLight, marginTop: 3, letterSpacing: 0.5 },
  detailWrap: { alignItems: 'center', marginTop: 16 },
  detail: { width: 168, height: 118, objectFit: 'cover' },
})

export interface RenderInput {
  copy: LookbookCopy
  tiers: CatalogTier[]
  corporate: CorporateFields
  images: { cover?: string; detail?: string; tierImages: Record<string, string> }   // resolved URLs
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
        <Text style={s.eyebrow}>Corporate Lookbook</Text>
        <Text style={s.wordmark}>Petite Lavande</Text>
        <Image style={s.divider} src={DIVIDER} />
        {copy.tagline ? <Text style={s.tagline}>{copy.tagline}</Text> : null}
        {images.cover ? (
          <View style={s.frame}><Image style={s.hero} src={images.cover} /></View>
        ) : (
          // No hero photo yet — the vintage botanical becomes the centerpiece.
          <Image style={s.bonnetCenter} src={BONNET} />
        )}
        {copy.brand_story ? <Text style={s.story}>{copy.brand_story}</Text> : null}
        <Text style={s.footer}>{contact}</Text>
      </Page>

      {/* Collection + corporate program */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.h2}>The Collection</Text>
        <Image style={s.dividerSm} src={DIVIDER} />
        <View style={{ marginTop: 4 }}>
          {shown.map(t => (
            <View key={t.id} style={s.tierRow} wrap={false}>
              {images.tierImages[t.name] ? (
                <View style={s.tierImgFrame}><Image style={s.tierImg} src={images.tierImages[t.name]} /></View>
              ) : null}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Text style={s.tierName}>{t.name}</Text>
                  <Text style={s.tierPrice}>${t.price}</Text>
                </View>
                {copy.tier_descriptions[t.name] ? <Text style={s.tierDesc}>{copy.tier_descriptions[t.name]}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        <View style={s.corpBox} wrap={false}>
          <View style={s.corpAccent} />
          <View style={s.corpInner}>
            <Text style={s.corpTitle}>Corporate Gifting</Text>
            {copy.corporate_blurb ? <Text style={s.corpBlurb}>{copy.corporate_blurb}</Text> : null}
            {hasCorpPricing ? (
              <View>
                <View style={s.tableHead}>
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
            {corporate.logo_ribbon ? <Text style={s.corpMeta}>LOGO GIFT TAG — {corporate.logo_ribbon}</Text> : null}
            {corporate.lead_time ? <Text style={s.corpMeta}>LEAD TIME — {corporate.lead_time}</Text> : null}
          </View>
        </View>

        {images.detail ? (
          <View style={s.detailWrap}>
            <View style={s.frame}><Image style={s.detail} src={images.detail} /></View>
          </View>
        ) : (
          <Image style={[s.bonnetSmall, { marginTop: 14 }]} src={BONNET} />
        )}
        <Text style={s.footer}>{contact}</Text>
      </Page>
    </Document>
  )
}

export async function renderLookbookPdf(input: RenderInput): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(<LookbookDoc {...input} />))
}
