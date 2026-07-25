import React from 'react';
import { motion } from 'framer-motion';

export const Tabs = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex space-x-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-800">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center space-x-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
              isActive
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 bg-white dark:bg-slate-900 rounded-lg shadow-sm"
                transition={{ type: 'spring', duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`relative z-10 px-1.5 py-0.5 text-[10px] rounded-full ${
                isActive ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
