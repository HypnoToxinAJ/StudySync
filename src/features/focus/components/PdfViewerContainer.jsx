import React, { useState, useMemo, useRef } from 'react';
import { PDFViewer } from '@embedpdf/react-pdf-viewer';
import {
  ArrowLeft,
  FileText,
  X,
  RotateCcw,
  Info,
  Download,
  Printer,
  Sparkles,
  Layers,
  FolderOpen
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { Modal } from '../../../components/common/Modal';

export const PdfViewerContainer = ({
  file,
  objectUrl,
  fileInfo,
  onClosePdf,
  onReplacePdf,
  onBackToTools
}) => {
  const { theme } = useTheme();
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const replaceInputRef = useRef(null);

  // Memoize EmbedPDF viewer configuration with StudySync brand colors
  const viewerConfig = useMemo(() => {
    return {
      src: objectUrl,
      theme: {
        preference: theme === 'dark' ? 'dark' : 'light',
        light: {
          accent: {
            primary: '#4F46E5',
            primaryForeground: '#FFFFFF'
          }
        },
        dark: {
          accent: {
            primary: '#6366F1',
            primaryForeground: '#FFFFFF'
          }
        }
      }
    };
  }, [objectUrl, theme]);

  const handleReplaceChange = (e) => {
    const newFile = e.target.files?.[0];
    if (newFile) {
      onReplacePdf(newFile);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-fadeIn flex flex-col h-[calc(100vh-8.5rem)] min-h-[600px]">
      {/* Hidden File Input for Replace Document */}
      <input
        ref={replaceInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleReplaceChange}
        className="hidden"
      />

      {/* Top Controls Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm shrink-0">
        {/* Left: Back & Document Metadata */}
        <div className="flex items-center space-x-3 min-w-0 pr-2">
          <button
            onClick={onBackToTools}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center space-x-1 shrink-0"
            title="Return to focus tools selection"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Tools</span>
          </button>

          <div className="flex items-center space-x-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                {fileInfo?.name || 'Document.pdf'}
              </h3>
              <p className="text-[10px] text-slate-400">
                {fileInfo?.formattedSize || 'PDF'} • PDF viewing and study markup
              </p>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
          <button
            onClick={() => setIsInfoModalOpen(true)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Document Information"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            onClick={() => replaceInputRef.current?.click()}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center space-x-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>Replace PDF</span>
          </button>

          <button
            onClick={onClosePdf}
            className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors flex items-center space-x-1"
            title="Close this PDF"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* EmbedPDF Viewer Container */}
      <div className="flex-1 rounded-3xl overflow-hidden border border-slate-200/90 dark:border-slate-800/90 shadow-2xl bg-white dark:bg-slate-950 relative">
        <PDFViewer
          config={viewerConfig}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Document Information Modal */}
      <Modal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        title="Document Information"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Filename</span>
              <p className="font-bold text-slate-900 dark:text-white mt-0.5">{fileInfo?.name}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">File Size</span>
              <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{fileInfo?.formattedSize}</p>
            </div>
            {fileInfo?.lastModified && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Last Modified</span>
                <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                  {new Date(fileInfo.lastModified).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 space-y-1">
            <p>• <strong>Viewing & Markup:</strong> Search, thumbnails, page navigation, highlights, drawings, and annotations are performed in-memory.</p>
            <p>• <strong>Exporting:</strong> Use the viewer export action to save an annotated copy with your study notes.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
