import { mysqlTable, int, text, float, boolean, varchar, serial, bigint } from "drizzle-orm/mysql-core"
import { createInsertSchema } from "drizzle-zod"
import { z } from "zod/v4"

export const usersTable = mysqlTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  username: varchar("username", { length: 100 }),
  phone: text("phone").default(""),
  password: text("password").default(""),
  legacyPass: text("pass").default(""),
  photo: text("photo").default(""),
  photoThumb: text("photo_thumb").default(""),
  gender: int("gender").default(1),
  birthday: text("birthday").default(""),
  age: int("age").default(0),
  city: text("city").default(""),
  country: text("country").default(""),
  countryCode: text("country_code").default(""),
  bio: text("bio").default(""),
  looking: int("looking").default(2),
  verified: int("verified").default(0),
  emailVerified: int("email_verified").default(0),
  premium: int("premium").default(0),
  premiumExpiry: int("premium_expiry").default(0),
  credits: int("credits").default(0),
  fake: int("fake").default(0),
  admin: int("admin").default(0),
  banned: int("banned").default(0),
  lastAccess: text("last_access").default("0"),
  created: int("created").default(0),
  lat: text("lat").default("0"),
  lng: text("lng").default("0"),
  superlike: int("superlike").default(3),
  popular: int("popular").default(0),
  online: int("online").default(0),
  lastDailyBonus: int("last_daily_bonus").default(0),
  profileComplete: int("profile_complete").default(0),
  welcomeShown: int("welcome_shown").default(0),
  verificationStatus: text("verification_status").default("none"),
  verificationPhoto: text("verification_photo").default(""),
  verificationNote: text("verification_note").default(""),
  referralCode: text("referral_code").default(""),
  referredBy: int("referred_by").default(0),
  profileVideo: text("profile_video").default(""),
  lastIp: text("last_ip").default(""),
})

export const userExtendedTable = mysqlTable("user_extended", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
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
  interests: text("interests").default(""),
  lookingForAge: text("looking_for_age").default(""),
  idealDate: text("ideal_date").default(""),
  passions: text("passions").default(""),
  selfDescription: text("self_description").default(""),
  favoriteTravel: text("favorite_travel").default(""),
  funActivities: text("fun_activities").default(""),
  languages: text("languages").default(""),
  zodiac: text("zodiac").default(""),
  personalityType: text("personality_type").default(""),
})

export const photosTable = mysqlTable("photos", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  photo: text("photo").notNull(),
  thumb: text("thumb").default(""),
  approved: int("approved").default(1),
  flagged: int("flagged").default(0),
  flagReason: text("flag_reason").default(""),
  main: int("main").default(0),
  created: int("created").default(0),
})

export const likesTable = mysqlTable("likes", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  targetId: int("target_id").notNull(),
  superlike: int("superlike").default(0),
  created: int("created").default(0),
})

export const messagesTable = mysqlTable("messages", {
  id: serial("id").primaryKey(),
  u1: int("u1").notNull(),
  u2: int("u2").notNull(),
  message: text("message").notNull(),
  time: int("time").default(0),
  read: int("read").default(0),
  mediaUrl: varchar("media_url", { length: 500 }).default(""),
  mediaType: varchar("media_type", { length: 20 }).default(""),
})

export const feedTable = mysqlTable("feed", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  content: text("content").notNull(),
  photo: text("photo").default(""),
  likesCount: int("likes_count").default(0),
  commentsCount: int("comments_count").default(0),
  time: int("time").default(0),
})

export const feedLikesTable = mysqlTable("feed_likes", {
  id: serial("id").primaryKey(),
  feedId: int("feed_id").notNull(),
  userId: int("user_id").notNull(),
})

export const notificationsTable = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  fromId: int("from_id"),
  type: text("type").notNull(),
  message: text("message").notNull(),
  link: text("link").default(""),
  read: int("read").default(0),
  time: int("time").default(0),
})

export const ordersTable = mysqlTable("orders", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  amount: float("amount").default(0),
  amountUsd: float("amount_usd").default(0),
  currency: text("currency").default("USD"),
  type: text("type").default("credits"),
  description: text("description").default(""),
  status: text("status").default("pending"),
  stripeSessionId: text("stripe_session_id").default(""),
  credits: int("credits").default(0),
  packageId: int("package_id").default(0),
  time: int("time").default(0),
})

export const storiesTable = mysqlTable("stories", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  photo: text("photo").default(""),
  video: text("video").default(""),
  expires: int("expires").default(0),
  created: int("created").default(0),
})

export const fakeMessageTemplatesTable = mysqlTable("fake_message_templates", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  active: int("active").default(1),
})

export const userVisitsTable = mysqlTable("user_visits", {
  id: serial("id").primaryKey(),
  visitorId: int("visitor_id").notNull(),
  targetId: int("target_id").notNull(),
  time: int("time").default(0),
})

export const giftsTable = mysqlTable("gifts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").default("🎁"),
  credits: int("credits").default(10),
  active: int("active").default(1),
})

export const userGiftsTable = mysqlTable("user_gifts", {
  id: serial("id").primaryKey(),
  fromId: int("from_id").notNull(),
  toId: int("to_id").notNull(),
  giftId: int("gift_id").notNull(),
  message: text("message").default(""),
  time: int("time").default(0),
})

export const siteConfigTable = mysqlTable("site_config", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value").default(""),
})

export const activityTable = mysqlTable("activity", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  userId: int("user_id").default(0),
  title: text("title").default(""),
  message: text("message").default(""),
  time: int("time").default(0),
})

export const autoMessageLogTable = mysqlTable("auto_message_log", {
  id: serial("id").primaryKey(),
  fakeUserId: int("fake_user_id").notNull(),
  realUserId: int("real_user_id").notNull(),
  templateId: int("template_id").default(0),
  time: int("time").default(0),
})

export const blockedUsersTable = mysqlTable("blocked_users", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  blockedId: int("blocked_id").notNull(),
  time: int("time").default(0),
})

export const reportedUsersTable = mysqlTable("reported_users", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  reportedId: int("reported_id").notNull(),
  reason: text("reason").default(""),
  time: int("time").default(0),
})

export const passwordResetTokensTable = mysqlTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  expires: int("expires").default(0),
  used: int("used").default(0),
})

export const emailVerificationsTable = mysqlTable("email_verifications", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  expires: int("expires").default(0),
  used: int("used").default(0),
})

export const profileBoostsTable = mysqlTable("profile_boosts", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  startTime: int("start_time").default(0),
  endTime: int("end_time").default(0),
  creditsSpent: int("credits_spent").default(0),
  active: int("active").default(1),
})

export const fakeVideoCallsTable = mysqlTable("fake_video_calls", {
  id: serial("id").primaryKey(),
  fakeUserId: int("fake_user_id").notNull(),
  realUserId: int("real_user_id").notNull(),
  videoUrl: text("video_url").default(""),
  triggeredAt: int("triggered_at").default(0),
  answered: int("answered").default(0),
  dismissed: int("dismissed").default(0),
})

export const customPaymentsTable = mysqlTable("custom_payments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo: text("logo").default(""),
  description: text("description").default(""),
  status: int("status").default(1),
  reviewTime: int("review_time").default(24),
  externalUrl: text("external_url").default(""),
  country: text("country").default(""),
  type: int("type").default(1),
  proofLabel: text("proof_label").default("Transaction ID / Screenshot"),
  createdAt: int("created_at").default(0),
})

export const customPaymentOrdersTable = mysqlTable("custom_payment_orders", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  gatewayId: int("gateway_id").notNull(),
  type: text("type").default("credits"),
  packageId: int("package_id").default(0),
  amount: float("amount").default(0),
  currency: text("currency").default("USD"),
  proof: text("proof").default(""),
  proofImage: text("proof_image").default(""),
  status: text("status").default("pending"),
  reviewedBy: int("reviewed_by").default(0),
  reviewNote: text("review_note").default(""),
  time: int("time").default(0),
  reviewedAt: int("reviewed_at").default(0),
})

export const chatLocksTable = mysqlTable("chat_locks", {
  id: serial("id").primaryKey(),
  conversationKey: varchar("conversation_key", { length: 255 }).notNull(),
  moderatorId: int("moderator_id").notNull(),
  lockedAt: int("locked_at").default(0),
  expiresAt: int("expires_at").default(0),
})

export const pushSubscriptionsTable = mysqlTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: int("created_at").default(0),
})

export const referralsTable = mysqlTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: int("referrer_id").notNull(),
  referredId: int("referred_id").notNull(),
  status: text("status").default("pending"),
  reward: text("reward").default(""),
  created: int("created").default(0),
})

export const emailCampaignsTable = mysqlTable("email_campaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 500 }).notNull().default(""),
  subject: varchar("subject", { length: 500 }).notNull().default(""),
  htmlBody: text("html_body").notNull().default(""),
  status: varchar("status", { length: 50 }).default("draft"),
  totalRecipients: int("total_recipients").default(0),
  sentCount: int("sent_count").default(0),
  failedCount: int("failed_count").default(0),
  batchSize: int("batch_size").default(50),
  coolingSeconds: int("cooling_seconds").default(60),
  filterGender: int("filter_gender").default(0),
  filterCountry: text("filter_country").default(""),
  filterMinAge: int("filter_min_age").default(0),
  filterMaxAge: int("filter_max_age").default(0),
  onlyReal: int("only_real").default(1),
  createdBy: int("created_by").default(0),
  createdAt: int("created_at").default(0),
  startedAt: int("started_at").default(0),
  completedAt: int("completed_at").default(0),
  lastSentAt: int("last_sent_at").default(0),
})

export const emailCampaignLogsTable = mysqlTable("email_campaign_logs", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  campaignId: int("campaign_id").notNull(),
  email: varchar("email", { length: 500 }).notNull().default(""),
  status: varchar("status", { length: 20 }).default("ok"),
  error: text("error").default(""),
  sentAt: int("sent_at").default(0),
})

export const contactSubmissionsTable = mysqlTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 300 }).notNull(),
  email: varchar("email", { length: 300 }).notNull(),
  subject: varchar("subject", { length: 500 }).default(""),
  message: text("message").notNull(),
  emailSent: int("email_sent").default(0),
  replied: int("replied").default(0),
  repliedAt: int("replied_at").default(0),
  replyMessage: text("reply_message").default(""),
  createdAt: int("created_at").notNull(),
})

export const engagementDailyTable = mysqlTable("engagement_daily", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  dayKey: varchar("day_key", { length: 20 }).notNull(),
  matchUserId: int("match_user_id").default(0),
  likedRevealUntil: int("liked_reveal_until").default(0),
  streakDays: int("streak_days").default(1),
  rewardCredits: int("reward_credits").default(0),
  createdAt: int("created_at").default(0),
})

export const engagementReactionsTable = mysqlTable("engagement_reactions", {
  id: serial("id").primaryKey(),
  fromId: int("from_id").notNull(),
  toId: int("to_id").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  time: int("time").default(0),
})

export const engagementFeedbackTable = mysqlTable("engagement_feedback", {
  id: serial("id").primaryKey(),
  userId: int("user_id").notNull(),
  rating: int("rating").notNull(),
  comment: text("comment").default(""),
  prompt: text("prompt").default(""),
  trigger: varchar("trigger", { length: 50 }).default(""),
  status: varchar("status", { length: 20 }).default("new"),
  adminNote: text("admin_note").default(""),
  createdAt: int("created_at").default(0),
  resolvedAt: int("resolved_at").default(0),
})

export const engagementEventsTable = mysqlTable("engagement_events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").default(""),
  image: text("image").default(""),
  ticketPrice: float("ticket_price").default(1),
  active: int("active").default(1),
  startsAt: int("starts_at").default(0),
  capacity: int("capacity").default(0),
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
export type ProfileBoost = typeof profileBoostsTable.$inferSelect
