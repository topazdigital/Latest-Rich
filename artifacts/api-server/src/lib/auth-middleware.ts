import { Request, Response, NextFunction } from "express"
import { verifyToken } from "./jwt"

declare global {
  namespace Express {
    interface Request {
      userId?: number
      user?: any
    }
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
