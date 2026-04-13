import express from "express";
import { getMemoriesByType } from "../controllers/patient.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/memories/:type", protect, getMemoriesByType);

export default router;
