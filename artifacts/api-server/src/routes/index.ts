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

const router: IRouter = Router()

router.use(healthRouter)
router.use("/auth", authRouter)
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

export default router
