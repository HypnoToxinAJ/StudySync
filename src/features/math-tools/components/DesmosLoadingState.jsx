import React from 'react';
import { Loader2, Calculator } from 'lucide-react';

export const DesmosLoadingState = ({ toolName = 'calculator' }) => {
  return (
    <div
      aria-live="polite"
      className="w-full h-[650px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center space-y-4 p-8 text-center"
    >
      <div className="w-16 h-16 rounded-3xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-inner animate-pulse">
        <Calculator className="w-8 h-8" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center justify-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
          <span>Loading Desmos {toolName}...</span>
        </h3>
        <p className="text-xs text-slate-400">
          Initializing math engine, expression parser, and coordinate workspace
        </p>
      </div>
    </div>
  );
};
