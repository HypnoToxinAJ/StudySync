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
  Filter
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { attendanceService } from '../services/attendanceService';
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
    recordMissedClass,
    undoLastMissed,
    updateMissedRecord,
    deleteMissedRecord,
    addAssessmentToCourse,
    updateAssessmentInCourse,
    deleteAssessmentFromCourse,
    toggleAssessmentMissed
  } = useData();

  // Dialog & Active State
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyCourseFilter, setHistoryCourseFilter] = useState('all');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  // Course Assessment Modal State
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [activeCourseForAst, setActiveCourseForAst] = useState(null);
  const [editingAssessment, setEditingAssessment] = useState(null);

  // Expanded assessment details per card
  const [expandedCards, setExpandedCards] = useState({});

  // Form State: Add/Edit Course
  const [courseForm, setCourseForm] = useState({
    courseId: 'CSE-317',
    courseTitle: 'Artificial Intelligence',
    credit: 3.0,
    courseType: 'theory',
    faculty: 'Dr. Mahfuzul Islam',
    semester: '5th Semester',
    color: '#8B5CF6'
  });

  // Form State: Assessment
  const [astForm, setAstForm] = useState({
    name: 'CT 1: Introduction to AI & Search',
    type: 'CT',
    totalMarks: 20,
    expectedMarks: 18,
    obtainedMarks: 17,
    isMissed: false,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Form State: Add Missed Class Record directly from History Modal
  const [manualMissedForm, setManualMissedForm] = useState({
    courseId: courses[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  // Editing History Record State
  const [editingHistoryRecord, setEditingHistoryRecord] = useState(null);
  const [deleteConfirmRecordId, setDeleteConfirmRecordId] = useState(null);

  // Validation feedback for course form
  const courseValidation = useMemo(() => {
    return attendanceService.validateCourseConfig(courseForm.courseType, courseForm.credit);
  }, [courseForm.courseType, courseForm.credit]);

  // Expand/collapse assessment list in course card
  const toggleCardExpanded = (courseId) => {
    setExpandedCards(prev => ({
      ...prev,
      [courseId]: !prev[courseId]
    }));
  };

  // Open modal for adding a course
  const handleOpenAddCourse = () => {
    setEditingCourse(null);
    setCourseForm({
      courseId: 'CSE-317',
      courseTitle: 'Artificial Intelligence',
      credit: 3.0,
      courseType: 'theory',
      faculty: 'Dr. Mahfuzul Islam',
      semester: '5th Semester',
      color: '#8B5CF6'
    });
    setIsAddCourseOpen(true);
  };

  // Open modal for editing a course
  const handleOpenEditCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({
      courseId: course.courseId || '',
      courseTitle: course.courseTitle || '',
      credit: course.credit || 3.0,
      courseType: course.courseType || 'theory',
      faculty: course.faculty || '',
      semester: course.semester || '5th Semester',
      color: course.color || '#4F46E5'
    });
    setIsAddCourseOpen(true);
  };

  const handleSaveCourseSubmit = (e) => {
    e.preventDefault();
    if (!courseValidation.isValid) return;

    if (editingCourse) {
      updateCourse(editingCourse.id, courseForm);
    } else {
      addCourse(courseForm);
    }
    setIsAddCourseOpen(false);
  };

  // Open modal for adding CT Assessment
  const handleOpenAddAssessment = (course) => {
    setActiveCourseForAst(course);
    setEditingAssessment(null);
    setAstForm({
      name: `CT ${(course.assessments?.length || 0) + 1}: `,
      type: 'CT',
      totalMarks: 20,
      expectedMarks: 18,
      obtainedMarks: 17,
      isMissed: false,
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setIsAssessmentModalOpen(true);
  };

  // Open modal for editing CT Assessment
  const handleOpenEditAssessment = (course, ast) => {
    setActiveCourseForAst(course);
    setEditingAssessment(ast);
    setAstForm({
      name: ast.name || '',
      type: ast.type || 'CT',
      totalMarks: ast.totalMarks || 20,
      expectedMarks: ast.expectedMarks || ast.totalMarks || 20,
      obtainedMarks: ast.isMissed ? 0 : (ast.obtainedMarks || 0),
      isMissed: Boolean(ast.isMissed),
      date: ast.date || new Date().toISOString().split('T')[0],
      notes: ast.notes || ''
    });
    setIsAssessmentModalOpen(true);
  };

  const handleSaveAssessmentSubmit = (e) => {
    e.preventDefault();
    if (!activeCourseForAst) return;

    if (editingAssessment) {
      updateAssessmentInCourse(activeCourseForAst.id, editingAssessment.id, astForm);
    } else {
      addAssessmentToCourse(activeCourseForAst.id, astForm);
    }
    setIsAssessmentModalOpen(false);
  };

  // Submit manual missed record in history modal
  const handleAddManualMissedSubmit = (e) => {
    e.preventDefault();
    if (!manualMissedForm.courseId) return;
    recordMissedClass(manualMissedForm.courseId, manualMissedForm.date, manualMissedForm.reason);
    setManualMissedForm(prev => ({ ...prev, reason: '' }));
  };

  // Filtered missed history records
  const missedHistoryRecords = useMemo(() => {
    return attendanceService.getMissedHistory(
      historyCourseFilter === 'all' ? null : historyCourseFilter,
      {
        courseType: historyTypeFilter === 'all' ? null : historyTypeFilter,
        startDate: historyStartDate || null,
        endDate: historyEndDate || null
      }
    );
  }, [courses, historyCourseFilter, historyTypeFilter, historyStartDate, historyEndDate]);

  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <CheckSquare className="w-6 h-6 text-brand-500" />
            <span>Attendance & CT Marks Tracker</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Missed-class limit monitoring (3-cr: 3 max, 2-cr: 2 max, 1.5-cr lab: 1 max, 0.75-cr lab: 0 max) & theory CT best-N scores
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <History className="w-4 h-4 text-brand-500" />
            <span>Missed History</span>
          </button>

          <button
            onClick={handleOpenAddCourse}
            className="flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Course</span>
          </button>
        </div>
      </div>

      {/* COURSE CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          const stats = attendanceService.calculateAttendanceStats(course);
          const marksSummary = marksService.getCourseMarksSummary(course);
          const isExpanded = Boolean(expandedCards[course.id]);

          // Progress percentage of missed capacity consumed
          const missedCapacityPercentage = stats.allowedMissed > 0
            ? Math.min(100, Math.round((stats.missed / stats.allowedMissed) * 100))
            : (stats.missed > 0 ? 100 : 0);

          return (
            <div
              key={course.id}
              className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between space-y-4 shadow-sm ${
                stats.hasDeductionRisk
                  ? 'border-rose-500/50 ring-2 ring-rose-500/20'
                  : stats.riskLevel === 'limit_reached'
                  ? 'border-amber-500/50'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div className="space-y-4">
                {/* Course Header & Badges */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: course.color || '#4F46E5' }} />
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">{course.courseId}</span>
                      <span className="text-xs text-slate-400 font-semibold">({course.credit} Cr)</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <Badge variant={course.courseType === 'theory' ? 'indigo' : 'cyan'} size="sm">
                        {String(course.courseType || 'theory').toUpperCase()}
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

                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1.5 truncate">
                    {course.courseTitle}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    Faculty: {course.faculty || 'Unassigned'} • {course.semester || '5th Semester'}
                  </p>
                </div>

                {/* MISSED CLASS ATTENDANCE CARD METRICS */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Absence Status
                    </span>
                    <Badge
                      variant={
                        stats.riskLevel === 'safe' ? 'emerald' :
                        stats.riskLevel === 'limit_reached' ? 'amber' :
                        stats.riskLevel === 'no_absence_allowed' ? 'indigo' : 'rose'
                      }
                      size="sm"
                    >
                      <span className="flex items-center space-x-1">
                        {stats.riskLevel === 'safe' && <CheckCircle2 className="w-3 h-3" />}
                        {stats.riskLevel === 'limit_reached' && <AlertTriangle className="w-3 h-3" />}
                        {stats.riskLevel === 'no_absence_allowed' && <Info className="w-3 h-3" />}
                        {stats.hasDeductionRisk && <XCircle className="w-3 h-3" />}
                        <span>{stats.riskLabel}</span>
                      </span>
                    </Badge>
                  </div>

                  {/* Attendance Numeric Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/40 dark:border-slate-700/40">
                      <span className="text-[10px] text-slate-400 font-semibold block">Scheduled Classes</span>
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">{stats.totalScheduled}</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/40 dark:border-slate-700/40">
                      <span className="text-[10px] text-slate-400 font-semibold block">Missed Classes</span>
                      <span className={`font-extrabold text-sm ${stats.missed > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                        {stats.missed}
                      </span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/40 dark:border-slate-700/40">
                      <span className="text-[10px] text-slate-400 font-semibold block">Max Safe Misses</span>
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">{stats.allowedMissed}</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/40 dark:border-slate-700/40">
                      <span className="text-[10px] text-slate-400 font-semibold block">Remaining Safe</span>
                      <span className="font-extrabold text-brand-600 dark:text-brand-400 text-sm">{stats.remainingSafe}</span>
                    </div>
                  </div>

                  {/* Missed Capacity Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Missed Capacity Used</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {stats.missed} / {stats.allowedMissed}
                      </span>
                    </div>
                    <ProgressBar
                      value={missedCapacityPercentage}
                      color={
                        stats.hasDeductionRisk ? '#EF4444' :
                        stats.riskLevel === 'limit_reached' ? '#F59E0B' : '#10B981'
                      }
                      height="h-2"
                    />
                  </div>

                  {/* Risk Alert Callout Banner */}
                  {stats.hasDeductionRisk && (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[11px] font-bold text-rose-700 dark:text-rose-300 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{stats.riskMessage}</span>
                    </div>
                  )}
                  {!stats.hasDeductionRisk && stats.riskLevel === 'limit_reached' && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>{stats.riskMessage}</span>
                    </div>
                  )}
                </div>

                {/* CT & ASSIGNMENT MARKS SECTION (THEORY COURSES ONLY) */}
                {marksSummary.isApplicable ? (
                  <div className="p-4 bg-brand-500/5 border border-brand-500/15 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <FileCheck2 className="w-4 h-4 text-brand-500" />
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">CT & Assignments</span>
                      </div>
                      <Badge variant="indigo" size="sm">
                        {marksSummary.message}
                      </Badge>
                    </div>

                    {/* CT Score Summary Metrics */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Best Total Score</span>
                        <p className="text-base font-extrabold text-slate-900 dark:text-white">
                          {marksSummary.obtainedTotal} / {marksSummary.maxTotal} Marks
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Best Percentage</span>
                        <p className="text-base font-extrabold text-brand-600 dark:text-brand-400">
                          {marksSummary.percentage}%
                        </p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-brand-500/10">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {marksSummary.currentCount} Assessment{marksSummary.currentCount === 1 ? '' : 's'} recorded
                      </span>
                      <Badge
                        variant={
                          marksSummary.performanceStatus === 'Excellent' ? 'emerald' :
                          marksSummary.performanceStatus === 'Good' ? 'indigo' :
                          marksSummary.performanceStatus === 'Average' ? 'amber' : 'rose'
                        }
                        size="sm"
                      >
                        {marksSummary.performanceStatus}
                      </Badge>
                    </div>

                    {/* Expand/Collapse Assessment List Controls */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => handleOpenAddAssessment(course)}
                        className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Marks</span>
                      </button>

                      <button
                        onClick={() => toggleCardExpanded(course.id)}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center space-x-1"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'Show Details'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Inline Expandable Assessment List */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-brand-500/10 space-y-2">
                        {(!course.assessments || course.assessments.length === 0) ? (
                          <p className="text-xs text-slate-400 italic py-2 text-center">No assessment entries recorded yet.</p>
                        ) : (
                          course.assessments.map((ast) => {
                            const isSelectedInBest = marksSummary.bestEntryIds?.has(ast.id);
                            return (
                              <div
                                key={ast.id}
                                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                                  isSelectedInBest
                                    ? 'bg-emerald-500/10 border-emerald-500/30'
                                    : 'bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-800'
                                }`}
                              >
                                <div className="space-y-0.5 min-w-0 pr-2">
                                  <div className="flex items-center space-x-1.5 truncate">
                                    {isSelectedInBest && (
                                      <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" title="Selected in Best Score" />
                                    )}
                                    <span className="font-bold text-slate-900 dark:text-white truncate">{ast.name}</span>
                                    <Badge variant="indigo" size="sm">{ast.type}</Badge>
                                  </div>
                                  <p className="text-[10px] text-slate-400">
                                    {ast.date ? `Date: ${ast.date}` : ''}
                                  </p>
                                </div>

                                <div className="flex items-center space-x-3 shrink-0">
                                  <div className="text-right">
                                    {ast.isMissed ? (
                                      <span className="font-extrabold text-rose-500">0 / {ast.totalMarks} (Missed)</span>
                                    ) : (
                                      <span className="font-extrabold text-slate-900 dark:text-white">
                                        {ast.obtainedMarks} / {ast.totalMarks}
                                      </span>
                                    )}
                                    {isSelectedInBest && (
                                      <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Best Selected</span>
                                    )}
                                  </div>

                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() => toggleAssessmentMissed(course.id, ast.id)}
                                      className={`p-1 rounded transition-colors ${
                                        ast.isMissed
                                          ? 'text-rose-500 hover:bg-rose-500/10'
                                          : 'text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      }`}
                                      title={ast.isMissed ? 'Mark Completed' : 'Mark Missed Test'}
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenEditAssessment(course, ast)}
                                      className="p-1 text-slate-400 hover:text-brand-600 transition-colors"
                                      title="Edit Assessment"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => deleteAssessmentFromCourse(course.id, ast.id)}
                                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                      title="Delete Assessment"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* LAB / SESSIONAL COURSE NOTICE PILL */
                  <div className="p-3 bg-slate-100 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                    Sessional course — CT marks not applicable
                  </div>
                )}
              </div>

              {/* CARD ACTION BUTTONS */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  onClick={() => recordMissedClass(course.id)}
                  className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 active:scale-[0.99] text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  <span>+ Mark Missed</span>
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    onClick={() => undoLastMissed(course.id)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center space-x-1 font-semibold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Undo Last Missed</span>
                  </button>

                  <button
                    onClick={() => {
                      setHistoryCourseFilter(course.id);
                      setIsHistoryModalOpen(true);
                    }}
                    className="font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Missed History</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD / EDIT COURSE MODAL */}
      <Modal
        isOpen={isAddCourseOpen}
        onClose={() => setIsAddCourseOpen(false)}
        title={editingCourse ? `Edit Course ${editingCourse.courseId}` : 'Add New Academic Course'}
      >
        <form onSubmit={handleSaveCourseSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Course Code</label>
              <input
                type="text"
                value={courseForm.courseId}
                onChange={(e) => setCourseForm({ ...courseForm, courseId: e.target.value })}
                placeholder="e.g. CSE-317"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Course Type</label>
              <select
                value={courseForm.courseType}
                onChange={(e) => {
                  const newType = e.target.value;
                  // Auto-suggest default credit
                  let defaultCredit = courseForm.credit;
                  if (newType === 'theory' && defaultCredit < 2.0) defaultCredit = 3.0;
                  if ((newType === 'lab' || newType === 'sessional') && defaultCredit > 1.5) defaultCredit = 1.5;
                  setCourseForm({ ...courseForm, courseType: newType, credit: defaultCredit });
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
              >
                <option value="theory">Theory Course</option>
                <option value="lab">Lab Course</option>
                <option value="sessional">Sessional Course</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Credit Weight & Allowed Absences
            </label>
            <select
              value={courseForm.credit}
              onChange={(e) => setCourseForm({ ...courseForm, credit: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
            >
              {courseForm.courseType === 'theory' ? (
                <>
                  <option value={3.0}>3.0 Credit Theory (39 classes • 3 safe misses • Best 3 CTs)</option>
                  <option value={2.0}>2.0 Credit Theory (26 classes • 2 safe misses • Best 2 CTs)</option>
                </>
              ) : (
                <>
                  <option value={1.5}>1.5 Credit Lab/Sessional (13 labs • 1 safe miss)</option>
                  <option value={0.75}>0.75 Credit Lab/Sessional (6 labs • 0 safe misses)</option>
                </>
              )}
            </select>
          </div>

          {/* Validation Warning Feedback */}
          {!courseValidation.isValid && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>{courseValidation.message}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Course Title</label>
            <input
              type="text"
              value={courseForm.courseTitle}
              onChange={(e) => setCourseForm({ ...courseForm, courseTitle: e.target.value })}
              placeholder="Artificial Intelligence"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Faculty / Teacher</label>
              <input
                type="text"
                value={courseForm.faculty}
                onChange={(e) => setCourseForm({ ...courseForm, faculty: e.target.value })}
                placeholder="Dr. Mahfuzul Islam"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Semester</label>
              <input
                type="text"
                value={courseForm.semester}
                onChange={(e) => setCourseForm({ ...courseForm, semester: e.target.value })}
                placeholder="5th Semester"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center">
            {editingCourse ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete course ${editingCourse.courseId}?`)) {
                    deleteCourse(editingCourse.id);
                    setIsAddCourseOpen(false);
                  }
                }}
                className="text-xs font-bold text-rose-500 hover:underline flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Course</span>
              </button>
            ) : <div />}

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsAddCourseOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!courseValidation.isValid}
                className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md disabled:opacity-50"
              >
                {editingCourse ? 'Update Course' : 'Save Course'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ADD / EDIT CT ASSESSMENT MODAL */}
      <Modal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        title={editingAssessment ? `Edit Assessment in ${activeCourseForAst?.courseId}` : `Add CT / Assessment Marks for ${activeCourseForAst?.courseId}`}
      >
        <form onSubmit={handleSaveAssessmentSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Assessment Name</label>
            <input
              type="text"
              value={astForm.name}
              onChange={(e) => setAstForm({ ...astForm, name: e.target.value })}
              placeholder="e.g. CT 1: ER Diagram"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select
                value={astForm.type}
                onChange={(e) => setAstForm({ ...astForm, type: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
              >
                <option value="CT">Class Test (CT)</option>
                <option value="assignment">Assignment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={astForm.date}
                onChange={(e) => setAstForm({ ...astForm, date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Total Marks</label>
              <input
                type="number"
                value={astForm.totalMarks}
                onChange={(e) => setAstForm({ ...astForm, totalMarks: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Obtained Marks</label>
              <input
                type="number"
                step="0.5"
                disabled={astForm.isMissed}
                value={astForm.isMissed ? 0 : astForm.obtainedMarks}
                onChange={(e) => setAstForm({ ...astForm, obtainedMarks: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isMissedCheck"
              checked={astForm.isMissed}
              onChange={(e) => setAstForm({ ...astForm, isMissed: e.target.checked })}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isMissedCheck" className="text-xs font-bold text-rose-500">
              Mark as Missed CT (Assigns 0 obtained score, preserved in history)
            </label>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsAssessmentModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md"
            >
              Save Assessment Marks
            </button>
          </div>
        </form>
      </Modal>

      {/* MISSED CLASS HISTORY MODAL */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Missed Class Records & History Log"
      >
        <div className="space-y-6">
          {/* Quick Record Missed Class Form */}
          <form onSubmit={handleAddManualMissedSubmit} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-brand-500" />
              <span>Record New Missed Class</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Course</label>
                <select
                  value={manualMissedForm.courseId}
                  onChange={(e) => setManualMissedForm({ ...manualMissedForm, courseId: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                  required
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.courseId} - {c.courseTitle}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Date</label>
                <input
                  type="date"
                  value={manualMissedForm.date}
                  onChange={(e) => setManualMissedForm({ ...manualMissedForm, date: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={manualMissedForm.reason}
                  onChange={(e) => setManualMissedForm({ ...manualMissedForm, reason: e.target.value })}
                  placeholder="e.g. Doctor's appointment"
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
              >
                + Record Missed
              </button>
            </div>
          </form>

          {/* History Filters */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Filter className="w-3.5 h-3.5 text-brand-500" />
              <span>Filter Missed Records</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <select
                  value={historyCourseFilter}
                  onChange={(e) => setHistoryCourseFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold outline-none"
                >
                  <option value="all">All Courses</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.courseId}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={historyTypeFilter}
                  onChange={(e) => setHistoryTypeFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold outline-none"
                >
                  <option value="all">All Course Types</option>
                  <option value="theory">Theory</option>
                  <option value="lab">Lab</option>
                  <option value="sessional">Sessional</option>
                </select>
              </div>

              <div className="flex items-center space-x-1">
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] outline-none"
                  title="From Date"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] outline-none"
                  title="To Date"
                />
              </div>
            </div>
          </div>

          {/* Missed Records List Table */}
          <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Course</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Reason / Note</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {missedHistoryRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                      No missed class records found matching filters.
                    </td>
                  </tr>
                ) : (
                  missedHistoryRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {rec.date}
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: rec.color || '#4F46E5' }} />
                        {rec.courseCode}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={rec.courseType === 'theory' ? 'indigo' : 'cyan'} size="sm">
                          {rec.courseType}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 max-w-[180px] truncate">
                        {editingHistoryRecord?.id === rec.id ? (
                          <input
                            type="text"
                            value={editingHistoryRecord.reason}
                            onChange={(e) => setEditingHistoryRecord({ ...editingHistoryRecord, reason: e.target.value })}
                            className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs w-full"
                          />
                        ) : (
                          rec.reason || 'No note recorded'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {editingHistoryRecord?.id === rec.id ? (
                          <div className="flex justify-end space-x-1">
                            <button
                              onClick={() => {
                                updateMissedRecord(rec.courseId, rec.id, { reason: editingHistoryRecord.reason });
                                setEditingHistoryRecord(null);
                              }}
                              className="px-2 py-1 bg-brand-600 text-white rounded-lg text-[10px] font-bold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingHistoryRecord(null)}
                              className="px-2 py-1 text-slate-400 hover:bg-slate-100 rounded-lg text-[10px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end items-center space-x-1">
                            <button
                              onClick={() => setEditingHistoryRecord({ id: rec.id, reason: rec.reason || '' })}
                              className="p-1 text-slate-400 hover:text-brand-600"
                              title="Edit note"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {deleteConfirmRecordId === rec.id ? (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => {
                                    deleteMissedRecord(rec.courseId, rec.id);
                                    setDeleteConfirmRecordId(null);
                                  }}
                                  className="px-1.5 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmRecordId(null)}
                                  className="px-1 py-0.5 text-slate-400 text-[10px]"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmRecordId(rec.id)}
                                className="p-1 text-slate-400 hover:text-rose-500"
                                title="Delete missed record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
