const GEMINI_API_KEY = process.env.GEMINI_API_KEY!

export async function generateImage(prompt: string, count = 1): Promise<Buffer[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3-generate-001:predict?key=${GEMINI_API_KEY}`,
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
    throw new Error(`Gemini image generation failed: ${err}`)
  }

  const data = await res.json()
  const predictions = data.predictions ?? []
  if (!predictions.length) throw new Error('No images returned from Gemini')
  return predictions.map((p: { bytesBase64Encoded: string }) => Buffer.from(p.bytesBase64Encoded, 'base64'))
}
