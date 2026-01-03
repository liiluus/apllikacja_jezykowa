import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { generateExercise, nextExercise } from "../controllers/exercise.controller.js";
import { aiGenerateExercise } from "../controllers/exercise.controller.js";
import { getExerciseById } from "../controllers/exercise.controller.js";
const router = Router();

router.post("/generate", requireAuth, generateExercise);
router.post("/next", requireAuth, nextExercise);
router.post("/ai-generate", requireAuth, aiGenerateExercise);
router.get("/:id", requireAuth, getExerciseById);

export default router;