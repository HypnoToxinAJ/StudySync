import React from 'react';
import {
  FileText,
  List,
  MessageSquare,
  Bookmark,
  Trash2,
  ChevronRight,
  Highlighter
} from 'lucide-react';

export const PdfSidebar = ({
  isOpen,
  tab,
  setTab,
  numPages,
  currentPage,
  goToPage,
  outline = [],
  annotations = [],
  notes = [],
  onDeleteAnnotation,
  onDeleteNote
}) => {
  if (!isOpen) return null;

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-full text-white text-xs select-none overflow-hidden">
      {/* Sidebar Tabs Header */}
      <div className="flex border-b border-slate-800 bg-slate-950/50">
        <button
          type="button"
          onClick={() => setTab('thumbnails')}
          className={`flex-1 py-2.5 flex items-center justify-center space-x-1 font-bold text-[11px] border-b-2 transition-all ${
            tab === 'thumbnails'
              ? 'border-brand-500 text-brand-400 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Pages</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('outline')}
          className={`flex-1 py-2.5 flex items-center justify-center space-x-1 font-bold text-[11px] border-b-2 transition-all ${
            tab === 'outline'
              ? 'border-brand-500 text-brand-400 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>Outline</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('notes')}
          className={`flex-1 py-2.5 flex items-center justify-center space-x-1 font-bold text-[11px] border-b-2 transition-all ${
            tab === 'notes'
              ? 'border-brand-500 text-brand-400 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Notes ({notes.length})</span>
        </button>
      </div>

      {/* Sidebar Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* PAGE THUMBNAILS TAB */}
        {tab === 'thumbnails' && (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: numPages || 1 }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => goToPage(pageNum)}
                className={`p-2 rounded-xl border text-center transition-all ${
                  currentPage === pageNum
                    ? 'bg-brand-600/20 border-brand-500 text-brand-300 font-extrabold shadow-sm'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="w-full aspect-[3/4] bg-slate-950/80 rounded border border-slate-700 flex items-center justify-center text-[11px] font-mono text-slate-400 mb-1">
                  P. {pageNum}
                </div>
                <span className="text-[10px]">Page {pageNum}</span>
              </button>
            ))}
          </div>
        )}

        {/* DOCUMENT OUTLINE TAB */}
        {tab === 'outline' && (
          <div className="space-y-1">
            {(!outline || outline.length === 0) ? (
              <p className="text-xs text-slate-500 text-center py-8 italic">
                No document bookmarks or outline available in this PDF.
              </p>
            ) : (
              outline.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => item.page && goToPage(item.page)}
                  className="w-full text-left p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-between transition-colors"
                >
                  <span className="truncate pr-2 font-medium">{item.title}</span>
                  {item.page && (
                    <span className="text-[10px] font-mono text-slate-400">p.{item.page}</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {/* NOTES & ANNOTATIONS TAB */}
        {tab === 'notes' && (
          <div className="space-y-3">
            {notes.length === 0 && annotations.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8 italic">
                No study notes or annotations added yet. Use the study tools above to add notes.
              </p>
            ) : (
              <>
                {/* Notes List */}
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => goToPage(n.page)}
                        className="text-xs font-bold text-brand-400 hover:underline flex items-center space-x-1 truncate"
                      >
                        <ChevronRight className="w-3 h-3 text-brand-500" />
                        <span className="truncate">{n.title}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(n.id)}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                        title="Delete note"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {n.selectedText && (
                      <p className="text-[10px] text-amber-300 italic border-l-2 border-amber-400 pl-2 py-0.5">
                        "{n.selectedText}"
                      </p>
                    )}

                    <p className="text-xs text-slate-200 font-medium leading-relaxed">
                      {n.content}
                    </p>

                    <span className="block text-[9px] text-slate-500 text-right font-mono">
                      Page {n.page}
                    </span>
                  </div>
                ))}

                {/* Highlights List */}
                {annotations.map((a) => (
                  <div
                    key={a.id}
                    className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => goToPage(a.page)}
                        className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center space-x-1"
                      >
                        <Highlighter className="w-3 h-3 text-amber-400" />
                        <span>Page {a.page} Highlight</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAnnotation(a.id)}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {a.text && <p className="text-[11px] text-slate-300 italic">"{a.text}"</p>}
                    {a.comment && <p className="text-[11px] text-slate-200">{a.comment}</p>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
