/**
 * Rich Dating Network — Legacy Photo Import
 *
 * Idempotent: safe to run multiple times.
 * Links photos that already exist in assets/sources/uploads/ to user profiles.
 *
 * Phase 1: users.photo → photos table (main profile photo for each user)
 * Phase 2: old_photo_comments → photos table (additional album photos)
 * Phase 3: Print summary
 *
 * Run on production server:
 *   node scripts/import-legacy-photos.mjs
 */

import mysql from "mysql2/promise"
import { readFileSync, existsSync } from "fs"
import { resolve, join } from "path"

// ── Load DATABASE_URL from .env if not already set ────────────────────────────
if (!process.env.DATABASE_URL) {
  const envPath = resolve(process.cwd(), ".env")
  if (existsSync(envPath)) {
    const env = readFileSync(envPath, "utf8")
    for (const line of env.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "").trim()
    }
  }
}

const url = process.env.DATABASE_URL
if (!url || !url.includes("mysql")) {
  console.log("Skipping: no MySQL DATABASE_URL found (PostgreSQL dev env).")
  process.exit(0)
}

console.log("Connecting to MySQL...")
const db = await mysql.createConnection(url)
console.log("Connected.\n")

const now = Math.floor(Date.now() / 1000)

// ── PHASE 1: users.photo → photos table ──────────────────────────────────────
console.log("Phase 1: Linking users.photo to photos table...")

const [usersWithPhotos] = await db.execute(`
  SELECT id, photo, photo_thumb
  FROM users
  WHERE photo IS NOT NULL AND photo != ''
    AND banned = 0
`)

console.log(`  Found ${usersWithPhotos.length} users with a photo set.`)

let p1Inserted = 0
let p1Skipped = 0

for (const u of usersWithPhotos) {
  const [existing] = await db.execute(
    "SELECT id FROM photos WHERE user_id = ? AND main = 1 LIMIT 1",
    [u.id]
  )
  if (existing.length > 0) { p1Skipped++; continue }

  const thumb = u.photo_thumb && u.photo_thumb !== "" ? u.photo_thumb : u.photo

  await db.execute(
    `INSERT IGNORE INTO photos (user_id, photo, thumb, approved, flagged, main, created)
     VALUES (?, ?, ?, 1, 0, 1, ?)`,
    [u.id, u.photo, thumb, now]
  )
  p1Inserted++

  if ((p1Inserted + p1Skipped) % 500 === 0) {
    process.stdout.write(`\r  Progress: ${p1Inserted + p1Skipped}/${usersWithPhotos.length}...`)
  }
}

console.log(`\n  Inserted main photos: ${p1Inserted}`)
console.log(`  Already had entry:   ${p1Skipped}\n`)

// ── PHASE 2: old_photo_comments → photos table (album photos) ────────────────
console.log("Phase 2: Importing additional photos from old_photo_comments...")

try {
  const [cols] = await db.execute("SHOW COLUMNS FROM old_photo_comments")
  const colNames = cols.map(c => c.Field.toLowerCase())
  console.log(`  Columns found: ${colNames.join(", ")}`)

  // Detect user ID column
  const uidCol = colNames.find(c => ["uid", "user_id", "userid", "u_id"].includes(c))
  // Detect photo column
  const photoCol = colNames.find(c => ["photo", "filename", "file", "image", "photo_url", "url"].includes(c))
  // Detect thumb column (optional)
  const thumbCol = colNames.find(c => ["thumb", "thumbnail", "photo_thumb"].includes(c))

  if (!uidCol || !photoCol) {
    console.log("  Cannot find user_id or photo column — skipping phase 2.\n")
  } else {
    console.log(`  Using columns: uid=${uidCol}, photo=${photoCol}${thumbCol ? `, thumb=${thumbCol}` : ""}`)

    const [oldPhotos] = await db.execute(`
      SELECT \`${uidCol}\` AS uid,
             \`${photoCol}\` AS photo
             ${thumbCol ? `, \`${thumbCol}\` AS thumb` : ""}
      FROM old_photo_comments
      WHERE \`${uidCol}\` > 0
        AND \`${photoCol}\` IS NOT NULL
        AND \`${photoCol}\` != ''
      LIMIT 100000
    `)

    console.log(`  Found ${oldPhotos.length} photo records.`)

    let p2Inserted = 0
    let p2Skipped = 0

    for (const row of oldPhotos) {
      const uid = parseInt(row.uid)
      if (!uid) continue

      // Verify user exists
      const [userCheck] = await db.execute("SELECT id FROM users WHERE id = ? LIMIT 1", [uid])
      if (!userCheck.length) continue

      // Check if this exact photo path already exists
      const [dupCheck] = await db.execute(
        "SELECT id FROM photos WHERE user_id = ? AND photo = ? LIMIT 1",
        [uid, row.photo]
      )
      if (dupCheck.length > 0) { p2Skipped++; continue }

      // Is this the first photo for this user?
      const [mainCheck] = await db.execute(
        "SELECT id FROM photos WHERE user_id = ? AND main = 1 LIMIT 1",
        [uid]
      )
      const isMain = mainCheck.length === 0 ? 1 : 0
      const thumb = row.thumb || row.photo

      await db.execute(
        `INSERT IGNORE INTO photos (user_id, photo, thumb, approved, flagged, main, created)
         VALUES (?, ?, ?, 1, 0, ?, ?)`,
        [uid, row.photo, thumb, isMain, now]
      )

      // Also update users.photo if this is becoming their first photo
      if (isMain === 1) {
        await db.execute(
          "UPDATE users SET photo = ?, photo_thumb = ? WHERE id = ? AND (photo IS NULL OR photo = '')",
          [row.photo, thumb, uid]
        )
      }

      p2Inserted++
      if ((p2Inserted + p2Skipped) % 1000 === 0) {
        process.stdout.write(`\r  Progress: ${p2Inserted + p2Skipped}/${oldPhotos.length}...`)
      }
    }

    console.log(`\n  Imported: ${p2Inserted}, Already existed: ${p2Skipped}\n`)
  }
} catch (e) {
  console.log(`  old_photo_comments table not found or error — skipping. (${e.message})\n`)
}

// ── PHASE 3: Summary ─────────────────────────────────────────────────────────
const [[{ c: totalPhotos }]] = await db.execute("SELECT COUNT(*) as c FROM photos")
const [[{ c: usersWithMain }]] = await db.execute("SELECT COUNT(DISTINCT user_id) as c FROM photos WHERE main = 1")
const [[{ c: realUsersNoPhoto }]] = await db.execute(
  "SELECT COUNT(*) as c FROM users WHERE (photo IS NULL OR photo = '') AND fake = 0 AND banned = 0"
)

console.log("==========================================")
console.log("  Photo Import Complete")
console.log("==========================================")
console.log(`  Total photos in table:     ${totalPhotos}`)
console.log(`  Users with main photo:     ${usersWithMain}`)
console.log(`  Real users still no photo: ${realUsersNoPhoto}`)
console.log("")

await db.end()
