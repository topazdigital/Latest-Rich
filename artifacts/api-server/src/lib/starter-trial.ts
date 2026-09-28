import { db } from "@workspace/db"
import { ordersTable, usersTable } from "@workspace/db/schema"
import { and, eq, ne } from "drizzle-orm"

export async function hasCompletedStarterOrder(userId: number, excludeOrderId?: number): Promise<boolean> {
  const conditions = [
    eq(ordersTable.userId, userId),
    eq(ordersTable.type, "starter"),
    eq(ordersTable.status, "completed"),
  ]
  if (excludeOrderId !== undefined) conditions.push(ne(ordersTable.id, excludeOrderId))

  const [order] = await db.select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(...conditions))
    .limit(1)

  return Boolean(order)
}

export async function fulfillStarterOrder(userId: number, orderId?: number): Promise<boolean> {
  if (await hasCompletedStarterOrder(userId, orderId)) return false

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1)
  if (!user) return false

  await db.update(usersTable)
    .set({ credits: (user.credits || 0) + 3 })
    .where(eq(usersTable.id, userId))
  return true
}