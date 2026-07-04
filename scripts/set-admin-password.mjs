/**
 * Rich Dating Network — Set Admin Password
 *
 * Sets a bcrypt password for any user in MySQL.
 * Run this on the test server inside the project folder.
 *
 * Usage:
 *   node scripts/set-admin-password.mjs <email> <new-password>
 *
 * Example:
 *   node scripts/set-admin-password.mjs patrickndungu.pnn@gmail.com "dj@Topaz27899310"
 *
 * Requires DATABASE_URL to be set, e.g.:
 *   DATABASE_URL=mysql://admin_testdating:EEhm0XRgtewBSUBditW7@localhost/admin_testdating \
 *     node scripts/set-admin-password.mjs patrickndungu.pnn@gmail.com "dj@Topaz27899310"
 */

import mysql from "mysql2/promise"
import bcrypt from "bcrypt"

const BCRYPT_ROUNDS = 12

const [,, email, newPassword] = process.argv

if (!email || !newPassword) {
  console.error("Usage: node scripts/set-admin-password.mjs <email> <new-password>")
  console.error("Example: node scripts/set-admin-password.mjs admin@example.com 'MyNewPass123'")
  process.exit(1)
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error("ERROR: DATABASE_URL is not set.")
  console.error("Example: DATABASE_URL=mysql://user:pass@localhost/dbname node scripts/set-admin-password.mjs ...")
  process.exit(1)
}

console.log(`Connecting to database...`)
const db = await mysql.createConnection(url)
console.log("Connected.\n")

// Find the user
const [rows] = await db.execute(
  "SELECT id, name, email, username, admin, fake, banned FROM users WHERE email = ? LIMIT 1",
  [email]
)

if (rows.length === 0) {
  console.error(`ERROR: No user found with email: ${email}`)
  await db.end()
  process.exit(1)
}

const user = rows[0]
console.log(`Found user:`)
console.log(`  ID       : ${user.id}`)
console.log(`  Name     : ${user.name}`)
console.log(`  Email    : ${user.email}`)
console.log(`  Username : ${user.username}`)
console.log(`  Admin    : ${user.admin}`)
console.log(`  Fake     : ${user.fake}`)
console.log(`  Banned   : ${user.banned}`)
console.log()

// Hash the new password
console.log(`Hashing new password with bcrypt (${BCRYPT_ROUNDS} rounds)...`)
const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)

// Update in DB
await db.execute(
  "UPDATE users SET password = ? WHERE id = ?",
  [hash, user.id]
)

console.log(`Password updated successfully for user #${user.id} (${user.email})`)
console.log(`New bcrypt hash: ${hash}`)
console.log()
console.log("You can now log in at richdatingnetwork.com with:")
console.log(`  Email   : ${email}`)
console.log(`  Password: ${newPassword}`)

await db.end()
