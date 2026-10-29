/**
 * CodexWithAnil — Core PDF Formatting & Watermark Engine (js/pdfEngine.js)
 * 
 * Rules:
 * 1. Promotional WhatsApp number ('WHATSAPP NO.-70566-25851') inside red box is CLEANLY ERASED!
 * 2. Promotional YouTube Channel ('YouTube Channel - @ignoustudymaterial76') below red box is CLEANLY ERASED!
 * 3. Top Yellow WhatsApp Banner ('PURCHASE SOLVED ASSIGNMENT ON WHATSAPP...') is CLEANLY ERASED!
 * 4. Red Box ('THE SOLVED ASSIGNMENT, GUESS PAPER...' & 'ASSIGNMENT ON ORDER') stays 100% INTACT!
 * 5. Watermark is ALWAYS diagonal: "OPENEDU.INDIA" on every page!
 * 6. Double border frame + Top Header + Bottom Footer & Page Numbering.
 * 7. Original assignment questions and content 100% safe & untouched!
 */

const { PDFDocument, StandardFonts, rgb, degrees } = PDFLib;

function sanitizeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, ' - ')
    .replace(/\u2013/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF•]/g, '');
}

/**
 * Formats a single PDF document buffer
 */
async function formatSinglePdf(arrayBuffer) {
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const totalPages = pdfDoc.getPageCount();

  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();

    // -------------------------------------------------------------------------
    // 1. ERASE UNWANTED PROMOTIONAL BANNERS & NUMBERS (SOLID WHITEOUT)
    // -------------------------------------------------------------------------
    // A. Top Yellow WhatsApp Banner (PURCHASE SOLVED ASSIGNMENT ON WHATSAPP...)
    page.drawRectangle({
      x: 35,
      y: height - 77,
      width: width - 70,
      height: 26,
      color: rgb(1, 1, 1),
      opacity: 1,
    });

    // B. Clean top margin above page number
    page.drawRectangle({
      x: 0,
      y: height - 32,
      width: width,
      height: 32,
      color: rgb(1, 1, 1),
      opacity: 1,
    });

    // C. ERASE WHATSAPP NUMBER INSIDE THE RED BOX (WHATSAPP NO.-70566-25851)
    // Keeps the red box outline and the upper text ("THE SOLVED ASSIGNMENT... ASSIGNMENT ON ORDER") 100% intact!
    page.drawRectangle({
      x: 42,
      y: 49,
      width: width - 84,
      height: 29,
      color: rgb(1, 1, 1),
      opacity: 1,
    });

    // D. ERASE YOUTUBE CHANNEL TEXT BELOW THE RED BOX (YouTube Channel - @ignoustudymaterial76)
    page.drawRectangle({
      x: 30,
      y: 26,
      width: width - 60,
      height: 23,
      color: rgb(1, 1, 1),
      opacity: 1,
    });

    // E. Clean bottom edge margin below the double border
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: 12,
      color: rgb(1, 1, 1),
      opacity: 1,
    });

    // -------------------------------------------------------------------------
    // 2. WATERMARK: "OPENEDU.INDIA" (DIAGONAL IN BACKGROUND)
    // -------------------------------------------------------------------------
    const wmText = 'OPENEDU.INDIA';
    const fontSize = 54;
    const angle = -45;
    const rad = (angle * Math.PI) / 180;
    const tw = fontBold.widthOfTextAtSize(wmText, fontSize);
    const th = fontBold.heightAtSize(fontSize) * 0.7;
    const cx = width / 2;
    const cy = height / 2;
    const x = cx - ((tw / 2) * Math.cos(rad) - (th / 2) * Math.sin(rad));
    const y = cy - ((tw / 2) * Math.sin(rad) + (th / 2) * Math.cos(rad));

    page.drawText(wmText, {
      x,
      y,
      size: fontSize,
      font: fontBold,
      color: rgb(0.15, 0.45, 0.75),
      opacity: 0.14, // Soft background opacity, text stays 100% readable
      rotate: degrees(angle),
    });

    // -------------------------------------------------------------------------
    // 3. DOUBLE BORDER FRAME (FRAMING THE PAGE)
    // -------------------------------------------------------------------------
    const outerMargin = 12;
    page.drawRectangle({
      x: outerMargin,
      y: outerMargin,
      width: width - outerMargin * 2,
      height: height - outerMargin * 2,
      borderColor: rgb(0.1, 0.28, 0.5),
      borderWidth: 1.4,
      opacity: 0.85,
    });

    const innerMargin = 15;
    page.drawRectangle({
      x: innerMargin,
      y: innerMargin,
      width: width - innerMargin * 2,
      height: height - innerMargin * 2,
      borderColor: rgb(0.18, 0.42, 0.68),
      borderWidth: 0.6,
      opacity: 0.7,
    });

    // -------------------------------------------------------------------------
    // 4. TOP BRANDED HEADER
    // -------------------------------------------------------------------------
    const headerStr = 'CodexWithAnil • WEB DEVELOPMENT | TECH | LEARN | GROW';
    const headerY = height - 24;
    const padX = 22;

    page.drawText(headerStr, {
      x: padX,
      y: headerY,
      size: 9,
      font: fontBold,
      color: rgb(0.08, 0.22, 0.45),
    });

    page.drawLine({
      start: { x: padX, y: headerY - 5 },
      end: { x: width - padX, y: headerY - 5 },
      thickness: 0.7,
      color: rgb(0.15, 0.45, 0.75),
      opacity: 0.75,
    });

    // -------------------------------------------------------------------------
    // 5. BOTTOM BRANDED FOOTER & AUTO PAGE NUMBERING
    // -------------------------------------------------------------------------
    const footerY = 16;
    page.drawLine({
      start: { x: padX, y: footerY + 10 },
      end: { x: width - padX, y: footerY + 10 },
      thickness: 0.7,
      color: rgb(0.15, 0.45, 0.75),
      opacity: 0.75,
    });

    const footerStr = 'Created by CodexWithAnil | Web Development • Tech • Learn • Grow';
    page.drawText(footerStr, {
      x: padX,
      y: footerY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.2, 0.28, 0.38),
    });

    const pageLabel = `Page ${i + 1} of ${totalPages}`;
    const numW = fontBold.widthOfTextAtSize(pageLabel, 9);
    page.drawText(pageLabel, {
      x: width - padX - numW,
      y: footerY,
      size: 9,
      font: fontBold,
      color: rgb(0.08, 0.45, 0.78),
    });
  }

  const savedBytes = await pdfDoc.save();
  return { savedBytes, totalPages };
}

/**
 * Creates 2 demo assignment PDFs for testing
 */
async function generateTestAssignmentPdfs() {
  const list = [
    { name: 'Assignment_Notes_Sample_1.pdf', pages: 3 },
    { name: 'Assignment_Notes_Sample_2.pdf', pages: 2 },
  ];

  const files = [];
  for (const item of list) {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    for (let p = 1; p <= item.pages; p++) {
      const page = doc.addPage([612, 792]);
      const { width, height } = page.getSize();

      // Page number 1
      page.drawText(String(p), {
        x: width / 2 - 4,
        y: height - 48,
        size: 13,
        font: fontBold,
        color: rgb(0, 0, 0),
      });

      // Top unwanted yellow WhatsApp banner (which gets whited out)
      page.drawRectangle({
        x: 40,
        y: height - 74,
        width: width - 80,
        height: 20,
        color: rgb(1, 0.95, 0.15),
      });
      page.drawText('PURCHASE SOLVED ASSIGNMENT ON WHATSAPP NO-70566-25851, 8607738077', {
        x: 48,
        y: height - 68,
        size: 9.5,
        font: fontBold,
        color: rgb(0.85, 0.05, 0.05),
      });

      // Neutral Document Body Content
      page.drawText('SAMPLE ASSIGNMENT DOCUMENT', {
        x: 140,
        y: height - 130,
        size: 20,
        font: fontBold,
        color: rgb(0.12, 0.22, 0.38),
      });

      page.drawText(`Module Unit ${p} — Comprehensive Questions & Solutions`, {
        x: 48,
        y: height - 160,
        size: 11,
        font: font,
        color: rgb(0.3, 0.38, 0.48),
      });

      for (let l = 0; l < 9; l++) {
        page.drawText(`Question ${p}.${l + 1}: Detailed answer and explanation for student reference.`, {
          x: 48,
          y: height - 195 - l * 24,
          size: 10,
          font: font,
          color: rgb(0.2, 0.2, 0.2),
        });
      }

      // Red Box at bottom
      const boxY = 47.1;
      const boxH = 101.9;
      page.drawRectangle({
        x: 36,
        y: boxY,
        width: width - 72,
        height: boxH,
        borderColor: rgb(0.85, 0.2, 0.2),
        borderWidth: 1.5,
        color: rgb(1, 1, 1),
      });

      // Text inside red box
      page.drawText('THE SOLVED ASSIGNMENT, GUESS PAPER, SCAN PDF, HAND WRITTEN', {
        x: 55,
        y: boxY + 70,
        size: 9.5,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      page.drawText('ASSIGNMENT ON ORDER', {
        x: 205,
        y: boxY + 52,
        size: 10.5,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });

      // Unwanted WhatsApp Number inside red box (will be whited out!)
      page.drawText('WHATSAPP NO.-70566-25851', {
        x: 215,
        y: boxY + 16,
        size: 11,
        font: fontBold,
        color: rgb(0.85, 0.05, 0.05),
      });

      // Unwanted YouTube channel text below red box (will be whited out!)
      page.drawText('YouTube Channel - @ignoustudymaterial76', {
        x: 180,
        y: 33,
        size: 10,
        font: fontBold,
        color: rgb(0.08, 0.4, 0.85),
      });
    }

    const b = await doc.save();
    files.push(new File([new Blob([b], { type: 'application/pdf' })], item.name, { type: 'application/pdf' }));
  }

  return files;
}
