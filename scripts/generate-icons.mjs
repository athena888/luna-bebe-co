import sharp from 'sharp'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')

// La Lumière Collective icon — dark background, gold circle, bold "L" mark
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- Background -->
  <rect width="100" height="100" fill="#383734"/>
  <!-- Outer gold ring -->
  <circle cx="50" cy="50" r="42" fill="none" stroke="#d4b97a" stroke-width="1.2"/>
  <!-- Inner subtle ring -->
  <circle cx="50" cy="50" r="36" fill="none" stroke="#d4b97a" stroke-width="0.4" opacity="0.5"/>
  <!-- Bold serif L — vertical stroke -->
  <rect x="33" y="26" width="7" height="40" fill="#d4b97a"/>
  <!-- Bold serif L — horizontal base -->
  <rect x="33" y="59" width="28" height="7" fill="#d4b97a"/>
  <!-- Small gold dot accent top-right quadrant -->
  <circle cx="64" cy="32" r="2.5" fill="#d4b97a" opacity="0.7"/>
</svg>`

const buf = Buffer.from(svg)

await sharp(buf).resize(192, 192).png().toFile(`${publicDir}/icon-192.png`)
console.log('✓  public/icon-192.png')

await sharp(buf).resize(512, 512).png().toFile(`${publicDir}/icon-512.png`)
console.log('✓  public/icon-512.png')

// Also generate apple-touch-icon (180×180)
await sharp(buf).resize(180, 180).png().toFile(`${publicDir}/apple-touch-icon.png`)
console.log('✓  public/apple-touch-icon.png')

// Favicon 32×32
await sharp(buf).resize(32, 32).png().toFile(`${publicDir}/favicon-32.png`)
console.log('✓  public/favicon-32.png')

console.log('\nAll icons generated.')
