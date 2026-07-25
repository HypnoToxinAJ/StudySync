import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';
import {
  GraduationCap,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Target,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { cgpaService } from '../services/cgpaService';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';

export const CGPAPage = () => {
  const { semesters, addSemester, addCourseToSemester, deleteSemester } = useData();

  const [chartType, setChartType] = useState('line'); // 'line' or 'bar'
  const [isAddSemOpen, setIsAddSemOpen] = useState(false);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [selectedSemId, setSelectedSemId] = useState(null);

  // Target Calculator state
  const [targetForm, setTargetForm] = useState({ desiredCGPA: 3.85, nextCredits: 18 });

  // Add Semester state
  const [semNameInput, setSemNameInput] = useState('');

  // Add Course to Semester state
  const [courseInput, setCourseInput] = useState({
    courseId: 'CSE-317',
    title: 'Artificial Intelligence',
    credit: 3.0,
    grade: 'A+',
    gradePoint: 4.00
  });

  const overallStats = cgpaService.calculateOverallCGPA();
  const targetResult = cgpaService.calculateTargetGPA(targetForm.desiredCGPA, targetForm.nextCredits);

  const gradePointMap = {
    'A+': 4.00,
    'A': 3.75,
    'A-': 3.50,
    'B+': 3.25,
    'B': 3.00,
    'B-': 2.75,
    'C+': 2.50,
    'C': 2.25,
    'D': 2.00,
    'F': 0.00
  };

  const handleGradeChange = (grade) => {
    setCourseInput({
      ...courseInput,
      grade,
      gradePoint: gradePointMap[grade] || 0.00
    });
  };

  const handleAddSemesterSubmit = (e) => {
    e.preventDefault();
    if (!semNameInput.trim()) return;
    addSemester(semNameInput);
    setSemNameInput('');
    setIsAddSemOpen(false);
  };

  const handleAddCourseSubmit = (e) => {
    e.preventDefault();
    if (!selectedSemId) return;
    addCourseToSemester(selectedSemId, courseInput);
    setIsAddCourseOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <GraduationCap className="w-6 h-6 text-brand-500" />
            <span>CGPA Calculator & Academic Trend</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Semester GPA tracking, quality points calculation, and next-semester target predictor
          </p>
        </div>

        <button
          onClick={() => setIsAddSemOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Semester</span>
        </button>
      </div>

      {/* OVERALL STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall CGPA</span>
          <h3 className="text-3xl font-extrabold text-brand-600 dark:text-brand-400 mt-2">
            {overallStats.cgpa.toFixed(2)} <span className="text-xs text-slate-400 font-semibold">/ 4.00</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">Across {overallStats.semesterCount} completed semesters</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Completed Credits</span>
          <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {overallStats.totalCredits} <span className="text-xs text-slate-400 font-semibold">Credits</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">Quality Points: {overallStats.totalQualityPoints.toFixed(1)}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Highest Semester GPA</span>
          <h3 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            {overallStats.highestGPA.toFixed(2)}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Peak academic performance</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grading Scale</span>
          <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            4.00 Scale
          </h3>
          <p className="text-xs text-slate-500 mt-1">A+ = 4.00, A = 3.75, B = 3.00</p>
        </div>
      </div>

      {/* RECHARTS GPA TREND GRAPH */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-brand-500" />
            <span>GPA Progression Trend Across Semesters</span>
          </h3>
          <div className="flex space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                chartType === 'line' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              Line Chart
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                chartType === 'bar' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              Bar Chart
            </button>
          </div>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={overallStats.trendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis domain={[2.0, 4.0]} stroke="#94A3B8" fontSize={11} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="gpa" stroke="#4F46E5" strokeWidth={3} dot={{ r: 5, fill: '#4F46E5' }} />
              </LineChart>
            ) : (
              <BarChart data={overallStats.trendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis domain={[0, 4.0]} stroke="#94A3B8" fontSize={11} />
                <RechartsTooltip />
                <Bar dataKey="gpa" fill="#06B6D4" radius={[8, 8, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* NEXT-SEMESTER TARGET CGPA PREDICTOR */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-xl space-y-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-brand-500/20 text-cyan-400 rounded-2xl border border-brand-500/30">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Next-Semester Target CGPA Calculator</h3>
            <p className="text-xs text-slate-300">
              Calculate exact required GPA for upcoming semester to reach your desired target CGPA
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="space-y-4 md:col-span-1">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Desired Final Target CGPA</label>
              <input
                type="number"
                step="0.01"
                min="2.0"
                max="4.0"
                value={targetForm.desiredCGPA}
                onChange={(e) => setTargetForm({ ...targetForm, desiredCGPA: Number(e.target.value) })}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white font-bold outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Next Semester Credits</label>
              <input
                type="number"
                step="0.5"
                min="1"
                value={targetForm.nextCredits}
                onChange={(e) => setTargetForm({ ...targetForm, nextCredits: Number(e.target.value) })}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white font-bold outline-none text-sm"
              />
            </div>
          </div>

          <div className="md:col-span-2 p-6 bg-white/10 rounded-2xl border border-white/15 backdrop-blur-md flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Required Next Semester GPA</span>
              <h4 className={`text-4xl font-extrabold mt-2 ${
                targetResult.isFeasible ? 'text-cyan-300' : 'text-rose-400'
              }`}>
                {targetResult.requiredGPA > 4.00 ? '> 4.00' : targetResult.requiredGPA.toFixed(2)}
              </h4>
              <p className="text-xs text-slate-200 mt-2">
                {targetResult.message}
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 font-medium">
              <span>Max Reachable CGPA: <strong>{targetResult.maxReachableCGPA}</strong></span>
              <Badge variant={targetResult.isFeasible ? 'emerald' : 'rose'}>
                {targetResult.isFeasible ? 'Feasible Target' : 'High Difficulty Warning'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* SEMESTERS ACCORDION LIST */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Completed & Active Semester Breakdown
        </h3>

        {semesters.map((sem) => {
          const semStats = cgpaService.calculateSemesterGPA(sem);
          return (
            <div
              key={sem.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">{sem.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Semester GPA: <strong className="text-brand-600 dark:text-brand-400">{semStats.gpa.toFixed(2)}</strong> ({semStats.totalCredits} Credits)
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedSemId(sem.id);
                      setIsAddCourseOpen(true);
                    }}
                    className="px-3 py-1.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500/20 text-xs font-bold rounded-xl transition-colors"
                  >
                    + Add Course
                  </button>
                  <button
                    onClick={() => deleteSemester(sem.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Semester Courses Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider font-semibold">
                      <th className="py-2 px-3">Course ID</th>
                      <th className="py-2 px-3">Course Title</th>
                      <th className="py-2 px-3">Credit</th>
                      <th className="py-2 px-3">Grade</th>
                      <th className="py-2 px-3">Grade Point</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(sem.courses || []).map((c) => (
                      <tr key={c.id}>
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{c.courseId}</td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{c.title}</td>
                        <td className="py-2.5 px-3 font-semibold">{c.credit}</td>
                        <td className="py-2.5 px-3"><Badge variant="indigo">{c.grade}</Badge></td>
                        <td className="py-2.5 px-3 font-bold text-brand-600 dark:text-brand-400">{c.gradePoint.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD SEMESTER MODAL */}
      <Modal isOpen={isAddSemOpen} onClose={() => setIsAddSemOpen(false)} title="Add New Semester">
        <form onSubmit={handleAddSemesterSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Semester Name</label>
            <input
              type="text"
              placeholder="e.g. 3rd Year 1st Semester"
              value={semNameInput}
              onChange={(e) => setSemNameInput(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              required
            />
          </div>
          <div className="pt-2 flex justify-end space-x-2">
            <button type="button" onClick={() => setIsAddSemOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
            <button type="submit" className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl shadow-md">Create Semester</button>
          </div>
        </form>
      </Modal>

      {/* ADD COURSE TO SEMESTER MODAL */}
      <Modal isOpen={isAddCourseOpen} onClose={() => setIsAddCourseOpen(false)} title="Add Course to Semester">
        <form onSubmit={handleAddCourseSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Course ID</label>
              <input
                type="text"
                value={courseInput.courseId}
                onChange={(e) => setCourseInput({ ...courseInput, courseId: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Credit Weight</label>
              <input
                type="number"
                step="0.5"
                value={courseInput.credit}
                onChange={(e) => setCourseInput({ ...courseInput, credit: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Course Title</label>
            <input
              type="text"
              value={courseInput.title}
              onChange={(e) => setCourseInput({ ...courseInput, title: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Obtained Grade</label>
            <select
              value={courseInput.grade}
              onChange={(e) => handleGradeChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
            >
              {Object.keys(gradePointMap).map(g => (
                <option key={g} value={g}>{g} ({gradePointMap[g].toFixed(2)})</option>
              ))}
            </select>
          </div>
          <div className="pt-2 flex justify-end space-x-2">
            <button type="button" onClick={() => setIsAddCourseOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
            <button type="submit" className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl shadow-md">Add Course</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
