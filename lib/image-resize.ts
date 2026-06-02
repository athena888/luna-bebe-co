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
