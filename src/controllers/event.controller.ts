import { Request, Response } from 'express';
import * as eventService from '../services/event.service';

interface AuthRequest extends Request {
    user?: any;
}

export const createEvent = async (req: AuthRequest, res: Response) => {
    try {
        const eventData = {
            ...req.body,
            userId: req.user._id,
            createdBy: req.user._id
        };
        const event = await eventService.createEvent(eventData);
        res.status(201).json(event);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getEvents = async (req: AuthRequest, res: Response) => {
    try {
        const events = await eventService.getEvents({ userId: req.user._id });
        res.json(events);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getEventById = async (req: AuthRequest, res: Response) => {
    try {
        const event = await eventService.getEventById(req.params.id as string);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        // Check ownership or caregiver access (simplified for MVP: strict ownership)
        if (event.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        res.json(event);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateEvent = async (req: AuthRequest, res: Response) => {
    try {
        const event = await eventService.getEventById(req.params.id as string);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (event.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        const updatedEvent = await eventService.updateEvent(req.params.id as string, req.body);
        res.json(updatedEvent);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteEvent = async (req: AuthRequest, res: Response) => {
    try {
        const event = await eventService.getEventById(req.params.id as string);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (event.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        await eventService.deleteEvent(req.params.id as string);
        res.json({ message: 'Event removed' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
