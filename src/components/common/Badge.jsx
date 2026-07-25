import React from 'react';

export const Badge = ({ children, variant = 'indigo', size = 'md' }) => {
  const variantStyles = {
    indigo: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
    slate: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] font-semibold',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  return (
    <span className={`inline-flex items-center rounded-full border ${variantStyles[variant]} ${sizeStyles[size]}`}>
      {children}
    </span>
  );
};
