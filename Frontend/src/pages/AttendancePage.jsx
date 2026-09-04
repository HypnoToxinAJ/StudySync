import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  AlertTriangle,
  RotateCcw,
  XCircle,
  History,
  TrendingUp,
  FileCheck2,
  Trash2,
  Edit2,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Star,
  BookOpen,
  Calendar,
  Filter,
  Layers,
  Check,
  Award
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { attendanceService, COURSE_TYPES } from '../services/attendanceService';
import { marksService } from '../services/marksService';
import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';
import { Modal } from '../components/common/Modal';

export const AttendancePage = () => {
  const {
    courses,
    addCourse,
    updateCourse,
    deleteCourse,
    recordAttendance,
    deleteAttendanceRecord,
    addCTMark,
    updateCTMark,
    deleteCTMark
  } = useData();

  // Active view tab
  const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'ct-table' | 'history'

  // Modals state
  const [isMarkAttendanceOpen, setIsMarkAttendanceOpen] = useState(false);
  const [isAddCTOpen, setIsAddCTOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingCTMark, setEditingCTMark] = useState(null);

  // Mark Attendance Form State
  const [attendanceForm, setAttendanceForm] = useState({
    courseId: courses[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    status: 'PRESENT',
    reason: ''
  });
  const [attendanceError, setAttendanceError] = useState('');

  // CT Mark Form State
  const [ctForm, setCtForm] = useState({
    courseId: '',
    ctNumber: 1,
    obtainedMarks: 18,
    totalMarks: 20,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [ctError, setCtError] = useState('');

  // Course Add/Edit Form State
  const [courseForm, setCourseForm] = useState({
    courseId: 'CSE-317',
    courseTitle: 'Artificial Intelligence',
    credit: 3.0,
    courseType: COURSE_TYPES.THEORY,
    faculty: 'Dr. Mahfuzul Islam',
    semester: '5th Semester',
    color: '#8B5CF6'
  });

  // History filters
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all'); // 'all' | 'PRESENT' | 'ABSENT'
  const [historyCourseFilter, setHistoryCourseFilter] = useState('all');

  // Overall Attendance Summary Stats
  const overallStats = useMemo(() => {
    return attendanceService.getOverallAttendanceStats(courses);
  }, [courses]);

  // Filter theory courses for CT operations
  const theoryCourses = useMemo(() => {
    return courses.filter(c => attendanceService.isTheory(c));
  }, [courses]);

  // Selected course in CT form for dynamic slot count calculation
  const selectedCTCourse = useMemo(() => {
    return courses.find(c => c.id === ctForm.courseId || c.courseId === ctForm.courseId) || theoryCourses[0] || null;
  }, [courses, ctForm.courseId, theoryCourses]);

  const selectedCTStructure = useMemo(() => {
    return selectedCTCourse ? marksService.getCourseCTStructure(selectedCTCourse) : { totalCTs: 4, bestCount: 3 };
  }, [selectedCTCourse]);

  // History records list
  const historyRecords = useMemo(() => {
    return attendanceService.getAttendanceHistory(historyCourseFilter, {
      status: historyStatusFilter
    });
  }, [courses, historyCourseFilter, historyStatusFilter]);

  // Handlers for Mark Attendance Modal
  const handleOpenMarkAttendance = (targetCourseId = null, prefillStatus = 'PRESENT') => {
    const defaultCourseId = targetCourseId || courses[0]?.id || '';
    setAttendanceForm({
      courseId: defaultCourseId,
      date: new Date().toISOString().split('T')[0],
      status: prefillStatus,
      reason: ''
    });
    setAttendanceError('');
    setIsMarkAttendanceOpen(true);
  };

  const handleMarkAttendanceSubmit = (e) => {
    e.preventDefault();
    setAttendanceError('');

    if (!attendanceForm.courseId) {
      setAttendanceError('Please select a course.');
      return;
    }
    if (!attendanceForm.date) {
      setAttendanceError('Please select a valid date.');
      return;
    }

    const ok = recordAttendance(
      attendanceForm.courseId,
      attendanceForm.status,
      attendanceForm.date,
      attendanceForm.reason
    );

    if (ok) {
      setIsMarkAttendanceOpen(false);
    }
  };

  // Quick mark attendance directly from card
  const handleQuickMark = (courseId, status) => {
    const today = new Date().toISOString().split('T')[0];
    recordAttendance(courseId, status, today, '');
  };

  // Handlers for Add/Edit CT Mark Modal
  const handleOpenAddCTMark = (course = null, existingMark = null) => {
    const activeCourse = course || theoryCourses[0];
    if (!activeCourse) return;

    const structure = marksService.getCourseCTStructure(activeCourse);
    setEditingCTMark(existingMark);

    if (existingMark) {
      setCtForm({
        courseId: activeCourse.id,
        ctNumber: existingMark.ctNumber || 1,
        obtainedMarks: existingMark.obtainedMarks ?? 0,
        totalMarks: existingMark.totalMarks || 20,
        date: existingMark.date || new Date().toISOString().split('T')[0],
        notes: existingMark.notes || ''
      });
    } else {
      // Auto suggest next unused CT number
      const usedNumbers = new Set(
        (activeCourse.assessments || []).map(a => Number(a.ctNumber || (a.name && (a.name.match(/CT\s*[-–]?\s*(\d+)/i) || [])[1])))
      );
      let nextCT = 1;
      for (let i = 1; i <= structure.totalCTs; i++) {
        if (!usedNumbers.has(i)) {
          nextCT = i;
          break;
        }
      }

      setCtForm({
        courseId: activeCourse.id,
        ctNumber: nextCT,
        obtainedMarks: 18,
        totalMarks: 20,
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }

    setCtError('');
    setIsAddCTOpen(true);
  };

  const handleSaveCTSubmit = (e) => {
    e.preventDefault();
    setCtError('');

    if (!ctForm.courseId) {
      setCtError('Please select a Theory course.');
      return;
    }

    const obtained = Number(ctForm.obtainedMarks);
    const total = Number(ctForm.totalMarks || 20);

    if (isNaN(obtained) || obtained < 0) {
      setCtError('Obtained marks cannot be negative.');
      return;
    }
    if (obtained > total) {
      setCtError(`Obtained marks (${obtained}) cannot exceed total marks (${total}).`);
      return;
    }

    if (editingCTMark) {
      const ok = updateCTMark(ctForm.courseId, editingCTMark.id, ctForm);
      if (ok) setIsAddCTOpen(false);
    } else {
      const ok = addCTMark(ctForm.courseId, ctForm);
      if (ok) setIsAddCTOpen(false);
    }
  };

  // Handlers for Add/Edit Course Modal
  const handleOpenAddCourse = () => {
    setEditingCourse(null);
    setCourseForm({
      courseId: 'CSE-317',
      courseTitle: 'Artificial Intelligence',
      credit: 3.0,
      courseType: COURSE_TYPES.THEORY,
      faculty: 'Dr. Mahfuzul Islam',
      semester: '5th Semester',
      color: '#8B5CF6'
    });
    setIsCourseModalOpen(true);
  };

  const handleOpenEditCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({
      courseId: course.courseId || '',
      courseTitle: course.courseTitle || '',
      credit: course.credit || 3.0,
      courseType: course.courseType || COURSE_TYPES.THEORY,
      faculty: course.faculty || '',
      semester: course.semester || '5th Semester',
      color: course.color || '#4F46E5'
    });
    setIsCourseModalOpen(true);
  };

  const handleSaveCourseSubmit = (e) => {
    e.preventDefault();
    if (!courseForm.courseId || !courseForm.courseTitle) return;

    if (editingCourse) {
      updateCourse(editingCourse.id, courseForm);
    } else {
      addCourse(courseForm);
    }
    setIsCourseModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2.5">
            <CheckSquare className="w-7 h-7 text-brand-500" />
            <span>Attendance & CT Marks Tracker</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Strict academic monitoring: Theory missed-class limits (3-cr: max 3, 2-cr: max 2) & Best-N CT marks evaluation (credits + 1 CTs). Sessional/Lab tracked with no deduction penalties.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <button
            onClick={() => handleOpenMarkAttendance()}
            className="flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Mark Attendance</span>
          </button>

          <button
            onClick={() => handleOpenAddCTMark()}
            disabled={theoryCourses.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <FileCheck2 className="w-4 h-4 text-cyan-400" />
            <span>Add CT Mark</span>
          </button>

          <button
            onClick={handleOpenAddCourse}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400" />
            <span>Add Course</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: ATTENDANCE OVERVIEW STATS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Overall Percentage */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overall Attendance</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`text-2xl font-black ${overallStats.overallPercentage >= 85 ? 'text-emerald-500' : overallStats.overallPercentage >= 75 ? 'text-amber-500' : 'text-rose-500'}`}>
              {overallStats.overallPercentage}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Across all registered courses</p>
        </div>

        {/* 2. Total Classes */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Classes</span>
          <div className="mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {overallStats.totalClasses}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Held to date</p>
        </div>

        {/* 3. Classes Attended */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attended</span>
          <div className="mt-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {overallStats.attendedClasses}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">{overallStats.totalClasses > 0 ? `${Math.round((overallStats.attendedClasses / overallStats.totalClasses) * 100)}% attended` : 'No classes'}</p>
        </div>

        {/* 4. Classes Missed */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Missed</span>
          <div className="mt-1">
            <span className={`text-2xl font-black ${overallStats.missedClasses > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
              {overallStats.missedClasses}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Total absences</p>
        </div>

        {/* 5. Theory Courses Count */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Theory Courses</span>
          <div className="mt-1">
            <span className="text-2xl font-black text-brand-600 dark:text-brand-400">
              {overallStats.theoryCoursesCount}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Penalty limits apply</p>
        </div>

        {/* 6. Courses At Risk */}
        <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${overallStats.atRiskCount > 0 ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300' : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Courses At Risk</span>
          <div className="mt-1 flex items-center space-x-1.5">
            {overallStats.atRiskCount > 0 && <AlertTriangle className="w-5 h-5 text-rose-500" />}
            <span className={`text-2xl font-black ${overallStats.atRiskCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {overallStats.atRiskCount}
            </span>
          </div>
          <p className="text-[10px] opacity-70 mt-1">{overallStats.atRiskCount > 0 ? 'Need urgent attention' : 'All courses safe'}</p>
        </div>
      </div>

      {/* VIEW TABS BAR */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'cards'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Course Cards</span>
          </button>

          <button
            onClick={() => setActiveTab('ct-table')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ct-table'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5 text-cyan-500" />
            <span>CT Marks Table</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5 text-brand-500" />
            <span>Attendance History ({historyRecords.length})</span>
          </button>
        </div>

        <span className="text-xs font-medium text-slate-400 hidden sm:inline">
          {courses.length} {courses.length === 1 ? 'course' : 'courses'} enrolled
        </span>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: SMART COURSE CARDS (SECTION 3, 4, 5, 6, 7, 20)     */}
      {/* ========================================================= */}
      {activeTab === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const stats = attendanceService.calculateAttendanceStats(course);
            const marksSummary = marksService.getCourseMarksSummary(course);

            return (
              <div
                key={course.id}
                className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between space-y-4 shadow-sm ${
                  stats.hasDeductionRisk
                    ? 'border-rose-500/60 ring-2 ring-rose-500/20 shadow-rose-500/5'
                    : stats.isLimitReached
                    ? 'border-amber-500/60 ring-1 ring-amber-500/20'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="space-y-4">
                  {/* Course Header */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: course.color || '#4F46E5' }} />
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                          {course.courseId}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          ({course.credit} Cr)
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <Badge
                          variant={
                            course.courseType === COURSE_TYPES.THEORY ? 'indigo' :
                            course.courseType === COURSE_TYPES.LAB ? 'cyan' : 'emerald'
                          }
                          size="sm"
                        >
                          {course.courseType}
                        </Badge>
                        <button
                          onClick={() => handleOpenEditCourse(course)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          title="Edit Course"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1.5 truncate" title={course.courseTitle}>
                      {course.courseTitle}
                    </h4>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Teacher: {course.faculty || 'Unassigned'} • {course.courseType} • {course.credit} {course.credit === 1 ? 'Credit' : 'Credits'}
                    </p>
                  </div>

                  {/* ATTENDANCE SECTION */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                    {/* Attendance Percentage & Status */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Attendance
                        </span>
                        <span className={`text-lg font-black ${stats.percentage >= 85 ? 'text-emerald-500' : stats.percentage >= 75 ? 'text-amber-500' : 'text-rose-500'}`}>
                          {stats.percentage}%
                        </span>
                      </div>

                      {/* Status Badge */}
                      <Badge
                        variant={
                          stats.status === 'SAFE' ? 'emerald' :
                          stats.status === 'LIMIT_REACHED' ? 'amber' :
                          stats.status === 'MARKS_DEDUCTION_RISK' ? 'rose' : 'indigo'
                        }
                        size="sm"
                      >
                        <span className="flex items-center space-x-1">
                          {stats.status === 'SAFE' && <CheckCircle2 className="w-3 h-3" />}
                          {stats.status === 'LIMIT_REACHED' && <AlertTriangle className="w-3 h-3" />}
                          {stats.status === 'MARKS_DEDUCTION_RISK' && <XCircle className="w-3 h-3" />}
                          {stats.status === 'TRACKING' && <Info className="w-3 h-3" />}
                          <span>{stats.statusLabel}</span>
                        </span>
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <ProgressBar
                      value={stats.percentage}
                      color={
                        stats.hasDeductionRisk ? '#EF4444' :
                        stats.isLimitReached ? '#F59E0B' : '#10B981'
                      }
                      height="h-2"
                    />

                    {/* Classes Breakdown Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/40 dark:border-slate-700/40">
                        <span className="text-[10px] text-slate-400 block font-semibold">Total Classes</span>
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">{stats.totalClasses}</span>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/40 dark:border-slate-700/40">
                        <span className="text-[10px] text-slate-400 block font-semibold">Attended</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{stats.attendedClasses}</span>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/40 dark:border-slate-700/40">
                        <span className="text-[10px] text-slate-400 block font-semibold">Missed</span>
                        <span className={`font-extrabold text-sm ${stats.missedClasses > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                          {stats.missedClasses}
                        </span>
                      </div>
                    </div>

                    {/* THEORY WARNING / SAFE BANNER (Section 6) */}
                    {stats.isTheory ? (
                      <div className={`p-2.5 rounded-xl text-[11px] font-bold flex items-center space-x-2 ${
                        stats.hasDeductionRisk
                          ? 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300'
                          : stats.isLimitReached
                          ? 'bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {stats.hasDeductionRisk ? (
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        ) : stats.isLimitReached ? (
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                        ) : (
                          <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                        )}
                        <span className="leading-tight">{stats.statusMessage}</span>
                      </div>
                    ) : (
                      /* SESSIONAL / LAB STATUS (Section 7) */
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span className="font-semibold">{course.courseType} Course</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">Missed-limit: Not Applicable</span>
                      </div>
                    )}
                  </div>

                  {/* CT PERFORMANCE SECTION (SECTION 11, 18, 20) */}
                  {marksSummary.isApplicable ? (
                    <div className="p-4 bg-brand-500/5 border border-brand-500/15 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <Award className="w-4 h-4 text-brand-500" />
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">CT Performance</span>
                        </div>
                        <Badge variant="indigo" size="sm">
                          {marksSummary.message}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Average Result</span>
                          <span className="text-base font-black text-brand-600 dark:text-brand-400">
                            {marksSummary.formattedResult}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-semibold">Progress</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {marksSummary.completionText}
                          </span>
                        </div>
                      </div>

                      {/* Best selected marks snippet */}
                      <div className="pt-2 border-t border-brand-500/10 flex items-center justify-between text-xs">
                        <button
                          onClick={() => handleOpenAddCTMark(course)}
                          className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center space-x-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add CT Mark</span>
                        </button>

                        <button
                          onClick={() => setActiveTab('ct-table')}
                          className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          View Table →
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Sessional / Lab CT Notice (Section 18) */
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl text-center text-xs text-slate-400 font-medium">
                      <span className="font-bold text-slate-500 dark:text-slate-400 block">CT Marks: Not Applicable</span>
                      CT marks are not applicable for {course.courseType} courses.
                    </div>
                  )}
                </div>

                {/* CARD QUICK ACTIONS (PRESENT / ABSENT BUTTONS) */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleQuickMark(course.id, 'PRESENT')}
                    className="py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors border border-emerald-500/20"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>+ Present</span>
                  </button>

                  <button
                    onClick={() => handleQuickMark(course.id, 'ABSENT')}
                    className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-colors border border-rose-500/20"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>+ Absent</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CT MARKS TABLE (SECTION 11, 12, 13, 14, 15, 16)    */}
      {/* ========================================================= */}
      {activeTab === 'ct-table' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                  <FileCheck2 className="w-5 h-5 text-brand-500" />
                  <span>Theory CT Marks Matrix</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automatic configuration: Total CTs = Credits + 1, Best N = Credits. Missing CTs are not treated as zero.
                </p>
              </div>

              <button
                onClick={() => handleOpenAddCTMark()}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add CT Mark</span>
              </button>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Course</th>
                    <th className="py-3 px-3 text-center">Type</th>
                    <th className="py-3 px-3 text-center">CT 1</th>
                    <th className="py-3 px-3 text-center">CT 2</th>
                    <th className="py-3 px-3 text-center">CT 3</th>
                    <th className="py-3 px-3 text-center">CT 4</th>
                    <th className="py-3 px-3 text-center">Best N Counted</th>
                    <th className="py-3 px-3 text-center font-extrabold">CT Result</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {courses.map((course) => {
                    const row = marksService.getCourseCTMatrixRow(course);

                    if (!row.isApplicable) {
                      return (
                        <tr key={course.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center space-x-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: course.color || '#4F46E5' }} />
                              <div>
                                <span className="font-mono">{course.courseId}</span>
                                <span className="text-slate-400 font-normal block text-[11px] truncate max-w-xs">{course.courseTitle}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <Badge variant="cyan" size="sm">{course.courseType}</Badge>
                          </td>
                          <td colSpan={6} className="py-3.5 px-3 text-center italic text-slate-400 font-medium">
                            CT marks are not applicable for Sessional/Lab courses.
                          </td>
                          <td className="py-3.5 px-3 text-right text-slate-400 font-medium text-[11px]">
                            —
                          </td>
                        </tr>
                      );
                    }

                    const ct1 = row.slots.find(s => s.ctNumber === 1);
                    const ct2 = row.slots.find(s => s.ctNumber === 2);
                    const ct3 = row.slots.find(s => s.ctNumber === 3);
                    const ct4 = row.slots.find(s => s.ctNumber === 4);

                    return (
                      <tr key={course.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: course.color || '#4F46E5' }} />
                            <div>
                              <span className="font-mono text-xs">{course.courseId}</span>
                              <span className="text-slate-400 font-normal block text-[11px] truncate max-w-xs">{course.courseTitle}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <Badge variant="indigo" size="sm">Theory ({course.credit} Cr)</Badge>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{row.completionText}</span>
                        </td>

                        {/* CT 1 */}
                        <td className="py-3.5 px-3 text-center">
                          {ct1?.isCompleted ? (
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white">
                              {ct1.obtainedMarks} <span className="text-[10px] text-slate-400 font-normal">/ {ct1.totalMarks}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Not Taken</span>
                          )}
                        </td>

                        {/* CT 2 */}
                        <td className="py-3.5 px-3 text-center">
                          {ct2?.isCompleted ? (
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white">
                              {ct2.obtainedMarks} <span className="text-[10px] text-slate-400 font-normal">/ {ct2.totalMarks}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Not Taken</span>
                          )}
                        </td>

                        {/* CT 3 */}
                        <td className="py-3.5 px-3 text-center">
                          {ct3?.isCompleted ? (
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white">
                              {ct3.obtainedMarks} <span className="text-[10px] text-slate-400 font-normal">/ {ct3.totalMarks}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Not Taken</span>
                          )}
                        </td>

                        {/* CT 4 (if course credit >= 3) */}
                        <td className="py-3.5 px-3 text-center">
                          {row.totalCTs >= 4 ? (
                            ct4?.isCompleted ? (
                              <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white">
                                {ct4.obtainedMarks} <span className="text-[10px] text-slate-400 font-normal">/ {ct4.totalMarks}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Not Taken</span>
                            )
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600 font-mono">—</span>
                          )}
                        </td>

                        {/* Best N Column */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                            {row.bestValuesFormatted}
                          </span>
                          <span className="text-[10px] text-slate-400 block">Best {row.bestCount}</span>
                        </td>

                        {/* CT Result (%) */}
                        <td className="py-3.5 px-3 text-center font-extrabold text-sm">
                          {row.resultPercentage !== null ? (
                            <span className={`px-2.5 py-1 rounded-xl ${row.resultPercentage >= 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-brand-500/10 text-brand-600 dark:text-brand-400'}`}>
                              {row.formattedResult}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs font-normal">No Marks Yet</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={() => handleOpenAddCTMark(course)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-brand-600 hover:text-white dark:hover:bg-brand-600 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all"
                          >
                            + Mark
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 22: CT Performance Summary Cards */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              CT Performance Summary
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {theoryCourses.map(course => {
                const row = marksService.getCourseCTMatrixRow(course);
                return (
                  <div key={course.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">{course.courseId}</span>
                      <Badge variant="indigo" size="sm">Best {row.bestCount} of {row.totalCTs}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{course.courseTitle}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-400 font-semibold">{row.completionText}</span>
                      <span className="text-base font-black text-brand-600 dark:text-brand-400">{row.formattedResult}</span>
                    </div>
                    <ProgressBar value={row.resultPercentage || 0} color="#4F46E5" height="h-1.5" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ATTENDANCE HISTORY (SECTION 21)                    */}
      {/* ========================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <History className="w-5 h-5 text-brand-500" />
                <span>Attendance Log</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Chronological record of all recorded present and absent entries</p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="PRESENT">Present Only</option>
                <option value="ABSENT">Absent Only</option>
              </select>

              <select
                value={historyCourseFilter}
                onChange={(e) => setHistoryCourseFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none max-w-xs"
              >
                <option value="all">All Courses</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.courseId} - {c.courseTitle}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 w-32">Date</th>
                  <th className="py-2.5 px-3">Course</th>
                  <th className="py-2.5 px-3 w-28 text-center">Status</th>
                  <th className="py-2.5 px-3">Reason / Note</th>
                  <th className="py-2.5 px-3 w-20 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {historyRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      No attendance entries found matching the filter.
                    </td>
                  </tr>
                ) : (
                  historyRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-semibold font-mono text-slate-600 dark:text-slate-400">
                        {record.date}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-extrabold text-slate-900 dark:text-white mr-1.5">{record.courseCode}</span>
                        <span className="text-slate-400 text-[11px]">{record.courseTitle}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant={record.status === 'ABSENT' ? 'rose' : 'emerald'}
                          size="sm"
                        >
                          {record.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                        {record.reason || '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => deleteAttendanceRecord(record.courseId, record.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: + MARK ATTENDANCE (SECTION 8)                    */}
      {/* ========================================================= */}
      <Modal
        isOpen={isMarkAttendanceOpen}
        onClose={() => setIsMarkAttendanceOpen(false)}
        title="Mark Attendance"
      >
        <form onSubmit={handleMarkAttendanceSubmit} className="space-y-4">
          {attendanceError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{attendanceError}</span>
            </div>
          )}

          {/* Course select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Course *
            </label>
            <select
              value={attendanceForm.courseId}
              onChange={(e) => setAttendanceForm({ ...attendanceForm, courseId: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-900 dark:text-white"
              required
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.courseId} — {course.courseTitle} ({course.courseType})
                </option>
              ))}
            </select>
          </div>

          {/* Date picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={attendanceForm.date}
              onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-900 dark:text-white"
              required
            />
          </div>

          {/* Status Radio Pills (Present / Absent) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Attendance Status *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAttendanceForm({ ...attendanceForm, status: 'PRESENT' })}
                className={`py-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 border transition-all ${
                  attendanceForm.status === 'PRESENT'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-500/50'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Present</span>
              </button>

              <button
                type="button"
                onClick={() => setAttendanceForm({ ...attendanceForm, status: 'ABSENT' })}
                className={`py-3 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 border transition-all ${
                  attendanceForm.status === 'ABSENT'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-rose-500/50'
                }`}
              >
                <XCircle className="w-4 h-4" />
                <span>Absent</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Marking Absent automatically updates missed count and recalculates attendance limits.
            </p>
          </div>

          {/* Optional reason / note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reason / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Traffic delay, fever, medical emergency"
              value={attendanceForm.reason}
              onChange={(e) => setAttendanceForm({ ...attendanceForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsMarkAttendanceOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
            >
              Save Attendance
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: + ADD / EDIT CT MARK (SECTION 17)                */}
      {/* ========================================================= */}
      <Modal
        isOpen={isAddCTOpen}
        onClose={() => setIsAddCTOpen(false)}
        title={editingCTMark ? 'Edit CT Mark' : 'Add CT Mark'}
      >
        <form onSubmit={handleSaveCTSubmit} className="space-y-4">
          {ctError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{ctError}</span>
            </div>
          )}

          {/* Theory Course Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Theory Course *
            </label>
            <select
              value={ctForm.courseId}
              onChange={(e) => setCtForm({ ...ctForm, courseId: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-900 dark:text-white"
              required
              disabled={Boolean(editingCTMark)}
            >
              {theoryCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.courseId} — {c.courseTitle} ({c.credit} Credits)
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              CT marks apply strictly to Theory courses. Automatic rule: {selectedCTStructure.totalCTs} CTs scheduled, best {selectedCTStructure.bestCount} counted.
            </p>
          </div>

          {/* CT Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              CT Number *
            </label>
            <select
              value={ctForm.ctNumber}
              onChange={(e) => setCtForm({ ...ctForm, ctNumber: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-900 dark:text-white"
              required
            >
              {Array.from({ length: selectedCTStructure.totalCTs }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  CT-{num}
                </option>
              ))}
            </select>
          </div>

          {/* Marks: Obtained & Total */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Obtained Marks *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max={ctForm.totalMarks || 20}
                value={ctForm.obtainedMarks}
                onChange={(e) => setCtForm({ ...ctForm, obtainedMarks: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Total Marks *
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={ctForm.totalMarks}
                onChange={(e) => setCtForm({ ...ctForm, totalMarks: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={ctForm.date}
              onChange={(e) => setCtForm({ ...ctForm, date: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
            {editingCTMark ? (
              <button
                type="button"
                onClick={() => {
                  deleteCTMark(ctForm.courseId, editingCTMark.id);
                  setIsAddCTOpen(false);
                }}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Mark</span>
              </button>
            ) : <div />}

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsAddCTOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
              >
                Save CT Mark
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: ADD / EDIT COURSE MODAL (SECTION 19)             */}
      {/* ========================================================= */}
      <Modal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        title={editingCourse ? 'Edit Course Details' : 'Add Academic Course'}
      >
        <form onSubmit={handleSaveCourseSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Course Code *
              </label>
              <input
                type="text"
                value={courseForm.courseId}
                onChange={(e) => setCourseForm({ ...courseForm, courseId: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-900 dark:text-white font-mono"
                placeholder="e.g. CSE-317"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Course Type *
              </label>
              <select
                value={courseForm.courseType}
                onChange={(e) => setCourseForm({ ...courseForm, courseType: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-900 dark:text-white"
              >
                <option value={COURSE_TYPES.THEORY}>Theory</option>
                <option value={COURSE_TYPES.LAB}>Lab</option>
                <option value={COURSE_TYPES.SESSIONAL}>Sessional</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Course Name *
            </label>
            <input
              type="text"
              value={courseForm.courseTitle}
              onChange={(e) => setCourseForm({ ...courseForm, courseTitle: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-900 dark:text-white"
              placeholder="e.g. Artificial Intelligence"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Credits *
              </label>
              <input
                type="number"
                step="0.25"
                min="0.5"
                max="6"
                value={courseForm.credit}
                onChange={(e) => setCourseForm({ ...courseForm, credit: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-900 dark:text-white"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Theory: Credits determine safe miss limit & CT structure automatically.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Teacher Name
              </label>
              <input
                type="text"
                value={courseForm.faculty}
                onChange={(e) => setCourseForm({ ...courseForm, faculty: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/30 text-slate-900 dark:text-white"
                placeholder="e.g. Dr. John Doe"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
            {editingCourse ? (
              <button
                type="button"
                onClick={() => {
                  deleteCourse(editingCourse.id);
                  setIsCourseModalOpen(false);
                }}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Course</span>
              </button>
            ) : <div />}

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsCourseModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
              >
                Save Course
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttendancePage;
