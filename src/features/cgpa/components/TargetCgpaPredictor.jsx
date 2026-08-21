import React, { useState } from 'react';
import { Target, Sparkles, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { Badge } from '../../../components/common/Badge';
import { calculateTargetGpaProjection } from '../utils/cgpaCalculations';

export const TargetCgpaPredictor = ({ currentCgpa = 3.80, completedCredits = 90 }) => {
  const [targetCgpa, setTargetCgpa] = useState(
    currentCgpa ? Number((currentCgpa + 0.05).toFixed(2)) : 3.85
  );
  const [nextCredits, setNextCredits] = useState(19.5);

  const projection = calculateTargetGpaProjection(
    currentCgpa,
    completedCredits,
    targetCgpa,
    nextCredits
  );

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl space-y-6 relative overflow-hidden border border-white/10">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-brand-500/20 text-cyan-400 rounded-2xl border border-brand-500/30">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold">Next-Semester Target CGPA Calculator</h3>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30 uppercase tracking-wide">
                Projection
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Simulate required next-semester performance based on your officially completed {completedCredits.toFixed(1)} credits
            </p>
          </div>
        </div>

        <span className="text-[11px] text-amber-300/90 font-semibold bg-white/5 px-3 py-1 rounded-xl border border-white/10 self-start sm:self-auto">
          ⚠️ Not part of official CUET results
        </span>
      </div>

      {/* Interactive Projection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center relative z-10">
        {/* User editable inputs */}
        <div className="space-y-4 md:col-span-1">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
              <span>Target Final CGPA</span>
              <span className="text-[10px] text-cyan-300">Max 4.00</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="2.00"
              max="4.00"
              value={targetCgpa}
              onChange={(e) => setTargetCgpa(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white font-bold outline-none text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
              <span>Upcoming Semester Credits</span>
              <span className="text-[10px] text-slate-400">e.g. 19.5 or 20.0</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="30"
              value={nextCredits}
              onChange={(e) => setNextCredits(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white font-bold outline-none text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
            />
          </div>

          <div className="text-[11px] text-slate-400 space-y-1 pt-1">
            <p>• Official Current CGPA: <strong className="text-white">{currentCgpa.toFixed(2)}</strong></p>
            <p>• Official Completed Credits: <strong className="text-white">{completedCredits.toFixed(1)}</strong></p>
          </div>
        </div>

        {/* Projection Results Output Panel */}
        <div className="md:col-span-2 p-6 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Required Next Semester GPA
              </span>
              <Badge variant={projection.isFeasible ? 'emerald' : 'rose'}>
                {projection.isFeasible ? 'Feasible Goal' : 'High Difficulty / Exceeds 4.00'}
              </Badge>
            </div>

            <h4 className={`text-4xl font-extrabold mt-2 tracking-tight ${
              projection.isFeasible ? 'text-cyan-300' : 'text-rose-400'
            }`}>
              {projection.requiredGPA > 4.00
                ? '> 4.00'
                : projection.requiredGPA < 0
                  ? '0.00'
                  : projection.requiredGPA.toFixed(2)}
            </h4>

            <p className="text-xs text-slate-200 mt-2 font-medium">
              {projection.message}
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300 font-medium">
            <span>
              Maximum Reachable CGPA with 4.00 Term: <strong className="text-white font-bold">{projection.maxReachableCGPA.toFixed(2)}</strong>
            </span>
            <span>
              Total Credits After Term: <strong>{(completedCredits + nextCredits).toFixed(1)}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
