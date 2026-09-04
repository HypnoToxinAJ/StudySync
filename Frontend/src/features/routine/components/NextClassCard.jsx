import React, { useState, useEffect, useMemo } from 'react';
import { Clock, MapPin, Sparkles, CheckCircle, GraduationCap } from 'lucide-react';

const formatTime12Hour = (value) => {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(AM|PM))?$/i);
  if (!match) return String(value || '');
  const minutes = match[2];
  if (match[3]) {
    return `${String(Number(match[1])).padStart(2, '0')}:${minutes} ${match[3].toUpperCase()}`;
  }
  const hour24 = Number(match[1]);
  const meridiem = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${minutes} ${meridiem}`;
};

const toMinutes = (timeStr) => {
  if (!timeStr) return null;
  const match = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

export const NextClassCard = ({ routines = [], isLoading = false }) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000); // refresh every 30 seconds for live countdown
    return () => clearInterval(timer);
  }, []);

  const nextClassInfo = useMemo(() => {
    if (!routines || routines.length === 0) return null;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todayStr = now.toISOString().split('T')[0];

    // Filter active classes for today
    const todaysClasses = routines
      .filter((r) => {
        if (!r.dayOfWeek || r.dayOfWeek.toLowerCase() !== currentDay.toLowerCase()) return false;
        if (r.effectiveStartDate && r.effectiveStartDate > todayStr) return false;
        if (r.effectiveEndDate && r.effectiveEndDate < todayStr) return false;
        return true;
      })
      .sort((a, b) => (toMinutes(a.startTime) || 0) - (toMinutes(b.startTime) || 0));

    if (todaysClasses.length === 0) {
      return { status: 'none', message: 'No classes scheduled today' };
    }

    // Find class in progress
    const activeClass = todaysClasses.find((r) => {
      const start = toMinutes(r.startTime);
      const end = toMinutes(r.endTime);
      return start !== null && end !== null && currentMinutes >= start && currentMinutes < end;
    });

    if (activeClass) {
      const end = toMinutes(activeClass.endTime);
      const remainingMinutes = end - currentMinutes;
      return {
        status: 'in-progress',
        class: activeClass,
        remainingMinutes,
        message: remainingMinutes <= 1 ? 'Ending shortly' : `Ends in ${remainingMinutes} min`
      };
    }

    // Find upcoming class
    const upcomingClass = todaysClasses.find((r) => {
      const start = toMinutes(r.startTime);
      return start !== null && start > currentMinutes;
    });

    if (upcomingClass) {
      const start = toMinutes(upcomingClass.startTime);
      const diff = start - currentMinutes;
      let countdown = '';
      if (diff <= 1) {
        countdown = 'Starts now';
      } else if (diff < 60) {
        countdown = `Starts in ${diff} min`;
      } else {
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        countdown = `Starts in ${hours} hr${hours > 1 ? 's' : ''}${mins > 0 ? ` ${mins} min` : ''}`;
      }

      return {
        status: 'upcoming',
        class: upcomingClass,
        countdown
      };
    }

    // All classes finished for today
    return { status: 'completed', message: 'No more classes today' };
  }, [routines, now]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm animate-pulse">
        <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded mb-3" />
        <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-3" />
        <div className="h-3 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    );
  }

  const cls = nextClassInfo?.class;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 sm:p-5 shadow-sm border border-slate-700/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold tracking-widest uppercase text-brand-300">
              NEXT CLASS
            </span>
            {nextClassInfo?.status === 'in-progress' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                In Progress
              </span>
            )}
            {nextClassInfo?.status === 'upcoming' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-400/20 text-brand-200 border border-brand-400/30">
                <Sparkles className="w-3 h-3 text-brand-300" />
                Upcoming
              </span>
            )}
          </div>

          {cls ? (
            <>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                  {cls.courseTitle || cls.course_title || 'Class Session'}
                </h3>
                <span className="text-xs font-bold text-brand-300 bg-brand-500/20 px-2 py-0.5 rounded-md">
                  {cls.courseId || cls.course_code}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  <span className="font-semibold">
                    {formatTime12Hour(cls.startTime)} – {formatTime12Hour(cls.endTime)}
                  </span>
                </div>
                {cls.room && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="font-semibold">
                      {cls.room}
                      {cls.building ? ` • ${cls.building}` : ''}
                    </span>
                  </div>
                )}
                {(cls.teacherName || cls.faculty) && (
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cls.teacherName || cls.faculty}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-1">
              <h3 className="text-sm sm:text-base font-bold text-slate-200">
                No more classes today
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {nextClassInfo?.message || 'You have completed all scheduled classes for today.'}
              </p>
            </div>
          )}
        </div>

        {cls && (
          <div className="sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/60">
            <div className="inline-flex sm:flex-col items-center sm:items-end gap-1.5">
              <span className="text-xs sm:text-sm font-extrabold text-amber-300 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/20 shadow-sm">
                {nextClassInfo.status === 'in-progress'
                  ? nextClassInfo.message
                  : nextClassInfo.countdown}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NextClassCard;
