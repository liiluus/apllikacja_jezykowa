import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { generateExercise, nextExercise } from "../controllers/exercise.controller.js";
import { aiGenerateExercise } from "../controllers/exercise.controller.js";
const router = Router();

router.post("/generate", requireAuth, generateExercise);
router.post("/next", requireAuth, nextExercise);
router.post("/ai-generate", requireAuth, aiGenerateExercise);

export default router;