import React, { lazy, Suspense } from 'react';
import { Loader2, FileText } from 'lucide-react';

const PdfStudyWorkspaceComponent = lazy(() => import('./PdfStudyWorkspace'));

const PdfWorkspaceFallback = () => (
  <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center space-y-3 text-center min-h-[300px]">
    <div className="p-3 bg-brand-500/10 rounded-2xl">
      <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
    </div>
    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
      Loading PDF Study Station...
    </p>
  </div>
);

export const PdfStudyWorkspaceLazy = (props) => (
  <Suspense fallback={<PdfWorkspaceFallback />}>
    <PdfStudyWorkspaceComponent {...props} />
  </Suspense>
);
