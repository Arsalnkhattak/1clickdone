import React from 'react';
import DocumentScanner from '../../components/document-scanner/DocumentScanner';

/**
 * ScanDocumentsTab — embedded inside Printing Studio tab or standalone
 */
export function ScanDocumentsTab({ tasks = [] }) {
  return <DocumentScanner initialTasks={tasks} />;
}

/**
 * Default Page export for `/scan` route
 */
export default function ScanDocumentsPage() {
  return (
    <div className="max-w-[1500px] mx-auto space-y-6">
      <DocumentScanner />
    </div>
  );
}
