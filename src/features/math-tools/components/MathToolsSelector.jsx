import React from 'react';
import { LineChart, Calculator, Box, Sparkles, ShieldCheck, Sigma } from 'lucide-react';
import { MathToolCard } from './MathToolCard';
import { desmosStateUtils } from '../utils/desmosStateUtils';

export const MathToolsSelector = ({ onSelectTool }) => {
  const graphingMeta = desmosStateUtils.getToolMetadata('graphing');
  const scientificMeta = desmosStateUtils.getToolMetadata('scientific');
  const d3Meta = desmosStateUtils.getToolMetadata('3d');

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4 sm:py-6 animate-fadeIn">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-extrabold border border-brand-500/20">
          <Sigma className="w-3.5 h-3.5" />
          <span>Interactive Mathematical Suite</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Math Tools & Calculators
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Select an interactive Desmos calculator for your engineering calculations, mathematical modeling, coordinate plotting, and 3D surface visualizations.
        </p>
      </div>

      {/* 3 Calculator Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-6 pt-2">
        {/* A. Graphing Calculator */}
        <MathToolCard
          title={graphingMeta.name}
          description={graphingMeta.description}
          badgeText={graphingMeta.badgeText}
          icon={LineChart}
          accentColor="indigo"
          onSelect={() => onSelectTool('graphing')}
          buttonText="Open Graphing"
        />

        {/* B. Scientific Calculator */}
        <MathToolCard
          title={scientificMeta.name}
          description={scientificMeta.description}
          badgeText={scientificMeta.badgeText}
          icon={Calculator}
          accentColor="violet"
          onSelect={() => onSelectTool('scientific')}
          buttonText="Open Scientific"
        />

        {/* C. 3D Calculator */}
        <MathToolCard
          title={d3Meta.name}
          description={d3Meta.description}
          badgeText={d3Meta.badgeText}
          icon={Box}
          accentColor="emerald"
          onSelect={() => onSelectTool('3d')}
          buttonText="Open 3D Math"
        />
      </div>

      {/* Footnote */}
      <div className="pt-6 border-t border-slate-200/60 dark:border-slate-800/60 text-center flex items-center justify-center space-x-2 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Powered by the official Desmos v1.12 API. Expressions and graphs are saved locally to your device.</span>
      </div>
    </div>
  );
};
