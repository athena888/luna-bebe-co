#!/usr/bin/env node
/**
 * Batch resize all product images to 1000×1250px (4:5 aspect ratio)
 *
 * Run: node scripts/resize-product-images.js
 *
 * Requirements:
 * - npm install sharp
 * - .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Load env vars
require('dotenv').config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const TARGET_WIDTH = 1000
const TARGET_HEIGHT = 1250
const TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT // 0.8 = 4:5

async function resizeImage(buffer) {
  try {
    // Get image metadata
    const metadata = await sharp(buffer).metadata()
    const { width, height } = metadata

    // Calculate center-crop to 4:5 aspect ratio
    const currentRatio = width / height
    let cropWidth = width
    let cropHeight = height

    if (currentRatio > TARGET_RATIO) {
      // Too wide — crop width
      cropWidth = Math.round(height * TARGET_RATIO)
    } else if (currentRatio < TARGET_RATIO) {
      // Too tall — crop height
      cropHeight = Math.round(width / TARGET_RATIO)
    }

    const cropLeft = Math.round((width - cropWidth) / 2)
    const cropTop = Math.round((height - cropHeight) / 2)

    console.log(`  Original: ${width}×${height}, Cropping to: ${cropWidth}×${cropHeight}`)

    // Crop and resize
    return await sharp(buffer)
      .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
      .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: 'fill' })
      .webp({ quality: 85 })
      .toBuffer()
  } catch (err) {
    console.error(`  ❌ Resize failed:`, err.message)
    return null
  }
}

async function main() {
  console.log('🖼️  Product Image Standardizer')
  console.log(`Target: ${TARGET_WIDTH}×${TARGET_HEIGHT}px (4:5 aspect ratio)`)
  console.log('---')

  try {
    // List all files in bucket
    const { data: files, error: listErr } = await supabase.storage
      .from('product-images')
      .list()

    if (listErr) throw new Error(`List failed: ${listErr.message}`)

    const imageFiles = files.filter(f => !f.name.startsWith('.') && f.name.match(/\.(jpg|jpeg|png|webp)$/i))
    console.log(`Found ${imageFiles.length} product images\n`)

    let processed = 0
    let failed = 0
    const updatedUrls = {}

    for (const file of imageFiles) {
      try {
        console.log(`[${processed + failed + 1}/${imageFiles.length}] Processing: ${file.name}`)

        // Download
        const { data, error: dlErr } = await supabase.storage
          .from('product-images')
          .download(file.name)

        if (dlErr) throw new Error(`Download failed: ${dlErr.message}`)

        const buffer = await data.arrayBuffer()

        // Resize
        const resized = await resizeImage(Buffer.from(buffer))
        if (!resized) {
          failed++
          continue
        }

        // Generate new filename
        const productId = file.name.replace(/\.[^.]+$/, '').split('-').slice(0, -1).join('-') || file.name.split('.')[0]
        const newFilename = `${productId}.webp`

        // Upload
        const { error: upErr } = await supabase.storage
          .from('product-images')
          .upload(newFilename, resized, { upsert: true, contentType: 'image/webp' })

        if (upErr) throw new Error(`Upload failed: ${upErr.message}`)

        // Get public URL
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(newFilename)
        updatedUrls[productId] = urlData.publicUrl

        console.log(`  ✅ Resized and uploaded as: ${newFilename}`)
        processed++
      } catch (err) {
        console.error(`  ❌ Error: ${err.message}`)
        failed++
      }
    }

    console.log(`\n---`)
    console.log(`✅ Processed: ${processed}/${imageFiles.length}`)
    console.log(`❌ Failed: ${failed}/${imageFiles.length}`)

    if (processed > 0) {
      console.log(`\n📝 Next: Update product URLs in database`)
      console.log(`Modified URLs (${Object.keys(updatedUrls).length}):`)
      Object.entries(updatedUrls).forEach(([id, url]) => {
        console.log(`  ${id}: ${url}`)
      })
      console.log(`\nRun this SQL in Supabase dashboard to update:`)
      Object.entries(updatedUrls).forEach(([id, url]) => {
        console.log(`UPDATE products SET image = '${url}' WHERE id = '${id}';`)
      })
    }
  } catch (err) {
    console.error('❌ Fatal error:', err.message)
    process.exit(1)
  }
}

main()
