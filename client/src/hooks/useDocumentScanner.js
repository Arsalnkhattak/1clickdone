/**
 * useDocumentScanner Hook
 * Central state management for Document Scanner: multi-page queue, active document,
 * non-destructive editing history (undo/redo), settings, and validation.
 */

import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { validateDocumentFile, isDuplicateFile } from '../utils/imageValidation';
import {
  createDocumentPageFromFile,
  renderDocumentPage,
} from '../services/documentScannerService';
import { detectDocumentCorners, getDefaultCorners } from '../utils/documentDetection';

const DEFAULT_SETTINGS = {
  paperSize: 'A4',
  customWidthMm: 210,
  customHeightMm: 297,
  orientation: 'auto',
  marginMm: 10,
  layoutDistribution: '1-up', // '1-up' or '2-up'
  outputFormat: 'pdf',
  imageQuality: 0.95,
  outputFileName: 'Scanned_Document.pdf',
};

export function useDocumentScanner() {
  const [documents, setDocuments] = useState([]);
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const activeDoc = documents.find((d) => d.id === activeDocumentId) || null;

  /**
   * Updates settings partial.
   */
  const updateSettings = useCallback((newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  /**
   * Adds multiple files to the document queue.
   */
  const addFiles = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    setIsProcessing(true);
    setProcessingMessage('Validating and loading document images...');
    setError(null);

    const validFiles = [];
    const filesArray = Array.from(fileList);

    for (const file of filesArray) {
      const validation = validateDocumentFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        continue;
      }

      if (isDuplicateFile(file, documents)) {
        toast(`"${file.name}" was already added; adding duplicate page.`, {
          icon: 'ℹ️',
        });
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      setIsProcessing(false);
      setProcessingMessage('');
      return;
    }

    try {
      const cv = window.cv;
      const newPages = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setProcessingMessage(`Scanning page ${i + 1} of ${validFiles.length}: ${file.name}...`);
        const page = await createDocumentPageFromFile(file, cv);
        newPages.push(page);
      }

      setDocuments((prev) => {
        const updated = [...prev, ...newPages];
        if (!activeDocumentId && updated.length > 0) {
          setActiveDocumentId(updated[0].id);
        }
        return updated;
      });

      toast.success(`${newPages.length} page${newPages.length > 1 ? 's' : ''} loaded successfully!`);
    } catch (err) {
      console.error('Error adding files:', err);
      setError(err.message || 'Failed to process some uploaded documents.');
      toast.error('Failed to load some images.');
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  }, [documents, activeDocumentId]);

  /**
   * Selects active page.
   */
  const selectDocument = useCallback((id) => {
    setActiveDocumentId(id);
  }, []);

  /**
   * Reorders documents.
   */
  const reorderDocument = useCallback((fromIndex, toIndex) => {
    setDocuments((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
  }, []);

  /**
   * Duplicates a page.
   */
  const duplicateDocument = useCallback((id) => {
    setDocuments((prev) => {
      const idx = prev.findIndex((d) => d.id === id);
      if (idx === -1) return prev;
      const orig = prev[idx];
      const copy = {
        ...orig,
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        originalName: `${orig.originalName} (Copy)`,
        undoStack: [],
        redoStack: [],
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    toast.success('Page duplicated');
  }, []);

  /**
   * Replaces a page image.
   */
  const replaceDocument = useCallback(async (id, newFile) => {
    const validation = validateDocumentFile(newFile);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsProcessing(true);
    setProcessingMessage('Replacing page...');

    try {
      const cv = window.cv;
      const newPage = await createDocumentPageFromFile(newFile, cv);
      newPage.id = id; // keep existing stable id

      setDocuments((prev) => prev.map((d) => (d.id === id ? newPage : d)));
      toast.success('Page replaced successfully');
    } catch (err) {
      toast.error('Failed to replace page');
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
    }
  }, []);

  /**
   * Removes a page.
   */
  const removeDocument = useCallback((id) => {
    setDocuments((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (activeDocumentId === id) {
        setActiveDocumentId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
    toast('Page removed');
  }, [activeDocumentId]);

  /**
   * Clears entire session.
   */
  const clearSession = useCallback(() => {
    setDocuments([]);
    setActiveDocumentId(null);
    setError(null);
    toast('Session cleared');
  }, []);

  /**
   * Takes a snapshot of document editing settings for undo history.
   */
  const createSnapshot = (doc) => ({
    corners: doc.corners ? doc.corners.map((p) => ({ ...p })) : null,
    isCropped: doc.isCropped,
    rotation: doc.rotation,
    straightenAngle: doc.straightenAngle,
    filter: doc.filter,
    brightness: doc.brightness,
    contrast: doc.contrast,
    sharpen: doc.sharpen,
  });

  /**
   * Updates settings for a document and triggers re-render.
   */
  const updateDocument = useCallback(async (id, mutator, saveUndo = true) => {
    let targetDoc = null;

    setDocuments((prev) => {
      return prev.map((doc) => {
        if (doc.id !== id) return doc;

        const snapshot = createSnapshot(doc);
        const undoStack = saveUndo ? [...doc.undoStack.slice(-19), snapshot] : doc.undoStack;
        const redoStack = saveUndo ? [] : doc.redoStack;

        const updated = typeof mutator === 'function' ? mutator(doc) : { ...doc, ...mutator };
        targetDoc = { ...updated, undoStack, redoStack };
        return targetDoc;
      });
    });

    if (targetDoc) {
      try {
        const cv = window.cv;
        const renderedUrl = await renderDocumentPage(targetDoc, cv);
        setDocuments((prev) =>
          prev.map((d) => (d.id === id ? { ...d, processedDataUrl: renderedUrl } : d))
        );
      } catch (err) {
        console.error('Failed to re-render updated page:', err);
      }
    }
  }, []);

  /**
   * Updates the currently active document.
   */
  const updateActiveDocument = useCallback(
    (mutator, saveUndo = true) => {
      if (activeDocumentId) {
        updateDocument(activeDocumentId, mutator, saveUndo);
      }
    },
    [activeDocumentId, updateDocument]
  );

  /**
   * Undo last edit on active document.
   */
  const undo = useCallback(async (id = activeDocumentId) => {
    if (!id) return;
    const doc = documents.find((d) => d.id === id);
    if (!doc || doc.undoStack.length === 0) return;

    const previousSnapshot = doc.undoStack[doc.undoStack.length - 1];
    const newUndoStack = doc.undoStack.slice(0, -1);
    const currentSnapshot = createSnapshot(doc);
    const newRedoStack = [...doc.redoStack, currentSnapshot];

    const updatedDoc = {
      ...doc,
      ...previousSnapshot,
      undoStack: newUndoStack,
      redoStack: newRedoStack,
    };

    const cv = window.cv;
    const rendered = await renderDocumentPage(updatedDoc, cv);
    updatedDoc.processedDataUrl = rendered;

    setDocuments((prev) => prev.map((d) => (d.id === id ? updatedDoc : d)));
    toast('Undo applied');
  }, [activeDocumentId, documents]);

  /**
   * Redo edit on active document.
   */
  const redo = useCallback(async (id = activeDocumentId) => {
    if (!id) return;
    const doc = documents.find((d) => d.id === id);
    if (!doc || doc.redoStack.length === 0) return;

    const nextSnapshot = doc.redoStack[doc.redoStack.length - 1];
    const newRedoStack = doc.redoStack.slice(0, -1);
    const currentSnapshot = createSnapshot(doc);
    const newUndoStack = [...doc.undoStack, currentSnapshot];

    const updatedDoc = {
      ...doc,
      ...nextSnapshot,
      undoStack: newUndoStack,
      redoStack: newRedoStack,
    };

    const cv = window.cv;
    const rendered = await renderDocumentPage(updatedDoc, cv);
    updatedDoc.processedDataUrl = rendered;

    setDocuments((prev) => prev.map((d) => (d.id === id ? updatedDoc : d)));
    toast('Redo applied');
  }, [activeDocumentId, documents]);

  /**
   * Re-detect document boundary on active page.
   */
  const detectActiveCorners = useCallback(async () => {
    if (!activeDoc) return;
    setIsProcessing(true);
    setProcessingMessage('Re-detecting document boundaries...');

    try {
      const img = new Image();
      img.onload = async () => {
        const cv = window.cv;
        let detection = {
          corners: getDefaultCorners(img.naturalWidth, img.naturalHeight, 0.05),
          confidence: 'manual',
          detected: false,
        };

        if (cv && cv.Mat) {
          detection = detectDocumentCorners(cv, img);
        }

        await updateActiveDocument({
          corners: detection.corners,
          isCropped: true,
          detectionConfidence: detection.confidence,
        });

        setIsProcessing(false);
        setProcessingMessage('');
        toast.success(
          detection.detected
            ? 'Document edges auto-detected!'
            : 'Edges adjusted to standard frame. You can drag corners to fine-tune.'
        );
      };
      img.src = activeDoc.originalDataUrl;
    } catch {
      setIsProcessing(false);
      setProcessingMessage('');
      toast.error('Could not detect corners');
    }
  }, [activeDoc, updateActiveDocument]);

  /**
   * Resets active document back to raw original image without any crop or filters.
   */
  const resetActiveDocument = useCallback(async () => {
    if (!activeDoc) return;
    const defaultCorners = getDefaultCorners(
      activeDoc.originalWidth,
      activeDoc.originalHeight,
      0.05
    );

    await updateActiveDocument({
      corners: defaultCorners,
      isCropped: false,
      rotation: 0,
      straightenAngle: 0,
      filter: 'color',
      brightness: 0,
      contrast: 0,
      sharpen: false,
    });

    toast('Document reset to original');
  }, [activeDoc, updateActiveDocument]);

  return {
    documents,
    activeDocument: activeDoc,
    activeDocumentId,
    isProcessing,
    processingMessage,
    error,
    settings,
    updateSettings,
    addFiles,
    selectDocument,
    reorderDocument,
    duplicateDocument,
    replaceDocument,
    removeDocument,
    clearSession,
    updateActiveDocument,
    updateDocument,
    undo,
    redo,
    detectActiveCorners,
    resetActiveDocument,
  };
}
