import React from 'react';
import { motion } from 'framer-motion';

export const ProgressBar = ({ progress = 0, color = 'indigo', showLabel = true, height = 'h-2' }) => {
  const clamped = Math.min(100, Math.max(0, progress));

  const colorMap = {
    indigo: 'bg-indigo-600 dark:bg-indigo-500',
    cyan: 'bg-cyan-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
          <span>Progress</span>
          <span>{clamped}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden ${height}`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${colorMap[color] || colorMap.indigo}`}
        />
      </div>
    </div>
  );
};
