import { createHash, randomBytes } from "crypto"

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = createHash("sha256").update(salt + password).digest("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":")
    const expected = createHash("sha256").update(salt + password).digest("hex")
    return hash === expected
  } catch {
    return false
  }
}
