import React from 'react';
import { ArrowRight } from 'lucide-react';

export const MathToolCard = ({
  title,
  description,
  badgeText,
  icon: Icon,
  accentColor = 'indigo',
  onSelect,
  buttonText = 'Open Calculator'
}) => {
  const accentStyles = {
    indigo: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      text: 'text-indigo-600 dark:text-indigo-400',
      badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
      hoverBorder: 'hover:border-indigo-500/60 dark:hover:border-indigo-500/60',
      buttonBg: 'hover:bg-indigo-600'
    },
    violet: {
      bg: 'bg-violet-500/10 dark:bg-violet-500/20',
      text: 'text-violet-600 dark:text-violet-400',
      badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20',
      hoverBorder: 'hover:border-violet-500/60 dark:hover:border-violet-500/60',
      buttonBg: 'hover:bg-violet-600'
    },
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
      hoverBorder: 'hover:border-emerald-500/60 dark:hover:border-emerald-500/60',
      buttonBg: 'hover:bg-emerald-600'
    }
  };

  const currentAccent = accentStyles[accentColor] || accentStyles.indigo;

  return (
    <div
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-8 shadow-lg hover:shadow-2xl ${currentAccent.hoverBorder} transition-all duration-300 cursor-pointer flex flex-col justify-between`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />

      <div className="relative z-10 space-y-4">
        {/* Top Icon & Badge Row */}
        <div className="flex items-center justify-between">
          <div className={`w-14 h-14 rounded-2xl ${currentAccent.bg} ${currentAccent.text} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300`}>
            <Icon className="w-7 h-7" />
          </div>

          {badgeText && (
            <span className={`px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider rounded-full border ${currentAccent.badge}`}>
              {badgeText}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="space-y-2 pt-1">
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="relative z-10 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
          Desmos v1.12
        </span>

        <button
          type="button"
          tabIndex={-1}
          className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 ${currentAccent.buttonBg} dark:bg-slate-800 text-white text-xs font-extrabold shadow-md group-hover:shadow-lg transition-all duration-200`}
        >
          <span>{buttonText}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};
