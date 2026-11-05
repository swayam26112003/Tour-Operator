import express from "express";

import {
  submitEnquiry,
  getEnquiries,
  getEnquiry,
  updateEnquiry,
  removeEnquiry,
  addNote,
  getNotes,
  addMessage,
  getMessages,
  runEnquiryAIAssist,
} from "../controllers/enquiryController.js";

const router = express.Router();

// Enquiry submission
router.post("/", submitEnquiry);

// Enquiry inbox
router.get("/", getEnquiries);

// Internal notes
router.post("/:id/notes", addNote);
router.get("/:id/notes", getNotes);

// Customer communication history
router.post("/:id/messages", addMessage);
router.get("/:id/messages", getMessages);

// AI enquiry assistant
router.post("/:id/ai-assist", runEnquiryAIAssist);

// Individual enquiry operations
router.get("/:id", getEnquiry);
router.patch("/:id", updateEnquiry);
router.delete("/:id", removeEnquiry);

export default router;