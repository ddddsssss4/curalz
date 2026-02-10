import express from 'express';
import { queryMemory } from '../controllers/conversation.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/query', protect, queryMemory);

export default router;
