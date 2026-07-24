import { Router, type IRouter } from "express"
import healthRouter from "./health"
import authRouter from "./auth"
import usersRouter from "./users"
import likesRouter from "./likes"
import chatRouter from "./chat"
import feedRouter from "./feed"
import notificationsRouter from "./notifications"
import photosRouter from "./photos"
import premiumRouter from "./premium"
import creditsRouter from "./credits"
import paymentsRouter from "./payments"
import storiesRouter from "./stories"
import uploadsRouter from "./uploads"
import adminRouter from "./admin"
import giftsRouter from "./gifts"
import visitsRouter from "./visits"
import blockRouter from "./block"
import locationRouter from "./location"
import socialAuthRouter from "./social-auth"
import boostRouter from "./boost"
import brandingRouter from "./branding"
import videoCallsRouter from "./video-calls"
import moderatorRouter from "./moderator"
import customPaymentsRouter from "./custom-payments"
import verificationRouter from "./verification"
import referralsRouter from "./referrals"
import emailCampaignsRouter from "./email-campaigns"
import contactRouter from "./contact"
import contactMessagesRouter from "./contact-messages"
import pushRouter from "./push"
import engagementRouter from "./engagement"

const router: IRouter = Router()

router.use(healthRouter)
router.use("/auth", authRouter)
router.use("/auth/social", socialAuthRouter)
router.use("/users", usersRouter)
router.use("/likes", likesRouter)
router.use("/chat", chatRouter)
router.use("/feed", feedRouter)
router.use("/notifications", notificationsRouter)
router.use("/photos", photosRouter)
router.use("/premium", premiumRouter)
router.use("/credits", creditsRouter)
router.use("/payments", paymentsRouter)
router.use("/stories", storiesRouter)
router.use("/uploads", uploadsRouter)
router.use("/admin", adminRouter)
router.use("/gifts", giftsRouter)
router.use("/visits", visitsRouter)
router.use("/location", locationRouter)
router.use("/boost", boostRouter)
router.use("/branding", brandingRouter)
router.use("/video-calls", videoCallsRouter)
router.use("/moderator", moderatorRouter)
router.use("/custom-payments", customPaymentsRouter)
router.use("/verification", verificationRouter)
router.use("/referrals", referralsRouter)
router.use("/push", pushRouter)
router.use("/engagement", engagementRouter)
router.use("/admin/email-campaigns", emailCampaignsRouter)
router.use("/admin/contact-messages", contactMessagesRouter)
router.use("/", contactRouter)
router.use("/", blockRouter)

export default router
