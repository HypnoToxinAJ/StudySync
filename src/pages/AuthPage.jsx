import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { OnboardingModal } from '../components/auth/OnboardingModal';
import { Modal } from '../components/common/Modal';
import { GraduationCap, Lock, Mail, User, CheckCircle2, ArrowRight } from 'lucide-react';

export const AuthPage = () => {
  const { user, login, register, loginWithGoogle } = useAuth();

  if (user && user.isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const [form, setForm] = useState({
    name: 'Tanvir Ahmed',
    email: 'tanvir.student@university.edu.bd',
    password: 'password123',
    university: 'Chittagong University of Engineering & Technology',
    department: 'Computer Science & Engineering',
    semester: '5th Semester'
  });

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isRegister) {
      await register(form);
    } else {
      await login(form.email || 'tanvir.student@university.edu.bd', form.password || 'password123');
    }
  };

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
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center space-x-2"
          >
            <span>{isRegister ? 'Register & Complete Setup' : 'Sign In to Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-500">OR</span>
        </div>

        {/* Mock Google Login */}
        <button
          type="button"
          onClick={() => loginWithGoogle()}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center space-x-2 transition-all"
        >
          <span>Continue with Google</span>
        </button>

        {/* Quick Demo Instant Access */}
        <button
          type="button"
          onClick={() => login('tanvir.student@university.edu.bd', 'password123')}
          className="w-full py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Quick Demo Access (Instant Workspace)</span>
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
      <Modal isOpen={isForgotPasswordOpen} onClose={() => setIsForgotPasswordOpen(false)} title="Reset Password Mock">
        <div className="space-y-4">
          {forgotSent ? (
            <div className="p-4 bg-emerald-500/10 text-emerald-300 rounded-xl text-xs font-semibold">
              Mock password reset link sent to {forgotEmail}! Check your inbox.
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
                onClick={() => setForgotSent(true)}
                className="w-full py-2.5 bg-brand-600 text-white text-xs font-bold rounded-xl"
              >
                Send Reset Link
              </button>
            </>
          )}
        </div>
      </Modal>

      {/* Onboarding Modal trigger for first-time user */}
      {user && !user.onboarded && (
        <OnboardingModal isOpen={true} onClose={() => {}} />
      )}
    </div>
  );
};
