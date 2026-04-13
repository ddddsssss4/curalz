import express from "express";
import { getMemoriesByType, createContact, getContacts } from "../controllers/patient.controller";
import { protect } from "../middleware/auth.middleware";

const router = express.Router();

router.get("/memories/:type", protect, getMemoriesByType);
router.post("/contacts", protect, createContact);
router.get("/contacts", protect, getContacts);

export default router;
