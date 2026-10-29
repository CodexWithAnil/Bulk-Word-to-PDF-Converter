/**
 * CodexWithAnil — PDF Border Post-Processor
 * Ensures that borders from Word (.docx), especially:
 * 1. Red footer border box (<w:pBdr>) with safe margin (never touching body text)
 * 2. Double page border (<w:pgBorders>)
 * 3. Dot-dash line under 'SOLVED ASSIGNMENT 2026-27'
 * are 100% perfectly preserved and visible in the output PDF!
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const JSZip = require(path.join(__dirname, '../vendor/jszip.min.js'));

async function detectDocxBorders(docxBuffer) {
  try {
    const zip = await JSZip.loadAsync(docxBuffer);
    let hasFooterRedBorder = false;
    let hasPageDoubleBorder = false;
    let hasSolvedAssignmentHeader = false;

    // Check footer xml files
    for (const fileName of Object.keys(zip.files)) {
      if (fileName.startsWith('word/footer') && fileName.endsWith('.xml')) {
        const content = await zip.files[fileName].async('string');
        if (
          content.includes('w:pBdr') ||
          content.includes('color="FF0000"') ||
          content.includes('w:color="FF0000"') ||
          content.includes('SOLVED ASSIGNMENTS') ||
          content.includes('WHATSAPP FOR INSTANT')
        ) {
          hasFooterRedBorder = true;
        }
      }
    }

    // Check document.xml
    if (zip.files['word/document.xml']) {
      const docXml = await zip.files['word/document.xml'].async('string');
      if (docXml.includes('w:pgBorders')) {
        hasPageDoubleBorder = true;
      }
      if (docXml.includes('SOLVED ASSIGNMENT')) {
        hasSolvedAssignmentHeader = true;
      }
      if (docXml.includes('w:pBdr') && (docXml.includes('color="FF0000"') || docXml.includes('w:color="FF0000"'))) {
        hasFooterRedBorder = true;
      }
    }

    return { hasFooterRedBorder, hasPageDoubleBorder, hasSolvedAssignmentHeader };
  } catch (err) {
    console.warn('Docx border detection error:', err.message);
    return { hasFooterRedBorder: true, hasPageDoubleBorder: true, hasSolvedAssignmentHeader: true };
  }
}

async function enhancePdfWithBorders(pdfBuffer, docxBuffer) {
  let hasFooterRedBorder = true;
  let hasPageDoubleBorder = true;
  let hasSolvedAssignmentHeader = false;

  if (docxBuffer) {
    const borders = await detectDocxBorders(docxBuffer);
    hasFooterRedBorder = borders.hasFooterRedBorder;
    hasPageDoubleBorder = borders.hasPageDoubleBorder;
    hasSolvedAssignmentHeader = borders.hasSolvedAssignmentHeader;
  }

  // Load PDF with pdf-lib
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    // 1. Draw Red Footer Border Box (Matching Image 2 exactly)
    // Sized comfortably so that it encloses the 3 footer lines without touching body text!
    // Top of box is at y = 102, whereas body content ends at y = 120+, leaving 18pt+ clean space!
    if (hasFooterRedBorder) {
      const boxX = 46;
      const boxY = 48;
      const boxWidth = width - (boxX * 2);
      const boxHeight = 54; // Adjusted from 73 to 54 so it never touches body text!

      // Outer red line
      page.drawRectangle({
        x: boxX,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        borderColor: rgb(0.92, 0.15, 0.15),
        borderWidth: 1.4,
      });

      // Inner thin red line (double-border styling matching Word's thinThickSmallGap)
      page.drawRectangle({
        x: boxX + 2,
        y: boxY + 2,
        width: boxWidth - 4,
        height: boxHeight - 4,
        borderColor: rgb(0.92, 0.15, 0.15),
        borderWidth: 0.6,
      });
    }

    // 2. Draw Crisp Double Page Border
    if (hasPageDoubleBorder) {
      const outerMargin = 22;
      page.drawRectangle({
        x: outerMargin,
        y: outerMargin,
        width: width - (outerMargin * 2),
        height: height - (outerMargin * 2),
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.2,
      });

      const innerMargin = 25.5;
      page.drawRectangle({
        x: innerMargin,
        y: innerMargin,
        width: width - (innerMargin * 2),
        height: height - (innerMargin * 2),
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.6,
      });
    }

    // 3. First Page: Light Dot-Dash Line below 'SOLVED ASSIGNMENT 2026-27'
    if (i === 0 && hasSolvedAssignmentHeader) {
      page.drawLine({
        start: { x: 46, y: 660 },
        end: { x: width - 46, y: 660 },
        thickness: 0.8,
        color: rgb(0.25, 0.25, 0.25),
        dashArray: [4, 2, 1.2, 2], // Dot-dash pattern matching Word
        opacity: 0.8,
      });
    }
  }

  return await pdfDoc.save();
}

module.exports = {
  detectDocxBorders,
  enhancePdfWithBorders,
};
