import React from 'react';
import { BookOpen } from 'lucide-react';

export const EmptyState = ({ icon: Icon = BookOpen, title = 'No Data Found', description = 'Get started by creating your first entry.', actionLabel, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
      <div className="p-4 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-2xl mb-4">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-base font-bold text-slate-900 dark:text-white">
        {title}
      </h4>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
