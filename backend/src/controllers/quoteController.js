
import {
  createQuote,
  getAllQuotes,
  getQuoteById,
  getPublicQuoteByToken,
  updateQuoteStatus,
  deleteQuote,
} from "../services/quoteService.js";
import prisma from "../config/database.js";
import { generateQuotePdf } from "../services/quotePdfService.js";
export async function createQuoteController(req, res) {
  try {
    const quote = await createQuote(req.body, req.user?.id ?? null);

    return res.status(201).json({
      success: true,
      message: "Quotation created successfully",
      data: quote,
    });
  } catch (error) {
    console.error("Create quote error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create quotation",
    });
  }
}

export async function getAllQuotesController(req, res) {
  try {
    const quotes = await getAllQuotes({
      status: req.query.status,
      packageId: req.query.packageId,
      enquiryId: req.query.enquiryId,
    });

    return res.status(200).json({
      success: true,
      count: quotes.length,
      data: quotes,
    });
  } catch (error) {
    console.error("Get quotes error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch quotations",
    });
  }
}

export async function getQuoteByIdController(req, res) {
  try {
    const quote = await getQuoteById(req.params.id);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error("Get quote error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch quotation",
    });
  }
}

export async function getPublicQuoteController(req, res) {
  try {
    const quote = await getPublicQuoteByToken(req.params.token);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found or no longer available",
      });
    }

    return res.status(200).json({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error("Get public quote error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve quotation",
    });
  }
}

export async function updateQuoteStatusController(req, res) {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Quote status is required",
      });
    }

    const quote = await updateQuoteStatus(req.params.id, status);

    return res.status(200).json({
      success: true,
      message: "Quotation status updated successfully",
      data: quote,
    });
  } catch (error) {
    console.error("Update quote status error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update quotation status",
    });
  }
}

export async function deleteQuoteController(req, res) {
  try {
    await deleteQuote(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Quotation deleted successfully",
    });
  } catch (error) {
    console.error("Delete quote error:", error);

    return res.status(404).json({
      success: false,
      message: "Quotation not found or could not be deleted",
    });
  }
}


export async function generateQuotePdfController(req, res) {
  try {
    const quote = await getQuoteById(req.params.id);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    const pdf = await generateQuotePdf(quote);

    const updatedQuote = await prisma.quote.update({
      where: { id: req.params.id },
      data: {
        pdfUrl: `/api/quotes/public/${quote.shareToken}/pdf`,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Quotation PDF generated successfully",
      data: {
        quoteId: updatedQuote.id,
        quoteNumber: updatedQuote.quoteNumber,
        pdfUrl: updatedQuote.pdfUrl,
      },
    });
  } catch (error) {
    console.error("Generate quote PDF error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate quotation PDF",
    });
  }
}


export async function getPublicQuotePdfController(req, res) {
  try {
    const quote = await getPublicQuoteByToken(req.params.token);

    if (!quote) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found or no longer available",
      });
    }

    const pdf = await generateQuotePdf(quote);

    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        pdfUrl: `/api/quotes/public/${quote.shareToken}/pdf`,
      },
    });

    return res.download(pdf.filePath, pdf.filename, (error) => {
      if (error && !res.headersSent) {
        console.error("PDF download error:", error);
        res.status(500).json({
          success: false,
          message: "Unable to download quotation PDF",
        });
      }
    });
  } catch (error) {
    console.error("Public quote PDF error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate quotation PDF",
    });
  }
}
