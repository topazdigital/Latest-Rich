import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable, userExtendedTable, activityTable, siteConfigTable } from "@workspace/db/schema"
import { eq } from "drizzle-orm"
import { signToken } from "../lib/jwt"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

async function getConfig(key: string): Promise<string> {
  const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
  return row?.value || ""
}

// Google OAuth - verify ID token
router.post("/google", async (req, res) => {
  try {
    const { credential, client_id } = req.body
    if (!credential) { res.status(400).json({ error: "No credential provided" }); return }

    // Verify the Google token
    const googleClientId = await getConfig("google_client_id") || client_id
    if (!googleClientId) { res.status(400).json({ error: "Google login not configured" }); return }

    // Decode the JWT token from Google (verify signature via Google's API)
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`)
    if (!verifyRes.ok) { res.status(401).json({ error: "Invalid Google token" }); return }

    const profile = await verifyRes.json() as Record<string, string>
    if (profile.aud !== googleClientId && !googleClientId.includes(profile.aud)) {
      res.status(401).json({ error: "Token audience mismatch" }); return
    }

    const { email, name, picture, sub: googleId } = profile
    if (!email) { res.status(400).json({ error: "No email from Google" }); return }

    // Find or create user
    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1)
    let isNew = false

    if (!user) {
      isNew = true
      const googleEmail = email.toLowerCase()
      await db.insert(usersTable).values({
        name: name || email.split("@")[0],
        email: googleEmail,
        password: `google_${googleId}`,
        photo: picture || "",
        photoThumb: picture || "",
        gender: 1,
        looking: 2,
        verified: 1,
        credits: 50,
        superlike: 3,
        created: now(),
        lastAccess: String(now()),
        online: 1,
      })
      const [newUser] = await db.select().from(usersTable).where(eq(usersTable.email, googleEmail)).limit(1)
      user = newUser
      await db.insert(userExtendedTable).values({ userId: user.id }).catch(() => {})
      await db.insert(activityTable).values({ type: "register", userId: user.id, title: "Google registration", message: `${name} joined via Google`, time: now() }).catch(() => {})
    } else {
      if (user.banned === 1) { res.status(403).json({ error: "Account suspended" }); return }
      // Update photo if changed
      const updates: any = { lastAccess: String(now()), online: 1 }
      if (picture && !user.photo) updates.photo = picture
      await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id))
    }

    const token = signToken({ userId: user.id })
    const { password: _, ...safeUser } = user
    res.json({ token, user: safeUser, needsCompletion: isNew })
  } catch (err: any) {
    console.error("Google auth error:", err)
    res.status(500).json({ error: "Google login failed" })
  }
})

// Facebook OAuth
router.post("/facebook", async (req, res) => {
  try {
    const { accessToken, userId: fbUserId } = req.body
    if (!accessToken || !fbUserId) { res.status(400).json({ error: "Missing Facebook credentials" }); return }

    const fbAppId = await getConfig("facebook_app_id")
    const fbAppSecret = await getConfig("facebook_app_secret")
    if (!fbAppId || !fbAppSecret) { res.status(400).json({ error: "Facebook login not configured" }); return }

    // Verify the token with Facebook
    const debugRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${fbAppId}|${fbAppSecret}`)
    const debug = await debugRes.json() as any
    if (!debug.data?.is_valid) { res.status(401).json({ error: "Invalid Facebook token" }); return }

    // Get user profile
    const profileRes = await fetch(`https://graph.facebook.com/${fbUserId}?fields=id,name,email,picture&access_token=${accessToken}`)
    const profile = await profileRes.json() as any
    if (!profile.id) { res.status(401).json({ error: "Failed to get Facebook profile" }); return }

    const email = profile.email || `fb_${profile.id}@facebook.com`
    const picture = profile.picture?.data?.url || ""

    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1)
    let isFbNew = false

    if (!user) {
      isFbNew = true
      const fbEmail = email.toLowerCase()
      await db.insert(usersTable).values({
        name: profile.name || email.split("@")[0],
        email: fbEmail,
        password: `facebook_${profile.id}`,
        photo: picture,
        photoThumb: picture,
        gender: 1,
        looking: 2,
        verified: 1,
        credits: 50,
        superlike: 3,
        created: now(),
        lastAccess: String(now()),
        online: 1,
      })
      const [newUser] = await db.select().from(usersTable).where(eq(usersTable.email, fbEmail)).limit(1)
      user = newUser
      await db.insert(userExtendedTable).values({ userId: user.id }).catch(() => {})
      await db.insert(activityTable).values({ type: "register", userId: user.id, title: "Facebook registration", message: `${profile.name} joined via Facebook`, time: now() }).catch(() => {})
    } else {
      if (user.banned === 1) { res.status(403).json({ error: "Account suspended" }); return }
      await db.update(usersTable).set({ lastAccess: String(now()), online: 1 }).where(eq(usersTable.id, user.id))
    }

    const token = signToken({ userId: user.id })
    const { password: _, ...safeUser } = user
    res.json({ token, user: safeUser, needsCompletion: isFbNew })
  } catch (err: any) {
    console.error("Facebook auth error:", err)
    res.status(500).json({ error: "Facebook login failed" })
  }
})

// Complete social profile — called after Google/Facebook signup to fill in missing fields
router.patch("/complete", requireAuth, async (req, res) => {
  try {
    const { username, phone, gender, lookingFor, birthday, city, country, countryCode } = req.body
    const userId = req.userId!

    if (!username || username.trim().length < 3) {
      res.status(400).json({ error: "Username must be at least 3 characters" }); return
    }
    if (!phone || phone.replace(/[\s\-()]/g, "").length < 7) {
      res.status(400).json({ error: "Phone number is required" }); return
    }

    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 30)
    const cleanPhone = phone.replace(/\s/g, "")

    // Check username uniqueness (allow same user)
    const [existingUser] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.username, cleanUsername)).limit(1)
    if (existingUser && existingUser.id !== userId) {
      res.status(409).json({ error: "Username already taken" }); return
    }

    // Check phone uniqueness (allow same user)
    const [existingPhone] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.phone, cleanPhone)).limit(1)
    if (existingPhone && existingPhone.id !== userId) {
      res.status(409).json({ error: "Phone number already registered" }); return
    }

    const calcAge = (bd: string) => {
      if (!bd) return 0
      const d = new Date(bd)
      const t = new Date()
      let age = t.getFullYear() - d.getFullYear()
      const m = t.getMonth() - d.getMonth()
      if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--
      return age
    }

    await db.update(usersTable).set({
      username: cleanUsername,
      phone: cleanPhone,
      gender: parseInt(gender) || 1,
      looking: parseInt(lookingFor) || 2,
      birthday: birthday || "",
      age: calcAge(birthday || ""),
      city: city || "",
      country: country || "",
      countryCode: countryCode || "",
      lastAccess: String(now()),
    }).where(eq(usersTable.id, userId))

    const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1)
    const { password: _, ...safeUser } = updatedUser
    res.json({ success: true, user: safeUser })
  } catch (err: any) {
    console.error("Social complete error:", err)
    res.status(500).json({ error: "Failed to complete profile" })
  }
})

// Get social login config (public keys only - no secrets)
router.get("/config", async (req, res) => {
  try {
    const googleClientId = await getConfig("google_client_id")
    const facebookAppId = await getConfig("facebook_app_id")
    res.json({ googleClientId, facebookAppId })
  } catch {
    res.json({ googleClientId: "", facebookAppId: "" })
  }
})

export default router
