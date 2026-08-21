import React from 'react';
import { ChevronUp, ChevronDown, Lock, Eye, EyeOff } from 'lucide-react';

export const SidebarSectionItem = ({
  section,
  index,
  totalCount,
  onToggleVisibility,
  onMoveUp,
  onMoveDown
}) => {
  const Icon = section.icon;
  const isLocked = section.locked;
  const isVisible = section.isVisible;

  return (
    <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
      isVisible
        ? 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-sm'
        : 'bg-slate-50/70 dark:bg-slate-800/40 border-dashed border-slate-300 dark:border-slate-800 opacity-70'
    }`}>
      {/* Left: Icon & Info */}
      <div className="flex items-center space-x-3.5 min-w-0 pr-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isVisible
            ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
        }`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {section.label}
            </h4>
            {isLocked ? (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                <Lock className="w-2.5 h-2.5" />
                <span>Required</span>
              </span>
            ) : !isVisible ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20">
                Hidden
              </span>
            ) : null}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {section.description}
          </p>
        </div>
      </div>

      {/* Right: Controls (Move Up, Move Down, Toggle Switch) */}
      <div className="flex items-center space-x-2.5 self-end sm:self-auto shrink-0">
        {/* Reorder Buttons */}
        <div className="flex items-center space-x-1 border-r border-slate-200 dark:border-slate-800 pr-2.5">
          <button
            type="button"
            disabled={index === 0 || isLocked}
            onClick={() => onMoveUp(section.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Move Section Up"
            aria-label={`Move ${section.label} up`}
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={index === totalCount - 1 || isLocked}
            onClick={() => onMoveDown(section.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Move Section Down"
            aria-label={`Move ${section.label} down`}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle Switch */}
        {isLocked ? (
          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-400 px-2 py-1">
            <Lock className="w-3.5 h-3.5" />
            <span>Always Visible</span>
          </div>
        ) : (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isVisible}
              onChange={(e) => onToggleVisibility(section.id, e.target.checked)}
              className="sr-only peer"
              aria-label={`Toggle visibility of ${section.label} in navigation`}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
          </label>
        )}
      </div>
    </div>
  );
};

export default SidebarSectionItem;
