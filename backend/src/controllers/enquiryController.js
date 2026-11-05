
import * as enquiryService from "../services/enquiryService.js";
import { createActivityLog } from "../services/activityLogService.js";
import { processEnquiryWithAI } from "../services/aiEnquiryService.js";

// Activity logging is secondary to the enquiry operation. Do not return an API
// failure after the primary database write has already succeeded.
const recordActivitySafely = async (entry) => {
  try {
    await createActivityLog(entry);
  } catch (error) {
    console.error("Enquiry activity log could not be saved:", error);
  }
};

// Submit a new public enquiry.
export const submitEnquiry = async (req, res) => {
  try {
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const travellers = typeof body.travellers === "string" ? body.travellers.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const packageId = typeof body.packageId === "string" ? body.packageId.trim() : "";
    const travelDate = typeof body.travelDate === "string" ? body.travelDate.trim() : "";

    if (!name || name.length < 2 || name.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Please enter a name between 2 and 100 characters",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email) || email.length > 254) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (!/^[+]?[-\d\s().]+$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number with country code",
      });
    }

    if (!travellers || travellers.length > 80) {
      return res.status(400).json({
        success: false,
        message: "Please select the number of travellers",
      });
    }

    if (message.length > 3000) {
      return res.status(400).json({
        success: false,
        message: "Please keep your requirements under 3,000 characters",
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid travel date",
      });
    }

    const parsedTravelDate = new Date(`${travelDate}T00:00:00.000Z`);
    if (
      Number.isNaN(parsedTravelDate.getTime()) ||
      parsedTravelDate.toISOString().slice(0, 10) !== travelDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid travel date",
      });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (parsedTravelDate < today) {
      return res.status(400).json({
        success: false,
        message: "Travel date cannot be in the past",
      });
    }

    if (body.contactConsent !== true) {
      return res.status(400).json({
        success: false,
        message: "Please provide consent to be contacted about this enquiry",
      });
    }

    if (packageId) {
      const isPublishedPackage = await enquiryService.checkPublishedPackageExists(packageId);
      if (!isPublishedPackage) {
        return res.status(404).json({
          success: false,
          message: "Selected package is not currently available",
        });
      }
    }

    const enquiry = await enquiryService.createEnquiry({
      name,
      email,
      phone,
      travelDate,
      travellers,
      message,
      packageId,
    });

    // The enquiry must still succeed if activity logging is temporarily unavailable.
    try {
      await recordActivitySafely({
        action: "ENQUIRY_CREATED",
        entityType: "ENQUIRY",
        entityId: enquiry.id,
        details: {
          customerName: enquiry.name,
          packageId: enquiry.packageId,
        },
      });
    } catch (logError) {
      console.error("Enquiry created, but activity logging failed:", logError);
    }

    return res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully",
      data: enquiry,
    });
  } catch (error) {
    console.error("Submit enquiry error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit enquiry",
    });
  }
};

// Get all enquiries
export const getEnquiries = async (req, res) => {
  try {
    const enquiries = await enquiryService.getAllEnquiries(req.query);

    return res.status(200).json({
      success: true,
      count: enquiries.length,
      data: enquiries,
    });
  } catch (error) {
    console.error("Get enquiries error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch enquiries",
    });
  }
};

// Run AI extraction, package recommendations and reply drafting for an enquiry.
// This keeps the existing /:id/ai-assist route working alongside Step 17 validation.
export const runEnquiryAIAssist = async (req, res) => {
  try {
    const result = await processEnquiryWithAI(req.params.id);

    // AI processing must not be reported as failed just because activity logging failed.
    try {
      await recordActivitySafely({
        action: "AI_ASSISTANT_PROCESSED",
        entityType: "ENQUIRY",
        entityId: result.enquiryId,
        details: {
          suggestedPackageCount: result.suggestedPackages?.length || 0,
          processedAt: result.processedAt,
        },
      });
    } catch (activityError) {
      console.error("AI activity log could not be saved:", activityError);
    }

    return res.status(200).json({
      success: true,
      message: "AI enquiry assistance completed. The reply is saved as a draft and has not been sent.",
      data: result,
    });
  } catch (error) {
    console.error("AI enquiry assistant error:", error);

    const statusCode =
      error.statusCode ||
      (error.message?.includes("GEMINI_API_KEY") ? 503 : 502);

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Unable to process this enquiry with AI.",
    });
  }
};

// Get a single enquiry
export const getEnquiry = async (req, res) => {
  try {
    const enquiry = await enquiryService.getEnquiryById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: enquiry,
    });
  } catch (error) {
    console.error("Get enquiry error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch enquiry",
    });
  }
};

// Update enquiry status, priority and consultant assignment
export const updateEnquiry = async (req, res) => {
  try {
    const previous = await enquiryService.getEnquiryById(req.params.id);

    if (!previous) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    const enquiry = await enquiryService.updateEnquiry(
      req.params.id,
      req.body
    );

    // Log status changes
    if (
      req.body.status !== undefined &&
      req.body.status !== previous.status
    ) {
      await recordActivitySafely({
        action: "STATUS_CHANGED",
        entityType: "ENQUIRY",
        entityId: enquiry.id,
        details: {
          oldStatus: previous.status,
          newStatus: enquiry.status,
        },
      });
    }

    // Log priority changes
    if (
      req.body.priority !== undefined &&
      req.body.priority !== previous.priority
    ) {
      await recordActivitySafely({
        action: "PRIORITY_CHANGED",
        entityType: "ENQUIRY",
        entityId: enquiry.id,
        details: {
          oldPriority: previous.priority,
          newPriority: enquiry.priority,
        },
      });
    }

    // Log consultant assignment changes
    if (
      req.body.assignedToId !== undefined &&
      req.body.assignedToId !== previous.assignedToId
    ) {
      await recordActivitySafely({
        action: "CONSULTANT_ASSIGNED",
        entityType: "ENQUIRY",
        entityId: enquiry.id,
        details: {
          previousAssigneeId: previous.assignedToId,
          newAssigneeId: enquiry.assignedToId,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Enquiry updated successfully",
      data: enquiry,
    });
  } catch (error) {
    console.error("Update enquiry error:", error);

    return res.status(error.code === "P2025" ? 404 : 400).json({
      success: false,
      message:
        error.code === "P2025"
          ? "Enquiry or assigned user not found"
          : error.message,
    });
  }
};

// Delete enquiry
export const removeEnquiry = async (req, res) => {
  try {
    const enquiry = await enquiryService.getEnquiryById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    await enquiryService.deleteEnquiry(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Enquiry deleted successfully",
    });
  } catch (error) {
    console.error("Delete enquiry error:", error);

    return res.status(error.code === "P2025" ? 404 : 500).json({
      success: false,
      message: "Failed to delete enquiry",
    });
  }
};

// Add a private internal note
export const addNote = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Note content is required",
      });
    }

    const enquiry = await enquiryService.getEnquiryById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    const note = await enquiryService.addEnquiryNote(
      req.params.id,
      content.trim()
    );

    await recordActivitySafely({
      action: "NOTE_ADDED",
      entityType: "ENQUIRY",
      entityId: req.params.id,
      details: {
        noteId: note.id,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Internal note added successfully",
      data: note,
    });
  } catch (error) {
    console.error("Add enquiry note error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add internal note",
    });
  }
};

// Get internal notes
export const getNotes = async (req, res) => {
  try {
    const enquiry = await enquiryService.getEnquiryById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    const notes = await enquiryService.getEnquiryNotes(req.params.id);

    return res.status(200).json({
      success: true,
      count: notes.length,
      data: notes,
    });
  } catch (error) {
    console.error("Get enquiry notes error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch internal notes",
    });
  }
};

// Record incoming or outgoing customer communication
export const addMessage = async (req, res) => {
  try {
    const { content, direction } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    if (!["INBOUND", "OUTBOUND"].includes(direction)) {
      return res.status(400).json({
        success: false,
        message: "Direction must be INBOUND or OUTBOUND",
      });
    }

    const enquiry = await enquiryService.getEnquiryById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    const message = await enquiryService.addEnquiryMessage(
      req.params.id,
      content.trim(),
      direction
    );

    await recordActivitySafely({
      action: "MESSAGE_RECORDED",
      entityType: "ENQUIRY",
      entityId: req.params.id,
      details: {
        messageId: message.id,
        direction,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Communication recorded successfully",
      data: message,
    });
  } catch (error) {
    console.error("Add enquiry message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to record communication",
    });
  }
};

// Get customer communication history
export const getMessages = async (req, res) => {
  try {
    const enquiry = await enquiryService.getEnquiryById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    const messages = await enquiryService.getEnquiryMessages(req.params.id);

    return res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error("Get enquiry messages error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch communication history",
    });
  }
};
