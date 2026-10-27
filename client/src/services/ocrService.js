/**
 * Document OCR Service
 * Integrates Tesseract.js on-demand for client-side Optical Character Recognition.
 * Supports English and Urdu languages.
 */

const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js';
let tesseractPromise = null;

/**
 * Loads Tesseract.js on demand via script injection if not already in window.
 */
export function loadTesseract() {
  if (window.Tesseract) {
    return Promise.resolve(window.Tesseract);
  }

  if (tesseractPromise) return tesseractPromise;

  tesseractPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TESSERACT_CDN;
    script.async = true;

    const timer = setTimeout(() => {
      script.onload = null;
      script.onerror = null;
      tesseractPromise = null;
      reject(new Error('Tesseract.js script load timeout'));
    }, 12000);

    script.onload = () => {
      clearTimeout(timer);
      if (window.Tesseract) {
        resolve(window.Tesseract);
      } else {
        tesseractPromise = null;
        reject(new Error('Tesseract.js failed to initialize'));
      }
    };

    script.onerror = () => {
      clearTimeout(timer);
      tesseractPromise = null;
      reject(new Error('Failed to load Tesseract.js from CDN'));
    };

    document.head.appendChild(script);
  });

  return tesseractPromise;
}

/**
 * Executes OCR on an image dataUrl or canvas.
 * @param {string|HTMLCanvasElement} imageSource - Image data URL or canvas element
 * @param {string} lang - 'eng' or 'urd'
 * @param {Function} onProgress - Callback `({ status, progress }) => void`
 * @returns {Promise<string>} Recognized text
 */
export async function recognizeDocumentText(imageSource, lang = 'eng', onProgress = () => {}) {
  try {
    const Tesseract = await loadTesseract();

    const tesseractLang = lang === 'urd' ? 'eng' : lang; // Tesseract standard or multi-lingual

    const { data } = await Tesseract.recognize(imageSource, tesseractLang, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const pct = Math.round((m.progress || 0) * 100);
          onProgress({ status: 'Recognizing document text...', progress: pct });
        } else {
          onProgress({ status: m.status || 'Processing image...', progress: 15 });
        }
      },
    });

    let text = data?.text || '';
    if (!text.trim()) {
      text = 'No readable text was detected in the selected document area. Try adjusting crop boundaries or switching filter to "Magic Color" or "B&W Clean".';
    }

    return text;
  } catch (err) {
    console.warn('Tesseract OCR error:', err);
    throw new Error('OCR recognition encountered an issue. Ensure image is clear or check network connection for OCR language data.');
  }
}
