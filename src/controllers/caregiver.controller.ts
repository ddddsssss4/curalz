import { Request, Response } from 'express';
import User from '../models/User';
import Thought from '../models/Thought';
import Event from '../models/Event';

import { extractEntities } from '../services/entityExtraction.service';
import { generateEmbedding } from '../services/embedding.service';
import { storeVector } from '../services/qdrant.service';
import { v4 as uuidv4 } from 'uuid';

interface AuthRequest extends Request {
    user?: any;
}

/**
 * Get list of linked patients for caregiver
 */
export const getPatients = async (req: AuthRequest, res: Response) => {
    try {
        if (req.user.role !== 'caregiver') {
            return res.status(403).json({ error: 'Only caregivers can access this' });
        }

        const patients = await User.find({
            _id: { $in: req.user.linkedPatientIds }
        }).select('-password');

        res.json({ patients });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get patient profile
 */
export const getPatientProfile = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
        if (req.user.role !== 'caregiver') {
            return res.status(403).json({ error: 'Only caregivers can access this' });
        }

        // Check if patient is linked to this caregiver
        if (!req.user.linkedPatientIds.some((pid: any) => pid.toString() === id)) {
            return res.status(403).json({ error: 'Patient not linked to this caregiver' });
        }

        const patient = await User.findById(id).select('-password');
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        res.json({ patient });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update patient profile
 */
export const updatePatientProfile = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, email } = req.body;

    try {
        if (req.user.role !== 'caregiver') {
            return res.status(403).json({ error: 'Only caregivers can access this' });
        }

        if (!req.user.linkedPatientIds.some((pid: any) => pid.toString() === id)) {
            return res.status(403).json({ error: 'Patient not linked to this caregiver' });
        }

        const patient = await User.findByIdAndUpdate(
            id,
            { name, email },
            { new: true }
        ).select('-password');

        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        res.json({ patient });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get patient activity (recent thoughts/conversations)
 */
export const getPatientActivity = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    try {
        if (req.user.role !== 'caregiver') {
            return res.status(403).json({ error: 'Only caregivers can access this' });
        }

        if (!req.user.linkedPatientIds.some((pid: any) => pid.toString() === id)) {
            return res.status(403).json({ error: 'Patient not linked to this caregiver' });
        }

        const thoughts = await Thought.find({ userId: id })
            .sort({ timestamp: -1 })
            .limit(Number(limit));

        res.json({
            activity: thoughts,
            count: thoughts.length
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Link a patient to caregiver by email
 */
export const linkPatient = async (req: AuthRequest, res: Response) => {
    const { email } = req.body;

    try {
        if (req.user.role !== 'caregiver') {
            return res.status(403).json({ error: 'Only caregivers can access this' });
        }

        const patient = await User.findOne({ email, role: 'patient' });
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found with this email' });
        }

        // Check if already linked
        if (req.user.linkedPatientIds.includes(patient._id)) {
            return res.status(400).json({ error: 'Patient already linked' });
        }

        // Add to caregiver's linked list
        req.user.linkedPatientIds.push(patient._id);
        await req.user.save();

        res.json({
            message: 'Patient linked successfully',
            patient: {
                id: patient._id,
                name: patient.name,
                email: patient.email
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Add a memory for a patient
 */
export const addMemoryForPatient = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { message } = req.body;

    try {
        if (req.user.role !== 'caregiver') {
            return res.status(403).json({ error: 'Only caregivers can access this' });
        }

        if (!req.user.linkedPatientIds.some((pid: any) => pid.toString() === id)) {
            return res.status(403).json({ error: 'Patient not linked to this caregiver' });
        }

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // 1. Generate embedding
        const embedding = await generateEmbedding(message);

        // 2. Extract entities
        const entities = await extractEntities(message);

        // 3. Store in MongoDB
        const qdrantId = uuidv4();
        const thought = await Thought.create({
            userId: id,
            rawText: message,
            entities,
            qdrantId,
            timestamp: new Date()
        });

        // 4. Store in Qdrant
        await storeVector(qdrantId, embedding, {
            userId: id.toString(),
            rawText: message,
            timestamp: new Date(),
            entities
        });

        res.json({
            message: 'Memory added successfully',
            thought
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Create an event for a patient
 */
export const createEventForPatient = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { title, description, datetime, importance, reminderOffsets } = req.body;

    try {
        if (req.user.role !== 'caregiver') {
            return res.status(403).json({ error: 'Only caregivers can access this' });
        }

        if (!req.user.linkedPatientIds.some((pid: any) => pid.toString() === id)) {
            return res.status(403).json({ error: 'Patient not linked to this caregiver' });
        }

        const event = await Event.create({
            userId: id,
            title,
            description,
            datetime,
            importance,
            reminderOffsets: reminderOffsets || [15],
            reminderStatus: 'pending',
            createdBy: req.user._id
        });

        res.status(201).json({ event });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get all events for a patient
 */
export const getPatientEvents = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
        if (req.user.role !== 'caregiver') {
            return res.status(403).json({ error: 'Only caregivers can access this' });
        }

        if (!req.user.linkedPatientIds.some((pid: any) => pid.toString() === id)) {
            return res.status(403).json({ error: 'Patient not linked to this caregiver' });
        }

        const events = await Event.find({ userId: id }).sort({ datetime: 1 });
        res.json({ events });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update a patient event
 */
export const updatePatientEvent = async (req: AuthRequest, res: Response) => {
    const { id } = req.params; // Event ID

    try {
        if (req.user.role !== 'caregiver') {
            return res.status(403).json({ error: 'Only caregivers can access this' });
        }

        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Verify that the event belongs to a patient linked to this caregiver
        if (!req.user.linkedPatientIds.some((pid: any) => pid.toString() === event.userId.toString())) {
            return res.status(403).json({ error: 'Not authorized to edit this event' });
        }

        const updatedEvent = await Event.findByIdAndUpdate(id, req.body, { new: true });
        res.json({ event: updatedEvent });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Delete a patient event
 */
export const deletePatientEvent = async (req: AuthRequest, res: Response) => {
    const { id } = req.params; // Event ID

    try {
        if (req.user.role !== 'caregiver') {
            return res.status(403).json({ error: 'Only caregivers can access this' });
        }

        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Verify authorization
        if (!req.user.linkedPatientIds.some((pid: any) => pid.toString() === event.userId.toString())) {
            return res.status(403).json({ error: 'Not authorized to delete this event' });
        }

        await Event.findByIdAndDelete(id);
        res.json({ message: 'Event deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
