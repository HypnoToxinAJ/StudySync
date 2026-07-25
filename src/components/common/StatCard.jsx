import React from 'react';
import { motion } from 'framer-motion';

export const StatCard = ({ title, value, subtext, icon: Icon, color = 'indigo', onClick, actionLabel }) => {
  const colorMap = {
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  };

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all ${
        onClick ? 'cursor-pointer group' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${colorMap[color] || colorMap.indigo}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {value}
        </h4>
        {subtext && (
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {subtext}
          </p>
        )}
      </div>

      {actionLabel && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:underline">
          <span>{actionLabel}</span>
          <span>&rarr;</span>
        </div>
      )}
    </motion.div>
  );
};
