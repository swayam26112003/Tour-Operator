import PDFDocument from "pdfkit";
import fs from "fs";

const doc = new PDFDocument();

doc.registerFont(
  "Noto",
  "./assets/fonts/NotoSans-Regular.woff"
);

doc.registerFont(
  "Devanagari",
  "./assets/fonts/NotoDevanagari.woff"
);

doc.pipe(fs.createWriteStream("rupee-test.pdf"));

doc.font("Noto").fontSize(20);
doc.text("Company A - Travel Quotation");

doc.moveDown(2);

doc.font("Devanagari").fontSize(24);
doc.text("₹");

doc.font("Noto").fontSize(20);
doc.text("15,999.00");

doc.moveDown();

doc.font("Devanagari").fontSize(24);
doc.text("₹");

doc.font("Noto").fontSize(20);
doc.text("16,798.95");

doc.end();

console.log("Rupee test PDF generated.");