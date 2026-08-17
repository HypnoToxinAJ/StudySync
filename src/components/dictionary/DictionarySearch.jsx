import React, { useRef, useEffect, useState } from 'react';
import { BookOpen, Search, X, Loader2 } from 'lucide-react';
import { useDictionary } from '../../hooks/useDictionary';
import { DictionaryPopover } from './DictionaryPopover';

export const DictionarySearch = () => {
  const {
    query,
    setQuery,
    submittedWord,
    result,
    status,
    errorType,
    errorMessage,
    recentSearches,
    isOpen,
    setIsOpen,
    searchWord,
    clearSearch,
    clearRecentSearches
  } = useDictionary();

  const inputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

  // Global Keyboard Shortcut: Cmd/Ctrl + Shift + D to focus search input
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
        } else {
          setIsMobileModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      searchWord(query);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleWordSelectFromRecent = (word) => {
    searchWord(word);
  };

  const handleRetry = (word) => {
    searchWord(word, { skipCache: true });
  };

  return (
    <div id="dictionary-search-container" className="relative flex items-center">
      {/* DESKTOP DICTIONARY SEARCH CONTROL (Visible on xl screens to left of date) */}
      <div className="hidden xl:flex items-center">
        <form
          onSubmit={handleSubmit}
          role="search"
          aria-label="English Dictionary Search"
          className="relative flex items-center"
        >
          <div className="relative flex items-center">
            <BookOpen className="absolute left-3 w-4 h-4 text-brand-500 pointer-events-none" />

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={handleInputFocus}
              placeholder="Dictionary search..."
              aria-label="Search English dictionary"
              aria-expanded={isOpen}
              aria-controls="dictionary-popover-panel"
              title="Search English Dictionary (Ctrl+Shift+D)"
              className="w-44 lg:w-48 pl-9 pr-14 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 focus:border-brand-500 dark:focus:border-brand-400 focus:bg-white dark:focus:bg-slate-900 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 transition-all font-medium"
            />

            {/* Clear or Loading Icon */}
            <div className="absolute right-7 flex items-center">
              {status === 'loading' ? (
                <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin" />
              ) : query ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear dictionary search"
                  className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {/* Search Submit Button */}
            <button
              type="submit"
              aria-label="Submit dictionary search"
              className="absolute right-1.5 p-1 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <Search className="w-3 h-3" />
            </button>
          </div>
        </form>

        {/* Desktop Popover */}
        <DictionaryPopover
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          status={status}
          errorType={errorType}
          errorMessage={errorMessage}
          result={result}
          submittedWord={submittedWord}
          recentSearches={recentSearches}
          onSelectWord={handleWordSelectFromRecent}
          onClearHistory={clearRecentSearches}
          onRetry={handleRetry}
        />
      </div>

      {/* TABLET & MOBILE DICTIONARY ICON BUTTON */}
      <div className="xl:hidden">
        <button
          type="button"
          onClick={() => {
            setIsMobileModalOpen(true);
            setIsOpen(true);
            setTimeout(() => {
              if (mobileInputRef.current) mobileInputRef.current.focus();
            }, 100);
          }}
          aria-label="Open English Dictionary"
          title="English Dictionary"
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1.5"
        >
          <BookOpen className="w-5 h-5 text-brand-500" />
        </button>

        {/* Mobile Responsive Modal */}
        {isMobileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col overflow-hidden">
              {/* Modal Header with Search Input */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-brand-500" />
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      English Dictionary
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsMobileModalOpen(false)}
                    aria-label="Close modal"
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="relative flex items-center">
                  <BookOpen className="absolute left-3 w-4 h-4 text-brand-500 pointer-events-none" />
                  <input
                    ref={mobileInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search a word..."
                    className="w-full pl-9 pr-16 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-brand-500 rounded-xl outline-none text-slate-900 dark:text-white placeholder-slate-400 font-medium"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-9 p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="absolute right-1.5 p-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* Modal Body Results */}
              <div className="overflow-y-auto flex-1">
                <DictionaryPopover
                  isOpen={true}
                  onClose={() => setIsMobileModalOpen(false)}
                  status={status}
                  errorType={errorType}
                  errorMessage={errorMessage}
                  result={result}
                  submittedWord={submittedWord}
                  recentSearches={recentSearches}
                  onSelectWord={handleWordSelectFromRecent}
                  onClearHistory={clearRecentSearches}
                  onRetry={handleRetry}
                  isMobileModal={true}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
