import React, { useMemo } from 'react';
import { Youtube, FileText, Sparkles, Compass, ShieldCheck } from 'lucide-react';
import { FocusToolCard } from './FocusToolCard';
import { focusPreferenceService } from '../services/focusPreferenceService';

export const FocusToolSelector = ({ onSelectTool }) => {
  const recentPdfs = useMemo(() => focusPreferenceService.getRecentPdfs(), []);
  const recentYouTube = useMemo(() => focusPreferenceService.getRecentYouTube(), []);

  const lastPdfName = recentPdfs.length > 0 ? recentPdfs[0].name : null;
  const lastYtTitle = recentYouTube.length > 0 ? recentYouTube[0].title : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4 sm:py-6 animate-fadeIn">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-extrabold border border-brand-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Distraction-Free Environment</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Choose your focus workspace
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          Select a distraction-free tool for your current study session. Only the chosen workspace will be loaded to keep your session calm and focused.
        </p>
      </div>

      {/* Workspace Cards Grid (Side-by-side on desktop, stacked on mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pt-2">
        {/* Tool 1: Distraction-Free YouTube */}
        <FocusToolCard
          title="Distraction-Free YouTube"
          description="Watch lectures, tutorials and playlists without surrounding comments, algorithmic recommendations, or sidebar distractions."
          icon={Youtube}
          iconBg="bg-rose-500/10 dark:bg-rose-500/20"
          iconColor="text-rose-600 dark:text-rose-400"
          tagText="Lectures & Tutorials"
          lastOpenedText={lastYtTitle}
          onSelect={() => onSelectTool('youtube')}
          buttonText="Open Video Workspace"
        />

        {/* Tool 2: PDF Study Viewer */}
        <FocusToolCard
          title="PDF Study Viewer"
          description="Read, search, annotate and study PDF documents directly in StudySync with search, bookmarks, thumbnails, and study markup tools."
          icon={FileText}
          iconBg="bg-indigo-500/10 dark:bg-indigo-500/20"
          iconColor="text-indigo-600 dark:text-indigo-400"
          tagText="Documents & Books"
          lastOpenedText={lastPdfName}
          onSelect={() => onSelectTool('pdf')}
          buttonText="Open PDF Workspace"
        />
      </div>

      {/* Subtle Privacy & Architecture Footnote */}
      <div className="pt-6 border-t border-slate-200/60 dark:border-slate-800/60 text-center flex items-center justify-center space-x-2 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>All PDF files and personal notes stay strictly in your browser and are never uploaded externally.</span>
      </div>
    </div>
  );
};
