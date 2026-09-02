import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async event => {
    event.preventDefault();
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await authService.resetPassword({ password });
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'This reset link is invalid or expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Choose a new password</h1>
          <p className="mt-1 text-xs text-slate-400">Use at least 10 characters and avoid common passwords.</p>
        </div>
        {error && <div role="alert" className="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-300">{error}</div>}
        <input type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={10} required placeholder="New password" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white" />
        <input type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} minLength={10} required placeholder="Confirm password" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white" />
        <button disabled={submitting} className="w-full rounded-xl bg-brand-600 py-3 text-xs font-bold text-white disabled:opacity-60">{submitting ? 'Updating…' : 'Update password'}</button>
        <Link to="/login" className="block text-center text-xs text-brand-400">Back to sign in</Link>
      </form>
    </div>
  );
};

export default ResetPasswordPage;
