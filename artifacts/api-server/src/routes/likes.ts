import { Router } from "express"
import { db } from "@workspace/db"
import { likesTable, notificationsTable, usersTable, photosTable } from "@workspace/db/schema"
import { eq, and, desc, inArray } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"
import { send } from "../lib/websocket"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

function safeUser(u: any) {
  if (!u) return null
  const { password, ...rest } = u
  return rest
}

// GET /api/likes — who liked me, I liked, and mutual matches
router.get("/", requireAuth, async (req, res) => {
  try {
    const myId = req.userId!

    const likedMeRows = await db.select({
      like: likesTable,
      user: usersTable,
    }).from(likesTable)
      .leftJoin(usersTable, eq(likesTable.userId, usersTable.id))
      .where(eq(likesTable.targetId, myId))
      .orderBy(desc(likesTable.created))
      .limit(100)

    const iLikedRows = await db.select({
      like: likesTable,
      user: usersTable,
    }).from(likesTable)
      .leftJoin(usersTable, eq(likesTable.targetId, usersTable.id))
      .where(eq(likesTable.userId, myId))
      .orderBy(desc(likesTable.created))
      .limit(100)

    const likedMeIds = new Set(likedMeRows.map(r => r.like.userId))
    const iLikedIds = new Set(iLikedRows.map(r => r.like.targetId))
    const matchIds = [...likedMeIds].filter(id => iLikedIds.has(id))

    const matches = likedMeRows.filter(r => matchIds.includes(r.like.userId))

    // Enrich photo fallback from photos table for users with empty photo
    const allUserIds = [
      ...likedMeRows.map(r => r.user?.id),
      ...iLikedRows.map(r => r.user?.id),
    ].filter((id): id is number => !!id)
    const uniqueIds = [...new Set(allUserIds)]
    const photoMap = new Map<number, { photo: string; thumb: string }>()
    if (uniqueIds.length > 0) {
      const fallbackPhotos = await db.select({ userId: photosTable.userId, photo: photosTable.photo, thumb: photosTable.thumb })
        .from(photosTable)
        .where(and(inArray(photosTable.userId, uniqueIds), eq(photosTable.approved, 1)))
        .orderBy(desc(photosTable.main), photosTable.id)
      for (const p of fallbackPhotos) {
        if (!photoMap.has(p.userId)) photoMap.set(p.userId, { photo: p.photo, thumb: p.thumb || p.photo })
      }
    }
    function enrichUser(u: any) {
      if (!u) return null
      const fb = photoMap.get(u.id)
      return { ...safeUser(u), photo: u.photo || fb?.photo || '', photoThumb: u.photoThumb || fb?.thumb || '' }
    }

    res.json({
      likedMe: likedMeRows.map(r => ({ ...r.like, user: enrichUser(r.user) })),
      iLiked: iLikedRows.map(r => ({ ...r.like, user: enrichUser(r.user) })),
      matches: matches.map(r => ({ ...r.like, user: enrichUser(r.user) })),
    })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

router.post("/", requireAuth, async (req, res) => {
  try {
    const { targetId, superlike } = req.body
    const myId = req.userId!
    if (targetId === myId) { res.status(400).json({ error: "Cannot like yourself" }); return }

    const [existing] = await db.select().from(likesTable)
      .where(and(eq(likesTable.userId, myId), eq(likesTable.targetId, targetId)))
      .limit(1)

    if (existing) {
      await db.delete(likesTable).where(and(eq(likesTable.userId, myId), eq(likesTable.targetId, targetId)))
      res.json({ liked: false })
      return
    }

    await db.insert(likesTable).values({ userId: myId, targetId, superlike: superlike ? 1 : 0, created: now() })

    const [me] = await db.select().from(usersTable).where(eq(usersTable.id, myId)).limit(1)
    const [target] = await db.select().from(usersTable).where(eq(usersTable.id, targetId)).limit(1)

    // Auto-like back if the target is a fake user — after a random delay so it doesn't look instant
    if (target?.fake === 1) {
      const [alreadyLikedBack] = await db.select().from(likesTable)
        .where(and(eq(likesTable.userId, targetId), eq(likesTable.targetId, myId)))
        .limit(1)
      if (!alreadyLikedBack) {
        // Random delay: 2–15 minutes in ms
        const delayMs = (Math.floor(Math.random() * 14) + 2) * 60 * 1000
        setTimeout(async () => {
          try {
            // Re-check in case real user deleted the like in the meantime
            const [stillLiked] = await db.select().from(likesTable)
              .where(and(eq(likesTable.userId, myId), eq(likesTable.targetId, targetId)))
              .limit(1)
            const [alreadyExists] = await db.select().from(likesTable)
              .where(and(eq(likesTable.userId, targetId), eq(likesTable.targetId, myId)))
              .limit(1)
            if (!stillLiked || alreadyExists) return

            await db.insert(likesTable).values({ userId: targetId, targetId: myId, superlike: 0, created: now() })
            // Refresh fake user's lastAccess so they appear recent (prevents "hours ago" block)
            await db.update(usersTable).set({ lastAccess: String(now()) }).where(eq(usersTable.id, targetId))

            // Notify the real user of the match
            const [fakeUser] = await db.select().from(usersTable).where(eq(usersTable.id, targetId)).limit(1)
            const [realUser] = await db.select().from(usersTable).where(eq(usersTable.id, myId)).limit(1)
            if (fakeUser && realUser) {
              await db.insert(notificationsTable).values({
                userId: myId,
                fromId: targetId,
                type: "match",
                message: `You matched with ${fakeUser.name}! 💝`,
                link: `/profile/${targetId}`,
                time: now(),
              })
              send(myId, { type: "matched", otherUser: { id: fakeUser.id, name: fakeUser.name, photo: fakeUser.photoThumb || fakeUser.photo } })
              import("../lib/push").then(({ sendPushToUser }) => {
                sendPushToUser(myId, { title: `💝 It's a match with ${fakeUser.name}!`, body: "You both liked each other — send a message!", url: `/profile/${targetId}` })
              }).catch(() => {})
            }
          } catch (err) {
            console.error("[auto-like-back]", err)
          }
        }, delayMs)
      }
    }

    const [theyLikedMe] = await db.select().from(likesTable).where(and(eq(likesTable.userId, targetId), eq(likesTable.targetId, myId))).limit(1)
    const isMatch = !!theyLikedMe

    await db.insert(notificationsTable).values({
      userId: targetId,
      fromId: myId,
      type: isMatch ? "match" : (superlike ? "superlike" : "like"),
      message: isMatch
        ? `${me?.name} and you liked each other! It's a match! 💝`
        : superlike
          ? `${me?.name} super liked you! ⭐`
          : `${me?.name} liked you 💝`,
      link: `/profile/${myId}`,
      time: now(),
    })

    // Send real-time WS notification to target (only for real users)
    if (me && me.fake !== 1) {
      const fromUser = { id: me.id, name: me.name, photo: me.photoThumb || me.photo, age: me.age, city: me.city }
      send(targetId, { type: "liked", fromUser, isMatch, superlike: !!superlike })
      // Push notification to the liked user
      import("../lib/push").then(({ sendPushToUser }) => {
        const title = superlike ? `⭐ ${me.name} super liked you!` : isMatch ? `💝 It's a match with ${me.name}!` : `💌 ${me.name} liked you`
        const body = isMatch ? "You both liked each other — send a message!" : "View their profile on Rich Dating Network"
        sendPushToUser(targetId, { title, body, url: `/profile/${myId}` })
      }).catch(() => {})
    }

    if (isMatch) {
      await db.insert(notificationsTable).values({
        userId: myId,
        fromId: targetId,
        type: "match",
        message: `You matched with ${target?.name}! 💝`,
        link: `/profile/${targetId}`,
        time: now(),
      })
      // Notify the liker in real-time
      if (target) {
        send(myId, { type: "matched", otherUser: { id: target.id, name: target.name, photo: target.photoThumb || target.photo } })
      }
      // Push match notification to the liker
      if (target) {
        import("../lib/push").then(({ sendPushToUser }) => {
          sendPushToUser(myId, { title: `💝 It's a match with ${target.name}!`, body: "You both liked each other — send a message!", url: `/profile/${targetId}` })
        }).catch(() => {})
      }
    }

    res.json({ liked: true, isMatch })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed" })
  }
})

export default router
