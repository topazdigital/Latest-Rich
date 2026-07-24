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

export function requireAuth(req: Request, res: Response, next: NextFunction) {
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
  req.userId = payload.userId
  req.clientIp = extractIp(req)
  // Fire-and-forget IP update — does not block the request
  maybeUpdateIp(payload.userId, req.clientIp).catch(() => {})
  next()
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7)
    const payload = verifyToken(token)
    if (payload?.userId) req.userId = payload.userId
  }
  next()
}
