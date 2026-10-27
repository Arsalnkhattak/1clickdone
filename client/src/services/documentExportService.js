/**
 * Document Export Service
 * Generates client-side PDFs via jsPDF, triggers direct browser print dialogs,
 * downloads images, and integrates with backend print jobs and tasks.
 */

import {
  getSheetDimensionsMm,
  calculate1UpPlacement,
  calculate2UpPlacement,
} from '../utils/printLayout';
import { dataUrlToBlob } from './documentScannerService';

const JSPDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
let jspdfPromise = null;

/**
 * Loads jsPDF on demand if not already available on window.
 */
export function loadJsPDF() {
  if (window.jspdf?.jsPDF) {
    return Promise.resolve(window.jspdf.jsPDF);
  }

  if (jspdfPromise) return jspdfPromise;

  jspdfPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = JSPDF_CDN;
    script.async = true;

    script.onload = () => {
      if (window.jspdf?.jsPDF) {
        resolve(window.jspdf.jsPDF);
      } else {
        reject(new Error('jsPDF failed to initialize from script'));
      }
    };

    script.onerror = () => {
      jspdfPromise = null;
      reject(new Error('Failed to load jsPDF library'));
    };

    document.head.appendChild(script);
  });

  return jspdfPromise;
}

/**
 * Helper to get natural dimensions of an image data URL.
 */
function getImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 800, height: 600 });
    img.src = dataUrl;
  });
}

/**
 * Generates a high-quality printable PDF from an array of document pages.
 * Supports:
 * - 1-up and 2-up layouts
 * - Custom and standard paper formats
 * - Margins and centering
 * - Multi-page collections
 */
export async function generateDocumentPdf(pages, settings = {}) {
  const {
    paperSize = 'A4',
    orientation = 'auto',
    marginMm = 10,
    layoutDistribution = '1-up', // '1-up' or '2-up'
    imageQuality = 0.95,
    customWidthMm = 210,
    customHeightMm = 297,
  } = settings;

  if (!pages || pages.length === 0) {
    throw new Error('No pages provided for PDF generation');
  }

  const jsPDF = await loadJsPDF();

  // Inspect first page to determine auto orientation
  const firstDims = await getImageDimensions(pages[0].processedDataUrl || pages[0].originalDataUrl);
  const sheetDims = getSheetDimensionsMm({
    paperSize,
    orientation,
    customWidthMm,
    customHeightMm,
    contentAspectRatio: firstDims.width / firstDims.height,
  });

  const pdf = new jsPDF({
    orientation: sheetDims.isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [sheetDims.widthMm, sheetDims.heightMm],
    compress: true,
  });

  if (layoutDistribution === '2-up') {
    // 2-up layout: 2 pages per sheet
    for (let i = 0; i < pages.length; i += 2) {
      if (i > 0) {
        pdf.addPage([sheetDims.widthMm, sheetDims.heightMm], sheetDims.isLandscape ? 'landscape' : 'portrait');
      }

      const pair = [pages[i], pages[i + 1]].filter(Boolean);
      const dimsList = await Promise.all(
        pair.map((p) => getImageDimensions(p.processedDataUrl || p.originalDataUrl))
      );

      const placements = calculate2UpPlacement(sheetDims, dimsList, marginMm, 5);

      for (let j = 0; j < pair.length; j++) {
        const p = pair[j];
        const pl = placements[j];
        const dataUrl = p.processedDataUrl || p.originalDataUrl;
        pdf.addImage(dataUrl, 'JPEG', pl.xMm, pl.yMm, pl.widthMm, pl.heightMm, undefined, 'FAST');
      }
    }
  } else {
    // 1-up layout: 1 page per sheet
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) {
        pdf.addPage([sheetDims.widthMm, sheetDims.heightMm], sheetDims.isLandscape ? 'landscape' : 'portrait');
      }

      const p = pages[i];
      const dataUrl = p.processedDataUrl || p.originalDataUrl;
      const dims = await getImageDimensions(dataUrl);
      const pl = calculate1UpPlacement(sheetDims, dims.width, dims.height, marginMm);

      pdf.addImage(dataUrl, 'JPEG', pl.xMm, pl.yMm, pl.widthMm, pl.heightMm, undefined, 'FAST');
    }
  }

  return pdf;
}

/**
 * Downloads a generated PDF to the user's computer.
 */
export async function downloadDocumentPdf(pages, settings = {}, filename = 'Document_Scan.pdf') {
  const pdf = await generateDocumentPdf(pages, settings);
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  return pdf;
}

/**
 * Direct print using an invisible iframe with exact @page print styling.
 * Preserves vector paper borders, resolution, and invokes native browser print.
 */
export async function triggerDirectPrint(pages, settings = {}) {
  const {
    paperSize = 'A4',
    orientation = 'auto',
    marginMm = 10,
    layoutDistribution = '1-up',
    customWidthMm = 210,
    customHeightMm = 297,
  } = settings;

  if (!pages || pages.length === 0) {
    throw new Error('No pages to print');
  }

  const firstDims = await getImageDimensions(pages[0].processedDataUrl || pages[0].originalDataUrl);
  const sheetDims = getSheetDimensionsMm({
    paperSize,
    orientation,
    customWidthMm,
    customHeightMm,
    contentAspectRatio: firstDims.width / firstDims.height,
  });

  // Create temporary iframe for silent print rendering
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();

  let bodyHtml = '';

  if (layoutDistribution === '2-up') {
    for (let i = 0; i < pages.length; i += 2) {
      const pair = [pages[i], pages[i + 1]].filter(Boolean);
      const dimsList = await Promise.all(
        pair.map((p) => getImageDimensions(p.processedDataUrl || p.originalDataUrl))
      );
      const placements = calculate2UpPlacement(sheetDims, dimsList, marginMm, 5);

      bodyHtml += `<div class="sheet">`;
      pair.forEach((p, j) => {
        const pl = placements[j];
        bodyHtml += `
          <img src="${p.processedDataUrl || p.originalDataUrl}"
               style="position: absolute; left: ${pl.xMm}mm; top: ${pl.yMm}mm; width: ${pl.widthMm}mm; height: ${pl.heightMm}mm; object-fit: contain;" />
        `;
      });
      bodyHtml += `</div>`;
    }
  } else {
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      const dataUrl = p.processedDataUrl || p.originalDataUrl;
      const dims = await getImageDimensions(dataUrl);
      const pl = calculate1UpPlacement(sheetDims, dims.width, dims.height, marginMm);

      bodyHtml += `
        <div class="sheet">
          <img src="${dataUrl}"
               style="position: absolute; left: ${pl.xMm}mm; top: ${pl.yMm}mm; width: ${pl.widthMm}mm; height: ${pl.heightMm}mm; object-fit: contain;" />
        </div>
      `;
    }
  }

  const printCss = `
    @page {
      size: ${sheetDims.widthMm}mm ${sheetDims.heightMm}mm;
      margin: 0mm;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: white;
    }
    .sheet {
      width: ${sheetDims.widthMm}mm;
      height: ${sheetDims.heightMm}mm;
      position: relative;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      background: white;
    }
    .sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    img {
      image-rendering: high-quality;
    }
  `;

  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Document</title>
        <style>${printCss}</style>
      </head>
      <body>
        ${bodyHtml}
      </body>
    </html>
  `);

  doc.close();

  // Wait for images to load inside iframe, then trigger print
  await new Promise((resolve) => setTimeout(resolve, 350));

  iframe.contentWindow.focus();
  iframe.contentWindow.print();

  // Clean up iframe after printing dialog closes
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 3000);
}

/**
 * Downloads a single page as an image file (JPEG or PNG).
 */
export function downloadPageAsImage(page, format = 'jpeg') {
  const dataUrl = page.processedDataUrl || page.originalDataUrl;
  const link = document.createElement('a');
  const ext = format === 'png' ? 'png' : 'jpg';
  link.download = `Scan_${page.originalName.replace(/\.[^/.]+$/, '')}.${ext}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
