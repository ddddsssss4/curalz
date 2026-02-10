import express from 'express';
import { createEvent, getEvents, getEventById, updateEvent, deleteEvent } from '../controllers/event.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.route('/')
    .get(protect, getEvents)
    .post(protect, createEvent);

router.route('/:id')
    .get(protect, getEventById)
    .put(protect, updateEvent)
    .delete(protect, deleteEvent);

export default router;
