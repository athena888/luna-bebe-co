import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { RETURNS_SUMMARY, conflictsWithReturnsPolicy } from '@/lib/site-config'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Interactive SEO generator. The admin supplies optional hints (brand voice,
// target keyword, verified specs) + optionally a photo, and gets back robust,
// keyword-led SEO assets plus poetic on-page copy.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const brandVoice = (form.get('brandVoice') as string) || 'warm, poetic, premium, calming — luxury organic baby brand'
    const targetKeyword = (form.get('targetKeyword') as string) || ''
    const specs = (form.get('specs') as string) || ''
    const currentName = (form.get('currentName') as string) || ''
    const category = (form.get('category') as string) || ''

    const instruction = `You are the SEO + copy lead for Petite Lavande, a luxury organic baby gift brand.

Brand voice: ${brandVoice}.
Target keyword: ${targetKeyword || '(infer the best high-intent keyword for this product)'}.
Verified specs (owner-supplied — treat as ground truth, do not contradict): ${specs || '(none provided — infer cautiously from the photo, do not invent certifications or materials)'}.
Current/working name: ${currentName || '(none)'}. Category: ${category || '(unknown)'}.

Write copy that is poetic and emotional for the customer, but SEO that is ROBUST and keyword-led for search engines.

Return STRICT JSON only (no markdown) with this exact shape:
{
  "names": ["3 poetic but descriptive product name options"],
  "description": "a ~150 word on-page product description in our brand voice",
  "titleTag": "a <=60 char SEO title tag that leads with the target keyword and includes 'Petite Lavande'",
  "metaDescription": "a 150-160 char meta description with the keyword and a gentle call to action",
  "faqs": [{"q":"question","a":"answer"}, {"q":"...","a":"..."}, {"q":"...","a":"..."}]
}

Rules: never invent certifications, materials, sizes, or origin that aren't in the verified specs. NEVER write "GOTS certified", "certified organic", or "100% organic" for a product or the brand — for cotton items just say "organic cotton". FAQs should answer real organic/safety/sizing/gifting questions. Keep titleTag truly <=60 characters.

Returns and refunds: our policy is exactly this — "${RETURNS_SUMMARY}" — and you may not soften or extend it. NEVER promise a return window ("30 days", "returnable within N days"), free returns, a money-back guarantee, or returns of unopened boxes. Google compares these answers against our Merchant Center return policy, which accepts defective products only, and a friendlier invented promise gets the listing disapproved. If a returns question belongs in the FAQs, answer it in the words of the policy above.`

    const content: Anthropic.MessageParam['content'] = []
    if (file) {
      const b64 = Buffer.from(await file.arrayBuffer()).toString('base64')
      content.push({ type: 'image', source: { type: 'base64', media_type: (file.type || 'image/jpeg') as 'image/jpeg', data: b64 } })
    }
    content.push({ type: 'text', text: instruction })

    const res = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1200,
      messages: [{ role: 'user', content }],
    })

    const text = res.content[0].type === 'text' ? res.content[0].text.trim() : ''
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const data = JSON.parse(clean)
    // A prompt rule is guidance, not a guarantee. Drop any FAQ that still
    // promises a return window — an admin saving one would publish it into the
    // product's FAQPage structured data, where Google reads it.
    if (Array.isArray(data?.faqs)) {
      data.faqs = data.faqs.filter(
        (f: { q?: string; a?: string }) => !conflictsWithReturnsPolicy(`${f?.q ?? ''} ${f?.a ?? ''}`),
      )
    }
    return NextResponse.json({ seo: data })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'SEO generation failed'
    console.error('AI SEO error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
