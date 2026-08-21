import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Layers,
  BookOpen,
  FileCheck,
  ShieldCheck,
  X
} from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { semesterResetUtils } from '../utils/semesterResetUtils';
import { semesterResetService } from '../services/semesterResetService';

export const ResetSemesterDialog = ({
  isOpen,
  onClose,
  onResetComplete
}) => {
  const [step, setStep] = useState(1); // 1: Warning, 2: Scope Review, 3: Typed Confirmation
  const [confirmationInput, setConfirmationInput] = useState('');
  const [newSemesterName, setNewSemesterName] = useState('');
  const [summary, setSummary] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setConfirmationInput('');
      const dataSummary = semesterResetUtils.getActiveSemesterSummary();
      setSummary(dataSummary);

      // Guess next semester name
      const match = (dataSummary?.semesterName || '').match(/^(\d+)(st|nd|rd|th)?\s*Semester/i);
      if (match) {
        const num = parseInt(match[1], 10) + 1;
        const suffix = num === 1 ? 'st' : num === 2 ? 'nd' : num === 3 ? 'rd' : 'th';
        setNewSemesterName(`${num}${suffix} Semester`);
      } else {
        setNewSemesterName('');
      }
    }
  }, [isOpen]);

  const handleExecuteReset = () => {
    if (confirmationInput.trim() !== 'RESET SEMESTER') return;
    setIsSubmitting(true);

    const result = semesterResetService.resetActiveSemester({
      newSemesterName: newSemesterName.trim() || undefined
    });

    setIsSubmitting(false);
    if (result.success) {
      if (onResetComplete) {
        onResetComplete(result);
      }
      onClose();
    } else {
      alert(result.message);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset Active Semester"
      maxWidth="max-w-xl"
    >
      <div className="space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${
              step === 1 ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              1
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Warning</span>
          </div>

          <div className="w-8 h-[2px] bg-slate-200 dark:bg-slate-700" />

          <div className="flex items-center space-x-2">
            <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${
              step === 2 ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              2
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Scope Review</span>
          </div>

          <div className="w-8 h-[2px] bg-slate-200 dark:bg-slate-700" />

          <div className="flex items-center space-x-2">
            <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${
              step === 3 ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              3
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Confirmation</span>
          </div>
        </div>

        {/* STEP 1: WARNING SUMMARY */}
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1 text-amber-800 dark:text-amber-300">
                <p className="font-bold">Prepare StudySync for a New Semester</p>
                <p className="opacity-90">
                  Resetting clears active-semester coursework, tests, and active routine definitions. Past class routine dates will remain visible as read-only historical calendar entries.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                Data that will be permanently cleared:
              </h4>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
                <li className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-medium">
                  <span>✕</span>
                  <span>Attendance course cards & missed class records</span>
                </li>
                <li className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-medium">
                  <span>✕</span>
                  <span>Class test & assignment marks</span>
                </li>
                <li className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-medium">
                  <span>✕</span>
                  <span>Upcoming tests, assignments & exam schedules</span>
                </li>
                <li className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-medium">
                  <span>✕</span>
                  <span>Active recurring weekly class routine</span>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
              <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>What will NOT be affected:</span>
              </h4>
              <p className="text-slate-500 dark:text-slate-400">
                • <strong>Calendar Routine History:</strong> Old routine dates remain visible in the calendar as read-only history.<br />
                • <strong>Personal & Financial Data:</strong> Notes, expense budgets, tuition records, CGPA / CUET results, focus data, and medications remain completely untouched.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-extrabold shadow-md transition-all flex items-center space-x-1.5"
              >
                <span>Review Scope & Counts</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SCOPE & RECORD COUNTS */}
        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Target Semester</span>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {summary?.semesterName}
                  </h4>
                </div>
                <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
                  {summary?.department}
                </span>
              </div>

              {/* Record Counts Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <p className="text-lg font-black text-rose-600">{summary?.coursesCount || 0}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Courses</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <p className="text-lg font-black text-rose-600">{summary?.assessmentsCount || 0}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Assessments</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                  <p className="text-lg font-black text-rose-600">{summary?.routinesCount || 0}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Routine Slots</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/30 bg-emerald-50/20">
                  <p className="text-lg font-black text-emerald-600">{summary?.preservedRoutineEventsCount || 0}</p>
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Preserved Dates</p>
                </div>
              </div>
            </div>

            {/* Next Semester Name Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                New Semester Name (After Reset)
              </label>
              <input
                type="text"
                value={newSemesterName}
                onChange={(e) => setNewSemesterName(e.target.value)}
                placeholder="e.g. 6th Semester"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium focus:border-brand-500"
              />
              <p className="text-[11px] text-slate-400">
                Your profile semester reference will be updated to this name.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md transition-all flex items-center space-x-1.5"
              >
                <span>Proceed to Confirmation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: TYPED CONFIRMATION */}
        {step === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs space-y-2">
              <div className="flex items-center space-x-2 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                <span>Final Verification Required</span>
              </div>
              <p>
                This action is permanent and cannot be undone. Active semester course progress, missed classes, and assessments will be deleted.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Type <strong className="font-black text-rose-600 dark:text-rose-400">RESET SEMESTER</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="RESET SEMESTER"
                className="w-full px-4 py-3 text-sm font-mono font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={confirmationInput.trim() !== 'RESET SEMESTER' || isSubmitting}
                onClick={handleExecuteReset}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isSubmitting ? 'Resetting Semester...' : 'Permanently reset semester'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ResetSemesterDialog;
