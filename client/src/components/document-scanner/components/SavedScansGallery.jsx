import React from 'react';
import { RefreshCw, Trash2, Eye } from 'lucide-react';

export default function SavedScansGallery({
  savedDocs,
  onRefresh,
  onDeleteDocument,
}) {
  if (!savedDocs || savedDocs.length === 0) return null;

  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Saved Scans in Database ({savedDocs.length})
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {savedDocs.map((doc) => {
          const imgUrl = doc.imageUrl?.startsWith('http')
            ? doc.imageUrl
            : `http://localhost:5000${doc.imageUrl}`;

          return (
            <div
              key={doc._id}
              className="bg-slate-950 p-2 rounded-lg border border-slate-800 relative group overflow-hidden"
            >
              <img
                src={imgUrl}
                alt={doc.title || 'Scan'}
                className="w-full h-24 object-cover rounded mb-1.5 transition duration-200 group-hover:scale-105"
                onError={(e) => {
                  if (doc.imageUrl && !e.target.src.endsWith(doc.imageUrl)) {
                    e.target.src = doc.imageUrl;
                  }
                }}
              />
              <p className="text-[10px] text-slate-300 truncate font-medium">
                {doc.title}
              </p>
              <p className="text-[9px] text-slate-500 capitalize">
                {doc.aspectPreset || 'Free'} • {doc.filterMode || 'Magic'}
              </p>
              <button
                type="button"
                onClick={() => onDeleteDocument(doc._id)}
                title="Delete scan"
                className="absolute top-3 right-3 bg-red-600/90 hover:bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition shadow-lg cursor-pointer"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
