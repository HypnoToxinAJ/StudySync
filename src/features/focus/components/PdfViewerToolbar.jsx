import React from 'react';
import {
  Sidebar,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  Printer,
  Download,
  Search,
  MousePointer,
  Hand,
  Layers,
  X,
  Maximize,
  Minimize2,
  FileText
} from 'lucide-react';

export const PdfViewerToolbar = ({
  fileName,
  currentPage,
  numPages,
  goToPage,
  zoomScale,
  zoomIn,
  zoomOut,
  setZoomScale,
  fitMode,
  setFitMode,
  rotateClockwise,
  rotateCounterClockwise,
  viewMode,
  setViewMode,
  interactionTool,
  setInteractionTool,
  searchQuery,
  setSearchQuery,
  searchResults,
  onSearchPrev,
  onSearchNext,
  isSidebarOpen,
  setIsSidebarOpen,
  onPrint,
  onDownload,
  onFullscreen,
  onCloseDoc
}) => {
  return (
    <div className="p-3 bg-slate-900 text-white rounded-t-3xl border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 select-none">
      {/* Left: Sidebar Toggle, Doc Name, Page Navigation */}
      <div className="flex items-center space-x-3 flex-wrap gap-y-2">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`p-1.5 rounded-lg transition-colors ${
            isSidebarOpen ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Toggle Navigation Sidebar"
        >
          <Sidebar className="w-4 h-4" />
        </button>

        <span className="font-bold text-slate-200 truncate max-w-[150px] sm:max-w-[220px]" title={fileName}>
          {fileName || 'Document'}
        </span>

        {/* Page Nav */}
        <div className="flex items-center space-x-1 bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-700">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-40"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center space-x-1">
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={currentPage}
              onChange={(e) => goToPage(Number(e.target.value))}
              className="w-10 text-center py-0.5 bg-slate-900 border border-slate-700 rounded-md text-xs font-bold text-white outline-none"
            />
            <span className="text-slate-400 font-semibold">/ {numPages || 1}</span>
          </div>

          <button
            type="button"
            disabled={currentPage >= (numPages || 1)}
            onClick={() => goToPage(currentPage + 1)}
            className="p-1 text-slate-300 hover:text-white disabled:opacity-40"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Middle: Search Box */}
      <div className="flex items-center space-x-1.5 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700">
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search text in PDF..."
          className="w-28 sm:w-36 bg-transparent text-xs text-white placeholder-slate-400 outline-none"
        />
        {searchResults.total > 0 && (
          <span className="text-[10px] text-slate-400 font-mono">
            {searchResults.current}/{searchResults.total}
          </span>
        )}
        {searchQuery && (
          <div className="flex items-center space-x-0.5">
            <button
              type="button"
              onClick={onSearchPrev}
              className="p-0.5 text-slate-400 hover:text-white"
              title="Previous Match"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onSearchNext}
              className="p-0.5 text-slate-400 hover:text-white"
              title="Next Match"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-0.5 text-slate-400 hover:text-white"
              title="Clear Search"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Right: Zoom, Rotate, Tool, Print, Download, Close */}
      <div className="flex items-center space-x-2 flex-wrap gap-y-2">
        {/* Interaction Tool */}
        <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700">
          <button
            type="button"
            onClick={() => setInteractionTool('select')}
            className={`p-1 rounded-lg transition-colors ${
              interactionTool === 'select' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Text Select Tool"
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setInteractionTool('pan')}
            className={`p-1 rounded-lg transition-colors ${
              interactionTool === 'pan' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Hand / Pan Tool"
          >
            <Hand className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={zoomOut}
            className="p-1 text-slate-300 hover:text-white"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <select
            value={fitMode === 'custom' ? zoomScale : fitMode}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'page' || val === 'width') {
                setFitMode(val);
              } else {
                setFitMode('custom');
                setZoomScale(Number(val));
              }
            }}
            className="bg-slate-900 border border-slate-700 rounded-md text-[11px] font-bold text-white px-1.5 py-0.5 outline-none"
          >
            <option value={0.5}>50%</option>
            <option value={0.75}>75%</option>
            <option value={1.0}>100%</option>
            <option value={1.25}>125%</option>
            <option value={1.5}>150%</option>
            <option value={2.0}>200%</option>
            <option value="width">Fit Width</option>
            <option value="page">Fit Page</option>
          </select>

          <button
            type="button"
            onClick={zoomIn}
            className="p-1 text-slate-300 hover:text-white"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Rotate Controls */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={rotateCounterClockwise}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            title="Rotate Counter-Clockwise"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={rotateClockwise}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            title="Rotate Clockwise"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Actions: Print, Download, Fullscreen, Close */}
        <div className="flex items-center space-x-1 border-l border-slate-800 pl-2">
          <button
            type="button"
            onClick={onPrint}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            title="Print Document"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            title="Download Original PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onFullscreen}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            title="Fullscreen View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onCloseDoc}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
            title="Close / Change PDF"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
