import React from 'react';
import {
  Highlighter,
  Underline,
  Strikethrough,
  MessageSquarePlus,
  PenTool,
  Download,
  Check,
  Info
} from 'lucide-react';
import { ANNOTATION_COLORS } from '../hooks/usePdfAnnotations';

export const PdfAnnotationToolbar = ({
  activeTool,
  setActiveTool,
  activeColor,
  setActiveColor,
  onExportNotes
}) => {
  return (
    <div className="px-3 py-2 bg-slate-800 text-white border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 select-none">
      {/* Tool Selection Buttons */}
      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pr-1">
          Study Tools:
        </span>

        <button
          type="button"
          onClick={() => setActiveTool(activeTool === 'highlight' ? 'none' : 'highlight')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
            activeTool === 'highlight'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-700/70 hover:bg-slate-700 text-slate-300'
          }`}
          title="Highlight Text"
        >
          <Highlighter className="w-3.5 h-3.5" />
          <span>Highlight</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool(activeTool === 'underline' ? 'none' : 'underline')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
            activeTool === 'underline'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'bg-slate-700/70 hover:bg-slate-700 text-slate-300'
          }`}
          title="Underline Text"
        >
          <Underline className="w-3.5 h-3.5" />
          <span>Underline</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool(activeTool === 'strikethrough' ? 'none' : 'strikethrough')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
            activeTool === 'strikethrough'
              ? 'bg-rose-500 text-white shadow-sm'
              : 'bg-slate-700/70 hover:bg-slate-700 text-slate-300'
          }`}
          title="Strike-through Text"
        >
          <Strikethrough className="w-3.5 h-3.5" />
          <span>Strikethrough</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool(activeTool === 'comment' ? 'none' : 'comment')}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
            activeTool === 'comment'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'bg-slate-700/70 hover:bg-slate-700 text-slate-300'
          }`}
          title="Add Sticky Note / Comment"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          <span>Page Note</span>
        </button>
      </div>

      {/* Color Swatch & Export Action */}
      <div className="flex items-center space-x-3">
        {/* Color Palette */}
        <div className="flex items-center space-x-1 bg-slate-900/80 px-2 py-1 rounded-xl border border-slate-700">
          <span className="text-[10px] text-slate-400 font-semibold pr-1">Color:</span>
          {Object.entries(ANNOTATION_COLORS).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveColor(key)}
              style={{ backgroundColor: item.bg, borderColor: item.border }}
              className={`w-4 h-4 rounded-full border flex items-center justify-center transition-transform ${
                activeColor === key ? 'scale-125 ring-2 ring-white' : 'hover:scale-110'
              }`}
              title={item.label}
            >
              {activeColor === key && <Check className="w-2.5 h-2.5 text-slate-900 stroke-[3]" />}
            </button>
          ))}
        </div>

        {/* Export Notes Action */}
        <button
          type="button"
          onClick={onExportNotes}
          className="flex items-center space-x-1 px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Notes (.md)</span>
        </button>
      </div>
    </div>
  );
};
