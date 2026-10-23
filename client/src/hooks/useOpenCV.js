/**
 * useOpenCV — loads OpenCV.js on demand (only when this hook runs).
 * The modal is only mounted when the user opens it, so this never
 * fires on a regular page load.
 */
import { useState, useEffect } from 'react';

const OPENCV_CDN = 'https://docs.opencv.org/4.9.0/opencv.js';

let loadPromise = null;

function loadOpenCV() {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (window.cv && window.cv.Mat) {
      resolve(window.cv);
      return;
    }

    const script = document.createElement('script');
    script.src = OPENCV_CDN;
    script.async = true;

    script.onload = () => {
      if (window.cv && window.cv.Mat) {
        resolve(window.cv);
      } else if (window.cv) {
        window.cv.onRuntimeInitialized = () => resolve(window.cv);
      } else {
        reject(new Error('OpenCV failed to initialize'));
      }
    };

    script.onerror = () => {
      loadPromise = null; // allow retry
      reject(new Error('Failed to load OpenCV.js — check internet connection'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

export function useOpenCV() {
  const [cvReady, setCvReady] = useState(!!(window.cv && window.cv.Mat));
  const [cvError, setCvError] = useState(null);

  useEffect(() => {
    if (cvReady) return;
    loadOpenCV()
      .then(() => setCvReady(true))
      .catch((err) => setCvError(err.message));
  }, [cvReady]);

  return { cvReady, cvError };
}
