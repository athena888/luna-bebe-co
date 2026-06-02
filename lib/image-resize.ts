export type PhotoBox = { x: number; y: number; w: number; h: number }

/**
 * Browser-only: crop a region (given as 0..1 fractions) out of an image data URL
 * and return a JPEG data URL. Used to pull each product's photo out of an
 * uploaded supplier quotation. Returns null on any failure / invalid box.
 */
export async function cropImage(dataUrl: string, box: PhotoBox, outMax = 600): Promise<string | null> {
  try {
    const valid = box && [box.x, box.y, box.w, box.h].every(n => typeof n === 'number' && n >= 0 && n <= 1) && box.w > 0.01 && box.h > 0.01
    if (!valid) return null

    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const i = new window.Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = dataUrl
    })

    const sx = Math.round(box.x * img.naturalWidth)
    const sy = Math.round(box.y * img.naturalHeight)
    const sw = Math.round(box.w * img.naturalWidth)
    const sh = Math.round(box.h * img.naturalHeight)
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

// Browser-only: downscale + re-encode an image to JPEG before upload.
// Phone photos are often 3–12 MB (and sometimes HEIC), which exceeds Vercel's
// ~4.5 MB serverless request-body limit. Resizing client-side keeps uploads
// small and converts to a universally-accepted JPEG.
export async function resizeImage(file: File, maxDim = 1600, quality = 0.85): Promise<File> {
  // Only attempt on images; if anything fails, fall back to the original file.
  const looksLikeImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)
  if (!looksLikeImage) return file

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
    ctx.drawImage(img, 0, 0, width, height)

    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return file

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg', lastModified: file.lastModified })
  } catch {
    return file
  }
}
