import React from 'react';
import { ArrowRight, Sparkles, Clock } from 'lucide-react';

export const FocusToolCard = ({
  title,
  description,
  icon: Icon,
  iconBg,
  iconColor,
  tagText,
  lastOpenedText,
  onSelect,
  buttonText = 'Open Workspace'
}) => {
  return (
    <div
      onClick={onSelect}
      className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 p-7 sm:p-8 shadow-lg hover:shadow-2xl hover:border-brand-500/50 dark:hover:border-brand-500/50 transition-all duration-300 cursor-pointer flex flex-col justify-between"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Subtle background ambient glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />

      <div className="relative z-10 space-y-5">
        {/* Top Header Row */}
        <div className="flex items-center justify-between">
          <div className={`w-14 h-14 rounded-2xl ${iconBg} ${iconColor} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300`}>
            <Icon className="w-7 h-7" />
          </div>

          {tagText && (
            <span className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
              {tagText}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Last Opened Snippet (if available) */}
        {lastOpenedText && (
          <div className="flex items-center space-x-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 pt-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="truncate">Recent: <strong className="text-slate-600 dark:text-slate-400 font-semibold">{lastOpenedText}</strong></span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="relative z-10 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
          Distraction-Free
        </span>

        <button
          type="button"
          tabIndex={-1}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-brand-600 dark:bg-slate-800 dark:hover:bg-brand-600 text-white text-xs font-extrabold shadow-md group-hover:shadow-lg transition-all duration-200"
        >
          <span>{buttonText}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
