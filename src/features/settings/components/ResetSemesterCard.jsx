import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, ShieldAlert, Sparkles, Calendar, BookOpen } from 'lucide-react';
import { ResetSemesterDialog } from './ResetSemesterDialog';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

export const ResetSemesterCard = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { refreshData } = useData();
  const { user, setUser } = useAuth();
  const { showToast } = useToast();

  const handleResetComplete = (result) => {
    refreshData();
    if (setUser && result.newSemesterName) {
      setUser(prev => ({ ...prev, semester: result.newSemesterName }));
    }
    showToast(result.message || 'Semester successfully reset.', 'success');
  };

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <RotateCcw className="w-5 h-5 text-rose-500" />
              <span>Academic Semester Reset</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-extrabold border border-slate-200/60 dark:border-slate-700/60">
              Active: {user?.semester || 'Current Semester'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
            Transition to a new semester by archiving old class routines to the calendar while clearing active course cards, assessments, and attendance records.
          </p>
        </div>

        <button
          onClick={() => setIsDialogOpen(true)}
          className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-extrabold text-xs transition-all flex items-center space-x-2 shrink-0 border border-rose-500/20 shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Semester</span>
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2.5">
        <Sparkles className="w-4 h-4 text-brand-500 shrink-0" />
        <span>
          Notes, tuition records, expense budgets, CGPA scores, and focus playlists are preserved safely across all semester resets.
        </span>
      </div>

      <ResetSemesterDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onResetComplete={handleResetComplete}
      />
    </div>
  );
};

export default ResetSemesterCard;
