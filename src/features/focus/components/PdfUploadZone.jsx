import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Clock,
  HardDrive,
  FileCheck,
  FolderOpen
} from 'lucide-react';
import { MAX_PDF_FILE_SIZE_MB } from '../utils/pdfFileUtils';
import { focusPreferenceService } from '../services/focusPreferenceService';

export const PdfUploadZone = ({
  onFileSelected,
  isLoading,
  error,
  onBackToTools
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const recentPdfs = focusPreferenceService.getRecentPdfs();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileSelected(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      onFileSelected(droppedFile);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToTools}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center space-x-1.5 text-xs font-bold"
            title="Return to tool selector"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to tools</span>
          </button>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
              <FileText className="w-6 h-6 text-indigo-500" />
              <span>PDF Study Viewer</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Open local course slides, research papers, and textbook chapters for distraction-free reading
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-start space-x-3 text-xs animate-fadeIn">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Invalid Document</p>
            <p className="opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative overflow-hidden p-8 sm:p-14 rounded-3xl border-2 border-dashed transition-all duration-300 text-center cursor-pointer ${
          isDragOver
            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-brand-500 scale-[1.01] shadow-2xl'
            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 hover:border-brand-500/80 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 shadow-xl'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-md mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white transition-all duration-300">
            <Upload className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {isDragOver ? 'Drop PDF here to open' : 'Select or drag a PDF document'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supports textbooks, lecture slides, assignments, and study materials up to {MAX_PDF_FILE_SIZE_MB}MB
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={isLoading}
              className="px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-extrabold shadow-lg shadow-brand-600/25 transition-all inline-flex items-center space-x-2"
            >
              <FolderOpen className="w-4 h-4" />
              <span>{isLoading ? 'Opening PDF...' : 'Choose PDF File'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-start space-x-3 text-xs text-slate-500 dark:text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-700 dark:text-slate-300 font-bold">100% In-Browser Privacy:</strong> Your PDF document stays strictly in your browser memory and is <strong className="text-slate-700 dark:text-slate-300 font-bold">never uploaded</strong> to any server, cloud storage, or external service.
        </p>
      </div>

      {/* Recent Documents Section */}
      {recentPdfs.length > 0 && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-extrabold text-slate-900 dark:text-white">
              <Clock className="w-4 h-4 text-brand-500" />
              <span>Recent PDF Documents</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">
              Re-select document file to resume
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {recentPdfs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => fileInputRef.current?.click()}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-left transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-brand-600 transition-colors">
                      {doc.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {doc.formattedSize} • Opened {new Date(doc.lastOpened).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <span className="text-xs text-brand-600 dark:text-brand-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  Open
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
