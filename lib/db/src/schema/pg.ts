import { pgTable, serial, text, integer, real, boolean } from "drizzle-orm/pg-core"
import { createInsertSchema } from "drizzle-zod"
import { z } from "zod/v4"

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  username: text("username").unique(),
  phone: text("phone").default(""),
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
  emailVerified: integer("email_verified").default(0),
  premium: integer("premium").default(0),
  premiumExpiry: integer("premium_expiry").default(0),
  credits: integer("credits").default(0),
  fake: integer("fake").default(0),
  admin: integer("admin").default(0),
  banned: integer("banned").default(0),
  lastAccess: text("last_access").default("0"),
  created: integer("created").default(0),
  lat: text("lat").default("0"),
  lng: text("lng").default("0"),
  superlike: integer("superlike").default(3),
  popular: integer("popular").default(0),
  online: integer("online").default(0),
  lastDailyBonus: integer("last_daily_bonus").default(0),
  profileComplete: integer("profile_complete").default(0),
  welcomeShown: integer("welcome_shown").default(0),
  verificationStatus: text("verification_status").default("none"),
  verificationPhoto: text("verification_photo").default(""),
  verificationNote: text("verification_note").default(""),
  referralCode: text("referral_code").default(""),
  referredBy: integer("referred_by").default(0),
  profileVideo: text("profile_video").default(""),
  lastIp: text("last_ip").default(""),
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

export const photosTable = pgTable("photos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  photo: text("photo").notNull(),
  thumb: text("thumb").default(""),
  approved: integer("approved").default(1),
  flagged: integer("flagged").default(0),
  flagReason: text("flag_reason").default(""),
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
  mediaUrl: text("media_url").default(""),
  mediaType: text("media_type").default(""),
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
  amountUsd: real("amount_usd").default(0),
  currency: text("currency").default("USD"),
  type: text("type").default("credits"),
  description: text("description").default(""),
  status: text("status").default("pending"),
  stripeSessionId: text("stripe_session_id").default(""),
  credits: integer("credits").default(0),
  packageId: integer("package_id").default(0),
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

export const fakeMessageTemplatesTable = pgTable("fake_message_templates", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  active: integer("active").default(1),
})

export const userVisitsTable = pgTable("user_visits", {
  id: serial("id").primaryKey(),
  visitorId: integer("visitor_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  targetId: integer("target_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  time: integer("time").default(0),
})

export const giftsTable = pgTable("gifts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").default("🎁"),
  credits: integer("credits").default(10),
  active: integer("active").default(1),
})

export const userGiftsTable = pgTable("user_gifts", {
  id: serial("id").primaryKey(),
  fromId: integer("from_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  toId: integer("to_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  giftId: integer("gift_id").notNull().references(() => giftsTable.id, { onDelete: "cascade" }),
  message: text("message").default(""),
  time: integer("time").default(0),
})

export const siteConfigTable = pgTable("site_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").default(""),
})

export const activityTable = pgTable("activity", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  userId: integer("user_id").default(0),
  title: text("title").default(""),
  message: text("message").default(""),
  time: integer("time").default(0),
})

export const autoMessageLogTable = pgTable("auto_message_log", {
  id: serial("id").primaryKey(),
  fakeUserId: integer("fake_user_id").notNull(),
  realUserId: integer("real_user_id").notNull(),
  templateId: integer("template_id").default(0),
  time: integer("time").default(0),
})

export const blockedUsersTable = pgTable("blocked_users", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  blockedId: integer("blocked_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  time: integer("time").default(0),
})

export const reportedUsersTable = pgTable("reported_users", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  reportedId: integer("reported_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  reason: text("reason").default(""),
  time: integer("time").default(0),
})

export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expires: integer("expires").default(0),
  used: integer("used").default(0),
})

export const emailVerificationsTable = pgTable("email_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expires: integer("expires").default(0),
  used: integer("used").default(0),
})

export const profileBoostsTable = pgTable("profile_boosts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  startTime: integer("start_time").default(0),
  endTime: integer("end_time").default(0),
  creditsSpent: integer("credits_spent").default(0),
  active: integer("active").default(1),
})

export const fakeVideoCallsTable = pgTable("fake_video_calls", {
  id: serial("id").primaryKey(),
  fakeUserId: integer("fake_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  realUserId: integer("real_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  videoUrl: text("video_url").default(""),
  triggeredAt: integer("triggered_at").default(0),
  answered: integer("answered").default(0),
  dismissed: integer("dismissed").default(0),
})

export const customPaymentsTable = pgTable("custom_payments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  logo: text("logo").default(""),
  description: text("description").default(""),
  status: integer("status").default(1),
  reviewTime: integer("review_time").default(24),
  externalUrl: text("external_url").default(""),
  country: text("country").default(""),
  type: integer("type").default(1),
  proofLabel: text("proof_label").default("Transaction ID / Screenshot"),
  createdAt: integer("created_at").default(0),
})

export const customPaymentOrdersTable = pgTable("custom_payment_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  gatewayId: integer("gateway_id").notNull().references(() => customPaymentsTable.id, { onDelete: "cascade" }),
  type: text("type").default("credits"),
  packageId: integer("package_id").default(0),
  amount: real("amount").default(0),
  currency: text("currency").default("USD"),
  proof: text("proof").default(""),
  proofImage: text("proof_image").default(""),
  status: text("status").default("pending"),
  reviewedBy: integer("reviewed_by").default(0),
  reviewNote: text("review_note").default(""),
  time: integer("time").default(0),
  reviewedAt: integer("reviewed_at").default(0),
})

export const chatLocksTable = pgTable("chat_locks", {
  id: serial("id").primaryKey(),
  conversationKey: text("conversation_key").notNull().unique(),
  moderatorId: integer("moderator_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  lockedAt: integer("locked_at").default(0),
  expiresAt: integer("expires_at").default(0),
})

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: integer("created_at").default(0),
})

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  referredId: integer("referred_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: text("status").default("pending"),
  reward: text("reward").default(""),
  created: integer("created").default(0),
})

export const emailCampaignsTable = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull().default(""),
  status: text("status").default("draft"),
  totalRecipients: integer("total_recipients").default(0),
  sentCount: integer("sent_count").default(0),
  failedCount: integer("failed_count").default(0),
  batchSize: integer("batch_size").default(50),
  coolingSeconds: integer("cooling_seconds").default(60),
  filterGender: integer("filter_gender").default(0),
  filterCountry: text("filter_country").default(""),
  filterMinAge: integer("filter_min_age").default(0),
  filterMaxAge: integer("filter_max_age").default(0),
  onlyReal: integer("only_real").default(1),
  createdBy: integer("created_by").default(0),
  createdAt: integer("created_at").default(0),
  startedAt: integer("started_at").default(0),
  completedAt: integer("completed_at").default(0),
  lastSentAt: integer("last_sent_at").default(0),
})

export const emailCampaignLogsTable = pgTable("email_campaign_logs", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  email: text("email").notNull().default(""),
  status: text("status").default("ok"),
  error: text("error").default(""),
  sentAt: integer("sent_at").default(0),
})

export const contactSubmissionsTable = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").default(""),
  message: text("message").notNull(),
  emailSent: integer("email_sent").default(0),
  replied: integer("replied").default(0),
  repliedAt: integer("replied_at").default(0),
  replyMessage: text("reply_message").default(""),
  createdAt: integer("created_at").notNull(),
})

export const engagementDailyTable = pgTable("engagement_daily", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  dayKey: text("day_key").notNull(),
  matchUserId: integer("match_user_id").default(0),
  likedRevealUntil: integer("liked_reveal_until").default(0),
  streakDays: integer("streak_days").default(1),
  rewardCredits: integer("reward_credits").default(0),
  createdAt: integer("created_at").default(0),
})

export const engagementReactionsTable = pgTable("engagement_reactions", {
  id: serial("id").primaryKey(),
  fromId: integer("from_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  toId: integer("to_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  time: integer("time").default(0),
  read: integer("read").default(0),
})

export const engagementFeedbackTable = pgTable("engagement_feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment").default(""),
  prompt: text("prompt").default(""),
  trigger: text("trigger").default(""),
  status: text("status").default("new"),
  adminNote: text("admin_note").default(""),
  createdAt: integer("created_at").default(0),
  resolvedAt: integer("resolved_at").default(0),
})

export const engagementEventsTable = pgTable("engagement_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").default(""),
  image: text("image").default(""),
  ticketPrice: real("ticket_price").default(1),
  active: integer("active").default(1),
  startsAt: integer("starts_at").default(0),
  capacity: integer("capacity").default(0),
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
