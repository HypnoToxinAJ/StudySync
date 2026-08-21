import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Award,
  BookOpen,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  PieChart as PieIcon,
  Layers,
  FlaskConical
} from 'lucide-react';
import { CUET_GRADE_RANKS, verifyPortalDifference } from '../utils/cgpaCalculations';

export const CgpaAnalytics = ({ semesters = [], overall = {}, failedCourses = [] }) => {
  const [chartType, setChartType] = useState('line'); // 'line' | 'bar'

  // Prepare trend data across semesters
  const trendData = useMemo(() => {
    return semesters.map((sem, idx) => ({
      name: sem.name.replace('Level ', 'L').replace(' - Term ', 'T'),
      fullName: sem.name,
      gpa: Number(sem.gpa || sem.calculatedGpa || 0),
      credits: Number(sem.completedCredits || 0),
      index: idx + 1
    }));
  }, [semesters]);

  // Calculate grade distribution frequencies
  const gradeDistribution = useMemo(() => {
    const counts = {};
    CUET_GRADE_RANKS.forEach(g => { counts[g] = 0; });

    let totalTheoryCredits = 0;
    let totalLabCredits = 0;

    semesters.forEach(sem => {
      (sem.courses || []).forEach(c => {
        const grade = c.letterGrade;
        if (counts[grade] !== undefined) {
          counts[grade] += 1;
        }
        if (c.courseType === 'Lab') {
          totalLabCredits += Number(c.credit || 0);
        } else {
          totalTheoryCredits += Number(c.credit || 0);
        }
      });
    });

    const barData = CUET_GRADE_RANKS.map(grade => ({
      grade,
      count: counts[grade] || 0
    })).filter(item => item.count > 0 || ['A+', 'A', 'A-', 'B+', 'B', 'F'].includes(item.grade));

    const pieData = [
      { name: 'Theory Credits', value: Number(totalTheoryCredits.toFixed(1)), color: '#4F46E5' },
      { name: 'Lab / Sessional Credits', value: Number(totalLabCredits.toFixed(1)), color: '#06B6D4' }
    ];

    return { barData, pieData, totalTheoryCredits, totalLabCredits };
  }, [semesters]);

  // Discrepancy check between overall official CGPA and calculated verification
  const discrepancyCheck = overall.cgpa !== undefined && overall.calculatedCgpa !== undefined
    ? verifyPortalDifference(overall.cgpa, overall.calculatedCgpa)
    : { hasDiscrepancy: false };

  const cgpaValue = Number(overall.cgpa || overall.calculatedCgpa || 0);
  const completedCredits = Number(overall.completedCredits || 0);
  const qualityPoints = Number(overall.qualityPoints || 0);
  const highestGpa = Number(overall.highestGpa || 0);

  return (
    <div className="space-y-6">
      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Overall CGPA */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Cumulative CGPA
            </span>
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-brand-600 dark:text-brand-400 mt-2 tracking-tight">
            {cgpaValue.toFixed(2)}{' '}
            <span className="text-xs text-slate-400 font-semibold">/ 4.00</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Across {semesters.length} published semesters
          </p>
        </div>

        {/* Completed Credits */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Earned Credits
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
            {completedCredits.toFixed(1)}{' '}
            <span className="text-xs text-slate-400 font-semibold">Credits</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quality Points: <strong>{qualityPoints.toFixed(1)}</strong>
          </p>
        </div>

        {/* Highest Semester GPA */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Peak Term GPA
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight">
            {highestGpa.toFixed(2)}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Highest single semester record
          </p>
        </div>

        {/* Failed / Uncleared Count */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Academic Status
            </span>
            <div className={`p-2 rounded-xl ${
              failedCourses.length > 0
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}>
              {failedCourses.length > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
          </div>
          <h3 className={`text-3xl font-black mt-2 tracking-tight ${
            failedCourses.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
          }`}>
            {failedCourses.length > 0 ? `${failedCourses.length} Uncleared` : 'All Cleared'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {failedCourses.length > 0
              ? 'Failed courses requiring re-examination'
              : 'No outstanding failed courses'}
          </p>
        </div>
      </div>

      {/* DISCREPANCY WARNING BANNER */}
      {discrepancyCheck.hasDiscrepancy && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold">Verification Notice</p>
            <p className="mt-0.5">{discrepancyCheck.message}</p>
          </div>
        </div>
      )}

      {/* UNCLEARED FAILED COURSES SUMMARY */}
      {failedCourses.length > 0 && (
        <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/30 space-y-3">
          <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4" />
            <h4 className="font-extrabold text-sm">
              Uncleared Failed Courses ({failedCourses.length})
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {failedCourses.map((fc, i) => (
              <div
                key={`failed-${fc.courseCode}-${i}`}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-500/20 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-rose-600 dark:text-rose-400">{fc.courseCode}</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold text-[10px]">
                    Grade: F (0.00)
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] truncate font-medium">
                  {fc.courseTitle}
                </p>
                <p className="text-slate-400 text-[10px]">
                  Credit: {fc.credit} • Attempts: {fc.attemptsCount}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECHARTS GPA PROGRESSION & GRADE DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main GPA Trend Chart (2 columns on desktop) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-brand-500" />
                <span>Semester GPA Progression</span>
              </h3>
              <p className="text-xs text-slate-400">
                Chronological term GPA progression across published academic terms
              </p>
            </div>

            <div className="flex space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartType('line')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  chartType === 'line'
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Line Chart
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                  chartType === 'bar'
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Bar Chart
              </button>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                  <YAxis domain={[2.0, 4.0]} stroke="#94A3B8" fontSize={11} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [`GPA: ${Number(value).toFixed(2)}`, 'Term Result']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) return payload[0].payload.fullName;
                      return label;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="gpa"
                    stroke="#4F46E5"
                    strokeWidth={3.5}
                    dot={{ r: 5, fill: '#4F46E5', strokeWidth: 2, stroke: '#FFFFFF' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                  <YAxis domain={[0, 4.0]} stroke="#94A3B8" fontSize={11} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [`GPA: ${Number(value).toFixed(2)}`, 'Term Result']}
                  />
                  <Bar dataKey="gpa" fill="#4F46E5" radius={[8, 8, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grade Distribution Bar Chart */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-cyan-500" />
              <span>Grade Distribution</span>
            </h3>
            <p className="text-xs text-slate-400">
              Total count of letter grades earned
            </p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeDistribution.barData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="grade" stroke="#94A3B8" fontSize={11} />
                <YAxis allowDecimals={false} stroke="#94A3B8" fontSize={11} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [`${value} Courses`, 'Frequency']}
                />
                <Bar dataKey="count" fill="#06B6D4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
