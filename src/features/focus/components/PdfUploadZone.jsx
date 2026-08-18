import React, { useRef, useState } from 'react';
import { FileText, UploadCloud, AlertTriangle, ShieldCheck, Lock } from 'lucide-react';
import { pdfFileUtils, MAX_PDF_FILE_SIZE_MB } from '../utils/pdfFileUtils';

export const PdfUploadZone = ({ onFileSelect, fileError }) => {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
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

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6 text-center">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-full text-xs font-bold border border-brand-500/20">
          <FileText className="w-4 h-4 text-brand-500" />
          <span>Local PDF Study Station</span>
        </div>
        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Study Your Course Materials & Textbooks
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Upload any lecture slides, lab manuals, or reference textbooks. Files remain 100% local on your device — never sent to any server.
        </p>
      </div>

      {/* DROPZONE CARD */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-8 sm:p-12 rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-4 ${
          isDragOver
            ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-3xl bg-brand-500/10 dark:bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
          <UploadCloud className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-extrabold text-slate-900 dark:text-white">
            <span className="text-brand-600 dark:text-brand-400 underline">Click to upload</span> or drag and drop PDF file
          </p>
          <p className="text-xs text-slate-400 font-medium">
            Supports PDF files up to {MAX_PDF_FILE_SIZE_MB}MB
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
        >
          Select PDF File
        </button>
      </div>

      {/* ERROR MESSAGE */}
      {fileError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center justify-center space-x-2 max-w-md mx-auto">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{fileError}</span>
        </div>
      )}

      {/* PRIVACY BADGES */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-semibold">
        <span className="flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>100% In-Browser & Local Only</span>
        </span>
        <span className="flex items-center space-x-1.5">
          <Lock className="w-4 h-4 text-brand-500" />
          <span>Zero Server Uploads</span>
        </span>
      </div>
    </div>
  );
};
