import express from 'express';
import { sendMessage, getChatHistory, searchMemories } from '../controllers/chat.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/message', protect, sendMessage);
router.get('/history', protect, getChatHistory);
router.post('/search', protect, searchMemories);

export default router;
