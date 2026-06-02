#!/usr/bin/env node
/**
 * Quick fix for a single product image that failed during batch resize
 *
 * Run: node scripts/fix-single-image.js garment-kimono
 */

const sharp = require('sharp')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const productId = process.argv[2]

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

if (!productId) {
  console.error('❌ Usage: node scripts/fix-single-image.js <product-id>')
  console.error('   Example: node scripts/fix-single-image.js garment-kimono')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const TARGET_WIDTH = 1000
const TARGET_HEIGHT = 1250
const TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT

async function fixImage() {
  try {
    console.log(`🔧 Fixing image for: ${productId}`)

    // List files for this product
    const { data: allFiles } = await supabase.storage.from('product-images').list()
    const productFiles = allFiles.filter(f => f.name.startsWith(productId))

    if (productFiles.length === 0) {
      console.error(`❌ No files found for ${productId}`)
      process.exit(1)
    }

    console.log(`Found ${productFiles.length} file(s): ${productFiles.map(f => f.name).join(', ')}`)

    // Use the first file (usually the best quality)
    const sourceFile = productFiles[0]
    console.log(`Using source: ${sourceFile.name}`)

    // Download
    const { data, error: dlErr } = await supabase.storage
      .from('product-images')
      .download(sourceFile.name)

    if (dlErr) throw new Error(`Download failed: ${dlErr.message}`)

    const buffer = await data.arrayBuffer()
    const metadata = await sharp(buffer).metadata()
    const { width, height } = metadata

    console.log(`  Original: ${width}×${height}`)

    // Center-crop to 4:5
    const currentRatio = width / height
    let cropWidth = width
    let cropHeight = height

    if (currentRatio > TARGET_RATIO) {
      cropWidth = Math.round(height * TARGET_RATIO)
    } else if (currentRatio < TARGET_RATIO) {
      cropHeight = Math.round(width / TARGET_RATIO)
    }

    const cropLeft = Math.round((width - cropWidth) / 2)
    const cropTop = Math.round((height - cropHeight) / 2)

    console.log(`  Cropping to: ${cropWidth}×${cropHeight}`)

    // Resize and convert
    const resized = await sharp(buffer)
      .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
      .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: 'fill' })
      .webp({ quality: 85 })
      .toBuffer()

    console.log(`  Resized to: ${TARGET_WIDTH}×${TARGET_HEIGHT}`)

    // Upload as WebP
    const newFilename = `${productId}.webp`
    const { error: upErr } = await supabase.storage
      .from('product-images')
      .upload(newFilename, resized, { upsert: true, contentType: 'image/webp' })

    if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

    console.log(`  ✅ Uploaded as: ${newFilename}`)

    // Get public URL
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(newFilename)
    const imageUrl = urlData.publicUrl

    console.log(`\n📝 Update database with this SQL:`)
    console.log(`UPDATE products SET image = '${imageUrl}' WHERE id = '${productId}';`)
    console.log(`\n✅ Done! Copy and paste the SQL above into Supabase SQL Editor.`)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

fixImage()
