import React, { useEffect, useRef } from 'react';
import { X, BookOpen } from 'lucide-react';
import { DictionaryResult } from './DictionaryResult';
import { DictionaryLoadingState } from './DictionaryLoadingState';
import { DictionaryErrorState } from './DictionaryErrorState';
import { DictionaryRecentSearches } from './DictionaryRecentSearches';

export const DictionaryPopover = ({
  isOpen,
  onClose,
  status,
  errorType,
  errorMessage,
  result,
  submittedWord,
  recentSearches,
  onSelectWord,
  onClearHistory,
  onRetry,
  isMobileModal = false
}) => {
  const popoverRef = useRef(null);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        // Check if event was fired from input container
        const searchContainer = document.getElementById('dictionary-search-container');
        if (searchContainer && searchContainer.contains(event.target)) {
          return;
        }
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Render contents
  const renderContent = () => {
    if (status === 'loading') {
      return <DictionaryLoadingState />;
    }

    if (status === 'success' && result) {
      return <DictionaryResult result={result} onWordClick={onSelectWord} />;
    }

    if (status === 'not-found' || status === 'error' || errorType === 'empty') {
      return (
        <DictionaryErrorState
          errorType={errorType}
          submittedWord={submittedWord}
          errorMessage={errorMessage}
          onRetry={onRetry}
        />
      );
    }

    // Default idle state: show recent searches if available
    return (
      <div className="p-4 space-y-4">
        {recentSearches && recentSearches.length > 0 ? (
          <DictionaryRecentSearches
            recentSearches={recentSearches}
            onSelectWord={onSelectWord}
            onClearHistory={onClearHistory}
          />
        ) : (
          <DictionaryErrorState errorType="empty" />
        )}
      </div>
    );
  };

  // Mobile Modal Layout
  if (isMobileModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="true"
          aria-label="English Dictionary"
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Mobile Modal Sticky Header */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-brand-500" />
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                English Dictionary
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
              aria-label="Close dictionary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  // Desktop Popover Layout (Anchored below topbar input)
  return (
    <div
      ref={popoverRef}
      id="dictionary-popover-panel"
      role="region"
      aria-label="Dictionary Search Results"
      aria-live="polite"
      className="absolute top-full right-0 mt-2 w-[420px] sm:w-[480px] max-w-[calc(100vw-2rem)] max-h-[70vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col z-50 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Desktop Sticky Header */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-4 h-4 text-brand-500" />
          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
            English Dictionary
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
          aria-label="Close dictionary results"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1">
        {renderContent()}
      </div>
    </div>
  );
};
