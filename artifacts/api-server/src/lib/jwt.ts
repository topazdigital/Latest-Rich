import jwt from "jsonwebtoken"

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production")
  }
  // Development-only fallback — never used in production
  return "dev-only-insecure-jwt-secret-change-in-production"
}

export function signToken(payload: object): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "90d" })
}

export function verifyToken(token: string): jwt.JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret())
    return typeof decoded === "object" ? decoded : null
  } catch {
    return null
  }
}
