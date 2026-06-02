import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { text, type } = await req.json()

    if (!text || !type) {
      return NextResponse.json({ error: 'Missing text or type' }, { status: 400 })
    }

    const prompt = type === 'description'
      ? `Improve this product description to be clearer and smoother in English. Keep the same information but make it more polished and professional. Return only the improved text, no explanations:\n\n${text}`
      : `Improve this ingredients/materials list to be clearer and more polished in English. Keep the same information but format it better. Return only the improved text, no explanations:\n\n${text}`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    })

    const improvedText = response.content[0].type === 'text' ? response.content[0].text : text

    return NextResponse.json({
      success: true,
      improved: improvedText.trim(),
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Text improvement error:', errorMsg)
    return NextResponse.json({ error: 'Text improvement failed', details: errorMsg }, { status: 500 })
  }
}
