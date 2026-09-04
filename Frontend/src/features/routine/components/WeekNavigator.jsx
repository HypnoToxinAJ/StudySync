import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export const WeekNavigator = ({
  currentWeekStart,
  onPrevWeek,
  onNextWeek,
  onToday,
  isCurrentWeek = false,
  visibleDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
}) => {
  // Format the week range: e.g. "September 7 – September 11, 2026"
  const formatWeekRange = () => {
    if (!currentWeekStart) return '';

    const firstDay = new Date(currentWeekStart);
    const lastDay = new Date(currentWeekStart);
    lastDay.setDate(firstDay.getDate() + (visibleDays.length - 1));

    const sameMonth = firstDay.getMonth() === lastDay.getMonth();
    const sameYear = firstDay.getFullYear() === lastDay.getFullYear();

    const startMonth = firstDay.toLocaleDateString('en-US', { month: 'long' });
    const endMonth = lastDay.toLocaleDateString('en-US', { month: 'long' });
    const startDay = firstDay.getDate();
    const endDay = lastDay.getDate();
    const year = lastDay.getFullYear();

    if (sameMonth && sameYear) {
      return `${startMonth} ${startDay} – ${endDay}, ${year}`;
    } else if (sameYear) {
      return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
    } else {
      return `${startMonth} ${startDay}, ${firstDay.getFullYear()} – ${endMonth} ${endDay}, ${year}`;
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-2 sm:p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <button
        type="button"
        onClick={onPrevWeek}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span>Previous Week</span>
      </button>

      <div className="flex items-center gap-2.5 order-first sm:order-none w-full sm:w-auto justify-center">
        <CalendarIcon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
        <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
          {formatWeekRange()}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToday}
          disabled={isCurrentWeek}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            isCurrentWeek
              ? 'text-slate-400 dark:text-slate-500 bg-slate-100/50 dark:bg-slate-800/30 cursor-default'
              : 'text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/40 border border-brand-200/60 dark:border-brand-800/60'
          }`}
        >
          Today
        </button>

        <button
          type="button"
          onClick={onNextWeek}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-colors"
        >
          <span>Next Week</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default WeekNavigator;
