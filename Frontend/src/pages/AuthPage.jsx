import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';
import { ArrowRight } from 'lucide-react';

export const AuthPage = () => {
  const { user, login, register, loginWithGoogle, forgotPassword } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    university: 'Chittagong University of Engineering & Technology',
    department: 'Computer Science & Engineering',
    semester: '5th Semester'
  });

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      if (isRegister) await register(form);
      else await login(form.email, form.password);
    } catch (error) {
      setErrorMessage(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      setErrorMessage(error.message || 'Google sign-in failed.');
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMessage('');
    try {
      await forgotPassword(forgotEmail);
      setForgotSent(true);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to send a reset link.');
    }
  };

  if (user && user.isLoggedIn) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Subtle Background Glow Spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-extrabold text-2xl mx-auto shadow-lg shadow-brand-500/30">
            S
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Welcome to <span className="text-brand-500">StudySync</span>
          </h2>
          <p className="text-xs text-slate-400">
            {isRegister ? 'Create your university student workspace' : 'Sign in to manage classes, attendance, and CGPA'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div role="alert" className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300">
              {errorMessage}
            </div>
          )}
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Full Student Name</label>
              <input
                type="text"
                placeholder="Tanvir Ahmed"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl outline-none text-white focus:border-brand-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Student Email or Username</label>
            <input
              type="text"
              placeholder="student@university.edu"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl outline-none text-white focus:border-brand-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl outline-none text-white focus:border-brand-500"
              required
            />
          </div>

          {!isRegister && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-xs text-brand-400 hover:underline font-semibold"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center space-x-2"
          >
            <span>{isSubmitting ? 'Please wait…' : (isRegister ? 'Register & Complete Setup' : 'Sign In to Dashboard')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-500">OR</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          className="w-full py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-3 disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4">
            <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z" />
            <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.4-4H3.3v2.6A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.6 14a6 6 0 0 1 0-4V7.4H3.3a10 10 0 0 0 0 9.2L6.6 14Z" />
            <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.3 7.4L6.6 10A5.8 5.8 0 0 1 12 5.9Z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="text-center pt-2">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Create One"}
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal isOpen={isForgotPasswordOpen} onClose={() => setIsForgotPasswordOpen(false)} title="Reset Password">
        <div className="space-y-4">
          {forgotSent ? (
            <div className="p-4 bg-emerald-500/10 text-emerald-300 rounded-xl text-xs font-semibold">
              If an account exists for {forgotEmail}, a reset link is on its way.
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-400">Enter your student email address to receive a password reset link.</p>
              <input
                type="email"
                placeholder="student@university.edu"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl outline-none text-white"
              />
              <button
                onClick={handleForgotPassword}
                disabled={!forgotEmail}
                className="w-full py-2.5 bg-brand-600 text-white text-xs font-bold rounded-xl"
              >
                Send Reset Link
              </button>
            </>
          )}
        </div>
      </Modal>

    </div>
  );
};
