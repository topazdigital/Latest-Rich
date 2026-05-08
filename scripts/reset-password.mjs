#!/usr/bin/env node
/**
 * Reset a user's password in the database.
 * Run from the project root:
 *   node scripts/reset-password.mjs <email> <newPassword>
 *
 * Example:
 *   node scripts/reset-password.mjs patrickndungu.pnn@gmail.com dj@Topaz27899310
 *
 * DATABASE_URL is auto-loaded from .env if present.
 */
import { readFileSync, existsSync } from "fs"
import { createPool } from "mysql2/promise"

// Auto-load .env file if it exists (no dotenv dependency needed)
function loadDotEnv(path = ".env") {
  if (!existsSync(path)) return
  const lines = readFileSync(path, "utf8").split("\n")
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith("#") || !line.includes("=")) continue
    const eqIdx = line.indexOf("=")
    const key = line.slice(0, eqIdx).trim()
    let val = line.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadDotEnv()

const [,, email, newPassword] = process.argv

if (!email || !newPassword) {
  console.error("Usage: node scripts/reset-password.mjs <email> <newPassword>")
  process.exit(1)
}

if (newPassword.length < 6) {
  console.error("Password must be at least 6 characters")
  process.exit(1)
}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not found. Make sure .env exists in the current directory.")
  process.exit(1)
}

// Dynamically import bcrypt
let bcrypt
try {
  bcrypt = (await import("bcrypt")).default
} catch {
  console.error("Could not load bcrypt — make sure pnpm install has been run")
  process.exit(1)
}

const isMysql = DATABASE_URL.startsWith("mysql://") || DATABASE_URL.startsWith("mysql2://")

async function run() {
  if (isMysql) {
    const pool = createPool(DATABASE_URL)
    const [rows] = await pool.query("SELECT id, email, name FROM users WHERE email = ? LIMIT 1", [email.toLowerCase()])
    if (!Array.isArray(rows) || !rows.length) {
      console.error(`No user found with email: ${email}`)
      await pool.end()
      process.exit(1)
    }
    const user = rows[0]
    const hash = await bcrypt.hash(newPassword, 12)
    await pool.query("UPDATE users SET `password` = ?, `pass` = ? WHERE id = ?", [hash, newPassword, user.id])
    await pool.end()
    console.log(`✅ Password reset for: ${user.name} <${user.email}> (id=${user.id})`)
    console.log(`   You can now login with: ${email} / ${newPassword}`)
  } else {
    const pg = await import("pg")
    const Pool = pg.default?.Pool ?? pg.Pool
    const pool = new Pool({ connectionString: DATABASE_URL })
    const { rows } = await pool.query("SELECT id, email, name FROM users WHERE email = $1 LIMIT 1", [email.toLowerCase()])
    if (!rows.length) {
      console.error(`No user found with email: ${email}`)
      await pool.end()
      process.exit(1)
    }
    const user = rows[0]
    const hash = await bcrypt.hash(newPassword, 12)
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hash, user.id])
    await pool.end()
    console.log(`✅ Password reset for: ${user.name} <${user.email}> (id=${user.id})`)
    console.log(`   You can now login with: ${email} / ${newPassword}`)
  }
}

run().catch(err => {
  console.error("Error:", err.message)
  process.exit(1)
})
