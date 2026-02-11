import express from 'express';
import {
    getPatients,
    getPatientProfile,
    updatePatientProfile,
    getPatientActivity,
    linkPatient,
    addMemoryForPatient,
    createEventForPatient
} from '../controllers/caregiver.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication and caregiver role
router.use(protect);
router.use(authorize('caregiver'));

router.get('/patients', getPatients);
router.get('/patient/:id/profile', getPatientProfile);
router.put('/patient/:id/profile', updatePatientProfile);
router.get('/patient/:id/activity', getPatientActivity);
router.post('/patient/link', linkPatient);
router.post('/patient/:id/memory', addMemoryForPatient);
router.post('/patient/:id/event', createEventForPatient);

export default router;
