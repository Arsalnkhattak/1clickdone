import React, { useRef } from 'react';
import DocumentThumbnail from './DocumentThumbnail';
import { HiOutlinePlus, HiOutlineCollection } from 'react-icons/hi';

export default function DocumentQueue({
  documents = [],
  activeDocumentId,
  onSelectDocument,
  onAddFiles,
  onReorderDocument,
  onDuplicateDocument,
  onReplaceDocument,
  onRemoveDocument,
}) {
  const addInputRef = useRef(null);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-xs flex flex-col h-full max-h-[750px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-1.5">
          <HiOutlineCollection className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Document Queue ({documents.length})
          </span>
        </div>

        <button
          type="button"
          onClick={() => addInputRef.current?.click()}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          <HiOutlinePlus className="w-3.5 h-3.5" />
          Add Pages
        </button>
        <input
          ref={addInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              onAddFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
      </div>

      {/* Pages List */}
      <div className="flex-1 overflow-y-auto pt-3 space-y-2 pr-1 scrollbar-thin">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400 space-y-2">
            <HiOutlineCollection className="w-8 h-8 text-gray-300" />
            <p className="text-xs">No document pages added yet.</p>
          </div>
        ) : (
          documents.map((page, idx) => (
            <DocumentThumbnail
              key={page.id}
              page={page}
              index={idx}
              totalCount={documents.length}
              isActive={page.id === activeDocumentId}
              onSelect={() => onSelectDocument(page.id)}
              onMoveUp={() => onReorderDocument(idx, idx - 1)}
              onMoveDown={() => onReorderDocument(idx, idx + 1)}
              onDuplicate={() => onDuplicateDocument(page.id)}
              onReplace={(file) => onReplaceDocument(page.id, file)}
              onRemove={() => onRemoveDocument(page.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
