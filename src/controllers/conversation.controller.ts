import { Request, Response } from 'express';
import Event from '../models/Event';
import { IEvent } from '../models/Event'; // Import IEvent interface

// STUB: In a real implementation, this would call an LLM service
export const queryMemory = async (req: Request, res: Response) => {
    const { query } = req.body;
    // @ts-ignore
    const userId = req.user._id;

    if (!query) {
        return res.status(400).json({ message: 'Query is required' });
    }

    try {
        // Simple keyword matching for MVP
        const keywords = query.toLowerCase().split(' ');

        let events: IEvent[] = []; // Explicitly type events as IEvent[]

        if (query.toLowerCase().includes('visit')) {
            events = await Event.find({
                userId,
                title: { $regex: 'visit', $options: 'i' }
            });
        } else if (query.toLowerCase().includes('tomorrow')) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const dayAfter = new Date(tomorrow);
            dayAfter.setDate(dayAfter.getDate() + 1);

            events = await Event.find({
                userId,
                datetime: { $gte: tomorrow, $lt: dayAfter }
            });
        } else {
            // Default: find generic upcoming events
            events = await Event.find({ userId }).sort({ datetime: 1 }).limit(3);
        }

        // Construct a natural language response
        let answer = '';
        if (events.length === 0) {
            answer = "I couldn't find any information about that in your memory.";
        } else {
            const eventDescriptions = events.map(e => `${e.title} on ${new Date(e.datetime).toDateString()}`).join(', ');
            answer = `Here is what I found: ${eventDescriptions}`;
        }

        res.json({ answer });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
