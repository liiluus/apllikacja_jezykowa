import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { generateExercise, nextExercise } from "../controllers/exercise.controller.js";

const router = Router();

router.post("/generate", requireAuth, generateExercise);
router.post("/next", requireAuth, nextExercise);

export default router;