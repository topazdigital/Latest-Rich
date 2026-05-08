/**
 * Rich Dating Network — Password Migration Script
 *
 * Reads every user from the MySQL database and bcrypt-hashes their
 * plaintext password. Run this ONCE after migrate-old-to-new.sql.
 *
 * Usage (on the server, inside the project folder):
 *   node scripts/hash-passwords.mjs
 *
 * Requires DATABASE_URL to be set in the environment, e.g.:
 *   DATABASE_URL=mysql://USER:PASS@localhost/admin_testdating node scripts/hash-passwords.mjs
 */

import mysql from "mysql2/promise"
import bcrypt from "bcrypt"

const BCRYPT_ROUNDS = 12
const BATCH_SIZE = 100

const url = process.env.DATABASE_URL
if (!url) {
  console.error("ERROR: DATABASE_URL environment variable is not set.")
  console.error("Usage: DATABASE_URL=mysql://user:pass@host/db node scripts/hash-passwords.mjs")
  process.exit(1)
}

console.log("Connecting to database...")
const db = await mysql.createConnection(url)
console.log("Connected.\n")

const [rows] = await db.execute(
  "SELECT id, password, pass FROM users ORDER BY id ASC"
)

console.log(`Found ${rows.length} users to process.\n`)

let hashed = 0
let skipped = 0
let noPassword = 0

for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  const batch = rows.slice(i, i + BATCH_SIZE)

  for (const user of batch) {
    const { id, password, pass } = user

    // Determine the best available plaintext password
    let plaintext = password

    // If the stored password is already a bcrypt hash, skip
    // Handles $2b$ (Node.js), $2a$ (older bcrypt), $2y$ (PHP bcrypt — all compatible)
    if (plaintext && (plaintext.startsWith("$2b$") || plaintext.startsWith("$2a$") || plaintext.startsWith("$2y$"))) {
      skipped++
      continue
    }

    // Skip placeholder values from old system
    if (!plaintext || plaintext === "**message**" || plaintext.trim() === "") {
      // Try falling back to the old DES-crypt hash column `pass`
      // DES-crypt hashes are 13 chars and start with a salt
      // We cannot reverse them — flag user to reset password
      if (pass && pass.length >= 8 && !pass.startsWith("$2")) {
        // Store as a marker so the app knows to force a reset
        await db.execute(
          "UPDATE users SET password = ? WHERE id = ?",
          [`NEEDS_RESET:${pass}`, id]
        )
        noPassword++
      } else {
        noPassword++
      }
      continue
    }

    try {
      const bcryptHash = await bcrypt.hash(plaintext, BCRYPT_ROUNDS)
      await db.execute(
        "UPDATE users SET password = ? WHERE id = ?",
        [bcryptHash, id]
      )
      hashed++
    } catch (err) {
      console.error(`Failed to hash password for user ${id}:`, err.message)
    }
  }

  const processed = Math.min(i + BATCH_SIZE, rows.length)
  process.stdout.write(`\rProgress: ${processed}/${rows.length} users processed...`)
}

console.log("\n")
console.log("=== Password Migration Complete ===")
console.log(`  Bcrypt hashed:   ${hashed}`)
console.log(`  Already hashed:  ${skipped}`)
console.log(`  Needs reset:     ${noPassword}  (old DES-crypt or missing password)`)
console.log("")
console.log("Users marked NEEDS_RESET will see a 'Reset your password' prompt on login.")
console.log("You can also manually reset them via the Admin Panel.")

await db.end()
