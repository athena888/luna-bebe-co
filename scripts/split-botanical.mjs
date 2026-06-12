#!/usr/bin/env node
// scripts/split-botanical.mjs
// Splits public/decor/botanical-source.png into two transparent corner assets.
// Run with: npm run decor:split

import sharp from 'sharp'
import { readFile, mkdir, writeFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const SRC = resolve(root, 'public/decor/botanical-source.png')
const OUT = resolve(root, 'public/decor')

/** Sample the four corners to detect background color (avg RGB). */
async function detectBg(raw, width, height) {
  const stride = width * 4
  function px(x, y) {
    const off = y * stride + x * 4
    return [raw[off], raw[off + 1], raw[off + 2]]
  }
  const samples = [px(0, 0), px(width - 1, 0), px(0, height - 1), px(width - 1, height - 1)]
  return [0, 1, 2].map(ch => Math.round(samples.reduce((s, p) => s + p[ch], 0) / samples.length))
}

/** Replace near-background pixels with alpha 0 (soft edge to keep line antialiasing). */
function removeBg(raw, width, height, bg, tolerance = 28) {
  const out = Buffer.from(raw)
  for (let i = 0; i < out.length; i += 4) {
    const dr = out[i] - bg[0], dg = out[i + 1] - bg[1], db = out[i + 2] - bg[2]
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)
    if (dist < tolerance) {
      // Ramp: pixels very close to bg → fully transparent; near threshold → semi-transparent
      out[i + 3] = Math.round((dist / tolerance) * out[i + 3])
    }
  }
  return out
}

/** Tight bounding box of non-transparent pixels + padding. */
function bbox(raw, width, height, padding = 24) {
  let minX = width, maxX = 0, minY = height, maxY = 0
  const stride = width * 4
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (raw[y * stride + x * 4 + 3] > 10) {
        if (x < minX) minX = x; if (x > maxX) maxX = x
        if (y < minY) minY = y; if (y > maxY) maxY = y
      }
    }
  }
  const left = Math.max(0, minX - padding)
  const top = Math.max(0, minY - padding)
  return {
    left,
    top,
    width: Math.min(width - left, maxX + padding + 1 - left),
    height: Math.min(height - top, maxY + padding + 1 - top),
  }
}

async function processRegion(srcPath, extract, bg) {
  const { left, top, width, height } = extract
  const raw = await sharp(srcPath)
    .extract({ left, top, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer()

  const transparent = removeBg(raw, width, height, bg)
  const box = bbox(transparent, width, height)
  console.log(`  content bbox: ${box.width}×${box.height} at (${box.left}, ${box.top})`)

  const base = await sharp(transparent, { raw: { width, height, channels: 4 } }).extract(box)

  const png = await base.clone().png({ compressionLevel: 9 }).toBuffer()
  const webp = await base.clone().webp({ quality: 85 }).toBuffer()
  return { png, webp }
}

async function run() {
  try { await readFile(SRC) } catch {
    console.error('\nERROR: public/decor/botanical-source.png not found.')
    console.error('Please add the source image to public/decor/ and re-run: npm run decor:split\n')
    process.exit(1)
  }

  await mkdir(OUT, { recursive: true })

  const meta = await sharp(SRC).metadata()
  const W = meta.width, H = meta.height
  if (!W || !H) { console.error('Cannot read source dimensions'); process.exit(1) }
  console.log(`Source: ${W}×${H}`)

  // Sample background color from corners of full image
  const fullRaw = await sharp(SRC).ensureAlpha().raw().toBuffer()
  const bg = await detectBg(fullRaw, W, H)
  console.log(`Background RGB: rgb(${bg.join(', ')})`)

  console.log('\nProcessing bottom-left (left 38% × bottom 60%)…')
  const blW = Math.round(W * 0.38), blH = Math.round(H * 0.60)
  const bl = await processRegion(SRC, { left: 0, top: H - blH, width: blW, height: blH }, bg)

  console.log('\nProcessing top-right (right 40% × top 50%)…')
  const trW = Math.round(W * 0.40), trH = Math.round(H * 0.50)
  const tr = await processRegion(SRC, { left: W - trW, top: 0, width: trW, height: trH }, bg)

  await writeFile(resolve(OUT, 'sprig-bl.png'), bl.png)
  await writeFile(resolve(OUT, 'sprig-bl.webp'), bl.webp)
  await writeFile(resolve(OUT, 'sprig-tr.png'), tr.png)
  await writeFile(resolve(OUT, 'sprig-tr.webp'), tr.webp)

  const kb = n => (n / 1024).toFixed(1)
  console.log(`\nsprig-bl.png  ${kb(bl.png.length)} KB    sprig-bl.webp  ${kb(bl.webp.length)} KB`)
  console.log(`sprig-tr.png  ${kb(tr.png.length)} KB    sprig-tr.webp  ${kb(tr.webp.length)} KB`)
  console.log(`Total WebP: ${kb(bl.webp.length + tr.webp.length)} KB (target < 120 KB)`)
  console.log('\nDone. Commit the four generated assets in public/decor/.')
}

run().catch(e => { console.error(e); process.exit(1) })
