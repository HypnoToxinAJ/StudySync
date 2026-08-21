import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  GraduationCap,
  Lock,
  User,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Loader2,
  Database
} from 'lucide-react';
import { cuetCredentialsSchema } from '../utils/resultValidation';

export const CuetResultConnectCard = ({
  onFetch,
  onLoadDemo,
  isLoading,
  error,
  initialStudentId = '',
  captchaChallenge,
  onCompleteCaptcha
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [captchaCode, setCaptchaCode] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(cuetCredentialsSchema),
    defaultValues: {
      studentId: initialStudentId || '',
      password: '',
      rememberStudentId: Boolean(initialStudentId),
      saveLocally: true
    }
  });

  const onSubmit = (formData) => {
    onFetch({
      studentId: formData.studentId,
      password: formData.password,
      rememberStudentId: formData.rememberStudentId,
      saveLocally: formData.saveLocally
    });
    // Form password field is cleared from React Hook Form state immediately
    setValue('password', '');
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-slate-50/80 to-indigo-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/40 border border-slate-200/90 dark:border-slate-800 shadow-xl p-6 sm:p-8">
      {/* Background ambient decorative glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-brand-600/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-2xl border border-brand-500/20 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                  Official Academic Integration
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full">
                  CUET Portal
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                Import from CUET Result Portal
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                Enter your student credentials to securely fetch verified semester results, credits, course grades, and official CGPA.
              </p>
            </div>
          </div>

          <a
            href="https://course.cuet.ac.bd"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300 transition-colors self-start sm:self-auto bg-white dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <span>CUET Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Error Alert Display */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-start space-x-3 text-xs animate-fadeIn">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Authentication / Fetch Notice</p>
              <p className="opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Credentials Form */}
        {captchaChallenge && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Complete CUET verification</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Enter the characters shown in the image to continue fetching your result.</p>
            </div>
            {captchaChallenge.captchaImage ? (
              <img src={captchaChallenge.captchaImage} alt="CUET CAPTCHA" className="h-12 w-32 rounded-lg border border-slate-300 bg-white object-contain" />
            ) : (
              <p className="text-xs text-rose-600">The CAPTCHA image could not be loaded. Please start the request again.</p>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={captchaCode}
                onChange={(event) => setCaptchaCode(event.target.value)}
                placeholder="Enter CAPTCHA"
                autoComplete="off"
                disabled={isLoading}
                className="flex-1 px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => onCompleteCaptcha(captchaCode)}
                disabled={isLoading || !captchaCode.trim()}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-xs font-bold"
              >
                {isLoading ? 'Verifying...' : 'Verify & Fetch Results'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Student ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>CUET Student ID</span>
                <span className="text-[10px] text-slate-400 font-normal">e.g. 1904001 or 2004055</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Enter Student ID"
                  disabled={isLoading}
                  {...register('studentId')}
                  className={`w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-white dark:bg-slate-800/90 border transition-all outline-none ${
                    errors.studentId
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
                  }`}
                />
              </div>
              {errors.studentId && (
                <p className="text-[11px] font-semibold text-rose-500 mt-1">
                  {errors.studentId.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>CUET Portal Password</span>
                <span className="text-[10px] text-slate-400 font-normal">Official Portal Password</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Password"
                  disabled={isLoading}
                  {...register('password')}
                  className={`w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-white dark:bg-slate-800/90 border transition-all outline-none ${
                    errors.password
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] font-semibold text-rose-500 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          {/* Checkbox Options */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('rememberStudentId')}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800 cursor-pointer"
                />
                <span>Remember Student ID</span>
              </label>

              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('saveLocally')}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800 cursor-pointer"
                />
                <span>Save results on this device</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-2 sm:pt-0">
              {onLoadDemo && (
                <button
                  type="button"
                  onClick={() => onLoadDemo()}
                  disabled={isLoading}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all flex items-center space-x-1.5"
                  title="Load verified sample dataset for testing"
                >
                  <Database className="w-3.5 h-3.5 text-brand-500" />
                  <span>Preview Demo Dataset</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-brand-600/25 transition-all flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Fetching Official Records...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Fetch Official Results</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Privacy & Security Guarantee Note */}
          <div className="flex items-start space-x-2 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-700 dark:text-slate-300 font-bold">Privacy Guarantee:</strong> Your CUET portal password is used only in-memory for this single authenticated request and is <strong className="text-slate-700 dark:text-slate-300 font-bold">never stored</strong> in local storage, session storage, cookies, or remote databases.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
