import express from "express";

import {
  createQuoteController,
  getAllQuotesController,
  getQuoteByIdController,
  getPublicQuoteController,
  getPublicQuotePdfController,
  updateQuoteStatusController,
  deleteQuoteController,
  generateQuotePdfController,
} from "../controllers/quoteController.js";

const router = express.Router();

// Public quote sharing and PDF access
router.get("/public/:token/pdf", getPublicQuotePdfController);
router.get("/public/:token", getPublicQuoteController);

// Quotation management
router.get("/", getAllQuotesController);
router.post("/", createQuoteController);
router.patch("/:id/status", updateQuoteStatusController);
router.post("/:id/pdf", generateQuotePdfController);
router.get("/:id", getQuoteByIdController);
router.delete("/:id", deleteQuoteController);

export default router;