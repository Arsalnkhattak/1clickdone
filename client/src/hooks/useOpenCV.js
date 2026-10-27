/**
 * useOpenCV — On-demand OpenCV.js loader.
 * Does NOT load opencv.js automatically on mount.
 * Call loadCV() only when the user explicitly requests CV features (e.g. Auto Detect).
 * The page always works immediately using Canvas 2D engine.
 */
import { useState, useCallback } from 'react';

const LOCAL_OPENCV = '/opencv.js';
const LOAD_TIMEOUT_MS = 8000;

let sharedLoadPromise = null;

function loadOpenCVScript() {
  if (sharedLoadPromise) return sharedLoadPromise;

  sharedLoadPromise = new Promise((resolve, reject) => {
    // Already loaded
    if (window.cv && window.cv.Mat) {
      resolve(window.cv);
      return;
    }

    const script = document.createElement('script');
    script.src = LOCAL_OPENCV;
    script.async = true;

    const timer = setTimeout(() => {
      script.onload = null;
      script.onerror = null;
      sharedLoadPromise = null;
      reject(new Error('OpenCV load timeout'));
    }, LOAD_TIMEOUT_MS);

    script.onload = () => {
      clearTimeout(timer);
      // cv may need a moment to initialise after script load
      let attempts = 0;
      const check = setInterval(() => {
        attempts++;
        if (window.cv && window.cv.Mat) {
          clearInterval(check);
          resolve(window.cv);
        } else if (attempts > 40) {
          clearInterval(check);
          sharedLoadPromise = null;
          reject(new Error('OpenCV runtime did not initialise'));
        }
      }, 100);
    };

    script.onerror = () => {
      clearTimeout(timer);
      sharedLoadPromise = null;
      reject(new Error('Failed to load opencv.js'));
    };

    document.head.appendChild(script);
  });

  return sharedLoadPromise;
}

export function useOpenCV() {
  // Start as true so the page shows "Engine Ready" immediately — Canvas 2D always works
  const [cvReady, setCvReady] = useState(false);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvError, setCvError] = useState(null);

  // Check if already loaded (e.g. user navigated away and back)
  const isAlreadyLoaded = !!(window.cv && window.cv.Mat);

  const loadCV = useCallback(async () => {
    if (isAlreadyLoaded || cvReady) return window.cv;
    if (cvLoading) return sharedLoadPromise;

    setCvLoading(true);
    setCvError(null);
    try {
      const cv = await loadOpenCVScript();
      setCvReady(true);
      setCvLoading(false);
      return cv;
    } catch (err) {
      setCvLoading(false);
      setCvError(err.message);
      return null;
    }
  }, [isAlreadyLoaded, cvReady, cvLoading]);

  return {
    cvReady: isAlreadyLoaded || cvReady,
    cvLoading,
    cvError,
    loadCV, // call this when you actually need OpenCV
    cv: (isAlreadyLoaded || cvReady) ? window.cv : null,
  };
}
