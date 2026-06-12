export type PhotoBox = { x: number; y: number; w: number; h: number }

/**
 * Browser-only: crop a region (given as 0..1 fractions) out of an image data URL
 * and return a JPEG data URL. Used to pull each product's photo out of an
 * uploaded supplier quotation. Returns null on any failure / invalid box.
 */
export async function cropImage(dataUrl: string, box: PhotoBox, outMax = 600, pad = 0.12): Promise<string | null> {
  try {
    const valid = box && [box.x, box.y, box.w, box.h].every(n => typeof n === 'number' && n >= 0 && n <= 1) && box.w > 0.01 && box.h > 0.01
    if (!valid) return null

    // Reject degenerate boxes (thin slivers / extreme aspect ratios) — these are
    // almost always a wrong AI guess and look broken. Better to show no photo.
    const ratio = box.w / box.h
    if (box.w < 0.05 || box.h < 0.05 || ratio > 3 || ratio < 0.2) return null

    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const i = new window.Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = dataUrl
    })

    // Pad the box outward so an imperfect AI box doesn't cut the product off,
    // and enforce a sensible minimum size around the box center.
    const cx = box.x + box.w / 2
    const cy = box.y + box.h / 2
    const w = Math.max(box.w * (1 + pad * 2), 0.14)
    const h = Math.max(box.h * (1 + pad * 2), 0.14)
    const bx = Math.max(0, Math.min(cx - w / 2, 1 - w))
    const by = Math.max(0, Math.min(cy - h / 2, 1 - h))
    const bw = Math.min(1 - bx, w)
    const bh = Math.min(1 - by, h)

    const sx = Math.round(bx * img.naturalWidth)
    const sy = Math.round(by * img.naturalHeight)
    const sw = Math.round(bw * img.naturalWidth)
    const sh = Math.round(bh * img.naturalHeight)
    if (sw <= 0 || sh <= 0) return null

    // Scale the crop down so the longest side is <= outMax
    let dw = sw, dh = sh
    if (Math.max(sw, sh) > outMax) {
      if (sw >= sh) { dh = Math.round((sh * outMax) / sw); dw = outMax }
      else { dw = Math.round((sw * outMax) / sh); dh = outMax }
    }

    const canvas = document.createElement('canvas')
    canvas.width = dw
    canvas.height = dh
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh)
    return canvas.toDataURL('image/jpeg', 0.85)
  } catch {
    return null
  }
}

/** Convert a data URL to a File (for uploading a crop as a product photo). */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [head, b64] = dataUrl.split(',')
  const mime = /:(.*?);/.exec(head)?.[1] || 'image/jpeg'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new File([arr], filename, { type: mime })
}

// Browser-only: downscale + re-encode an image before upload.
// Phone photos are often 3–12 MB (and sometimes HEIC), which exceeds Vercel's
// ~4.5 MB serverless request-body limit. Resizing client-side keeps uploads
// small. Transparency is preserved: PNG/WebP re-encode to PNG, and SVG (vector)
// is passed through untouched. Only opaque photos become JPEG — encoding a
// transparent image as JPEG would flatten its alpha to solid black.
export async function resizeImage(file: File, maxDim = 1600, quality = 0.85, forceJpeg = false): Promise<File> {
  // Only attempt on images; if anything fails, fall back to the original file.
  const looksLikeImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|svg)$/i.test(file.name)
  if (!looksLikeImage) return file

  // SVG is vector — rasterizing it would lose scalability (and alpha). Pass through.
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) return file

  // PNG/WebP can carry transparency → re-encode to PNG (lossless, keeps alpha)
  // — UNLESS forceJpeg is set (for opaque artwork like cards, where PNG bloats
  // past the upload size limit and JPEG is dramatically smaller).
  const keepsAlpha = !forceJpeg && (/png|webp/i.test(file.type) || /\.(png|webp)$/i.test(file.name))
  const outType = keepsAlpha ? 'image/png' : 'image/jpeg'
  const outExt = keepsAlpha ? 'png' : 'jpg'

  try {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = reject
      r.readAsDataURL(file)
    })

    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const i = new window.Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = dataUrl
    })

    let { width, height } = img
    if (!width || !height) return file
    if (width > maxDim || height > maxDim) {
      if (width >= height) { height = Math.round((height * maxDim) / width); width = maxDim }
      else { width = Math.round((width * maxDim) / height); height = maxDim }
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    // JPEG has no alpha — flatten any transparency to white (not black) first.
    if (outType === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height) }
    ctx.drawImage(img, 0, 0, width, height)

    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, outType, quality))
    if (!blob) return file

    const newName = file.name.replace(/\.[^.]+$/, '') + '.' + outExt
    return new File([blob], newName, { type: outType, lastModified: file.lastModified })
  } catch {
    return file
  }
}
