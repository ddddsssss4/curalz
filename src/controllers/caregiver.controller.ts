import { Request, Response } from 'express';
import User from '../models/User';
import Memory from '../models/Memory';
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

        // Defensive check
        if (!req.user.linkedPatientIds) {
            req.user.linkedPatientIds = [];
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

        // Defensive check
        if (!req.user.linkedPatientIds) {
            req.user.linkedPatientIds = [];
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

        // Defensive check
        if (!req.user.linkedPatientIds) {
            req.user.linkedPatientIds = [];
        }

        if (!req.user.linkedPatientIds.some((pid: any) => pid.toString() === id)) {
            return res.status(403).json({ error: 'Patient not linked to this caregiver' });
        }

        const memories = await Memory.find({ userId: id, type: "chat" })
            .sort({ timestamp: -1 })
            .limit(Number(limit));

        res.json({
            activity: memories,
            count: memories.length
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

        // Defensive check
        if (!req.user.linkedPatientIds) {
            req.user.linkedPatientIds = [];
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
    let { message, imageUrl, mediaType, mimeType } = req.body;

    try {
        if (req.user.role !== 'caregiver') {
            return res.status(403).json({ error: 'Only caregivers can access this' });
        }

        console.log('🔍 DEBUG addMemoryForPatient:');
        console.log('  Patient ID from params:', id);
        console.log('  req.user.linkedPatientIds:', req.user.linkedPatientIds);
        console.log('  req.user object:', JSON.stringify(req.user, null, 2));

        // Defensive check: Initialize linkedPatientIds if undefined
        if (!req.user.linkedPatientIds) {
            req.user.linkedPatientIds = [];
        }

        if (!req.user.linkedPatientIds.some((pid: any) => pid.toString() === id)) {
            return res.status(403).json({ error: 'Patient not linked to this caregiver' });
        }

        if (!message && !imageUrl) {
            return res.status(400).json({ error: 'Message or Media is required' });
        }

        // If an image is provided but no message
        let rawText = message || "";
        if (imageUrl && mediaType === 'image') {
            if (!rawText) rawText = "A memory captured in this image.";
        }
        
        if (imageUrl && mediaType === 'video' && !rawText) {
             rawText = "A memory captured in this video.";
        }

        // 1. Generate embedding
        const embedding = await generateEmbedding(rawText);

        // 2. Extract entities
        const entities = await extractEntities(rawText);

        // 3. Store in MongoDB
        const qdrantId = uuidv4();
        const memory = await Memory.create({
            userId: id,
            qdrantId,
            type: "chat",
            createdBy: "caregiver",
            timestamp: new Date(),
            data: {
                rawText,
                entities,
                imageUrl,
            }
        });

        // 4. Store in Qdrant
        await storeVector(qdrantId, embedding, {
            userId: id.toString(),
            memoryId: memory._id.toString(),
            type: "chat",
            timestamp: new Date(),
            searchableText: rawText,
            rawText,
            entities,
            imageUrl,
            mediaType
        });

        res.json({
            message: 'Memory added successfully',
            memory
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Add a Photo Memory for a patient
 */
export const addPhotoMemoryForPatient = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { title, year, category, caption, imageUrl } = req.body;

    try {
        if (!req.user.linkedPatientIds?.some((pid: any) => pid.toString() === id)) {
            return res.status(403).json({ error: 'Patient not linked to this caregiver' });
        }

        if (!imageUrl) {
            return res.status(400).json({ error: 'Image URL is required' });
        }

        const searchableText = `${title || ""} ${caption || ""} ${category || ""} Photo from ${year || "the past"}`.trim();
        const embedding = await generateEmbedding(searchableText);

        const qdrantId = uuidv4();
        const memory = await Memory.create({
            userId: id,
            qdrantId,
            type: "photo",
            title,
            year,
            createdBy: "caregiver",
            timestamp: new Date(),
            data: {
                imageUrl,
                category,
                caption
            }
        });

        await storeVector(qdrantId, embedding, {
            userId: id.toString(),
            memoryId: memory._id.toString(),
            type: "photo",
            searchableText,
            timestamp: new Date(),
            title,
            year,
            category,
            imageUrl
        });

        res.json({ message: 'Photo memory added successfully', memory });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Add a Story Memory for a patient
 */
export const addStoryMemoryForPatient = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { title, year, description, mood } = req.body;

    try {
        if (!req.user.linkedPatientIds?.some((pid: any) => pid.toString() === id)) {
            return res.status(403).json({ error: 'Patient not linked to this caregiver' });
        }

        if (!description) {
            return res.status(400).json({ error: 'Description is required' });
        }

        const searchableText = `${title || ""} ${description} Mood: ${mood || ""}`.trim();
        const embedding = await generateEmbedding(searchableText);

        const qdrantId = uuidv4();
        const memory = await Memory.create({
            userId: id,
            qdrantId,
            type: "story",
            title,
            year,
            createdBy: "caregiver",
            timestamp: new Date(),
            data: {
                description,
                mood
            }
        });

        await storeVector(qdrantId, embedding, {
            userId: id.toString(),
            memoryId: memory._id.toString(),
            type: "story",
            searchableText,
            timestamp: new Date(),
            title,
            year,
            mood
        });

        res.json({ message: 'Story memory added successfully', memory });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Add a Place Memory for a patient
 */
export const addPlaceMemoryForPatient = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { placeName, address, category, description, photoUrl } = req.body;

    try {
        if (!req.user.linkedPatientIds?.some((pid: any) => pid.toString() === id)) {
            return res.status(403).json({ error: 'Patient not linked to this caregiver' });
        }

        if (!placeName) {
            return res.status(400).json({ error: 'Place name is required' });
        }

        const searchableText = `${placeName} ${address || ""} ${description || ""} ${category || ""}`.trim();
        const embedding = await generateEmbedding(searchableText);

        const qdrantId = uuidv4();
        const memory = await Memory.create({
            userId: id,
            qdrantId,
            type: "place",
            createdBy: "caregiver",
            timestamp: new Date(),
            data: {
                placeName,
                address,
                category,
                description,
                photoUrl
            }
        });

        await storeVector(qdrantId, embedding, {
            userId: id.toString(),
            memoryId: memory._id.toString(),
            type: "place",
            searchableText,
            timestamp: new Date(),
            category,
            address,
            photoUrl
        });

        res.json({ message: 'Place memory added successfully', memory });
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

        // Defensive check
        if (!req.user.linkedPatientIds) {
            req.user.linkedPatientIds = [];
        }

        console.log('🔍 DEBUG createEventForPatient:');
        console.log('  Target Patient ID:', id);
        console.log('  Caregiver Linked IDs:', req.user.linkedPatientIds);

        if (!req.user.linkedPatientIds.some((pid: any) => pid.toString() === id)) {
            console.log('  ❌ Auth Failed: ID not found in linked list');
            return res.status(403).json({
                error: 'Patient not linked to this caregiver',
                debug: {
                    requestedId: id,
                    linkedIds: req.user.linkedPatientIds,
                    idType: typeof id,
                    linkedTypes: req.user.linkedPatientIds.map((p: any) => typeof p)
                }
            });
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

        // Defensive check
        if (!req.user.linkedPatientIds) {
            req.user.linkedPatientIds = [];
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

        // Defensive check: Check if event belongs to linked patient
        if (!req.user.linkedPatientIds) {
            req.user.linkedPatientIds = [];
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

        // Defensive check
        if (!req.user.linkedPatientIds) {
            req.user.linkedPatientIds = [];
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
