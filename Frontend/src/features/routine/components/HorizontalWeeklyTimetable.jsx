import React, { useMemo } from 'react';
import { Edit3, Copy, Trash2, CalendarX } from 'lucide-react';

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

export const HorizontalWeeklyTimetable = ({
  routines = [],
  visibleDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  weekDates = {},
  isLoading = false,
  onEdit,
  onDuplicate,
  onDelete
}) => {
  const todayName = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long' });
  }, []);

  // Compute earliest start hour and latest end hour dynamically based on routines
  const { minHour, maxHour, timeSlots } = useMemo(() => {
    let earliest = 8; // default 08:00
    let latest = 17; // default 17:00 (ends at 18:00)

    routines.forEach((r) => {
      const start = toMinutes(r.startTime);
      const end = toMinutes(r.endTime);
      if (start !== null) {
        const h = Math.floor(start / 60);
        if (h < earliest) earliest = Math.max(6, h);
      }
      if (end !== null) {
        const h = Math.ceil(end / 60);
        if (h > latest) latest = Math.min(22, h);
      }
    });

    const slots = [];
    for (let h = earliest; h <= latest; h++) {
      const nextH = h + 1;
      const formatSlotHour = (hour) => {
        const m = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        return `${String(h12).padStart(2, '0')}:00 ${m}`;
      };
      const start12 = formatSlotHour(h);
      const end12 = formatSlotHour(nextH);
      const label = `${start12} – ${end12}`;
      slots.push({ hour: h, nextHour: nextH, start12, end12, label });
    }

    return { minHour: earliest, maxHour: latest + 1, timeSlots: slots };
  }, [routines]);

  const rowHeight = 60; // compact pixels per hour (reduced from 92px)
  const totalGridHeight = timeSlots.length * rowHeight;
  const totalMinutes = (maxHour - minHour) * 60;

  // Group routines by day and calculate layout positions with overlap handling
  const positionedByDay = useMemo(() => {
    const map = {};
    visibleDays.forEach((day) => {
      const dayClasses = routines
        .filter((r) => r.dayOfWeek?.toLowerCase() === day.toLowerCase())
        .sort((a, b) => (toMinutes(a.startTime) || 0) - (toMinutes(b.startTime) || 0));

      // Overlap detection
      const clusters = [];
      dayClasses.forEach((cls) => {
        const start = toMinutes(cls.startTime) ?? minHour * 60;
        const end = toMinutes(cls.endTime) ?? start + 50;

        let placed = false;
        for (const cluster of clusters) {
          const overlaps = cluster.some((c) => {
            const cStart = toMinutes(c.startTime) ?? minHour * 60;
            const cEnd = toMinutes(c.endTime) ?? cStart + 50;
            return start < cEnd && end > cStart;
          });
          if (overlaps) {
            cluster.push(cls);
            placed = true;
            break;
          }
        }
        if (!placed) {
          clusters.push([cls]);
        }
      });

      const positioned = [];
      clusters.forEach((cluster) => {
        const totalInCluster = cluster.length;
        cluster.forEach((cls, idx) => {
          const start = toMinutes(cls.startTime) ?? minHour * 60;
          const end = toMinutes(cls.endTime) ?? start + 50;
          const duration = Math.max(30, end - start);

          const top = Math.max(0, ((start - minHour * 60) / totalMinutes) * totalGridHeight);
          const rawHeight = (duration / totalMinutes) * totalGridHeight;
          const height = Math.min(48, Math.max(38, rawHeight - 4));

          const widthPercent = 100 / totalInCluster;
          const leftPercent = idx * widthPercent;

          positioned.push({
            routine: cls,
            top,
            height,
            widthPercent,
            leftPercent
          });
        });
      });

      map[day] = positioned;
    });

    return map;
  }, [routines, visibleDays, minHour, maxHour, totalMinutes, totalGridHeight]);

  const totalClassesInWeek = useMemo(() => {
    return routines.filter((r) =>
      visibleDays.some((d) => d.toLowerCase() === r.dayOfWeek?.toLowerCase())
    ).length;
  }, [routines, visibleDays]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm animate-pulse space-y-4">
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-6 gap-3 h-96">
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl" />
          <div className="bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl" />
          <div className="bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl" />
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
      {/* Scrollable Container */}
      <div className="overflow-x-auto relative scrollbar-thin">
        <div className="min-w-[780px] sm:min-w-[900px] flex flex-col">
          {/* Timetable Header Row */}
          <div className="grid grid-cols-[85px_repeat(auto-fit,minmax(120px,1fr))] border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 sticky top-0 z-20"
               style={{ gridTemplateColumns: `85px repeat(${visibleDays.length}, minmax(120px, 1fr))` }}>
            {/* Time Column Header */}
            <div className="p-2 text-center border-r border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/70 sticky left-0 z-30">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Time
              </span>
            </div>

            {/* Day Column Headers */}
            {visibleDays.map((day) => {
              const isToday = day.toLowerCase() === todayName.toLowerCase();
              const dateNumber = weekDates[day];

              return (
                <div
                  key={day}
                  className={`p-2 text-center border-r last:border-r-0 border-slate-200 dark:border-slate-800 transition-colors ${
                    isToday
                      ? 'bg-brand-500/10 dark:bg-brand-950/40 border-b-2 border-b-brand-600 dark:border-b-brand-400'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span
                      className={`text-[11px] font-black uppercase tracking-wider ${
                        isToday
                          ? 'text-brand-600 dark:text-brand-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {day}
                    </span>
                    {isToday && (
                      <span className="px-1 py-0.2 rounded text-[8px] font-extrabold bg-brand-600 text-white shadow-xs">
                        Today
                      </span>
                    )}
                  </div>
                  {dateNumber && (
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 block">
                      {dateNumber}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Timetable Body / Time Grid */}
          {totalClassesInWeek === 0 ? (
            <div className="p-12 text-center my-6 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <CalendarX className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No classes scheduled
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                There are no classes scheduled for this period.
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-[85px_repeat(auto-fit,minmax(120px,1fr))] relative"
              style={{
                gridTemplateColumns: `85px repeat(${visibleDays.length}, minmax(120px, 1fr))`,
                height: `${totalGridHeight}px`
              }}
            >
              {/* Left Column: 12-Hour Time Slot Labels */}
              <div className="border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20 sticky left-0 z-10 select-none">
                {timeSlots.map((slot) => (
                  <div
                    key={slot.hour}
                    className="border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-center px-2 text-right"
                    style={{ height: `${rowHeight}px` }}
                  >
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-none">
                      {slot.start12}
                    </span>
                    <span className="text-[8px] font-medium text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                      to {slot.end12}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {visibleDays.map((day) => {
                const isToday = day.toLowerCase() === todayName.toLowerCase();
                const items = positionedByDay[day] || [];

                return (
                  <div
                    key={day}
                    className={`relative border-r last:border-r-0 border-slate-200/80 dark:border-slate-800/80 transition-colors ${
                      isToday ? 'bg-brand-500/[0.02] dark:bg-brand-950/[0.05]' : ''
                    }`}
                  >
                    {/* Background Hour Lines */}
                    {timeSlots.map((slot) => (
                      <div
                        key={slot.hour}
                        className="border-b border-slate-100 dark:border-slate-800/50 w-full"
                        style={{ height: `${rowHeight}px` }}
                      />
                    ))}

                    {/* Class Cards */}
                    {items.map(({ routine, top, height, widthPercent, leftPercent }) => {
                      const color = routine.color || '#4F46E5';
                      const isLab = routine.classType?.toLowerCase() === 'lab' || routine.classType?.toLowerCase() === 'sessional';

                      return (
                        <div
                          key={routine.id}
                          className="absolute z-10 px-1 transition-all duration-200 group"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`
                          }}
                        >
                          <div
                            className="w-full h-full rounded-lg px-2 py-1 flex flex-col justify-center text-white shadow-xs border border-white/15 transition-all duration-200 group-hover:scale-[1.01] group-hover:shadow-md relative overflow-hidden"
                            style={{ backgroundColor: color }}
                            title={`${routine.courseId || routine.course_code}: ${routine.courseTitle || routine.course_title}\n${formatTime12Hour(routine.startTime)} – ${formatTime12Hour(routine.endTime)}${routine.room ? ` • ${routine.room}` : ''}`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-extrabold text-[11px] tracking-tight leading-tight text-white drop-shadow-xs truncate">
                                {routine.courseId || routine.course_code}
                              </span>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-xs px-1 py-0.5 rounded shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit?.(routine);
                                  }}
                                  className="hover:text-amber-200 transition-colors p-0.5"
                                  title="Edit Class"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDuplicate?.(routine);
                                  }}
                                  className="hover:text-cyan-200 transition-colors p-0.5"
                                  title="Duplicate Class"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete?.(routine.id);
                                  }}
                                  className="hover:text-rose-200 transition-colors p-0.5"
                                  title="Delete Class"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>

                            <p className="text-[9px] sm:text-[10px] font-semibold text-white/95 leading-tight line-clamp-1 sm:line-clamp-2 mt-0.5">
                              {routine.courseTitle || routine.course_title}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HorizontalWeeklyTimetable;
