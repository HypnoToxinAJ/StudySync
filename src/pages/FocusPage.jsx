import React from 'react';
import {
  Flame,
  Zap,
  Clock,
  CheckCircle2,
  Calendar,
  BarChart2
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { YouTubeFocusPlayer } from '../features/focus/components/YouTubeFocusPlayer';
import { PomodoroCard } from '../features/focus/components/PomodoroCard';
import { PdfStudyWorkspaceLazy } from '../features/focus/components/PdfStudyWorkspace.lazy';

export const FocusPage = () => {
  const { focusData } = useData();

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold border border-amber-500/20 mb-2">
            <Flame className="w-4 h-4 fill-current text-amber-500" />
            <span>{focusData?.currentStreakDays || 5} Day Focus Streak</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Distraction-Free Learning & Focus Station
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Distraction-free YouTube, compact Pomodoro intervals, and local PDF study workspace
          </p>
        </div>

        {/* Quick Analytics Summary Badge */}
        <div className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Weekly Focus</span>
            <span className="text-sm font-extrabold text-brand-600 dark:text-brand-400">
              {focusData?.totalMinutesThisWeek || 420} mins
            </span>
          </div>
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Sessions Done</span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              {focusData?.sessionsCompletedThisWeek || 16}
            </span>
          </div>
        </div>
      </div>

      {/* TIER 1: YOUTUBE WORKSPACE (70-75%) + POMODORO CARD (25-30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* YouTube Primary Feature (75% on Desktop) */}
        <div className="lg:col-span-8 order-1">
          <YouTubeFocusPlayer />
        </div>

        {/* Compact Pomodoro Card (25% on Desktop) */}
        <div className="lg:col-span-4 order-2">
          <PomodoroCard />
        </div>
      </div>

      {/* TIER 2: LOCAL PDF STUDY WORKSPACE (Full Width) */}
      <div className="space-y-3">
        <PdfStudyWorkspaceLazy />
      </div>

      {/* TIER 3: FOCUS ANALYTICS & RECENT SESSIONS */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <BarChart2 className="w-5 h-5 text-brand-500" />
            <span>Recent Focus Session History</span>
          </h3>
          <span className="text-xs text-slate-400 font-semibold">
            Daily Goal: {focusData?.dailyGoalMinutes || 90} mins
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Minutes (This Week)</span>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {focusData?.totalMinutesThisWeek || 420} mins
            </h4>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400">Sessions Completed</span>
            <h4 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {focusData?.sessionsCompletedThisWeek || 16} Sessions
            </h4>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400">Focus Streak</span>
            <h4 className="text-2xl font-extrabold text-amber-500 mt-1 flex items-center space-x-1">
              <Flame className="w-6 h-6 fill-current" />
              <span>{focusData?.currentStreakDays || 5} Days</span>
            </h4>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Target Task / Subject</th>
                <th className="py-2.5 px-3 text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {(!focusData?.history || focusData.history.length === 0) ? (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-slate-400 italic">
                    No recent focus sessions recorded.
                  </td>
                </tr>
              ) : (
                focusData.history.slice(0, 5).map((session, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold whitespace-nowrap">{session.date}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{session.task}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                      {session.minutes} mins
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
