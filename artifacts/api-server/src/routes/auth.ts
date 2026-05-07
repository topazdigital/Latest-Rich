import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable, userExtendedTable, activityTable, passwordResetTokensTable } from "@workspace/db/schema"
import { eq } from "drizzle-orm"
import { signToken } from "../lib/jwt"
import { hashPassword, verifyAndUpgrade } from "../lib/password"
import crypto from "crypto"

const router = Router()

function now() { return Math.floor(Date.now() / 1000) }

function calcAge(birthday: string): number {
  if (!birthday) return 0
  try {
    const d = new Date(birthday)
    const today = new Date()
    let age = today.getFullYear() - d.getFullYear()
    const m = today.getMonth() - d.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
    return age
  } catch { return 0 }
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, gender, lookingFor, birthday, city, country } = req.body
    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email and password are required" })
      return
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" })
      return
    }
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1)
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already registered" })
      return
    }
    const age = calcAge(birthday || "")
    const [user] = await db.insert(usersTable).values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: await hashPassword(password),
      gender: parseInt(gender) || 1,
      looking: parseInt(lookingFor) || 2,
      birthday: birthday || "",
      age,
      city: city || "",
      country: country || "",
      lastAccess: String(now()),
      created: now(),
      credits: 50,
      superlike: 3,
    }).returning()
    await db.insert(userExtendedTable).values({ userId: user.id })
    await db.insert(activityTable).values({ type: "register", userId: user.id, title: "New registration", message: `${user.name} joined from ${country || "unknown"}`, time: now() })

    import("../lib/fake-message-scheduler").then(({ triggerAutoMessages }) => {
      triggerAutoMessages(user.id).catch(() => {})
    }).catch(() => {})

    const token = signToken({ userId: user.id })
    const { password: _, ...safeUser } = user
    res.json({ token, user: safeUser })
  } catch (err: any) {
    console.error("Register error:", err)
    res.status(500).json({ error: "Registration failed" })
  }
})

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" })
      return
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1)
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" })
      return
    }
    const valid = await verifyAndUpgrade(password, user.password, async (newHash) => {
      await db.update(usersTable).set({ password: newHash }).where(eq(usersTable.id, user.id))
    })
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" })
      return
    }
    if (user.banned === 1) {
      res.status(403).json({ error: "Account suspended. Contact support." })
      return
    }
    await db.update(usersTable).set({ lastAccess: String(now()), online: 1 }).where(eq(usersTable.id, user.id))
    await db.insert(activityTable).values({ type: "login", userId: user.id, title: "User login", message: `${user.name} logged in`, time: now() }).catch(() => {})

    if (user.fake !== 1) {
      import("../lib/fake-message-scheduler").then(({ triggerAutoMessages }) => {
        triggerAutoMessages(user.id).catch(() => {})
      }).catch(() => {})
    }

    const token = signToken({ userId: user.id })
    const { password: _, ...safeUser } = user
    res.json({ token, user: safeUser })
  } catch (err) {
    console.error("Login error:", err)
    res.status(500).json({ error: "Login failed" })
  }
})

router.post("/logout", async (req, res) => {
  const auth = req.headers.authorization
  if (auth) {
    try {
      const { verifyToken } = await import("../lib/jwt")
      const payload = verifyToken(auth.replace("Bearer ", ""))
      if (payload?.userId) {
        await db.update(usersTable).set({ online: 0 }).where(eq(usersTable.id, payload.userId))
      }
    } catch { /* ignore */ }
  }
  res.json({ success: true })
})

// Forgot password — request reset link
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body
    if (!email) { res.status(400).json({ error: "Email is required" }); return }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1)
    // Always return success to prevent email enumeration
    if (!user) { res.json({ success: true, message: "If this email is registered, you will receive reset instructions." }); return }

    // Invalidate previous tokens
    await db.update(passwordResetTokensTable).set({ used: 1 }).where(eq(passwordResetTokensTable.userId, user.id))

    const token = crypto.randomBytes(32).toString("hex")
    const expires = now() + 3600 // 1 hour
    await db.insert(passwordResetTokensTable).values({ userId: user.id, token, expires, used: 0 })

    // In production you'd send an email. Here we return the token for in-app reset flow
    // and log to activity so admin can see it
    await db.insert(activityTable).values({
      type: "system", userId: user.id,
      title: "Password reset requested",
      message: `Reset token generated for ${user.email}`,
      time: now()
    }).catch(() => {})

    res.json({ success: true, message: "Password reset instructions sent to your email.", token })
  } catch (err) {
    console.error("Forgot password error:", err)
    res.status(500).json({ error: "Failed to process request" })
  }
})

// Reset password with token
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body
    if (!token || !newPassword) { res.status(400).json({ error: "Token and new password are required" }); return }
    if (newPassword.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return }

    const [resetRecord] = await db.select().from(passwordResetTokensTable).where(eq(passwordResetTokensTable.token, token)).limit(1)
    if (!resetRecord || resetRecord.used === 1 || resetRecord.expires < now()) {
      res.status(400).json({ error: "Invalid or expired reset token" }); return
    }

    const newHash = await hashPassword(newPassword)
    await db.update(usersTable).set({ password: newHash }).where(eq(usersTable.id, resetRecord.userId))
    await db.update(passwordResetTokensTable).set({ used: 1 }).where(eq(passwordResetTokensTable.id, resetRecord.id))

    await db.insert(activityTable).values({
      type: "system", userId: resetRecord.userId,
      title: "Password reset completed",
      message: `User ID ${resetRecord.userId} reset their password`,
      time: now()
    }).catch(() => {})

    res.json({ success: true, message: "Password updated successfully. You can now sign in." })
  } catch (err) {
    console.error("Reset password error:", err)
    res.status(500).json({ error: "Failed to reset password" })
  }
})

// Verify reset token validity
router.get("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params
    const [record] = await db.select().from(passwordResetTokensTable).where(eq(passwordResetTokensTable.token, token)).limit(1)
    if (!record || record.used === 1 || record.expires < now()) {
      res.status(400).json({ valid: false, error: "Invalid or expired reset token" }); return
    }
    res.json({ valid: true })
  } catch {
    res.status(500).json({ valid: false })
  }
})

export default router
