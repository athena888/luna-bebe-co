import { NextResponse } from 'next/server'

// Quick health check for the Gemini key + image model, without exposing secrets.
// Visit /api/health/gemini in production to confirm it's wired up.
export async function GET() {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return NextResponse.json({ ok: false, where: 'env', error: 'GEMINI_API_KEY is not set in this environment (add it in Vercel → Settings → Environment Variables, then redeploy).' }, { status: 500 })
  }

  // 1×1 transparent PNG to send as a tiny edit input
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { inline_data: { mime_type: 'image/png', data: pngBase64 } },
              { text: 'Return this image unchanged.' },
            ],
          }],
        }),
      }
    )

    const bodyText = await res.text()
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        where: 'gemini',
        status: res.status,
        hint: res.status === 403 || res.status === 400
          ? 'Key is set but rejected — check the Generative Language API is enabled and billing is on for the key\'s Google project.'
          : res.status === 404
            ? 'Model not found for this key/region — the image model may be unavailable; tell Claude to adjust the model name.'
            : 'Unexpected error from Gemini.',
        error: bodyText.slice(0, 300),
      }, { status: 500 })
    }

    // Did it return an image part?
    let hasImage = false
    try {
      const data = JSON.parse(bodyText)
      const parts = data?.candidates?.[0]?.content?.parts ?? []
      hasImage = parts.some((p: { inline_data?: unknown; inlineData?: unknown }) => p.inline_data || p.inlineData)
    } catch { /* ignore */ }

    return NextResponse.json({
      ok: true,
      keyPresent: true,
      imageModelReachable: true,
      returnedImage: hasImage,
      message: hasImage
        ? 'Gemini image model is working — Style photo should work.'
        : 'Key works and the model responded, but no image came back on the test. Style photo may still work on a real photo.',
    })
  } catch (e) {
    return NextResponse.json({ ok: false, where: 'network', error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
