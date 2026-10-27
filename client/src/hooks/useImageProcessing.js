/**
 * useImageProcessing Hook
 * Wraps OpenCV.js lifecycle, automatic boundary detection, perspective warping,
 * and enhancement pipeline with fallback to Canvas 2D.
 */

import { useState, useCallback } from 'react';
import { useOpenCV } from './useOpenCV';
import { detectDocumentCorners, getDefaultCorners } from '../utils/documentDetection';
import { applyPerspectiveWarp } from '../utils/perspectiveTransform';
import { applyImageEnhancements } from '../utils/imageEnhancement';
import { renderDocumentPage } from '../services/documentScannerService';

export function useImageProcessing() {
  const { cvReady, cvError } = useOpenCV();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  /**
   * Run boundary detection on an image.
   */
  const detectBoundaries = useCallback(
    async (sourceImg) => {
      setIsProcessing(true);
      setProcessingStatus('Detecting document edges...');
      try {
        const cv = window.cv;
        if (!cvReady || !cv) {
          const w = sourceImg.naturalWidth || sourceImg.width;
          const h = sourceImg.naturalHeight || sourceImg.height;
          return {
            corners: getDefaultCorners(w, h, 0.05),
            confidence: 'manual',
            detected: false,
          };
        }
        return detectDocumentCorners(cv, sourceImg);
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    },
    [cvReady]
  );

  /**
   * Re-renders a page using its current settings.
   */
  const processPage = useCallback(
    async (page) => {
      setIsProcessing(true);
      setProcessingStatus('Processing document image...');
      try {
        const cv = window.cv;
        const resultDataUrl = await renderDocumentPage(page, cv);
        return resultDataUrl;
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    },
    []
  );

  return {
    cvReady,
    cvError,
    isProcessing,
    processingStatus,
    detectBoundaries,
    processPage,
  };
}
