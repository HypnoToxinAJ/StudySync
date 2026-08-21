import React, { useState } from 'react';
import { ChevronDown, ChevronUp, GraduationCap, Award, BookOpen, AlertCircle } from 'lucide-react';
import { CourseResultTable } from './CourseResultTable';
import { verifyPortalDifference } from '../utils/cgpaCalculations';

export const ReadOnlySemesterCard = ({ semester, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const courses = semester.courses || [];
  const gpa = Number(semester.gpa || semester.calculatedGpa || 0);
  const completedCredits = Number(semester.completedCredits || 0);
  const attemptedCredits = Number(semester.attemptedCredits || completedCredits);

  // Check for discrepancy between official portal value and calculated verification value
  const discrepancyCheck = semester.gpa !== undefined && semester.calculatedGpa !== undefined
    ? verifyPortalDifference(semester.gpa, semester.calculatedGpa)
    : { hasDiscrepancy: false };

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 sm:p-6 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-black text-sm shrink-0 border border-brand-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                {semester.name}
              </h4>
              {discrepancyCheck.hasDiscrepancy && (
                <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20" title={discrepancyCheck.message}>
                  <AlertCircle className="w-3 h-3" />
                  <span>Portal value differs from calculated verification</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {courses.length} Courses • {completedCredits.toFixed(1)} Completed Credits
              {attemptedCredits > completedCredits && ` (${attemptedCredits.toFixed(1)} Attempted)`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Term GPA Display */}
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Term GPA
            </span>
            <span className="text-lg sm:text-xl font-black text-brand-600 dark:text-brand-400">
              {gpa.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            aria-label={isExpanded ? 'Collapse semester' : 'Expand semester'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Discrepancy warning on mobile if present */}
      {discrepancyCheck.hasDiscrepancy && (
        <div className="sm:hidden px-5 pb-2 text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Portal value differs from calculated verification</span>
        </div>
      )}

      {/* Expandable Course Table */}
      {isExpanded && (
        <div className="px-5 pb-6 sm:px-6 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <CourseResultTable courses={courses} />
        </div>
      )}
    </div>
  );
};
