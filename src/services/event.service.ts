import Event, { IEvent } from '../models/Event';
import mongoose from 'mongoose';

export const createEvent = async (eventData: Partial<IEvent>) => {
    const event = await Event.create(eventData);
    return event;
};

export const getEvents = async (query: any) => {
    return await Event.find(query).sort({ datetime: 1 });
};

export const getEventById = async (id: string) => {
    return await Event.findById(id);
};

export const updateEvent = async (id: string, updateData: Partial<IEvent>) => {
    return await Event.findByIdAndUpdate(id, updateData, { new: true });
};

export const deleteEvent = async (id: string) => {
    return await Event.findByIdAndDelete(id);
};

export const getUpcomingEvents = async (userId: string, limit: number = 5) => {
    const now = new Date();
    return await Event.find({
        userId,
        datetime: { $gte: now }
    }).sort({ datetime: 1 }).limit(limit);
}
