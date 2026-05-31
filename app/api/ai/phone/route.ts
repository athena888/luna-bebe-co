import { NextRequest, NextResponse } from 'next/server'
import { anthropic, LUNA_SYSTEM_PROMPT } from '@/lib/anthropic'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const params = new URLSearchParams(body)

    const callSid = params.get('CallSid') || ''
    const callerPhone = params.get('From') || ''
    const speechResult = params.get('SpeechResult') || ''
    const callStatus = params.get('CallStatus') || ''

    // Handle initial greeting (no speech yet)
    if (!speechResult) {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello, and thank you for calling Petite Lavande. I'm your personal gift assistant. How can I help you today? Please speak after the tone.</Say>
  <Record maxLength="60" transcribe="false" action="/api/ai/phone" playBeep="true" />
</Response>`
      return new NextResponse(twiml, {
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Generate AI response
    const aiMessage = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `${LUNA_SYSTEM_PROMPT}

You are responding to a phone call. Keep responses SHORT (2-3 sentences max) since they will be spoken aloud via text-to-speech. Be warm, helpful, and concise. If the caller has an issue or complaint, acknowledge it empathetically and let them know a team member will follow up within hours. Always end with asking if there's anything else you can help with.`,
      messages: [
        {
          role: 'user',
          content: speechResult,
        },
      ],
    })

    const spokenResponse = aiMessage.content[0].type === 'text'
      ? aiMessage.content[0].text
      : 'Thank you for reaching out. A team member will be in touch shortly.'

    // Generate issue summary
    const summaryMessage = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      system: 'You are a customer service assistant. Summarize the customer issue in one short sentence (under 20 words). Be factual and direct.',
      messages: [
        {
          role: 'user',
          content: `Customer said: "${speechResult}"\n\nSummarize this issue in one short sentence.`,
        },
      ],
    })

    const issueSummary = summaryMessage.content[0].type === 'text'
      ? summaryMessage.content[0].text.trim()
      : `Phone inquiry from ${callerPhone}`

    // Save to database
    await supabaseAdmin.from('customer_issues').insert({
      caller_phone: callerPhone,
      issue_summary: issueSummary,
      full_transcript: `Caller: ${speechResult}\n\nPetite Lavande: ${spokenResponse}`,
      status: 'open',
    })

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${spokenResponse.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] || c))}</Say>
  <Say voice="alice">Is there anything else I can help you with? Please speak after the tone, or hang up and our team will follow up with you soon.</Say>
  <Record maxLength="30" transcribe="false" action="/api/ai/phone" playBeep="true" />
</Response>`

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error) {
    console.error('Phone webhook error:', error)

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling Petite Lavande. We're experiencing a brief technical issue. Please call back shortly or visit us online at Petite Lavande dot com. Goodbye!</Say>
  <Hangup />
</Response>`

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    })
  }
}
