#!/usr/bin/env node
/**
 * Batch compress all existing photos in assets/sources/uploads/ using sharp.
 *
 * Run on the production server (after pnpm install which installs sharp):
 *   node scripts/compress-old-photos.mjs
 *   node scripts/compress-old-photos.mjs --dry-run          # preview only
 *   node scripts/compress-old-photos.mjs --quality=80       # lower quality
 *   node scripts/compress-old-photos.mjs --max-size=1600    # larger max dimension
 *   node scripts/compress-old-photos.mjs --skip-kb=0        # compress everything
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const quality = parseInt(args.find(a => a.startsWith('--quality='))?.split('=')[1] ?? '85')
const maxSize = parseInt(args.find(a => a.startsWith('--max-size='))?.split('=')[1] ?? '1200')
const skipKb  = parseInt(args.find(a => a.startsWith('--skip-kb='))?.split('=')[1]  ?? '150')
const dryRun  = args.includes('--dry-run')

const uploadDirs = [
  path.join(rootDir, 'assets', 'sources', 'uploads'),
  path.join(rootDir, 'uploads'),
]

const COMPRESSIBLE = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'])

let total = 0, compressed = 0, skipped = 0, errors = 0, savedBytes = 0

function walkDir(dir) {
  if (!fs.existsSync(dir)) return []
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walkDir(full))
    else if (entry.isFile() && COMPRESSIBLE.has(path.extname(entry.name).toLowerCase())) {
      files.push(full)
    }
  }
  return files
}

async function compressFile(sharp, filePath) {
  total++
  const stat = fs.statSync(filePath)
  const sizeKb = stat.size / 1024

  if (sizeKb < skipKb) {
    skipped++
    return
  }

  if (dryRun) {
    console.log(`[DRY] ${path.relative(rootDir, filePath)}  (${Math.round(sizeKb)}KB)`)
    compressed++
    return
  }

  const tmp = filePath + '.compress_tmp'
  try {
    await sharp(filePath)
      .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, progressive: true })
      .toFile(tmp)

    const newStat = fs.statSync(tmp)
    if (newStat.size < stat.size) {
      // Rename .png/.webp/etc → .jpg since output is JPEG
      const ext = path.extname(filePath).toLowerCase()
      const finalPath = (ext === '.jpg' || ext === '.jpeg') ? filePath : filePath.replace(/\.[^.]+$/, '.jpg')
      fs.renameSync(tmp, finalPath)
      if (finalPath !== filePath) fs.unlinkSync(filePath)

      const saved = stat.size - newStat.size
      savedBytes += saved
      compressed++
      console.log(`✓  ${path.relative(rootDir, finalPath)}  ${Math.round(sizeKb)}KB → ${Math.round(newStat.size / 1024)}KB  (-${Math.round(saved / 1024)}KB)`)
    } else {
      fs.unlinkSync(tmp)
      skipped++
    }
  } catch (err) {
    if (fs.existsSync(tmp)) try { fs.unlinkSync(tmp) } catch {}
    console.error(`✗  ${path.relative(rootDir, filePath)}: ${err.message}`)
    errors++
  }
}

async function main() {
  let sharp
  try {
    const mod = await import('sharp')
    sharp = mod.default ?? mod
  } catch {
    console.error('Error: sharp is not installed. Run: pnpm install')
    process.exit(1)
  }

  console.log(`\nBatch photo compression${dryRun ? ' [DRY RUN]' : ''}`)
  console.log(`  Quality: ${quality}  Max dimension: ${maxSize}px  Skip if < ${skipKb}KB\n`)

  const allFiles = uploadDirs.flatMap(walkDir)
  console.log(`Found ${allFiles.length} images\n`)

  for (const file of allFiles) await compressFile(sharp, file)

  console.log(`\nDone: ${total} scanned, ${compressed} compressed, ${skipped} skipped, ${errors} errors`)
  if (!dryRun && savedBytes > 0) {
    console.log(`Total space saved: ${Math.round(savedBytes / 1024 / 1024 * 10) / 10} MB`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
