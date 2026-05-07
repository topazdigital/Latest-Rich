import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable, userExtendedTable } from "@workspace/db/schema"
import { eq } from "drizzle-orm"
import { signToken } from "../lib/jwt"
import { hashPassword, verifyPassword } from "../lib/password"

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
    }).returning()
    await db.insert(userExtendedTable).values({ userId: user.id })
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
    if (!user || !(await verifyPassword(password, user.password))) {
      res.status(401).json({ error: "Invalid email or password" })
      return
    }
    if (user.banned === 1) {
      res.status(403).json({ error: "Account suspended" })
      return
    }
    await db.update(usersTable).set({ lastAccess: String(now()) }).where(eq(usersTable.id, user.id))
    const token = signToken({ userId: user.id })
    const { password: _, ...safeUser } = user
    res.json({ token, user: safeUser })
  } catch (err) {
    console.error("Login error:", err)
    res.status(500).json({ error: "Login failed" })
  }
})

export default router
