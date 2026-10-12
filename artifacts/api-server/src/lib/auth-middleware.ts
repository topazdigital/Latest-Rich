import { Request, Response, NextFunction } from "express"
import { verifyToken } from "./jwt"
import { db } from "@workspace/db"
import { usersTable } from "@workspace/db/schema"
import { eq } from "drizzle-orm"

declare global {
  namespace Express {
    interface Request {
      userId?: number
      user?: any
      clientIp?: string
    }
  }
}

// Throttle IP updates: only write once per 5 minutes per user to avoid per-request DB writes
const ipUpdateCache = new Map<number, number>()
const IP_UPDATE_INTERVAL = 5 * 60 * 1000

export const ACCOUNT_SUSPENDED_ERROR = "Account suspended. Contact support."
export const ACCOUNT_SUSPENDED_CODE = "ACCOUNT_SUSPENDED"

export type AccountAuthStatus = "active" | "banned" | "missing"

export async function getAccountAuthStatus(userId: number): Promise<AccountAuthStatus> {
  const [user] = await db.select({ id: usersTable.id, banned: usersTable.banned })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1)
  if (!user) return "missing"
  return user.banned === 1 ? "banned" : "active"
}

function extractIp(req: Request): string {
  return ((req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress || "")
    .split(",")[0].trim()
}

async function maybeUpdateIp(userId: number, ip: string) {
  if (!ip) return
  const last = ipUpdateCache.get(userId) || 0
  if (Date.now() - last < IP_UPDATE_INTERVAL) return
  ipUpdateCache.set(userId, Date.now())
  try {
    await db.update(usersTable).set({ lastIp: ip } as any).where(eq(usersTable.id, userId))
  } catch {
    // column may not exist yet on production — safe to ignore
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }
  const token = authHeader.slice(7)
  const payload = verifyToken(token)
  if (!payload?.userId) {
    res.status(401).json({ error: "Invalid token" })
    return
  }
  try {
    const accountStatus = await getAccountAuthStatus(payload.userId)
    if (accountStatus === "missing") {
      res.status(401).json({ error: "Invalid token" })
      return
    }
    if (accountStatus === "banned") {
      res.status(403).json({ error: ACCOUNT_SUSPENDED_ERROR, code: ACCOUNT_SUSPENDED_CODE })
      return
    }
  } catch (err) {
    console.error("[auth] Could not verify account status", err)
    res.status(503).json({ error: "Unable to verify account status. Please try again." })
    return
  }
  req.userId = payload.userId
  req.clientIp = extractIp(req)
  // Fire-and-forget IP update — does not block the request
  maybeUpdateIp(payload.userId, req.clientIp).catch(() => {})
  next()
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    const payload = verifyToken(token)
    if (payload?.userId) {
      try {
        const accountStatus = await getAccountAuthStatus(payload.userId)
        if (accountStatus === "missing") {
          res.status(401).json({ error: "Invalid token" })
          return
        }
        if (accountStatus === "banned") {
          res.status(403).json({ error: ACCOUNT_SUSPENDED_ERROR, code: ACCOUNT_SUSPENDED_CODE })
          return
        }
        req.userId = payload.userId
      } catch (err) {
        console.error("[auth] Could not verify optional account status", err)
        res.status(503).json({ error: "Unable to verify account status. Please try again." })
        return
      }
    }
  }
  next()
}
