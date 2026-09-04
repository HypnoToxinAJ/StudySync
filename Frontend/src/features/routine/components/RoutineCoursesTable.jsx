import React, { useMemo } from 'react';
import { BookOpen } from 'lucide-react';

const formatCredit = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '—';
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1);
};

export const RoutineCoursesTable = ({ routines = [], allCourses = [], isLoading = false }) => {
  // Extract unique courses included in the routine
  const uniqueCourses = useMemo(() => {
    const courseMap = new Map();

    routines.forEach((routine) => {
      const code = (routine.courseId || routine.course_code || '').trim().toUpperCase();
      if (!code) return;

      if (!courseMap.has(code)) {
        // Find matching course from allCourses if available for richer meta (like credit)
        const match = allCourses.find(
          (c) => (c.courseId || c.course_id || c.code || '').trim().toUpperCase() === code
        );

        const title = routine.courseTitle || routine.course_title || match?.courseTitle || match?.name || code;
        const credit = routine.credit ?? match?.credit ?? 0;

        courseMap.set(code, {
          code,
          title,
          credit: Number(credit) || 0
        });
      }
    });

    return Array.from(courseMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [routines, allCourses]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm animate-pulse space-y-3">
        <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded" />
        <div className="h-10 bg-slate-50 dark:bg-slate-800/40 rounded" />
      </div>
    );
  }

  return (
    <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <span className="text-base" role="img" aria-label="courses">📚</span>
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
          Courses
        </h3>
        <span className="text-xs text-slate-400 font-medium ml-1">
          ({uniqueCourses.length} {uniqueCourses.length === 1 ? 'course' : 'courses'} in routine)
        </span>
      </div>

      {uniqueCourses.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No courses currently associated with this schedule.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-3 w-36">Course Code</th>
                <th className="py-2.5 px-3">Course Name</th>
                <th className="py-2.5 px-3 w-20 text-center">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {uniqueCourses.map((course, index) => (
                <tr
                  key={course.code}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-3 text-center text-slate-400 font-bold font-mono text-[11px]">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                      {course.code}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                    {course.title}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-600 dark:text-slate-400">
                    {formatCredit(course.credit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default RoutineCoursesTable;
