const GEMINI_API_KEY = process.env.GEMINI_API_KEY!

export async function generateImage(prompt: string, count = 1): Promise<Buffer[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/imagen-2-generate-001:generateImages?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: Math.min(count, 4) }, // max 4 per request
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('Gemini API error response:', { status: res.status, body: err })
    throw new Error(`Gemini API error (${res.status}): ${err}`)
  }

  const data = await res.json()
  console.log('Gemini response:', data)

  const predictions = data.predictions ?? data.generatedImages ?? []
  if (!predictions.length) {
    console.error('No images in response:', data)
    throw new Error('No images returned from Gemini - check API response format')
  }

  // Handle both prediction formats
  return predictions.map((p: any) => {
    const base64 = p.bytesBase64Encoded || p.imageBase64 || (p.image ? p.image.imageBase64 : null)
    if (!base64) {
      console.error('No base64 in prediction:', p)
      throw new Error('Missing image data in prediction')
    }
    return Buffer.from(base64, 'base64')
  })
}

/**
 * Image-to-image edit with Gemini ("nano banana" — gemini-2.5-flash-image).
 * Feeds the source photo + a prompt and returns the edited image, so the real
 * garment is preserved while the background/lighting are restyled.
 */
export async function editImage(imageBase64: string, mimeType: string, prompt: string): Promise<Buffer> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: prompt },
          ],
        }],
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('Gemini edit error:', { status: res.status, body: err })
    throw new Error(`Gemini image edit failed (${res.status}): ${err}`)
  }

  const data = await res.json()
  const parts = data?.candidates?.[0]?.content?.parts ?? []
  for (const p of parts) {
    const inline = p.inline_data || p.inlineData
    if (inline?.data) return Buffer.from(inline.data, 'base64')
  }
  console.error('No image part in Gemini edit response:', JSON.stringify(data).slice(0, 500))
  throw new Error('No image returned from the Gemini editor')
}
