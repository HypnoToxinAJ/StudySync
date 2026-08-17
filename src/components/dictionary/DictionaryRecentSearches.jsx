import React from 'react';
import { History, Trash2 } from 'lucide-react';

export const DictionaryRecentSearches = ({ recentSearches, onSelectWord, onClearHistory }) => {
  if (!recentSearches || recentSearches.length === 0) return null;

  return (
    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-800 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
          <History className="w-3.5 h-3.5 text-brand-500" />
          <span>Recent Dictionary Searches</span>
        </span>
        <button
          type="button"
          onClick={onClearHistory}
          className="text-[11px] font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center space-x-1 hover:underline"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear history</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {recentSearches.map((item) => (
          <button
            key={item.word}
            onClick={() => onSelectWord(item.word)}
            className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 hover:border-brand-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-2xs hover:shadow-sm transition-all"
          >
            {item.word}
          </button>
        ))}
      </div>
    </div>
  );
};
