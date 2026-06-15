import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import * as pgSchemaModule from "./schema/pg"
import * as mysqlSchemaModule from "./schema/mysql"

// Auto-load .env before reading DATABASE_URL.
// This runs before any top-level code that reads env vars,
// so PM2 does not need DATABASE_URL pre-configured.
function loadEnv() {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
    resolve(process.cwd(), "../../../.env"),
  ]
  for (const p of candidates) {
    if (!existsSync(p)) continue
    for (const raw of readFileSync(p, "utf8").split("\n")) {
      const line = raw.trim()
      if (!line || line.startsWith("#") || !line.includes("=")) continue
      const eqIdx = line.indexOf("=")
      const key = line.slice(0, eqIdx).trim()
      let val = line.slice(eqIdx + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) val = val.slice(1, -1)
      process.env[key] = val
    }
    break
  }
}
loadEnv()

const url = process.env.DATABASE_URL || ""
export const isMysql = url.startsWith("mysql://") || url.startsWith("mysql2://")

if (!isMysql && !url) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?")
}

let _db: any
let _pool: any

if (isMysql) {
  const { createPool } = (await import("mysql2/promise"))
  const { drizzle } = (await import("drizzle-orm/mysql2"))
  _pool = createPool(url)
  _db = drizzle(_pool, { schema: mysqlSchemaModule, mode: "default" })
} else {
  const pgMod = await import("pg")
  const PgPool = (pgMod as any).default?.Pool ?? pgMod.Pool
  const { drizzle } = await import("drizzle-orm/node-postgres")
  _pool = new PgPool({ connectionString: url })
  _db = drizzle(_pool, { schema: pgSchemaModule })
}

export const db: any = _db
export const pool: any = _pool

// Active schema based on adapter
const schema = isMysql ? mysqlSchemaModule : pgSchemaModule

export const usersTable = schema.usersTable
export const userExtendedTable = schema.userExtendedTable
export const photosTable = schema.photosTable
export const likesTable = schema.likesTable
export const messagesTable = schema.messagesTable
export const feedTable = schema.feedTable
export const feedLikesTable = schema.feedLikesTable
export const notificationsTable = schema.notificationsTable
export const ordersTable = schema.ordersTable
export const storiesTable = schema.storiesTable
export const fakeMessageTemplatesTable = schema.fakeMessageTemplatesTable
export const userVisitsTable = schema.userVisitsTable
export const giftsTable = schema.giftsTable
export const userGiftsTable = schema.userGiftsTable
export const siteConfigTable = schema.siteConfigTable
export const activityTable = schema.activityTable
export const autoMessageLogTable = schema.autoMessageLogTable
export const blockedUsersTable = schema.blockedUsersTable
export const reportedUsersTable = schema.reportedUsersTable
export const passwordResetTokensTable = schema.passwordResetTokensTable
export const emailVerificationsTable = schema.emailVerificationsTable
export const profileBoostsTable = schema.profileBoostsTable
export const fakeVideoCallsTable = schema.fakeVideoCallsTable
export const customPaymentsTable = schema.customPaymentsTable
export const customPaymentOrdersTable = schema.customPaymentOrdersTable
export const chatLocksTable = schema.chatLocksTable
export const pushSubscriptionsTable = schema.pushSubscriptionsTable
export const referralsTable = (schema as any).referralsTable

export const insertUserSchema = schema.insertUserSchema
export const insertMessageSchema = schema.insertMessageSchema
export const insertLikeSchema = schema.insertLikeSchema
export const insertFeedSchema = schema.insertFeedSchema
export const insertNotificationSchema = schema.insertNotificationSchema

export type User = typeof pgSchemaModule.usersTable.$inferSelect
export type Message = typeof pgSchemaModule.messagesTable.$inferSelect
export type Like = typeof pgSchemaModule.likesTable.$inferSelect
export type Feed = typeof pgSchemaModule.feedTable.$inferSelect
export type Notification = typeof pgSchemaModule.notificationsTable.$inferSelect
export type Order = typeof pgSchemaModule.ordersTable.$inferSelect
export type Photo = typeof pgSchemaModule.photosTable.$inferSelect
export type ProfileBoost = typeof pgSchemaModule.profileBoostsTable.$inferSelect
