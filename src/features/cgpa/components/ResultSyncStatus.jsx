import React, { useState } from 'react';
import {
  CheckCircle2,
  RefreshCw,
  Trash2,
  Clock,
  ShieldCheck,
  Building,
  User,
  GraduationCap,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';

export const ResultSyncStatus = ({
  student,
  fetchedAt,
  isSavedCopy,
  source,
  onRefresh,
  onClear,
  isLoading
}) => {
  const [isRefreshModalOpen, setIsRefreshModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [refreshPassword, setRefreshPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [refreshError, setRefreshError] = useState('');

  const formattedDate = fetchedAt
    ? new Date(fetchedAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Recently';

  const handleRefreshSubmit = (e) => {
    e.preventDefault();
    if (!refreshPassword) {
      setRefreshError('Password is required to refresh official records.');
      return;
    }
    setRefreshError('');
    onRefresh({
      studentId: student?.studentId,
      password: refreshPassword
    });
    setRefreshPassword('');
    setIsRefreshModalOpen(false);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-7">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Student Identity Information */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official CUET Data</span>
            </span>

            {isSavedCopy ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/20">
                <Clock className="w-3.5 h-3.5" />
                <span>Saved copy on device</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold border border-cyan-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Live Sync Active</span>
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
              {isSavedCopy ? 'Saved copy — last synchronized:' : 'Last synchronized:'} <strong>{formattedDate}</strong>
            </span>
            <span>({source || 'CUET Result Portal'})</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setIsRefreshModalOpen(true)}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold text-xs shadow-md transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Results</span>
          </button>

          <button
            onClick={() => setIsClearConfirmOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-600 text-slate-600 dark:text-slate-300 font-bold text-xs transition-all border border-slate-200 dark:border-slate-700"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear / Disconnect</span>
          </button>
        </div>
      </div>

      {/* REFRESH AUTHENTICATION MODAL */}
      <Modal
        isOpen={isRefreshModalOpen}
        onClose={() => {
          setIsRefreshModalOpen(false);
          setRefreshPassword('');
          setRefreshError('');
        }}
        title="Re-authenticate to Refresh Results"
      >
        <form onSubmit={handleRefreshSubmit} className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            For security, StudySync does not store your portal password. Enter your password to initiate a live sync with the CUET portal for Student ID <strong>{student?.studentId}</strong>.
          </p>

          {refreshError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{refreshError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              CUET Portal Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your CUET password"
                value={refreshPassword}
                onChange={(e) => setRefreshPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-semibold"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setIsRefreshModalOpen(false);
                setRefreshPassword('');
              }}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* CLEAR RESULTS CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={() => {
          setIsClearConfirmOpen(false);
          onClear();
        }}
        title="Disconnect & Clear Imported Results?"
        message="This will remove the official fetched CUET results from this device. You will need to enter your Student ID and password to import them again."
        confirmText="Clear Results"
        variant="rose"
      />
    </div>
  );
};
