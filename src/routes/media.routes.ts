import express from "express";
import { getUploadUrl } from "../controllers/media.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

// Both patient and caregiver can upload media
router.post("/upload-url", protect, getUploadUrl);

export default router;
