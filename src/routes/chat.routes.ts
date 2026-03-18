import express from "express";
import {
  sendMessage,
  sendMessageStream,
  getChatHistory,
  searchMemories,
} from "../controllers/chat.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/message", protect, sendMessage);
router.post("/message/stream", protect, sendMessageStream);
router.get("/history", protect, getChatHistory);
router.post("/search", protect, searchMemories);

export default router;
