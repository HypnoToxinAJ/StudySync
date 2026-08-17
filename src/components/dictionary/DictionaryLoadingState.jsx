import React from 'react';

export const DictionaryLoadingState = () => {
  return (
    <div className="space-y-4 p-4 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2 pb-3 border-b border-slate-200/60 dark:border-slate-800">
        <div className="h-7 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="flex items-center space-x-3">
          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
        </div>
      </div>

      {/* Meanings Skeleton 1 */}
      <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-800">
        <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-4 w-4/6 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>
      </div>

      {/* Meanings Skeleton 2 */}
      <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/50 dark:border-slate-800">
        <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-md" />
        </div>
      </div>
    </div>
  );
};
