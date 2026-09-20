import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  AlertTriangle,
  RotateCcw,
  History,
  Trash2,
  Edit2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Star,
  FileText,
  Clock,
  BookOpen,
  Calendar,
  XCircle,
  Pencil
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { attendanceService, COURSE_TYPES } from '../services/attendanceService';
import { marksService } from '../services/marksService';
import { Modal } from '../components/common/Modal';

export const AttendancePage = () => {
  const {
    courses = [],
    addCourse,
    updateCourse,
    deleteCourse,
    recordAttendance,
    undoLastMissed,
    deleteAttendanceRecord,
    addCTMark,
    updateCTMark,
    deleteCTMark
  } = useData();

  // State to control expanded / collapsed assessment lists for each course card
  // By default, expand first course (matching Card 1 in reference image) and collapse others
  const [expandedCards, setExpandedCards] = useState(() => {
    const initial = {};
    if (courses.length > 0) {
      initial[courses[0].id || courses[0].courseId] = true;
    }
    return initial;
  });

  // Modal States
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedCourseForHistory, setSelectedCourseForHistory] = useState(null);

  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({
    courseId: 'CSE-317',
    courseTitle: 'Artificial Intelligence',
    credit: 3.0,
    courseType: COURSE_TYPES.THEORY,
    faculty: 'Dr. Mahfuzul Islam',
    semester: '5th Semester',
    scheduledClasses: 39,
    color: '#8B5CF6'
  });

  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [markForm, setMarkForm] = useState({
    courseId: '',
    title: 'CT 1: Fundamentals',
    type: 'CT',
    obtainedMarks: 18,
    totalMarks: 20,
    date: new Date().toISOString().split('T')[0],
    isMissed: false
  });
  const [markError, setMarkError] = useState('');

  // Toggle card assessment details expand/collapse
  const toggleCardExpansion = (courseKey) => {
    setExpandedCards(prev => ({
      ...prev,
      [courseKey]: !prev[courseKey]
    }));
  };

  // Open history modal for a specific course or all
  const handleOpenHistory = (course = null) => {
    setSelectedCourseForHistory(course);
    setIsHistoryModalOpen(true);
  };

  // Open Add / Edit Course Modal
  const handleOpenAddCourse = () => {
    setEditingCourse(null);
    setCourseForm({
      courseId: 'CSE-317',
      courseTitle: 'Artificial Intelligence',
      credit: 3.0,
      courseType: COURSE_TYPES.THEORY,
      faculty: 'Dr. Mahfuzul Islam',
      semester: '5th Semester',
      scheduledClasses: 39,
      color: '#8B5CF6'
    });
    setIsCourseModalOpen(true);
  };

  const handleOpenEditCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({
      courseId: course.courseId || '',
      courseTitle: course.courseTitle || '',
      credit: Number(course.credit) || 3.0,
      courseType: course.courseType || COURSE_TYPES.THEORY,
      faculty: course.faculty || '',
      semester: course.semester || '5th Semester',
      scheduledClasses: course.scheduledClasses || (course.courseType === COURSE_TYPES.LAB ? 13 : 39),
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

  // Open Add / Edit Assessment Modal
  const handleOpenAddMarks = (targetCourse) => {
    setEditingAssessment(null);
    const nextCtNum = (targetCourse.assessments || []).length + 1;
    setMarkForm({
      courseId: targetCourse.id || targetCourse.courseId,
      ctNumber: nextCtNum,
      title: `CT ${nextCtNum}: Topic Review`,
      type: 'CT',
      obtainedMarks: 18,
      totalMarks: 20,
      date: new Date().toISOString().split('T')[0],
      isMissed: false
    });
    setMarkError('');
    setIsMarkModalOpen(true);
  };

  const handleOpenEditMarks = (targetCourse, assessment) => {
    setEditingAssessment(assessment);
    setMarkForm({
      courseId: targetCourse.id || targetCourse.courseId,
      ctNumber: assessment.ctNumber || 1,
      title: assessment.title || assessment.name || 'Assessment',
      type: assessment.type || 'CT',
      obtainedMarks: assessment.isMissed ? 0 : Number(assessment.obtainedMarks || 0),
      totalMarks: Number(assessment.totalMarks || 20),
      date: assessment.date ? String(assessment.date).split('T')[0] : new Date().toISOString().split('T')[0],
      isMissed: Boolean(assessment.isMissed)
    });
    setMarkError('');
    setIsMarkModalOpen(true);
  };

  const handleSaveMarkSubmit = (e) => {
    e.preventDefault();
    setMarkError('');

    if (!markForm.title.trim()) {
      setMarkError('Please provide an assessment title.');
      return;
    }

    const obtained = markForm.isMissed ? 0 : Number(markForm.obtainedMarks);
    const total = Number(markForm.totalMarks || 20);

    if (obtained < 0) {
      setMarkError('Obtained marks cannot be negative.');
      return;
    }
    if (obtained > total) {
      setMarkError(`Obtained marks (${obtained}) cannot exceed total marks (${total}).`);
      return;
    }

    const payload = {
      ...markForm,
      obtainedMarks: obtained,
      totalMarks: total
    };

    let ok = false;
    if (editingAssessment) {
      ok = updateCTMark(markForm.courseId, editingAssessment.id, payload);
    } else {
      ok = addCTMark(markForm.courseId, payload);
    }
    if (ok !== false) {
      setIsMarkModalOpen(false);
    }
  };

  // Quick action: Mark Missed Class
  const handleMarkMissedClick = (course) => {
    const today = new Date().toISOString().split('T')[0];
    recordAttendance(course.id, 'ABSENT', today, 'Unexcused Absence');
  };

  // Quick action: Undo Last Missed Class
  const handleUndoMissedClick = (course) => {
    undoLastMissed(course.id);
  };

  // Active course history list for modal
  const activeHistoryRecords = useMemo(() => {
    if (!selectedCourseForHistory) {
      // Aggregate across all courses
      return courses.flatMap(c => {
        const history = Array.isArray(c.history) ? c.history : [];
        return history
          .filter(h => String(h.status).toLowerCase() === 'missed' || String(h.status).toUpperCase() === 'ABSENT')
          .map(h => ({ ...h, courseCode: c.courseId, courseTitle: c.courseTitle, realCourseId: c.id }));
      }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }

    const history = Array.isArray(selectedCourseForHistory.history) ? selectedCourseForHistory.history : [];
    return history
      .filter(h => String(h.status).toLowerCase() === 'missed' || String(h.status).toUpperCase() === 'ABSENT')
      .map(h => ({
        ...h,
        courseCode: selectedCourseForHistory.courseId,
        courseTitle: selectedCourseForHistory.courseTitle,
        realCourseId: selectedCourseForHistory.id
      }))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [selectedCourseForHistory, courses]);

  return (
    <div className="space-y-6 pb-12">
      {/* ==================================================================== */}
      {/* 1. PAGE BREADCRUMB & HEADER                                          */}
      {/* ==================================================================== */}
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1.5 font-medium">
          <span className="hover:text-slate-300 transition-colors cursor-pointer">Dashboard</span>
          <span className="text-slate-600 font-bold">&gt;</span>
          <span className="text-slate-200">Attendance &amp; CT Marks</span>
        </div>

        {/* Title, Subtitle, and Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2.5">
              <CheckSquare className="w-7 h-7 text-[#8B5CF6]" />
              <span>Attendance &amp; CT Marks Tracker</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Missed-class limit monitoring (3-cr: 3 max, 2-cr: 2 max, 1.5-cr lab: 1 max, 0.75-cr lab: 0 max) &amp; theory CT best-N scores
            </p>
          </div>

          {/* Right Header Buttons */}
          <div className="flex items-center space-x-2.5 self-start lg:self-auto">
            <button
              onClick={() => handleOpenHistory(null)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#161e31] hover:bg-[#1e293d] border border-[#2a374f] active:scale-[0.98] text-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <History className="w-4 h-4 text-slate-300" />
              <span>Missed History</span>
            </button>

            <button
              onClick={handleOpenAddCourse}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Course</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. COURSE CARDS GRID (3-COLUMN EXACT PIXEL-FOR-PIXEL REPLICA)        */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          const courseKey = course.id || course.courseId;
          const stats = attendanceService.calculateAttendanceStats(course);
          const overview = marksService.getCourseAssessmentsOverview(course);
          const isExpanded = !!expandedCards[courseKey];

          // Compute missed capacity ratio
          const maxSafe = stats.maxSafeMissed !== null && stats.maxSafeMissed !== undefined ? stats.maxSafeMissed : 3;
          const missedCount = stats.missedClasses || 0;
          const capacityRatio = `${missedCount}/${maxSafe}`;
          const capacityBarPercentage = maxSafe > 0 ? Math.min(100, Math.round((missedCount / maxSafe) * 100)) : 100;

          return (
            <div
              key={courseKey}
              className={`rounded-3xl bg-[#111827] border transition-all flex flex-col justify-between p-5 space-y-4 shadow-xl ${
                stats.hasDeductionRisk
                  ? 'border-rose-500/70 shadow-rose-950/20 ring-1 ring-rose-500/30'
                  : 'border-[#1f293d] hover:border-slate-700/80'
              }`}
            >
              <div className="space-y-4">
                {/* -------------------------------------------------------- */}
                {/* A. CARD HEADER                                          */}
                {/* -------------------------------------------------------- */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: course.color || (stats.isTheory ? '#8B5CF6' : '#06B6D4') }}
                      />
                      <span className="text-sm font-extrabold text-white font-mono tracking-tight">
                        {course.courseId}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">
                        ({course.credit} Cr)
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          stats.isTheory
                            ? 'bg-indigo-950/70 text-indigo-300 border-indigo-700/50'
                            : 'bg-cyan-950/70 text-cyan-300 border-cyan-700/50'
                        }`}
                      >
                        {course.courseType?.toUpperCase() || (stats.isTheory ? 'THEORY' : 'LAB')}
                      </span>

                      <button
                        onClick={() => handleOpenEditCourse(course)}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        title="Edit Course"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white mt-1.5 truncate" title={course.courseTitle}>
                    {course.courseTitle}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    Faculty: {course.faculty || 'Unassigned'} • {course.semester || '5th Semester'}
                  </p>
                </div>

                {/* -------------------------------------------------------- */}
                {/* B. ABSENCE STATUS WIDGET                                */}
                {/* -------------------------------------------------------- */}
                <div className="p-4 rounded-2xl bg-[#0c1220] border border-[#1e293b] space-y-3">
                  {/* Widget Header: Status Title & Status Pill */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Absence Status
                    </span>

                    {stats.hasDeductionRisk ? (
                      <span className="flex items-center space-x-1 bg-rose-950/60 text-rose-400 border border-rose-800/60 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>MARKS DEDUCTION RISK</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>SAFE</span>
                      </span>
                    )}
                  </div>

                  {/* 2x2 Grid for Absence Numbers */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-[#111827] border border-[#1e293b]/80">
                      <span className="text-[10px] text-slate-400 block font-medium">Scheduled Classes</span>
                      <span className="font-extrabold text-white text-sm mt-0.5 block">
                        {stats.scheduledClasses || (stats.isTheory ? 39 : 13)}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#111827] border border-[#1e293b]/80">
                      <span className="text-[10px] text-slate-400 block font-medium">Missed Classes</span>
                      <span className={`font-extrabold text-sm mt-0.5 block ${stats.hasDeductionRisk ? 'text-[#f43f5e]' : 'text-white'}`}>
                        {stats.missedClasses}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#111827] border border-[#1e293b]/80">
                      <span className="text-[10px] text-slate-400 block font-medium">Max Safe Misses</span>
                      <span className="font-extrabold text-white text-sm mt-0.5 block">
                        {maxSafe}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-[#111827] border border-[#1e293b]/80">
                      <span className="text-[10px] text-slate-400 block font-medium">Remaining Safe</span>
                      <span className="font-extrabold text-white text-sm mt-0.5 block">
                        {stats.remainingSafe}
                      </span>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Missed Capacity Used</span>
                      <span className="text-white font-semibold">{capacityRatio}</span>
                    </div>

                    <div className="w-full h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          stats.hasDeductionRisk ? 'bg-[#f43f5e]' : 'bg-cyan-500'
                        }`}
                        style={{ width: `${capacityBarPercentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-white font-semibold">0%</span>
                    </div>
                  </div>

                  {/* Over-limit Coral Alert Banner */}
                  {stats.hasDeductionRisk && (
                    <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start space-x-2 text-rose-300 text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        Exceeded safe limit of {maxSafe} misses! Marks deduction applicable.
                      </span>
                    </div>
                  )}
                </div>

                {/* -------------------------------------------------------- */}
                {/* C. CT & ASSIGNMENTS WIDGET                              */}
                {/* -------------------------------------------------------- */}
                {overview.isApplicable ? (
                  <div className="p-4 rounded-2xl bg-[#0c1220] border border-[#1e293b] space-y-3">
                    {/* Widget Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-white">CT &amp; Assignments</span>
                      </div>

                      <span className="bg-[#1e1b4b] border border-indigo-700/50 text-indigo-300 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                        Best {overview.bestCount} selected
                      </span>
                    </div>

                    {/* Best Total Score & Best Percentage Columns */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-0.5">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          BEST TOTAL SCORE
                        </span>
                        <span className="text-base font-black text-white mt-0.5 block">
                          {overview.bestScoreFormatted}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          BEST PERCENTAGE
                        </span>
                        <span className="text-base font-black text-cyan-400 mt-0.5 block">
                          {overview.bestPercentage}%
                        </span>
                      </div>
                    </div>

                    {/* Count & Rating Badge Row */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-400 text-xs">
                        {overview.totalAssessmentsCount} Assessments recorded
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          overview.rating === 'Excellent'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                            : overview.rating === 'Good'
                            ? 'bg-cyan-950/60 text-cyan-400 border-cyan-500/30'
                            : 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {overview.rating}
                      </span>
                    </div>

                    {/* Action Links: + Add Marks & Expand/Collapse Toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#1e293b] text-xs">
                      <button
                        onClick={() => handleOpenAddMarks(course)}
                        className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Marks</span>
                      </button>

                      <button
                        onClick={() => toggleCardExpansion(courseKey)}
                        className="text-slate-400 hover:text-white flex items-center space-x-1 font-medium transition-colors"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'Show Details'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Expandable Assessments List */}
                    {isExpanded && (
                      <div className="space-y-2 pt-2 border-t border-[#1e293b]/60">
                        {overview.items.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-500 italic">
                            No assessments added yet. Click &quot;Add Marks&quot; to begin.
                          </div>
                        ) : (
                          overview.items.map((ast) => (
                            <div
                              key={ast.id}
                              className="p-2.5 rounded-xl bg-[#111827] border border-[#1e293b] flex items-center justify-between gap-2 hover:border-slate-700/80 transition-all"
                            >
                              <div className="flex items-start space-x-2 min-w-0">
                                <div className="mt-0.5 shrink-0">
                                  {ast.isBestSelected ? (
                                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                                  ) : (
                                    <Star className="w-4 h-4 text-slate-600" />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="text-xs font-bold text-white truncate max-w-[130px] sm:max-w-[150px]">
                                      {ast.title}
                                    </span>
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                        ast.type === 'ASSIGNMENT'
                                          ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/50'
                                          : 'bg-blue-950/60 text-blue-300 border-blue-800/50'
                                      }`}
                                    >
                                      {ast.type}
                                    </span>
                                  </div>

                                  <span className="text-[10px] text-slate-400 block mt-0.5">
                                    Date: {ast.date}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 shrink-0">
                                <div className="text-right">
                                  <span className={`text-xs font-bold block ${ast.isMissed ? 'text-rose-400' : 'text-white'}`}>
                                    {ast.isMissed ? `0 / ${ast.totalMarks} (Missed)` : `${ast.obtainedMarks} / ${ast.totalMarks}`}
                                  </span>
                                  {ast.isBestSelected && (
                                    <span className="text-[10px] font-medium text-emerald-400 block">
                                      Best Selected
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center space-x-1 text-slate-400">
                                  <button
                                    onClick={() => handleOpenEditMarks(course, ast)}
                                    className="p-1 hover:text-white transition-colors"
                                    title="Edit Assessment"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteCTMark(course.id, ast.id)}
                                    className="p-1 hover:text-rose-400 transition-colors"
                                    title="Delete Assessment"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Sessional / Lab Muted Notice */
                  <div className="p-4 rounded-2xl bg-[#0c1220] border border-[#1e293b] flex items-center justify-center min-h-[140px]">
                    <span className="text-xs text-slate-400 font-medium text-center">
                      Sessional course — CT marks not applicable
                    </span>
                  </div>
                )}
              </div>

              {/* -------------------------------------------------------- */}
              {/* D. CARD FOOTER ACTIONS                                  */}
              {/* -------------------------------------------------------- */}
              <div className="space-y-3 pt-1">
                {/* Full-Width Vibrant Coral Red + Mark Missed Button */}
                <button
                  onClick={() => handleMarkMissedClick(course)}
                  className="w-full py-2.5 px-4 bg-[#f43f5e] hover:bg-[#e11d48] active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950/40 transition-all flex items-center justify-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Mark Missed</span>
                </button>

                {/* Sub-bar: Undo Last Missed & Missed History */}
                <div className="flex items-center justify-between text-xs px-1">
                  <button
                    onClick={() => handleUndoMissedClick(course)}
                    className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Undo Last Missed</span>
                  </button>

                  <button
                    onClick={() => handleOpenHistory(course)}
                    className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Missed History</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* 3. MODALS                                                            */}
      {/* ==================================================================== */}

      {/* Modal 1: Missed History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={
          selectedCourseForHistory
            ? `Missed History: ${selectedCourseForHistory.courseId}`
            : 'All Missed Classes History'
        }
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {selectedCourseForHistory && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-white block">{selectedCourseForHistory.courseTitle}</span>
                <span className="text-slate-400">Total Absences: {activeHistoryRecords.length} classes</span>
              </div>
              <span className="text-xs font-semibold text-slate-300">
                Safe Limit: {attendanceService.getMaximumSafeMisses(selectedCourseForHistory)} misses
              </span>
            </div>
          )}

          {activeHistoryRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No missed classes recorded. Perfect attendance!
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {activeHistoryRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-rose-400">
                        {rec.courseCode ? `[${rec.courseCode}] ` : ''}Missed Class
                      </span>
                      <span className="text-slate-400">• {rec.date}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] mt-0.5">
                      Reason: {rec.reason || 'Unexcused Absence'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      deleteAttendanceRecord(rec.realCourseId || rec.courseId, rec.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Remove absence record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal 2: Add / Edit Course Modal */}
      <Modal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        title={editingCourse ? 'Edit Course Details' : 'Add New Course'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveCourseSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Course Code</label>
              <input
                type="text"
                value={courseForm.courseId}
                onChange={(e) => setCourseForm({ ...courseForm, courseId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                placeholder="e.g. CSE-311"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Credits</label>
              <select
                value={courseForm.credit}
                onChange={(e) => setCourseForm({ ...courseForm, credit: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={3.0}>3.0 Credits (Theory: 3 safe)</option>
                <option value={2.0}>2.0 Credits (Theory: 2 safe)</option>
                <option value={1.5}>1.5 Credits (Lab: 1 safe)</option>
                <option value={0.75}>0.75 Credits (Lab: 0 safe)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Course Title</label>
            <input
              type="text"
              value={courseForm.courseTitle}
              onChange={(e) => setCourseForm({ ...courseForm, courseTitle: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Database Management Systems"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Course Type</label>
              <select
                value={courseForm.courseType}
                onChange={(e) => setCourseForm({ ...courseForm, courseType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={COURSE_TYPES.THEORY}>THEORY</option>
                <option value={COURSE_TYPES.LAB}>LAB / SESSIONAL</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Scheduled Classes</label>
              <input
                type="number"
                min="1"
                value={courseForm.scheduledClasses}
                onChange={(e) => setCourseForm({ ...courseForm, scheduledClasses: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Faculty</label>
              <input
                type="text"
                value={courseForm.faculty}
                onChange={(e) => setCourseForm({ ...courseForm, faculty: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                placeholder="Dr. Al-Mamun"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Semester</label>
              <input
                type="text"
                value={courseForm.semester}
                onChange={(e) => setCourseForm({ ...courseForm, semester: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                placeholder="5th Semester"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCourseModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl font-bold shadow-md transition-all"
            >
              {editingCourse ? 'Save Changes' : 'Create Course'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Add / Edit Marks Modal */}
      <Modal
        isOpen={isMarkModalOpen}
        onClose={() => setIsMarkModalOpen(false)}
        title={editingAssessment ? 'Edit Assessment' : 'Add Assessment Marks'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveMarkSubmit} className="space-y-4 text-xs">
          {markError && (
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300">
              {markError}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-300 mb-1">Assessment Title</label>
            <input
              type="text"
              value={markForm.title}
              onChange={(e) => setMarkForm({ ...markForm, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              placeholder="e.g. CT 1: ER Diagram"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Type</label>
              <select
                value={markForm.type}
                onChange={(e) => setMarkForm({ ...markForm, type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="CT">Class Test (CT)</option>
                <option value="ASSIGNMENT">Assignment</option>
                <option value="QUIZ">Quiz</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={markForm.date}
                onChange={(e) => setMarkForm({ ...markForm, date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Obtained Marks</label>
              <input
                type="number"
                step="0.5"
                min="0"
                disabled={markForm.isMissed}
                value={markForm.isMissed ? 0 : markForm.obtainedMarks}
                onChange={(e) => setMarkForm({ ...markForm, obtainedMarks: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Total Marks</label>
              <input
                type="number"
                step="0.5"
                min="1"
                value={markForm.totalMarks}
                onChange={(e) => setMarkForm({ ...markForm, totalMarks: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="isMissedCheck"
              checked={markForm.isMissed}
              onChange={(e) => setMarkForm({ ...markForm, isMissed: e.target.checked })}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
            />
            <label htmlFor="isMissedCheck" className="text-slate-300 font-medium">
              Mark as Missed (counts as 0 score)
            </label>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsMarkModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-md transition-all"
            >
              {editingAssessment ? 'Update Mark' : 'Save Mark'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttendancePage;
