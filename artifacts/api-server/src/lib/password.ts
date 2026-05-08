import bcrypt from "bcrypt"
import crypto from "crypto"

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export function isBcryptHash(hash: string): boolean {
  return typeof hash === "string" && (hash.startsWith("$2b$") || hash.startsWith("$2a$") || hash.startsWith("$2y$"))
}

function md5(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex")
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false
  try {
    if (isBcryptHash(hash)) {
      // Normalize PHP's $2y$ prefix to $2b$ — identical algorithm, different prefix
      const normalizedHash = hash.startsWith("$2y$") ? "$2b$" + hash.slice(4) : hash
      return bcrypt.compare(password, normalizedHash)
    }
    // Legacy MD5 (common PHP dating scripts)
    if (hash.length === 32 && /^[a-f0-9]+$/.test(hash)) {
      return md5(password) === hash
    }
    // Legacy plain text passwords (stored as-is in old PHP system)
    if (password === hash) return true
    // MD5 with salt patterns
    if (md5(password) === hash) return true
    return false
  } catch {
    return false
  }
}

export async function verifyAndUpgrade(
  password: string,
  hash: string,
  onUpgrade: (newHash: string) => Promise<void>
): Promise<boolean> {
  const valid = await verifyPassword(password, hash)
  if (valid && !isBcryptHash(hash)) {
    try {
      const newHash = await hashPassword(password)
      await onUpgrade(newHash)
    } catch { /* non-blocking */ }
  }
  return valid
}
