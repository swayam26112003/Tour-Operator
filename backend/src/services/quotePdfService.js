
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfDirectory = path.join(__dirname, "../../uploads/quotes");

const regularFont = path.join(
  __dirname,
  "../../assets/fonts/NotoSans-Regular.woff"
);

const boldFont = path.join(
  __dirname,
  "../../assets/fonts/NotoSans-Bold.woff"
);

const rupeeFont = path.join(
  __dirname,
  "../../assets/fonts/NotoDevanagari.woff"
);

// Format numeric values without using the unsupported rupee glyph.
function formatAmount(value) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

// Draw the rupee symbol and amount using separate fonts.
function drawMoney(
  doc,
  value,
  x,
  y,
  width = 100,
  bold = false,
  fontSize = 8
) {
  const formatted = formatAmount(value);

  doc
    .font(bold ? "Noto-Bold" : "Noto")
    .fontSize(fontSize);

  const numberWidth = doc.widthOfString(formatted);

  const symbolWidth = 11;
  const gap = 3;

  const symbolX = x + width - numberWidth - symbolWidth - gap;

  doc
    .font("Rupee")
    .fontSize(fontSize)
    .text("₹", symbolX, y, {
      lineBreak: false,
    });

  doc
    .font(bold ? "Noto-Bold" : "Noto")
    .fontSize(fontSize)
    .text(formatted, symbolX + symbolWidth + gap, y, {
      lineBreak: false,
    });
}

// Format dates using UTC components to avoid timezone shifts.
function formatDate(value) {
  if (!value) return "Not specified";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "Not specified";
  }

  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(
    d.getUTCMonth() + 1
  ).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export async function generateQuotePdf(quote) {
  fs.mkdirSync(pdfDirectory, { recursive: true });

  if (
    !fs.existsSync(regularFont) ||
    !fs.existsSync(boldFont) ||
    !fs.existsSync(rupeeFont)
  ) {
    throw new Error("Required quotation PDF fonts are missing");
  }

  const filename = `${quote.quoteNumber}.pdf`;
  const filePath = path.join(pdfDirectory, filename);

  // Single-page A4 quotation.
  const doc = new PDFDocument({
    size: "A4",
    margins: {
      top: 28,
      bottom: 28,
      left: 38,
      right: 38,
    },
    bufferPages: true,
  });

  doc.registerFont("Noto", regularFont);
  doc.registerFont("Noto-Bold", boldFont);
  doc.registerFont("Rupee", rupeeFont);

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  const green = "#173B35";
  const muted = "#64746F";
  const dark = "#263B36";
  const line = "#DCE5E1";

  const snapshot = quote.snapshot || {};
  const companyName = process.env.COMPANY_NAME || "Company A";
  const companyAddress =
    process.env.COMPANY_ADDRESS || "Kochi, Kerala, India";

  const companyEmail = process.env.COMPANY_EMAIL || "";
  const companyPhone = process.env.COMPANY_PHONE || "";

  const logoPath = process.env.COMPANY_LOGO
    ? path.resolve(process.env.COMPANY_LOGO)
    : null;

  const currency = quote.currency || "INR";

  // Section heading.
  function section(title, y) {
    doc
      .font("Noto-Bold")
      .fontSize(10)
      .fillColor(green)
      .text(title.toUpperCase(), 38, y);

    doc
      .moveTo(38, y + 16)
      .lineTo(557, y + 16)
      .strokeColor(line)
      .lineWidth(0.8)
      .stroke();
  }

  // Regular detail field.
  function detail(label, value, x, y, width = 250) {
    doc
      .font("Noto-Bold")
      .fontSize(8)
      .fillColor(dark)
      .text(`${label}:`, x, y, {
        width: 100,
      });

    doc
      .font("Noto")
      .fontSize(8)
      .fillColor(dark)
      .text(String(value ?? "Not specified"), x + 100, y, {
        width: width - 100,
      });
  }

  // Currency detail field.
  function detailMoney(label, value, x, y, width = 250) {
    doc
      .font("Noto-Bold")
      .fontSize(8)
      .fillColor(dark)
      .text(`${label}:`, x, y, {
        width: 100,
      });

    if (value === undefined || value === null) {
      doc
        .font("Noto")
        .fontSize(8)
        .fillColor(dark)
        .text("Not specified", x + 100, y);

      return;
    }

    drawMoney(doc, value, x + 100, y, width - 100);
  }

  // HEADER
  doc
    .font("Noto-Bold")
    .fontSize(19)
    .fillColor(green)
    .text(companyName, 38, 28, {
      width: 340,
    });

  if (logoPath && fs.existsSync(logoPath)) {
    doc.image(logoPath, 465, 25, {
      fit: [90, 48],
      align: "right",
    });
  }

  doc
    .font("Noto")
    .fontSize(8)
    .fillColor(muted)
    .text(companyAddress, 38, 53);

  const contact = [companyEmail, companyPhone]
    .filter(Boolean)
    .join(" | ");

  if (contact) {
    doc.text(contact, 38, 66);
  }

  doc
    .font("Noto-Bold")
    .fontSize(16)
    .fillColor(green)
    .text("TRAVEL QUOTATION", 38, 91);

  doc
    .font("Noto")
    .fontSize(8)
    .fillColor(muted)
    .text(`Quote No: ${quote.quoteNumber}`, 38, 116)
    .text(`Issued: ${formatDate(quote.createdAt)}`, 235, 116)
    .text(`Valid Until: ${formatDate(quote.validUntil)}`, 410, 116);

  // TRAVELLER DETAILS
  section("Traveller Details", 143);

  detail("Name", quote.travellerName, 38, 169, 250);
  detail("Email", quote.travellerEmail, 310, 169, 247);

  detail("Phone", quote.travellerPhone, 38, 190, 250);

  detail(
    "Travellers",
    `${quote.numberOfAdults} Adults, ${quote.numberOfChildren} Children`,
    310,
    190,
    247
  );

  // TRIP DETAILS
  section("Trip Details", 222);

  detail(
    "Package",
    snapshot.packageTitle || quote.package?.title || "Travel Package",
    38,
    248,
    250
  );

  detail(
    "Destination",
    snapshot.destination || quote.package?.destination || "Not specified",
    310,
    248,
    247
  );

  detail(
    "Duration",
    snapshot.duration || quote.package?.duration || "Not specified",
    38,
    269,
    250
  );

  detail(
    "Hotel Category",
    quote.hotelCategory || "Not specified",
    310,
    269,
    247
  );

  detail("Travel Date", formatDate(quote.travelDate), 38, 290, 250);
  detail("Return Date", formatDate(quote.returnDate), 310, 290, 247);

  // PRICING BASIS
  section("Pricing Basis", 322);

  detailMoney(
    "Per Person",
    snapshot.pricePerPerson,
    38,
    348,
    250
  );

  detailMoney(
    "Twin Sharing",
    snapshot.priceTwinSharing,
    310,
    348,
    247
  );

  detail(
    "Travel Season",
    quote.travelSeason || "Not specified",
    38,
    369,
    250
  );

  detail(
    "GST Rate",
    `${quote.gstPercentage}%`,
    310,
    369,
    247
  );

  // PRICE BREAKDOWN
  section("Price Breakdown", 401);

  const headerY = 427;

  doc
    .font("Noto-Bold")
    .fontSize(8)
    .fillColor(green)
    .text("Description", 38, headerY)
    .text("Qty", 330, headerY, {
      width: 35,
      align: "right",
    })
    .text("Unit Price", 385, headerY, {
      width: 75,
      align: "right",
    })
    .text("Total", 480, headerY, {
      width: 77,
      align: "right",
    });

  let rowY = 447;

  for (const item of quote.items || []) {
    doc
      .font("Noto")
      .fontSize(8)
      .fillColor(dark)
      .text(item.description, 38, rowY, {
        width: 275,
      })
      .text(String(item.quantity), 330, rowY, {
        width: 35,
        align: "right",
      });

    drawMoney(doc, item.unitPrice, 385, rowY, 75);
    drawMoney(doc, item.totalPrice, 480, rowY, 77);

    rowY += 17;
  }

  // TOTALS
  const summaryY = Math.max(rowY + 8, 475);

  function summary(label, value, y, bold = false, negative = false) {
    doc
      .font(bold ? "Noto-Bold" : "Noto")
      .fontSize(bold ? 10 : 8)
      .fillColor(bold ? green : dark)
      .text(label, 375, y, {
        width: 90,
      });

    if (negative) {
      doc
        .font(bold ? "Noto-Bold" : "Noto")
        .fontSize(bold ? 10 : 8)
        .text("-", 465, y);

      drawMoney(doc, value, 475, y, 82, bold, bold ? 10 : 8);
    } else {
      drawMoney(doc, value, 465, y, 92, bold, bold ? 10 : 8);
    }
  }

  summary("Subtotal", quote.subtotal, summaryY);

  summary(
    "Discount",
    quote.discountAmount,
    summaryY + 17,
    false,
    true
  );

  summary(
    `GST (${quote.gstPercentage}%)`,
    quote.gstAmount,
    summaryY + 34
  );

  doc
    .moveTo(375, summaryY + 52)
    .lineTo(557, summaryY + 52)
    .strokeColor(green)
    .stroke();

  summary(
    "GRAND TOTAL",
    quote.totalAmount,
    summaryY + 60,
    true
  );

  // NOTES AND TERMS
  const notesY = Math.max(summaryY + 88, 570);

  if (quote.notes) {
    doc
      .font("Noto-Bold")
      .fontSize(8)
      .fillColor(green)
      .text("NOTES", 38, notesY);

    doc
      .font("Noto")
      .fontSize(7)
      .fillColor(dark)
      .text(quote.notes, 38, notesY + 13, {
        width: 519,
        height: 30,
        ellipsis: true,
      });
  }

  if (quote.terms) {
    doc
      .font("Noto-Bold")
      .fontSize(8)
      .fillColor(green)
      .text("TERMS & CONDITIONS", 38, notesY + 38);

    doc
      .font("Noto")
      .fontSize(7)
      .fillColor(dark)
      .text(quote.terms, 38, notesY + 51, {
        width: 519,
        height: 35,
        ellipsis: true,
      });
  }

  // FOOTER
  doc
    .font("Noto")
    .fontSize(8)
    .fillColor(muted)
    .text(
      `Thank you for choosing ${companyName}. We look forward to planning your journey.`,
      38,
      755,
      {
        width: 519,
        align: "center",
      }
    );

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return {
    filename,
    filePath,
    relativePath: `/uploads/quotes/${filename}`,
  };
}
