import React from 'react';
import { BookX, WifiOff, AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';

export const DictionaryErrorState = ({ errorType, submittedWord, errorMessage, onRetry }) => {
  if (errorType === 'empty') {
    return (
      <div className="p-6 text-center space-y-2">
        <HelpCircle className="w-8 h-8 text-brand-500 mx-auto" />
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          English Dictionary Search
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Enter an English word in the search box to view definitions, phonetics, and meanings.
        </p>
      </div>
    );
  }

  if (errorType === 'not-found') {
    return (
      <div className="p-6 text-center space-y-3">
        <BookX className="w-10 h-10 text-amber-500 mx-auto" />
        <div>
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
            Word not found
          </h4>
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">
            "{submittedWord}"
          </p>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          We couldn’t find definitions for this word. Please check the spelling or try searching another term.
        </p>
      </div>
    );
  }

  if (errorType === 'network') {
    return (
      <div className="p-6 text-center space-y-3">
        <WifiOff className="w-10 h-10 text-rose-500 mx-auto" />
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
          Connection Failed
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          We couldn’t reach the dictionary service. Please check your network connection and try again.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={() => onRetry(submittedWord)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        )}
      </div>
    );
  }

  // Server error or fallback
  return (
    <div className="p-6 text-center space-y-3">
      <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
        Service Unavailable
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
        {errorMessage || 'The dictionary service is temporarily unavailable.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={() => onRetry(submittedWord)}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
