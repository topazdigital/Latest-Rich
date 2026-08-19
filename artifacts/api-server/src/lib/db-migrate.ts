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
    const statements = isMysql ? [
      "CREATE TABLE IF NOT EXISTS engagement_daily (id int unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY, user_id int NOT NULL, day_key varchar(20) NOT NULL, match_user_id int NOT NULL DEFAULT 0, liked_reveal_until int NOT NULL DEFAULT 0, streak_days int NOT NULL DEFAULT 1, reward_credits int NOT NULL DEFAULT 0, created_at int NOT NULL DEFAULT 0)",
      "CREATE TABLE IF NOT EXISTS engagement_reactions (id int unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY, from_id int NOT NULL, to_id int NOT NULL, type varchar(20) NOT NULL, time int NOT NULL DEFAULT 0)",
      "CREATE TABLE IF NOT EXISTS engagement_feedback (id int unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY, user_id int NOT NULL, rating int NOT NULL, comment text, prompt varchar(255), trigger varchar(50), status varchar(20) NOT NULL DEFAULT 'new', admin_note text, created_at int NOT NULL DEFAULT 0, resolved_at int NOT NULL DEFAULT 0)",
      "CREATE TABLE IF NOT EXISTS engagement_events (id int unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY, title varchar(255) NOT NULL, description text, image text, ticket_price decimal(10,2) NOT NULL DEFAULT 1.00, active tinyint NOT NULL DEFAULT 1, starts_at int NOT NULL DEFAULT 0, capacity int NOT NULL DEFAULT 0)",
      "CREATE TABLE IF NOT EXISTS video_call_sessions (id int unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY, caller_id int NOT NULL, callee_id int NOT NULL, status varchar(20) NOT NULL DEFAULT 'ringing', created_at int NOT NULL DEFAULT 0, connected_at int NOT NULL DEFAULT 0, ended_at int NOT NULL DEFAULT 0, billed_minutes int NOT NULL DEFAULT 0, credits_charged int NOT NULL DEFAULT 0, end_reason varchar(80) NOT NULL DEFAULT '')",
    ] : [
      "CREATE TABLE IF NOT EXISTS engagement_daily (id serial PRIMARY KEY, user_id integer NOT NULL, day_key text NOT NULL, match_user_id integer DEFAULT 0, liked_reveal_until integer DEFAULT 0, streak_days integer DEFAULT 1, reward_credits integer DEFAULT 0, created_at integer DEFAULT 0)",
      "CREATE TABLE IF NOT EXISTS engagement_reactions (id serial PRIMARY KEY, from_id integer NOT NULL, to_id integer NOT NULL, type text NOT NULL, time integer DEFAULT 0)",
      "CREATE TABLE IF NOT EXISTS engagement_feedback (id serial PRIMARY KEY, user_id integer NOT NULL, rating integer NOT NULL, comment text, prompt text, trigger text, status text DEFAULT 'new', admin_note text, created_at integer DEFAULT 0, resolved_at integer DEFAULT 0)",
      "CREATE TABLE IF NOT EXISTS engagement_events (id serial PRIMARY KEY, title text NOT NULL, description text, image text, ticket_price real DEFAULT 1, active integer DEFAULT 1, starts_at integer DEFAULT 0, capacity integer DEFAULT 0)",
      "CREATE TABLE IF NOT EXISTS video_call_sessions (id serial PRIMARY KEY, caller_id integer NOT NULL, callee_id integer NOT NULL, status text NOT NULL DEFAULT 'ringing', created_at integer NOT NULL DEFAULT 0, connected_at integer NOT NULL DEFAULT 0, ended_at integer NOT NULL DEFAULT 0, billed_minutes integer NOT NULL DEFAULT 0, credits_charged integer NOT NULL DEFAULT 0, end_reason text NOT NULL DEFAULT '')",
    ]
    for (const statement of statements) {
      if (isMysql) await pool.execute(statement)
      else await pool.query(statement)
    }
    if (isMysql) {
      await pool.execute("ALTER TABLE engagement_daily ADD UNIQUE KEY uq_engagement_daily_user_day (user_id, day_key)").catch((e: any) => {
        if (!["ER_DUP_KEYNAME", "ER_DUP_ENTRY"].includes(e?.code)) throw e
      })
    } else {
      await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS uq_engagement_daily_user_day ON engagement_daily (user_id, day_key)")
    }
  } catch (err) {
    // Non-fatal: log but don't crash startup
    console.warn("[db-migrate] profile_video migration skipped:", (err as any)?.message)
  }
}
