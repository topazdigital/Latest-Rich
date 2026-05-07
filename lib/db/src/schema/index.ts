import { pgTable, serial, text, integer, timestamp, boolean, varchar, real } from "drizzle-orm/pg-core"
import { createInsertSchema } from "drizzle-zod"
import { z } from "zod/v4"

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  photo: text("photo").default(""),
  photoThumb: text("photo_thumb").default(""),
  gender: integer("gender").default(1),
  birthday: text("birthday").default(""),
  age: integer("age").default(0),
  city: text("city").default(""),
  country: text("country").default(""),
  countryCode: text("country_code").default(""),
  bio: text("bio").default(""),
  looking: integer("looking").default(2),
  verified: integer("verified").default(0),
  premium: integer("premium").default(0),
  premiumExpiry: integer("premium_expiry").default(0),
  credits: integer("credits").default(0),
  fake: integer("fake").default(0),
  admin: integer("admin").default(0),
  banned: integer("banned").default(0),
  lastAccess: text("last_access").default("0"),
  created: integer("created").default(0),
})

export const userExtendedTable = pgTable("user_extended", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  occupation: text("occupation").default(""),
  education: text("education").default(""),
  height: text("height").default(""),
  bodyType: text("body_type").default(""),
  ethnicity: text("ethnicity").default(""),
  religion: text("religion").default(""),
  smoking: text("smoking").default(""),
  drinking: text("drinking").default(""),
  children: text("children").default(""),
  relationship: text("relationship").default(""),
})

export const photosTable = pgTable("photos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  photo: text("photo").notNull(),
  thumb: text("thumb").default(""),
  approved: integer("approved").default(1),
  main: integer("main").default(0),
  created: integer("created").default(0),
})

export const likesTable = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  targetId: integer("target_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  superlike: integer("superlike").default(0),
  created: integer("created").default(0),
})

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  u1: integer("u1").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  u2: integer("u2").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  time: integer("time").default(0),
  read: integer("read").default(0),
})

export const feedTable = pgTable("feed", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  photo: text("photo").default(""),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  time: integer("time").default(0),
})

export const feedLikesTable = pgTable("feed_likes", {
  id: serial("id").primaryKey(),
  feedId: integer("feed_id").notNull().references(() => feedTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
})

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  fromId: integer("from_id").references(() => usersTable.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  message: text("message").notNull(),
  link: text("link").default(""),
  read: integer("read").default(0),
  time: integer("time").default(0),
})

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: real("amount").default(0),
  currency: text("currency").default("USD"),
  type: text("type").default("credits"),
  description: text("description").default(""),
  status: text("status").default("pending"),
  stripeSessionId: text("stripe_session_id").default(""),
  credits: integer("credits").default(0),
  time: integer("time").default(0),
})

export const storiesTable = pgTable("stories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  photo: text("photo").default(""),
  video: text("video").default(""),
  expires: integer("expires").default(0),
  created: integer("created").default(0),
})

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true })
export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true })
export const insertLikeSchema = createInsertSchema(likesTable).omit({ id: true })
export const insertFeedSchema = createInsertSchema(feedTable).omit({ id: true })
export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true })

export type User = typeof usersTable.$inferSelect
export type InsertUser = z.infer<typeof insertUserSchema>
export type Message = typeof messagesTable.$inferSelect
export type Like = typeof likesTable.$inferSelect
export type Feed = typeof feedTable.$inferSelect
export type Notification = typeof notificationsTable.$inferSelect
export type Order = typeof ordersTable.$inferSelect
export type Photo = typeof photosTable.$inferSelect
