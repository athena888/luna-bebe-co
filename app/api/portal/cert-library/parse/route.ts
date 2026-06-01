import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { certSlug } from '@/lib/certifications'
import { resolveImageType } from '@/lib/media-type'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const isPdf = file.type === 'application/pdf'
    const isImage = file.type.startsWith('image/')
    if (!isPdf && !isImage) {
      return NextResponse.json({ error: 'Please upload a PDF or image file' }, { status: 400 })
    }

    // Sniff the real image format — browsers sometimes report the wrong MIME type
    const realImageType = isImage ? resolveImageType(arrayBuffer, file.type) : null

    const contentBlock = isPdf
      ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 } }
      : { type: 'image' as const, source: { type: 'base64' as const, media_type: realImageType as 'image/jpeg' | 'image/png' | 'image/webp', data: base64 } }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          contentBlock,
          {
            type: 'text',
            text: `You are reading a product certification document for a luxury baby goods company.

Extract the following and return ONLY valid JSON (no markdown, no explanation):

{
  "name": "Short badge label (e.g. 'GOTS', 'OEKO-TEX 100', 'Bureau Veritas')",
  "full_name": "Full official certification name",
  "blurb": "One sentence, customer-facing: what this certification means for the safety/quality of the product. Write in plain English, no jargon.",
  "region": "Where this certification is recognized: 'International', 'United States', 'Europe', 'China', etc.",
  "issuing_body": "The organization that issued this cert (e.g. 'Bureau Veritas', 'OEKO-TEX Association')",
  "cert_number": "Certificate number or ID if visible, otherwise null",
  "valid_until": "Expiry/validity date if shown (e.g. '2027-01-30'), otherwise null",
  "logo_description": "Describe what the official logo looks like if you can see it in the document, e.g. 'Green circle with two arrows forming a leaf shape and the text GOTS'. If not visible, describe the typical official logo for this certification based on your knowledge.",
  "logo_source_hint": "Where the admin can find/download the official logo, e.g. 'Available at oeko-tex.com/en/our-standards/oeko-tex-standard-100 — look for press/media resources'"
}`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(clean)

    // Auto-generate a key from the name
    const key = certSlug(parsed.name ?? 'cert')

    return NextResponse.json({
      extracted: {
        key,
        name: parsed.name ?? '',
        full_name: parsed.full_name ?? '',
        blurb: parsed.blurb ?? '',
        region: parsed.region ?? '',
        issuing_body: parsed.issuing_body ?? '',
        cert_number: parsed.cert_number ?? null,
        valid_until: parsed.valid_until ?? null,
        logo_description: parsed.logo_description ?? '',
        logo_source_hint: parsed.logo_source_hint ?? '',
      },
    })
  } catch (error) {
    console.error('Cert parse error:', error)
    return NextResponse.json({ error: 'Failed to parse certificate' }, { status: 500 })
  }
}
