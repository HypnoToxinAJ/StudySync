import React from 'react';
import { Badge } from '../../../components/common/Badge';
import { CheckCircle2, AlertTriangle, RotateCcw, BookOpen, FlaskConical } from 'lucide-react';

export const CourseResultTable = ({ courses = [] }) => {
  if (!courses || courses.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-slate-400">
        No course records published for this semester.
      </div>
    );
  }

  const getGradeBadgeVariant = (grade) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'emerald';
      case 'A-':
      case 'B+':
      case 'B':
        return 'indigo';
      case 'B-':
      case 'C+':
      case 'C':
      case 'D':
        return 'amber';
      case 'F':
        return 'rose';
      default:
        return 'slate';
    }
  };

  return (
    <div className="overflow-hidden">
      {/* Desktop & Tablet Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3">Course Code</th>
              <th className="py-2.5 px-3">Course Title</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3 text-center">Credit</th>
              <th className="py-2.5 px-3 text-center">Grade</th>
              <th className="py-2.5 px-3 text-center">Grade Point</th>
              <th className="py-2.5 px-3 text-center">Quality Points</th>
              <th className="py-2.5 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {courses.map((course, idx) => {
              const isFailed = course.letterGrade === 'F';
              const isRepeated = Boolean(course.isRepeated);

              return (
                <tr
                  key={`${course.courseCode}-${idx}`}
                  className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                    isFailed ? 'bg-rose-500/5' : ''
                  }`}
                >
                  {/* Course Code */}
                  <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                    {course.courseCode}
                  </td>

                  {/* Course Title */}
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs font-medium">
                    {course.courseTitle || 'Not provided'}
                  </td>

                  {/* Type */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {course.courseType === 'Lab' ? (
                        <>
                          <FlaskConical className="w-3.5 h-3.5 text-cyan-500" />
                          <span>Lab</span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Theory</span>
                        </>
                      )}
                    </span>
                  </td>

                  {/* Credit */}
                  <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                    {Number(course.credit || 0).toFixed(2)}
                  </td>

                  {/* Letter Grade */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <Badge variant={getGradeBadgeVariant(course.letterGrade)}>
                      {course.letterGrade}
                    </Badge>
                  </td>

                  {/* Grade Point */}
                  <td className="py-3 px-3 text-center font-bold text-brand-600 dark:text-brand-400">
                    {Number(course.gradePoint || 0).toFixed(2)}
                  </td>

                  {/* Quality Points */}
                  <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">
                    {Number(course.qualityPoints || (course.credit * course.gradePoint) || 0).toFixed(2)}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    {isFailed ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold border border-rose-500/20">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Failed</span>
                      </span>
                    ) : isRepeated ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold border border-amber-500/20" title="Previous attempt superseded by later grade">
                        <RotateCcw className="w-3 h-3" />
                        <span>Repeated</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Passed</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card-Based List */}
      <div className="block sm:hidden space-y-2.5 pt-2">
        {courses.map((course, idx) => {
          const isFailed = course.letterGrade === 'F';
          const isRepeated = Boolean(course.isRepeated);

          return (
            <div
              key={`m-${course.courseCode}-${idx}`}
              className={`p-3.5 rounded-2xl border ${
                isFailed
                  ? 'bg-rose-500/5 border-rose-500/20'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80'
              } space-y-2`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h5 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {course.courseCode}
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {course.courseTitle || 'Not provided'}
                  </p>
                </div>
                <Badge variant={getGradeBadgeVariant(course.letterGrade)}>
                  {course.letterGrade} ({Number(course.gradePoint || 0).toFixed(2)})
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60 font-semibold text-slate-600 dark:text-slate-300">
                <span>{course.courseType} • {Number(course.credit || 0).toFixed(2)} Credits</span>
                <span>QP: {Number(course.qualityPoints || (course.credit * course.gradePoint) || 0).toFixed(2)}</span>
                <span>
                  {isFailed ? (
                    <span className="text-rose-500 font-bold">Failed</span>
                  ) : isRepeated ? (
                    <span className="text-amber-500 font-bold">Repeated</span>
                  ) : (
                    <span className="text-emerald-500 font-bold">Passed</span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
