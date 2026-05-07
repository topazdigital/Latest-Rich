import jwt from "jsonwebtoken"

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required but not set")
  }
  return secret
}

export function signToken(payload: object): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "90d" })
}

export function verifyToken(token: string): any | null {
  try {
    return jwt.verify(token, getSecret())
  } catch {
    return null
  }
}
