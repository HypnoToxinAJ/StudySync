import React from 'react';
import { AlertCircle, RotateCcw, Key, WifiOff, ArrowLeft } from 'lucide-react';

export const DesmosErrorState = ({ error, onRetry, onBackToSelector }) => {
  const isConfigMissing = error?.code === 'CONFIG_MISSING';
  const isNetworkError = error?.code === 'NETWORK_ERROR' || error?.code === 'TIMEOUT';

  return (
    <div
      role="alert"
      className="w-full min-h-[500px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6 max-w-xl mx-auto my-6"
    >
      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner ${
        isConfigMissing
          ? 'bg-amber-500/10 text-amber-500'
          : 'bg-rose-500/10 text-rose-500'
      }`}>
        {isConfigMissing ? (
          <Key className="w-8 h-8" />
        ) : isNetworkError ? (
          <WifiOff className="w-8 h-8" />
        ) : (
          <AlertCircle className="w-8 h-8" />
        )}
      </div>

      <div className="space-y-2 max-w-md">
        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
          {isConfigMissing
            ? 'Desmos Configuration Required'
            : isNetworkError
              ? 'Connection to Desmos Failed'
              : 'Calculator Loading Notice'}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {error?.message || 'The calculator could not be loaded. Please try again.'}
        </p>

        {isConfigMissing && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-300 text-left mt-3">
            <code>VITE_DESMOS_API_KEY=your_key_here</code>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {onRetry && isNetworkError && (
          <button
            onClick={onRetry}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center space-x-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        )}

        {onBackToSelector && (
          <button
            onClick={onBackToSelector}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Math Tools</span>
          </button>
        )}
      </div>
    </div>
  );
};
