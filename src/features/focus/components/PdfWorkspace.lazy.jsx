import React, { Suspense, lazy } from 'react';
import { FileText, Loader2, Sparkles } from 'lucide-react';

const LazyPdfWorkspace = lazy(() => import('./PdfWorkspace'));

export const PdfWorkspaceLazy = (props) => {
  return (
    <Suspense
      fallback={
        <div className="p-12 sm:p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-4 max-w-xl mx-auto shadow-xl my-8 animate-pulse">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
            <FileText className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              <span>Loading PDF Study Workspace...</span>
            </h3>
            <p className="text-xs text-slate-400">
              Initializing EmbedPDF engine, bookmarks, and annotation tools
            </p>
          </div>
        </div>
      }
    >
      <LazyPdfWorkspace {...props} />
    </Suspense>
  );
};

export default PdfWorkspaceLazy;
