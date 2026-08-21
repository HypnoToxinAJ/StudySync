import React from 'react';
import { GraduationCap, ArrowLeft, RefreshCw } from 'lucide-react';
import { useCuetResults } from '../features/cgpa/hooks/useCuetResults';
import { CuetResultConnectCard } from '../features/cgpa/components/CuetResultConnectCard';
import { ResultSyncStatus } from '../features/cgpa/components/ResultSyncStatus';
import { CgpaAnalytics } from '../features/cgpa/components/CgpaAnalytics';
import { ReadOnlySemesterCard } from '../features/cgpa/components/ReadOnlySemesterCard';
import { TargetCgpaPredictor } from '../features/cgpa/components/TargetCgpaPredictor';

export const CGPAPage = () => {
  const {
    resultData,
    isLoading,
    error,
    captchaChallenge,
    isCached,
    rememberedStudentId,
    fetchOfficialResults,
    completeCaptchaChallenge,
    clearResults,
    loadDemoResults
  } = useCuetResults();

  const hasResults = Boolean(resultData && resultData.semesters && resultData.semesters.length > 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <div className="p-2 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span>CUET CGPA Calculator & Academic Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Official CUET semester results, verified grade point analytics, and next-semester target predictor
          </p>
        </div>
      </div>

      {/* STATE 1: NO RESULTS IMPORTED -> SHOW CONNECTION FORM */}
      {!hasResults && (
        <div className="space-y-8">
          <CuetResultConnectCard
            onFetch={fetchOfficialResults}
            onLoadDemo={loadDemoResults}
            isLoading={isLoading}
            error={error}
            captchaChallenge={captchaChallenge}
            onCompleteCaptcha={completeCaptchaChallenge}
            initialStudentId={rememberedStudentId}
          />
        </div>
      )}

      {/* STATE 2: RESULTS AVAILABLE -> SHOW READ-ONLY OFFICIAL DASHBOARD */}
      {hasResults && (
        <div className="space-y-8">
          {/* Official Sync Status Banner */}
          <ResultSyncStatus
            student={resultData.student}
            fetchedAt={resultData.fetchedAt}
            isSavedCopy={isCached || resultData.isSavedCopy}
            source={resultData.source}
            onRefresh={fetchOfficialResults}
            onClear={clearResults}
            isLoading={isLoading}
          />

          {/* Core Analytics & Progression Trend Charts */}
          <CgpaAnalytics
            semesters={resultData.semesters}
            overall={resultData.overall}
            failedCourses={resultData.failedCourses || []}
          />

          {/* Interactive Target CGPA Projection Calculator */}
          <TargetCgpaPredictor
            currentCgpa={Number(resultData.overall?.cgpa || resultData.overall?.calculatedCgpa || 3.80)}
            completedCredits={Number(resultData.overall?.completedCredits || 0)}
          />

          {/* Read-Only Semesters Breakdown List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Published Semester Records ({resultData.semesters.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Official read-only course records, credit weights, quality points, and term GPAs
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {resultData.semesters.map((sem, idx) => (
                <ReadOnlySemesterCard
                  key={sem.id || `sem-${idx}`}
                  semester={sem}
                  defaultExpanded={idx === resultData.semesters.length - 1} // latest expanded by default
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CGPAPage;
