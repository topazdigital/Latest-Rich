/**
 * Safe incremental migrations — run at startup.
 * Each statement is wrapped in try/catch so an already-applied column
 * doesn't crash the server (MySQL doesn't support IF NOT EXISTS for ADD COLUMN
 * in older versions; PG does but we guard both).
 */
import { pool, isMysql } from "@workspace/db"

export async function runMigrations() {
  try {
    if (isMysql) {
      // MySQL: catch the duplicate column error (code ER_DUP_FIELDNAME)
      await pool.execute(
        "ALTER TABLE users ADD COLUMN profile_video TEXT NOT NULL DEFAULT ''"
      ).catch((e: any) => {
        if (e?.code !== "ER_DUP_FIELDNAME") throw e
      })
    } else {
      // PostgreSQL: use IF NOT EXISTS (supported since PG 9.6)
      await pool.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_video TEXT NOT NULL DEFAULT ''"
      )
    }
  } catch (err) {
    // Non-fatal: log but don't crash startup
    console.warn("[db-migrate] profile_video migration skipped:", (err as any)?.message)
  }
}
