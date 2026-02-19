import { PDFDocument, PDFImage } from "pdf-lib";

// A4 dimensions in points (1 pt = 1/72 inch)
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

export interface CreatePackPdfOptions {
  imageBuffers: Buffer[];
  pageSize: "A4";
  marginPt: number;
}

/**
 * Generates a PDF where each image occupies one A4 page.
 * Images are scaled to fit within the printable area (A4 minus margins)
 * while preserving aspect ratio, and centered on the page.
 */
export async function createPackPdf(
  options: CreatePackPdfOptions
): Promise<Buffer> {
  const { imageBuffers, marginPt } = options;

  const doc = await PDFDocument.create();

  const availableWidth = A4_WIDTH_PT - marginPt * 2;
  const availableHeight = A4_HEIGHT_PT - marginPt * 2;

  for (const buffer of imageBuffers) {
    let image: PDFImage;

    // pdf-lib supports JPEG and PNG natively
    const isPng = isPngBuffer(buffer);
    if (isPng) {
      image = await doc.embedPng(buffer);
    } else {
      image = await doc.embedJpg(buffer);
    }

    const { width: imgW, height: imgH } = image;

    // Scale to fit available area, preserving aspect ratio
    const scale = Math.min(availableWidth / imgW, availableHeight / imgH);
    const drawWidth = imgW * scale;
    const drawHeight = imgH * scale;

    // Center on page
    const x = marginPt + (availableWidth - drawWidth) / 2;
    const y = marginPt + (availableHeight - drawHeight) / 2;

    const page = doc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
    page.drawImage(image, { x, y, width: drawWidth, height: drawHeight });
  }

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function isPngBuffer(buf: Buffer): boolean {
  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  return (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}
