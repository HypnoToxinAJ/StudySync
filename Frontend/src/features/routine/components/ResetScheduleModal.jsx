import React, { useState } from 'react';
import { RotateCcw, Trash2, Sparkles, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { storageService } from '../../../services/storageService';
import { routineService } from '../../../services/routineService';
import { routineApi } from '../../../services/routineApi';
import { attendanceService } from '../../../services/attendanceService';
import { initialRoutines } from '../../../data/mockData';
import { useToast } from '../../../context/ToastContext';

export const ResetScheduleModal = ({
  isOpen,
  onClose,
  serverRoutines = [],
  onResetCompleted
}) => {
  const { showToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // 'clear' | 'default' | 'all'

  const handleClearRoutine = async () => {
    setIsProcessing(true);
    try {
      // Clear from backend database (routines, attendance, CT marks)
      await routineApi.clearAll().catch(() => {});
      // Clear local routine storage
      routineService.saveAll([]);
      // Clear local attendance records and CT marks
      attendanceService.clearAttendanceAndMarks();
      onResetCompleted?.();
      showToast('All routine classes, attendance, and CT marks have been cleared.', 'info');
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to clear routine.', 'error');
    } finally {
      setIsProcessing(false);
      setConfirmTarget(null);
    }
  };

  const handleRestoreDefault = async () => {
    setIsProcessing(true);
    try {
      // Clear backend and recreate sample classes
      await routineApi.clearAll().catch(() => {});
      routineService.saveAll(initialRoutines);
      attendanceService.clearAttendanceAndMarks();
      for (const r of initialRoutines) {
        void routineApi.create(r).catch(() => {});
      }
      onResetCompleted?.();
      showToast('Routine reset to default schedule with fresh attendance & CT marks.', 'success');
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to restore default routine.', 'error');
    } finally {
      setIsProcessing(false);
      setConfirmTarget(null);
    }
  };

  const handleResetAllWorkspace = async () => {
    setIsProcessing(true);
    try {
      // Clear both backend routine records and sync documents
      await routineApi.clearAll().catch(() => {});
      await storageService.resetAll();
      onResetCompleted?.();
      showToast('All workspace data has been reset to defaults.', 'warning');
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to reset workspace.', 'error');
    } finally {
      setIsProcessing(false);
      setConfirmTarget(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reset Options">
      <div className="space-y-4 text-xs">
        <p className="text-slate-500 dark:text-slate-400">
          Choose what you would like to reset. You can clear only the routine, restore sample classes, or reset all workspace data.
        </p>

        {/* Option 1: Clear Routine Only */}
        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-white">Clear All Classes</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Removes all routine entries, attendance records, and CT marks so you can start fresh.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                if (confirmTarget === 'clear') {
                  void handleClearRoutine();
                } else {
                  setConfirmTarget('clear');
                }
              }}
              className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all ${
                confirmTarget === 'clear'
                  ? 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-amber-500/60'
              }`}
            >
              {isProcessing && confirmTarget === 'clear' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : confirmTarget === 'clear' ? (
                'Confirm Clear?'
              ) : (
                'Clear Routine'
              )}
            </button>
          </div>
        </div>

        {/* Option 2: Restore Default Sample Schedule */}
        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-white">Restore Sample Schedule</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Loads standard sample CSE classes into the weekly timetable.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                if (confirmTarget === 'default') {
                  void handleRestoreDefault();
                } else {
                  setConfirmTarget('default');
                }
              }}
              className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all ${
                confirmTarget === 'default'
                  ? 'bg-brand-600 text-white hover:bg-brand-700'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-brand-500/60'
              }`}
            >
              {isProcessing && confirmTarget === 'default' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : confirmTarget === 'default' ? (
                'Confirm Restore?'
              ) : (
                'Restore Defaults'
              )}
            </button>
          </div>
        </div>

        {/* Option 3: Reset All Workspace Data */}
        <div className="p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/10 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-extrabold text-rose-950 dark:text-rose-200">Reset All Workspace Data</h4>
                <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                  Resets everything: routine, attendance, assessments, and cached workspace data.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                if (confirmTarget === 'all') {
                  void handleResetAllWorkspace();
                } else {
                  setConfirmTarget('all');
                }
              }}
              className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all ${
                confirmTarget === 'all'
                  ? 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse'
                  : 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-50'
              }`}
            >
              {isProcessing && confirmTarget === 'all' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : confirmTarget === 'all' ? (
                'Confirm Reset All?'
              ) : (
                'Reset All'
              )}
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ResetScheduleModal;
