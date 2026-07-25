import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FileCheck2,
  Trash2,
  Edit2,
  History,
  TrendingUp,
  Award
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { attendanceService } from '../services/attendanceService';
import { marksService } from '../services/marksService';
import { Badge } from '../components/common/Badge';
import { ProgressBar } from '../components/common/ProgressBar';
import { CircularProgress } from '../components/common/CircularProgress';
import { Modal } from '../components/common/Modal';
import { Tabs } from '../components/common/Tabs';

export const AttendancePage = () => {
  const { courses, addCourse, updateCourse, deleteCourse, recordAttendance, undoAttendance, addAssessment, updateAssessment, deleteAssessment } = useData();

  const [activeCourseId, setActiveCourseId] = useState(courses[0]?.id || null);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isMarksModalOpen, setIsMarksModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // New Course Form state
  const [courseForm, setCourseForm] = useState({
    courseId: 'CSE-317',
    courseTitle: 'Artificial Intelligence',
    credit: 3.0,
    faculty: 'Dr. Mahfuzul Islam',
    semester: '5th Semester',
    color: '#8B5CF6'
  });

  // Assessment Form State
  const [astForm, setAstForm] = useState({
    name: 'CT 1: Introduction to AI & Search',
    type: 'CT',
    totalMarks: 20,
    expectedMarks: 18,
    obtainedMarks: 17,
    isMissed: false
  });

  const selectedCourse = courses.find(c => c.id === activeCourseId) || courses[0];

  const handleAddCourseSubmit = (e) => {
    e.preventDefault();
    addCourse(courseForm);
    setIsAddCourseOpen(false);
  };

  const handleAddAssessmentSubmit = (e) => {
    e.preventDefault();
    if (!selectedCourse) return;
    marksService.addAssessmentToCourse(selectedCourse.id, astForm);
    setIsMarksModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <CheckSquare className="w-6 h-6 text-brand-500" />
            <span>Attendance & CT Marks Tracker</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enforcing n-credit missed class rules (n allowed absences), risk monitoring, and CT score contributions
          </p>
        </div>

        <button
          onClick={() => setIsAddCourseOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Course</span>
        </button>
      </div>

      {/* COURSE ATTENDANCE CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          const stats = attendanceService.calculateAttendanceStats(course);
          const marksSummary = marksService.getCourseMarksSummary(course);

          return (
            <div
              key={course.id}
              className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between space-y-4 shadow-sm ${
                stats.riskLevel === 'at_risk'
                  ? 'border-rose-500/50 ring-2 ring-rose-500/20'
                  : stats.riskLevel === 'limit_reached'
                  ? 'border-amber-500/50'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div>
                {/* Course Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">{course.courseId}</span>
                    <span className="text-xs text-slate-400 font-semibold">({course.credit} Cr)</span>
                  </div>

                  <Badge
                    variant={
                      stats.riskLevel === 'safe' ? 'emerald' :
                      stats.riskLevel === 'warning' ? 'amber' :
                      stats.riskLevel === 'limit_reached' ? 'amber' : 'rose'
                    }
                  >
                    {stats.riskLevel.toUpperCase().replace('_', ' ')}
                  </Badge>
                </div>

                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-2 truncate">
                  {course.courseTitle}
                </h4>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">Faculty: {course.faculty || 'Unassigned'}</p>

                {/* Progress & Circular Ring */}
                <div className="mt-4 flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">
                      Attended: <span className="text-emerald-600 dark:text-emerald-400">{stats.attended}</span> / {stats.total}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Missed: <span className="text-rose-500 font-bold">{stats.missed}</span> (Max safe: {stats.allowedMissed})
                    </p>
                    <p className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                      Remaining Safe: {stats.remainingSafe} classes
                    </p>
                  </div>

                  <CircularProgress
                    value={stats.percentage}
                    size={58}
                    strokeWidth={5}
                    color={stats.riskLevel === 'safe' ? '#10B981' : stats.riskLevel === 'at_risk' ? '#EF4444' : '#F59E0B'}
                  />
                </div>

                {/* Risk Warning Callout */}
                {stats.riskLevel === 'at_risk' && (
                  <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-[11px] font-semibold text-rose-700 dark:text-rose-300 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>Missed class limit exceeded! Marks deduction applicable.</span>
                  </div>
                )}

                {/* CT & Assessment Summary Mini Pill */}
                <div className="mt-3 p-3 bg-brand-500/5 border border-brand-500/15 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">CT Score Contribution</span>
                    <p className="font-extrabold text-slate-900 dark:text-white">
                      {marksSummary.obtainedTotal} / {marksSummary.maxTotal} Marks ({marksSummary.projectedContribution} / 20)
                    </p>
                  </div>
                  <Badge variant="indigo" size="sm">
                    {marksSummary.currentCount} / {marksSummary.recommendedCount} CTs
                  </Badge>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => recordAttendance(course.courseId, 'attended')}
                    className="py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1 shadow-sm transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>+ Attended</span>
                  </button>
                  <button
                    onClick={() => recordAttendance(course.courseId, 'missed')}
                    className="py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1 shadow-sm transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>+ Missed</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    onClick={() => undoAttendance(course.courseId)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Undo Last</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveCourseId(course.id);
                      setIsMarksModalOpen(true);
                    }}
                    className="font-bold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Manage CT Scores &rarr;
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILED CT & ASSESSMENTS BREAKDOWN FOR ACTIVE COURSE */}
      {selectedCourse && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <FileCheck2 className="w-5 h-5 text-brand-500" />
                <span>Class Tests & Assessment Marks for {selectedCourse.courseId}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recommended: {selectedCourse.credit + 1} Assessments ({selectedCourse.credit} Credit Course)
              </p>
            </div>

            <button
              onClick={() => setIsMarksModalOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Class Test / Assessment Marks</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Score Obtained</span>
              <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {marksService.getCourseMarksSummary(selectedCourse).obtainedTotal} / {marksService.getCourseMarksSummary(selectedCourse).maxTotal}
              </h4>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-bold uppercase text-slate-400">Best Assessment Score</span>
              <h4 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {marksService.getCourseMarksSummary(selectedCourse).bestScore} Marks
              </h4>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-bold uppercase text-slate-400">Projected CT Contribution</span>
              <h4 className="text-2xl font-extrabold text-brand-600 dark:text-brand-400 mt-1">
                {marksService.getCourseMarksSummary(selectedCourse).projectedContribution} / 20
              </h4>
            </div>
          </div>

          {/* Assessment List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Assessment Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Obtained / Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {(selectedCourse.assessments || []).map((ast) => (
                  <tr key={ast.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{ast.name}</td>
                    <td className="py-3 px-4"><Badge variant="indigo">{ast.type}</Badge></td>
                    <td className="py-3 px-4 font-bold">
                      {ast.isMissed ? (
                        <span className="text-rose-500">0 / {ast.totalMarks} (Missed)</span>
                      ) : (
                        <span>{ast.obtainedMarks} / {ast.totalMarks}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {ast.isMissed ? (
                        <Badge variant="rose">Missed Test</Badge>
                      ) : (
                        <Badge variant="emerald">Completed</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteAssessment(ast.id)}
                        className="p-1 text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD COURSE MODAL */}
      <Modal isOpen={isAddCourseOpen} onClose={() => setIsAddCourseOpen(false)} title="Add New Course">
        <form onSubmit={handleAddCourseSubmit} className="space-y-4">
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Credit Weight (n)</label>
              <input
                type="number"
                step="0.5"
                value={courseForm.credit}
                onChange={(e) => setCourseForm({ ...courseForm, credit: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>
          </div>
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
          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsAddCourseOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl shadow-md"
            >
              Save Course
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD CT MARKS MODAL */}
      <Modal isOpen={isMarksModalOpen} onClose={() => setIsMarksModalOpen(false)} title={`Add CT / Assessment Marks for ${selectedCourse?.courseId}`}>
        <form onSubmit={handleAddAssessmentSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Assessment Name</label>
            <input
              type="text"
              value={astForm.name}
              onChange={(e) => setAstForm({ ...astForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              required
            />
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
              id="isMissed"
              checked={astForm.isMissed}
              onChange={(e) => setAstForm({ ...astForm, isMissed: e.target.checked })}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="isMissed" className="text-xs font-bold text-rose-500">
              Mark as Missed CT (Assigns 0 Obtained Score)
            </label>
          </div>
          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsMarksModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl shadow-md"
            >
              Save Marks
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
