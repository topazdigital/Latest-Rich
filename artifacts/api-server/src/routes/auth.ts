import { Router } from "express"
import { db } from "@workspace/db"
import {
  usersTable, userExtendedTable, activityTable,
  passwordResetTokensTable, emailVerificationsTable, siteConfigTable
} from "@workspace/db/schema"
import { eq, or } from "drizzle-orm"
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

async function getConfig(key: string): Promise<string> {
  try {
    const rows = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
    return rows[0]?.value || ""
  } catch { return "" }
}

function getSiteUrl(req: any): string {
  return process.env.APP_URL ||
    (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : `${req.protocol}://${req.get("host")}`)
}

function sanitizeUsername(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_\.]/g, "").slice(0, 30)
}

// Check availability of username, email, or phone
router.get("/check-availability", async (req, res) => {
  try {
    const { field, value } = req.query as { field: string; value: string }
    if (!field || !value) { res.json({ available: false }); return }

    if (field === "email") {
      const rows = await db.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.email, value.toLowerCase().trim())).limit(1)
      res.json({ available: rows.length === 0 })
    } else if (field === "username") {
      const clean = sanitizeUsername(value)
      if (clean.length < 3) { res.json({ available: false, reason: "min 3 chars" }); return }
      const rows = await db.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.username, clean)).limit(1)
      res.json({ available: rows.length === 0, cleaned: clean })
    } else if (field === "phone") {
      const phone = value.replace(/\s/g, "")
      const rows = await db.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.phone, phone)).limit(1)
      res.json({ available: rows.length === 0 })
    } else {
      res.json({ available: false })
    }
  } catch (err) {
    res.json({ available: false })
  }
})

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, username, phone, gender, lookingFor, birthday, city, country, countryCode } = req.body
    if (!name || !email || !password) {
      res.status(400).json({ error: "Name, email and password are required" })
      return
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" })
      return
    }
    if (!username || username.trim().length < 3) {
      res.status(400).json({ error: "Username is required (min 3 characters)" })
      return
    }
    if (!phone || phone.replace(/[\s+\-()]/g, "").length < 7) {
      res.status(400).json({ error: "Phone number is required" })
      return
    }

    // 18+ enforcement
    if (birthday) {
      const age = calcAge(birthday)
      if (age < 18) {
        res.status(400).json({ error: "You must be 18 or older to register" })
        return
      }
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1)
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already registered" })
      return
    }

    // Validate username if provided
    let cleanUsername: string | null = null
    if (username) {
      cleanUsername = sanitizeUsername(username)
      if (cleanUsername.length < 3) {
        res.status(400).json({ error: "Username must be at least 3 characters" })
        return
      }
      const existingUsername = await db.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.username, cleanUsername)).limit(1)
      if (existingUsername.length > 0) {
        res.status(400).json({ error: "Username already taken" })
        return
      }
    }

    // Validate phone if provided
    let cleanPhone = ""
    if (phone) {
      cleanPhone = phone.replace(/\s/g, "")
      const existingPhone = await db.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.phone, cleanPhone)).limit(1)
      if (existingPhone.length > 0) {
        res.status(400).json({ error: "Phone number already registered" })
        return
      }
    }

    const age = calcAge(birthday || "")
    const registrationCredits = parseInt(await getConfig("registration_credits") || "50")

    const [user] = await db.insert(usersTable).values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      username: cleanUsername || null,
      phone: cleanPhone,
      password: await hashPassword(password),
      gender: parseInt(gender) || 1,
      looking: parseInt(lookingFor) || 2,
      birthday: birthday || "",
      age,
      city: city || "",
      country: country || "",
      countryCode: countryCode || "",
      lastAccess: String(now()),
      created: now(),
      credits: registrationCredits,
      superlike: 3,
      emailVerified: 0,
      welcomeShown: 0,
    }).returning()
    await db.insert(userExtendedTable).values({ userId: user.id })
    await db.insert(activityTable).values({
      type: "register", userId: user.id,
      title: "New registration",
      message: `${user.name} joined from ${country || "unknown"}`,
      time: now()
    })

    const requireEmailVerification = await getConfig("require_email_verification")
    if (requireEmailVerification === "1") {
      const verifyToken = crypto.randomBytes(32).toString("hex")
      await db.insert(emailVerificationsTable).values({
        userId: user.id,
        token: verifyToken,
        expires: now() + 86400,
        used: 0,
      })
      const siteUrl = getSiteUrl(req)
      import("../lib/mailer").then(({ sendVerificationEmail }) => {
        sendVerificationEmail(user.email, user.name, verifyToken, siteUrl).catch(() => {})
      }).catch(() => {})
    }

    import("../lib/fake-message-scheduler").then(({ triggerAutoMessages }) => {
      triggerAutoMessages(user.id, true).catch(() => {})
    }).catch(() => {})

    const token = signToken({ userId: user.id })
    const { password: _, ...safeUser } = user
    res.json({
      token,
      user: safeUser,
      requireEmailVerification: requireEmailVerification === "1",
    })
  } catch (err: any) {
    console.error("Register error:", err)
    res.status(500).json({ error: "Registration failed" })
  }
})

router.post("/login", async (req, res) => {
  try {
    // Accept email, username, or phone as identifier
    const { identifier, email, password } = req.body
    const loginId = (identifier || email || "").trim()
    if (!loginId || !password) {
      res.status(400).json({ error: "Email/username/phone and password are required" })
      return
    }

    // Try find by email first, then username, then phone
    let user: typeof usersTable.$inferSelect | undefined

    const byEmail = await db.select().from(usersTable)
      .where(eq(usersTable.email, loginId.toLowerCase())).limit(1)
    if (byEmail.length > 0) {
      user = byEmail[0]
    } else {
      // Try username
      const byUsername = await db.select().from(usersTable)
        .where(eq(usersTable.username, loginId.toLowerCase())).limit(1)
      if (byUsername.length > 0) {
        user = byUsername[0]
      } else {
        // Try phone
        const byPhone = await db.select().from(usersTable)
          .where(eq(usersTable.phone, loginId.replace(/\s/g, ""))).limit(1)
        if (byPhone.length > 0) user = byPhone[0]
      }
    }

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" })
      return
    }
    const valid = await verifyAndUpgrade(password, user.password, async (newHash) => {
      await db.update(usersTable).set({ password: newHash }).where(eq(usersTable.id, user!.id))
    })
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" })
      return
    }
    if (user.banned === 1) {
      res.status(403).json({ error: "Account suspended. Contact support." })
      return
    }
    await db.update(usersTable).set({ lastAccess: String(now()), online: 1 }).where(eq(usersTable.id, user.id))
    await db.insert(activityTable).values({
      type: "login", userId: user.id,
      title: "User login", message: `${user.name} logged in`, time: now()
    }).catch(() => {})

    if (user.fake !== 1) {
      import("../lib/fake-message-scheduler").then(({ triggerAutoMessages }) => {
        triggerAutoMessages(user!.id, false).catch(() => {})
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
    } catch { }
  }
  res.json({ success: true })
})

router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body
    if (!token) { res.status(400).json({ error: "Token required" }); return }
    const [record] = await db.select().from(emailVerificationsTable).where(eq(emailVerificationsTable.token, token)).limit(1)
    if (!record || record.used === 1 || record.expires < now()) {
      res.status(400).json({ error: "Invalid or expired verification link" }); return
    }
    await db.update(usersTable).set({ emailVerified: 1 }).where(eq(usersTable.id, record.userId))
    await db.update(emailVerificationsTable).set({ used: 1 }).where(eq(emailVerificationsTable.id, record.id))

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, record.userId)).limit(1)
    const jwtToken = signToken({ userId: record.userId })
    const { password: _, ...safeUser } = user
    res.json({ success: true, token: jwtToken, user: safeUser, message: "Email verified! Welcome back 🎉" })
  } catch (err) {
    console.error("Verify email error:", err)
    res.status(500).json({ error: "Verification failed" })
  }
})

router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params
    const [record] = await db.select().from(emailVerificationsTable).where(eq(emailVerificationsTable.token, token)).limit(1)
    if (!record || record.used === 1 || record.expires < now()) {
      res.status(400).json({ valid: false, error: "Invalid or expired link" }); return
    }
    res.json({ valid: true })
  } catch {
    res.status(500).json({ valid: false })
  }
})

router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body
    if (!email) { res.status(400).json({ error: "Email required" }); return }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1)
    if (!user) { res.json({ success: true }); return }
    if (user.emailVerified === 1) { res.json({ success: true, message: "Email already verified" }); return }

    await db.update(emailVerificationsTable).set({ used: 1 }).where(eq(emailVerificationsTable.userId, user.id))
    const verifyToken = crypto.randomBytes(32).toString("hex")
    await db.insert(emailVerificationsTable).values({ userId: user.id, token: verifyToken, expires: now() + 86400, used: 0 })

    const siteUrl = getSiteUrl(req)
    import("../lib/mailer").then(({ sendVerificationEmail }) => {
      sendVerificationEmail(user.email, user.name, verifyToken, siteUrl).catch(() => {})
    }).catch(() => {})

    res.json({ success: true, message: "Verification email sent" })
  } catch (err) {
    res.status(500).json({ error: "Failed to resend" })
  }
})

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body
    if (!email) { res.status(400).json({ error: "Email is required" }); return }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1)
    if (!user) { res.json({ success: true, message: "If this email is registered, you will receive reset instructions." }); return }

    await db.update(passwordResetTokensTable).set({ used: 1 }).where(eq(passwordResetTokensTable.userId, user.id))

    const token = crypto.randomBytes(32).toString("hex")
    const expires = now() + 3600
    await db.insert(passwordResetTokensTable).values({ userId: user.id, token, expires, used: 0 })

    const siteUrl = getSiteUrl(req)
    import("../lib/mailer").then(({ sendPasswordResetEmail }) => {
      sendPasswordResetEmail(user.email, user.name, token, siteUrl).catch(() => {})
    }).catch(() => {})

    await db.insert(activityTable).values({
      type: "system", userId: user.id,
      title: "Password reset requested",
      message: `Reset link sent to ${user.email}`,
      time: now()
    }).catch(() => {})

    res.json({ success: true, message: "Password reset instructions have been sent to your email." })
  } catch (err) {
    console.error("Forgot password error:", err)
    res.status(500).json({ error: "Failed to process request" })
  }
})

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

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, resetRecord.userId)).limit(1)
    const jwtToken = signToken({ userId: resetRecord.userId })
    const { password: _, ...safeUser } = user

    await db.insert(activityTable).values({
      type: "system", userId: resetRecord.userId,
      title: "Password reset completed",
      message: `User ${user.name} reset their password`,
      time: now()
    }).catch(() => {})

    res.json({ success: true, message: "Password updated successfully. Welcome back!", token: jwtToken, user: safeUser })
  } catch (err) {
    console.error("Reset password error:", err)
    res.status(500).json({ error: "Failed to reset password" })
  }
})

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
