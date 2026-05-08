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

function isDesCryptHash(hash: string): boolean {
  return typeof hash === "string" && hash.length === 13 && /^[a-zA-Z0-9./]{13}$/.test(hash)
}

async function verifyDesCrypt(password: string, hash: string): Promise<boolean> {
  try {
    const { default: crypt } = await import("unix-crypt-td-js") as any
    return crypt(password, hash) === hash
  } catch {
    return false
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false
  try {
    if (isBcryptHash(hash)) {
      const normalizedHash = hash.startsWith("$2y$") ? "$2b$" + hash.slice(4) : hash
      return bcrypt.compare(password, normalizedHash)
    }
    if (hash.length === 32 && /^[a-f0-9]+$/.test(hash)) {
      return md5(password) === hash
    }
    if (isDesCryptHash(hash)) {
      return verifyDesCrypt(password, hash)
    }
    if (password === hash) return true
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
    } catch { }
  }
  return valid
}
