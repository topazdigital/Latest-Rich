/**
 * Rich Dating Network — Photo Migration Script
 *
 * 1. Scans old_activity JSON for photo URLs → builds user→photo mapping
 * 2. Inserts rows into the `photos` table
 * 3. Updates users.photo and users.photo_thumb
 * 4. Fixes admin user password (bcrypt hashes all plaintext passwords)
 *
 * Run on the test server after migrate-old-to-new.sql:
 *   DATABASE_URL=mysql://admin_testdating:PASS@localhost/admin_testdating node scripts/migrate-photos.mjs
 */

import mysql from "mysql2/promise"
import bcrypt from "bcrypt"

const BCRYPT_ROUNDS = 12
const OLD_SITE_BASE = "http://richdatingnetwork.com/assets/sources/uploads/"
const NEW_PATH_BASE = "/assets/sources/uploads/"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("ERROR: DATABASE_URL environment variable is not set.")
  console.error("Usage: DATABASE_URL=mysql://user:pass@host/db node scripts/migrate-photos.mjs")
  process.exit(1)
}

console.log("Connecting to database...")
const db = await mysql.createConnection(url)
console.log("Connected.\n")

// ─── PHASE 1: Extract photo URLs from old_activity ───────────────────────────

console.log("Phase 1: Scanning old_activity for photo URLs...")

const [activityRows] = await db.execute(`
  SELECT uid, message, title
  FROM old_activity
  WHERE (message LIKE '%uploads/%' OR title LIKE '%uploads/%')
    AND uid IS NOT NULL AND uid > 0
  ORDER BY id DESC
`)

console.log(`  Found ${activityRows.length} activity rows with photo references.`)

// Map: userId → { photo, thumb }
const userPhotoMap = new Map()

for (const row of activityRows) {
  const uid = parseInt(row.uid)
  if (!uid || userPhotoMap.has(uid)) continue

  const combined = (row.message || "") + " " + (row.title || "")

  // Extract URL from JSON or plain text
  const urlMatch = combined.match(/https?:\/\/[^\s"']+\/uploads\/([^\s"'<>]+)/i)
  if (!urlMatch) continue

  const filename = urlMatch[1]
  const cleanFilename = filename.replace(/[?#].*$/, "").trim()
  if (!cleanFilename) continue

  // Determine if this is already a thumb or the full image
  const isThumb = cleanFilename.toLowerCase().startsWith("thumb_")
  const thumb = isThumb ? cleanFilename : `thumb_${cleanFilename}`
  const photo = isThumb ? cleanFilename.replace(/^thumb_/i, "") : cleanFilename

  userPhotoMap.set(uid, {
    photo: NEW_PATH_BASE + photo,
    thumb: NEW_PATH_BASE + thumb,
    filename: cleanFilename,
  })
}

console.log(`  Mapped photos for ${userPhotoMap.size} users from activity log.\n`)


// ─── PHASE 2: Also scan users_fake_messages and bio_url for photo hints ──────

console.log("Phase 2: Scanning users table bio_url for photo hints...")

const [bioRows] = await db.execute(`
  SELECT id, bio_url
  FROM users
  WHERE bio_url IS NOT NULL
    AND bio_url != ''
    AND bio_url != '**message**'
    AND bio_url LIKE '%uploads/%'
`)

console.log(`  Found ${bioRows.length} users with photo URL in bio_url.`)

for (const row of bioRows) {
  const uid = parseInt(row.id)
  if (userPhotoMap.has(uid)) continue

  try {
    const data = JSON.parse(row.bio_url)
    const photoUrl = data?.photo || data?.image || data?.src || null
    if (!photoUrl) continue

    const urlMatch = photoUrl.match(/uploads\/([^\s"'<>?#]+)/)
    if (!urlMatch) continue

    const cleanFilename = urlMatch[1].trim()
    const isThumb = cleanFilename.toLowerCase().startsWith("thumb_")
    const thumb = isThumb ? cleanFilename : `thumb_${cleanFilename}`
    const photo = isThumb ? cleanFilename.replace(/^thumb_/i, "") : cleanFilename

    userPhotoMap.set(uid, {
      photo: NEW_PATH_BASE + photo,
      thumb: NEW_PATH_BASE + thumb,
      filename: cleanFilename,
    })
  } catch {
    // bio_url might be a plain URL, not JSON
    const urlMatch = row.bio_url.match(/uploads\/([^\s"'<>?#]+)/)
    if (!urlMatch) continue

    const cleanFilename = urlMatch[1].trim()
    const isThumb = cleanFilename.toLowerCase().startsWith("thumb_")
    const thumb = isThumb ? cleanFilename : `thumb_${cleanFilename}`
    const photo = isThumb ? cleanFilename.replace(/^thumb_/i, "") : cleanFilename

    userPhotoMap.set(uid, {
      photo: NEW_PATH_BASE + photo,
      thumb: NEW_PATH_BASE + thumb,
      filename: cleanFilename,
    })
  }
}

console.log(`  Total users with mapped photos: ${userPhotoMap.size}\n`)


// ─── PHASE 3: Insert into photos table + update users.photo ──────────────────

console.log("Phase 3: Inserting into photos table and updating users...")

let photosInserted = 0
let usersUpdated = 0

for (const [uid, data] of userPhotoMap) {
  const now = Math.floor(Date.now() / 1000)

  // Check user exists
  const [userCheck] = await db.execute("SELECT id FROM users WHERE id = ?", [uid])
  if (userCheck.length === 0) continue

  // Check if photo already exists for this user
  const [existing] = await db.execute(
    "SELECT id FROM photos WHERE user_id = ? AND main = 1 LIMIT 1",
    [uid]
  )

  if (existing.length === 0) {
    await db.execute(
      "INSERT IGNORE INTO photos (user_id, photo, thumb, approved, main, created) VALUES (?, ?, ?, 1, 1, ?)",
      [uid, data.photo, data.thumb, now]
    )
    photosInserted++
  }

  // Update users.photo and users.photo_thumb
  await db.execute(
    "UPDATE users SET photo = ?, photo_thumb = ? WHERE id = ? AND (photo IS NULL OR photo = '')",
    [data.photo, data.thumb, uid]
  )
  usersUpdated++
}

console.log(`  Photos inserted: ${photosInserted}`)
console.log(`  Users updated:   ${usersUpdated}\n`)


// ─── PHASE 4: Hash all remaining plaintext passwords ─────────────────────────

console.log("Phase 4: Hashing plaintext passwords...")

const [users] = await db.execute(
  "SELECT id, password, pass, admin, username FROM users ORDER BY id ASC"
)

let hashed = 0
let skipped = 0
let noPassword = 0

for (const user of users) {
  const { id, password, pass } = user
  let plaintext = password

  // Skip if already bcrypt hashed ($2b$ Node.js, $2a$ older, $2y$ PHP — all compatible)
  if (plaintext && (plaintext.startsWith("$2b$") || plaintext.startsWith("$2a$") || plaintext.startsWith("$2y$"))) {
    skipped++
    continue
  }

  // Skip obvious non-passwords
  if (!plaintext || plaintext === "**message**" || plaintext.trim() === "") {
    if (pass && pass.length >= 8 && !pass.startsWith("$2")) {
      await db.execute(
        "UPDATE users SET password = ? WHERE id = ?",
        [`NEEDS_RESET:${pass}`, id]
      )
    }
    noPassword++
    continue
  }

  const bcryptHash = await bcrypt.hash(plaintext, BCRYPT_ROUNDS)
  await db.execute("UPDATE users SET password = ? WHERE id = ?", [bcryptHash, id])
  hashed++

  if (hashed % 100 === 0) {
    process.stdout.write(`\r  Hashing passwords: ${hashed} done...`)
  }
}

console.log(`\n  Bcrypt hashed:   ${hashed}`)
console.log(`  Already hashed:  ${skipped}`)
console.log(`  Needs reset:     ${noPassword}\n`)


// ─── PHASE 5: Ensure admin user (ID 1) has admin=2 ───────────────────────────

console.log("Phase 5: Verifying admin roles...")

const [adminUsers] = await db.execute(
  "SELECT id, name, email, username, admin, fake, password FROM users WHERE admin >= 1 ORDER BY admin DESC"
)

console.log(`  Admin/moderator accounts:`)
for (const u of adminUsers) {
  const roleLabel = u.admin >= 2 ? "ADMIN" : "MODERATOR"
  console.log(`    [${roleLabel}] #${u.id} ${u.username || u.name} <${u.email}>`)
}

// Make sure user ID 1 is admin level 2
await db.execute(
  "UPDATE users SET admin = 2 WHERE id = 1 AND admin < 2"
)

// Any other old admin=1 non-fake users should be admin=2
await db.execute(
  "UPDATE users SET admin = 2 WHERE admin = 1 AND fake = 0"
)

const [updatedAdmins] = await db.execute(
  "SELECT id, name, email, username, admin FROM users WHERE admin >= 2"
)

console.log(`\n  Final admin accounts (level 2):`)
for (const u of updatedAdmins) {
  console.log(`    #${u.id} ${u.username || u.name} <${u.email}> — admin=${u.admin}`)
}


// ─── PHASE 6: Preserve user roles (moderators stay as 1, admins stay as 2) ────

console.log("\nPhase 6: Checking moderator accounts...")

const [mods] = await db.execute(
  "SELECT id, name, email, username, admin FROM users WHERE admin = 1"
)
if (mods.length > 0) {
  console.log(`  Moderator accounts:`)
  for (const u of mods) {
    console.log(`    #${u.id} ${u.username || u.name} <${u.email}>`)
  }
} else {
  console.log("  No moderator accounts found.")
}


// ─── DONE ─────────────────────────────────────────────────────────────────────

await db.end()

console.log("\n====================================")
console.log("  Photo & Password Migration Done!")
console.log("====================================")
console.log(`  Photos linked: ${photosInserted}`)
console.log(`  Passwords hashed: ${hashed}`)
console.log("")
console.log("Next: Copy the uploads folder then test logging in at richdatingnetwork.com")
