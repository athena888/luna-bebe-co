/**
 * Detect the actual image media type from the first bytes of the file buffer.
 * Browsers sometimes report the wrong MIME type (e.g. image/png for a JPEG).
 * Claude's Vision API rejects mismatched types, so we sniff the real format.
 */
export function sniffImageType(
  buffer: ArrayBuffer
): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | null {
  const bytes = new Uint8Array(buffer.slice(0, 12))

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  // WebP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50 (RIFF....WEBP)
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp'
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif'

  return null
}

/** Returns the real media type for an image file, falling back to the declared type. */
export function resolveImageType(
  buffer: ArrayBuffer,
  declaredType: string
): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  return sniffImageType(buffer) ?? (declaredType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif')
}
