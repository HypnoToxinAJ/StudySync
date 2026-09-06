import React, { useState } from 'react';
import {
  Trash2,
  Clock,
  ShieldCheck,
  Building,
  User,
  Upload
} from 'lucide-react';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';

export const ResultSyncStatus = ({
  student,
  fetchedAt,
  isSavedCopy,
  source,
  onOpenImport,
  onClear,
  isLoading
}) => {
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const formattedDate = fetchedAt
    ? new Date(fetchedAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Recently';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-7">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Student Identity Information */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Official CUET Data</span>
            </span>

            {isSavedCopy && (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold border border-cyan-500/20">
                <Clock className="w-3.5 h-3.5" />
                <span>Saved in Database</span>
              </span>
            )}
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
              <User className="w-5 h-5 text-brand-500" />
              <span>{student?.name || 'CUET Student'}</span>
            </h3>
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
              <span><strong>ID:</strong> {student?.studentId}</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Building className="w-3.5 h-3.5" />
                <span>{student?.department || 'Department of CSE'}</span>
              </span>
              {student?.batch && (
                <>
                  <span>•</span>
                  <span><strong>Batch:</strong> {student.batch}</span>
                </>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {isSavedCopy ? 'Last synchronized:' : 'Imported at:'} <strong>{formattedDate}</strong>
            </span>
            <span>({source || 'CUET Result Portal'})</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
          <button
            onClick={onOpenImport}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-xs shadow-md transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Re-import / Update Results</span>
          </button>

          <button
            onClick={() => setIsClearConfirmOpen(true)}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-600 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset & Delete from Database</span>
          </button>
        </div>
      </div>

      {/* CLEAR / DELETE RESULTS CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={() => {
          setIsClearConfirmOpen(false);
          onClear();
        }}
        title="Delete Official Results from Database?"
        message="This will permanently delete all your imported academic results, semester records, and calculated CGPA from the database and local storage. You can re-import them anytime from the CUET result portal."
        confirmText="Delete from Database"
        variant="rose"
      />
    </div>
  );
};
