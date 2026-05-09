/**
 * Rich Dating Network — Import Likes from Old MySQL DB
 *
 * The old site may store "likes" as favourites, matches, or a custom table.
 * This script probes for common table names and imports whatever it finds
 * into the new `likes` table (matched by user ID).
 *
 * Run on the live server after migrate-old-to-new.sql:
 *   DATABASE_URL=mysql://admin_testdating:PASS@localhost/admin_testdating \
 *   OLD_DB_URL=mysql://admin_richdatingnetwork:PASS@localhost/admin_richdatingnetwork \
 *   node scripts/import-likes.mjs
 *
 * Or if both new and old data are in the same DB (after the SQL migration):
 *   DATABASE_URL=mysql://admin_testdating:PASS@localhost/admin_testdating \
 *   node scripts/import-likes.mjs
 */

import mysql from "mysql2/promise"

const NEW_DB_URL = process.env.DATABASE_URL
const OLD_DB_URL = process.env.OLD_DB_URL || process.env.DATABASE_URL

if (!NEW_DB_URL) {
  console.error("ERROR: DATABASE_URL is not set.")
  console.error("Usage: DATABASE_URL=mysql://user:pass@host/db node scripts/import-likes.mjs")
  process.exit(1)
}

console.log("Connecting to new DB...")
const newDb = await mysql.createConnection(NEW_DB_URL)
console.log("Connected to new DB.\n")

let oldDb = newDb
if (OLD_DB_URL && OLD_DB_URL !== NEW_DB_URL) {
  console.log("Connecting to old DB...")
  oldDb = await mysql.createConnection(OLD_DB_URL)
  console.log("Connected to old DB.\n")
}


// ─── Step 1: Detect which table holds likes/favourites ────────────────────────

const candidateTables = [
  { table: "favourites",  userCol: "user_id",  targetCol: "fav_id",      timeCol: "time" },
  { table: "favorites",   userCol: "user_id",  targetCol: "fav_id",      timeCol: "time" },
  { table: "favorites",   userCol: "uid",      targetCol: "target_id",   timeCol: "created" },
  { table: "favourites",  userCol: "uid",      targetCol: "target_id",   timeCol: "created" },
  { table: "likes",       userCol: "user_id",  targetCol: "target_id",   timeCol: "created" },
  { table: "user_likes",  userCol: "user_id",  targetCol: "liked_id",    timeCol: "time" },
  { table: "matches",     userCol: "user1_id", targetCol: "user2_id",    timeCol: "time" },
  { table: "old_likes",   userCol: "user_id",  targetCol: "target_id",   timeCol: "created" },
]

let sourceConfig = null

for (const cfg of candidateTables) {
  try {
    const [rows] = await oldDb.execute(
      `SELECT COUNT(*) AS cnt FROM \`${cfg.table}\` LIMIT 1`
    )
    if (rows[0].cnt >= 0) {
      sourceConfig = cfg
      console.log(`Found source table: \`${cfg.table}\` (${rows[0].cnt} rows)`)
      break
    }
  } catch {
    // table doesn't exist, try next
  }
}

if (!sourceConfig) {
  console.log("No known likes/favourites table found in the old DB.")
  console.log("Checked: " + candidateTables.map(c => c.table).join(", "))
  console.log("\nIf your old DB uses a different table name, add it to the candidateTables array in this script.")

  // As a fallback, infer likes from the old chat history:
  // if user A sent messages to user B, treat that as a "like"
  console.log("\nFallback: Inferring likes from chat message history (senders → recipients)...")
  await inferLikesFromChat(newDb, oldDb)
  await cleanup(newDb, oldDb)
  process.exit(0)
}


// ─── Step 2: Import rows from old likes/favourites table ─────────────────────

console.log(`\nImporting likes from \`${sourceConfig.table}\`...`)

const { table, userCol, targetCol, timeCol } = sourceConfig

const safeTime = timeCol ? `COALESCE(\`${timeCol}\`, UNIX_TIMESTAMP())` : "UNIX_TIMESTAMP()"

const [likeRows] = await oldDb.execute(`
  SELECT \`${userCol}\` AS user_id, \`${targetCol}\` AS target_id, ${safeTime} AS created
  FROM \`${table}\`
  WHERE \`${userCol}\` IS NOT NULL
    AND \`${targetCol}\` IS NOT NULL
    AND \`${userCol}\` > 0
    AND \`${targetCol}\` > 0
`)

console.log(`  Found ${likeRows.length} like records.`)

let inserted = 0
let skipped = 0

for (const row of likeRows) {
  try {
    await newDb.execute(
      `INSERT IGNORE INTO likes (user_id, target_id, superlike, created)
       VALUES (?, ?, 0, ?)`,
      [row.user_id, row.target_id, row.created || Math.floor(Date.now() / 1000)]
    )
    inserted++
  } catch {
    skipped++
  }
}

console.log(`  Inserted: ${inserted}`)
console.log(`  Skipped (duplicate/error): ${skipped}`)


// ─── Step 3: Summary ──────────────────────────────────────────────────────────

const [totalRows] = await newDb.execute("SELECT COUNT(*) AS cnt FROM likes")
console.log(`\nTotal likes in new DB: ${totalRows[0].cnt}`)

await cleanup(newDb, oldDb)
console.log("\nDone! Likes imported successfully.")


// ─── Helpers ──────────────────────────────────────────────────────────────────

async function inferLikesFromChat(newDb, oldDb) {
  // Find the old chat table name (old_chat or chat)
  let chatTable = null
  for (const t of ["old_chat", "chat"]) {
    try {
      await oldDb.execute(`SELECT 1 FROM \`${t}\` LIMIT 1`)
      chatTable = t
      break
    } catch { }
  }

  if (!chatTable) {
    console.log("  No chat table found for inference.")
    return
  }

  console.log(`  Using \`${chatTable}\` to infer likes...`)

  const [chatRows] = await oldDb.execute(`
    SELECT DISTINCT s_id AS user_id, r_id AS target_id, MIN(time) AS created
    FROM \`${chatTable}\`
    WHERE s_id > 0 AND r_id > 0
    GROUP BY s_id, r_id
  `)

  console.log(`  Found ${chatRows.length} chat-based like pairs.`)

  let inserted = 0
  for (const row of chatRows) {
    try {
      await newDb.execute(
        `INSERT IGNORE INTO likes (user_id, target_id, superlike, created)
         VALUES (?, ?, 0, ?)`,
        [row.user_id, row.target_id, row.created || Math.floor(Date.now() / 1000)]
      )
      inserted++
    } catch { }
  }

  const [totalRows] = await newDb.execute("SELECT COUNT(*) AS cnt FROM likes")
  console.log(`  Inserted: ${inserted} likes inferred from chat`)
  console.log(`  Total likes in new DB: ${totalRows[0].cnt}`)
}

async function cleanup(newDb, oldDb) {
  try { if (oldDb !== newDb) await oldDb.end() } catch { }
  try { await newDb.end() } catch { }
}
