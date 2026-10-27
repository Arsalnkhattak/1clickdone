import React, { useState } from 'react';
import { useDocumentScanner } from '../../hooks/useDocumentScanner';
import { useOpenCV } from '../../hooks/useOpenCV';
import ScannerToolbar from './ScannerToolbar';
import DocumentUpload from './DocumentUpload';
import DocumentQueue from './DocumentQueue';
import DocumentPreview from './DocumentPreview';
import PageManagementToolbar from './PageManagementToolbar';
import ImageEnhancementPanel from './ImageEnhancementPanel';
import PrintSettingsPanel from './PrintSettingsPanel';
import ExportPanel from './ExportPanel';
import ConfirmClearDialog from './ConfirmClearDialog';

export default function DocumentScanner({ initialTasks = [] }) {
  const { cvReady, cvError } = useOpenCV();

  const {
    documents,
    activeDocument,
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
    undo,
    redo,
    detectActiveCorners,
    resetActiveDocument,
  } = useDocumentScanner();

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const activeIndex = documents.findIndex((d) => d.id === activeDocumentId);

  // Navigation handlers
  const handlePreviousPage = () => {
    if (activeIndex > 0) {
      selectDocument(documents[activeIndex - 1].id);
    }
  };

  const handleNextPage = () => {
    if (activeIndex < documents.length - 1) {
      selectDocument(documents[activeIndex + 1].id);
    }
  };

  // Rotation handler
  const handleRotateActive = (delta) => {
    if (!activeDocument) return;
    const currentRot = activeDocument.rotation || 0;
    const newRot = (currentRot + delta + 360) % 360;
    updateActiveDocument({ rotation: newRot });
  };

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <ScannerToolbar
        documentCount={documents.length}
        cvReady={cvReady}
        cvError={cvError}
        isProcessing={isProcessing}
        processingMessage={processingMessage}
        onAddFiles={addFiles}
        onClearSession={() => setConfirmClearOpen(true)}
      />

      {/* Error alert banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center justify-between">
          <span>{error}</span>
        </div>
      )}

      {/* Main Workspace Body */}
      {documents.length === 0 ? (
        <DocumentUpload onAddFiles={addFiles} isProcessing={isProcessing} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Left Column: Multi-Page Queue (3 cols) */}
          <div className="xl:col-span-3">
            <DocumentQueue
              documents={documents}
              activeDocumentId={activeDocumentId}
              onSelectDocument={selectDocument}
              onAddFiles={addFiles}
              onReorderDocument={reorderDocument}
              onDuplicateDocument={duplicateDocument}
              onReplaceDocument={replaceDocument}
              onRemoveDocument={removeDocument}
            />
          </div>

          {/* Middle Column: Large Preview & Enhancement Controls (6 cols) */}
          <div className="xl:col-span-6 space-y-4">
            <DocumentPreview
              activeDocument={activeDocument}
              currentIndex={activeIndex >= 0 ? activeIndex : 0}
              totalCount={documents.length}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
              onUpdateCorners={(corners) => updateActiveDocument({ corners }, false)}
              onAutoDetectCorners={detectActiveCorners}
              onResetCorners={() => {
                if (activeDocument) {
                  updateActiveDocument({
                    corners: [
                      { x: 0, y: 0 },
                      { x: activeDocument.originalWidth, y: 0 },
                      { x: activeDocument.originalWidth, y: activeDocument.originalHeight },
                      { x: 0, y: activeDocument.originalHeight },
                    ],
                    isCropped: true,
                  });
                }
              }}
              onApplyCrop={() => {
                if (activeDocument) {
                  updateActiveDocument({ isCropped: true });
                }
              }}
            />

            <PageManagementToolbar
              documentPage={activeDocument}
              onAutoDetect={detectActiveCorners}
              onToggleCrop={() => {
                if (activeDocument) {
                  updateActiveDocument({ isCropped: !activeDocument.isCropped });
                }
              }}
              onRotate={handleRotateActive}
              onDuplicate={() => duplicateDocument(activeDocumentId)}
              onReplace={(file) => replaceDocument(activeDocumentId, file)}
              onDelete={() => removeDocument(activeDocumentId)}
            />

            <ImageEnhancementPanel
              documentPage={activeDocument}
              onUpdateSettings={(settingsPartial) => updateActiveDocument(settingsPartial)}
              onRotate={handleRotateActive}
              onReset={resetActiveDocument}
              onUndo={() => undo(activeDocumentId)}
              onRedo={() => redo(activeDocumentId)}
            />
          </div>

          {/* Right Column: Print Settings & PDF Export (3 cols) */}
          <div className="xl:col-span-3 space-y-4">
            <PrintSettingsPanel
              settings={settings}
              onUpdateSettings={updateSettings}
            />

            <ExportPanel
              documents={documents}
              activeDocument={activeDocument}
              settings={settings}
            />
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Session Clear */}
      <ConfirmClearDialog
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={clearSession}
        title="Clear Scanning Session?"
        message="Are you sure you want to remove all captured pages and reset the scanner? Any unsaved edits will be discarded."
      />
    </div>
  );
}
