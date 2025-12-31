import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getProgress } from "../controllers/progress.controller.js";
import { getWeeklyProgress } from "../controllers/progress.controller.js";


const router = Router();

router.get("/", requireAuth, getProgress);
router.get("/weekly", requireAuth, getWeeklyProgress);

export default router;
