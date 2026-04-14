import express from "express";
import { getSignedUrl } from "../controllers/elevenlabs.controller";
// import { protect } from "../middleware/auth.middleware"; // optional

const router = express.Router();

// GET /api/elevenlabs/signed-url
router.get("/signed-url", getSignedUrl);
// router.get("/signed-url", protect, getSignedUrl); // if you want auth

export default router;
