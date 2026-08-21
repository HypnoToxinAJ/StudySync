import React, { useState } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  Maximize2,
  Minimize2,
  LineChart,
  Calculator,
  Box,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { desmosStateUtils } from '../utils/desmosStateUtils';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';

export const MathToolsHeader = ({
  activeTool,
  onSelectTool,
  onBackToSelector,
  onResetWorkspace,
  isFullscreen,
  onToggleFullscreen
}) => {
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const metadata = desmosStateUtils.getToolMetadata(activeTool);

  const tools = [
    { id: 'graphing', label: 'Graphing', icon: LineChart },
    { id: 'scientific', label: 'Scientific', icon: Calculator },
    { id: '3d', label: '3D Math', icon: Box }
  ];

  const handleResetConfirm = () => {
    setIsResetConfirmOpen(false);
    onResetWorkspace();
  };

  return (
    <div className="space-y-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
      {/* Top Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Back button & Tool Identity */}
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={onBackToSelector}
            className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center space-x-1.5 text-xs font-bold shrink-0"
            title="Return to Math Tools selector"
            aria-label="Back to Math Tools selector"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Tools</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                {metadata.name}
              </h2>
              <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-extrabold border border-brand-500/20">
                {metadata.badgeText}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {metadata.hint}
            </p>
          </div>
        </div>

        {/* Right: Segmented Tool Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Segmented Control Tabs */}
          <div
            className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60"
            role="tablist"
            aria-label="Select calculator mode"
          >
            {tools.map((t) => {
              const Icon = t.icon;
              const isActive = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelectTool(t.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Reset Workspace Button */}
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
            title="Reset active calculator expressions and view"
            aria-label="Reset active calculator workspace"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={onToggleFullscreen}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetConfirm}
        title={`Reset ${metadata.name}?`}
        message={`This will clear your current expressions, equations, and view settings for the ${metadata.name}. This action cannot be undone.`}
        confirmText="Reset Calculator"
        variant="rose"
      />
    </div>
  );
};
