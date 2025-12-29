import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { generateExercise } from "../controllers/exercise.controller.js";

const router = Router();

router.post("/generate", requireAuth, generateExercise);

export default router;