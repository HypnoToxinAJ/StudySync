import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BookOpen, Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react';
import { Modal } from '../../../components/common/Modal';

const formatCredit = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '—';
  if (Number.isInteger(numeric)) return String(numeric);
  // Use up to 2 decimal places, trim trailing zero
  const formatted = numeric.toFixed(2);
  return formatted.endsWith('0') ? numeric.toFixed(1) : formatted;
};

/* ─── Delete Confirmation Dialog ─── */
const DeleteConfirmDialog = ({ isOpen, course, onConfirm, onCancel }) => {
  const cancelRef = useRef(null);

  useEffect(() => {
    if (isOpen && cancelRef.current) cancelRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Delete this course?
            </h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{course.code}</span> will be permanently removed along with all associated routine entries, attendance records, and CT marks.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(course)}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Add / Edit Course Modal ─── */
const CourseFormModal = ({ isOpen, onClose, onSave, editingCourse }) => {
  const [form, setForm] = useState({ courseId: '', courseTitle: '', credit: 3 });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (editingCourse) {
        setForm({
          courseId: editingCourse.code || '',
          courseTitle: editingCourse.title || '',
          credit: editingCourse.credit || 3
        });
      } else {
        setForm({ courseId: '', courseTitle: '', credit: 3 });
      }
      setErrors({});
    }
  }, [isOpen, editingCourse]);

  const validate = () => {
    const e = {};
    if (!form.courseId.trim()) e.courseId = 'Course code is required';
    if (!form.courseTitle.trim()) e.courseTitle = 'Course name is required';
    if (!Number.isFinite(Number(form.credit)) || Number(form.credit) <= 0) e.credit = 'Enter a valid credit';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      courseId: form.courseId.trim(),
      courseTitle: form.courseTitle.trim(),
      credit: Number(form.credit),
      oldCourseId: editingCourse?.code
    }, editingCourse);
    onClose();
  };

  const isEdit = Boolean(editingCourse);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Course' : 'Add New Course'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Course Code */}
        <div>
          <label htmlFor="course-form-code" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Course Code
          </label>
          <input
            id="course-form-code"
            type="text"
            value={form.courseId}
            onChange={(e) => setForm((f) => ({ ...f, courseId: e.target.value }))}
            placeholder="e.g. CSE-311"
            className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none transition-colors focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 ${errors.courseId ? 'border-rose-400 dark:border-rose-600' : 'border-slate-200 dark:border-slate-700'}`}
            autoFocus
          />
          {errors.courseId && <p className="mt-1 text-[11px] text-rose-500">{errors.courseId}</p>}
        </div>

        {/* Course Name */}
        <div>
          <label htmlFor="course-form-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Course Name
          </label>
          <input
            id="course-form-name"
            type="text"
            value={form.courseTitle}
            onChange={(e) => setForm((f) => ({ ...f, courseTitle: e.target.value }))}
            placeholder="e.g. Computer Networks"
            className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none transition-colors focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 ${errors.courseTitle ? 'border-rose-400 dark:border-rose-600' : 'border-slate-200 dark:border-slate-700'}`}
          />
          {errors.courseTitle && <p className="mt-1 text-[11px] text-rose-500">{errors.courseTitle}</p>}
        </div>

        {/* Credit */}
        <div>
          <label htmlFor="course-form-credit" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Credit
          </label>
          <input
            id="course-form-credit"
            type="number"
            min="0.25"
            step="0.25"
            value={form.credit}
            onChange={(e) => setForm((f) => ({ ...f, credit: e.target.value }))}
            className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none transition-colors focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 ${errors.credit ? 'border-rose-400 dark:border-rose-600' : 'border-slate-200 dark:border-slate-700'}`}
          />
          {errors.credit && <p className="mt-1 text-[11px] text-rose-500">{errors.credit}</p>}
        </div>

        {/* Actions */}
        <div className="pt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md transition-colors"
          >
            {isEdit ? 'Save Changes' : 'Create Course'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

/* ─── Single Course Row ─── */
const CourseRow = ({ course, onEdit, onDelete }) => {
  return (
    <div
      className="group flex items-center gap-3 sm:gap-4 px-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 rounded-xl transition-all duration-150 hover:border-brand-400/40 dark:hover:border-brand-500/30 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:shadow-sm"
    >
      {/* Course Code Badge */}
      <span className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-lg bg-brand-500/10 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 font-mono text-[11px] font-bold tracking-wide border border-brand-200/60 dark:border-brand-700/40">
        {course.code}
      </span>

      {/* Course Name */}
      <span className="flex-1 min-w-0 text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
        {course.title}
      </span>

      {/* Credits */}
      <span className="flex-shrink-0 hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
        <span className="text-slate-700 dark:text-slate-300 font-bold">{formatCredit(course.credit)}</span>
        {Number(course.credit) > 0 && <span>{Number(course.credit) === 1 ? 'Credit' : 'Credits'}</span>}
      </span>

      {/* Mobile credits */}
      <span className="flex-shrink-0 sm:hidden text-[11px] text-slate-500 dark:text-slate-400 font-bold">
        {formatCredit(course.credit)}cr
      </span>

      {/* Action Buttons */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(course)}
            className="p-1.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30 rounded-lg transition-colors"
            title={`Edit ${course.code}`}
            aria-label={`Edit course ${course.code}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(course)}
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
            title={`Delete ${course.code}`}
            aria-label={`Delete course ${course.code}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── Main Courses Section ─── */
export const RoutineCoursesTable = ({
  routines = [],
  allCourses = [],
  isLoading = false,
  onDeleteCourse,
  onAddCourse,
  onUpdateCourse
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Extract unique courses included in the routine
  const uniqueCourses = useMemo(() => {
    const courseMap = new Map();

    routines.forEach((routine) => {
      const code = (routine.courseId || routine.course_code || '').trim().toUpperCase();
      if (!code) return;

      if (!courseMap.has(code)) {
        // Find matching course from allCourses if available for richer meta (like credit)
        const match = allCourses.find(
          (c) => (c.courseId || c.course_id || c.code || '').trim().toUpperCase() === code
        );

        const title = routine.courseTitle || routine.course_title || match?.courseTitle || match?.name || code;
        const credit = routine.credit ?? match?.credit ?? 0;
        const id = match?.id || code;

        courseMap.set(code, {
          id,
          code,
          title,
          credit: Number(credit) || 0
        });
      }
    });

    return Array.from(courseMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [routines, allCourses]);

  const handleOpenAdd = () => {
    setEditingCourse(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (course) => {
    setEditingCourse(course);
    setIsFormOpen(true);
  };

  const handleSave = (formData, editing) => {
    if (editing) {
      // Update existing course
      if (onUpdateCourse) {
        onUpdateCourse(editing.id, {
          courseId: formData.courseId,
          courseTitle: formData.courseTitle,
          credit: formData.credit,
          oldCourseId: formData.oldCourseId
        });
      }
    } else {
      // Add new course
      if (onAddCourse) {
        onAddCourse({
          courseId: formData.courseId,
          courseTitle: formData.courseTitle,
          credit: formData.credit
        });
      }
    }
  };

  const handleDeleteConfirm = (course) => {
    if (onDeleteCourse) {
      onDeleteCourse(course.id || course.code);
    }
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm animate-pulse space-y-3">
        <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
        <div className="h-12 bg-slate-50 dark:bg-slate-800/40 rounded-xl" />
        <div className="h-12 bg-slate-50 dark:bg-slate-800/40 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
        {/* Section Header */}
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-base" role="img" aria-label="courses">📚</span>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              Courses
            </h3>
            <span className="text-xs text-slate-400 font-medium ml-0.5">
              ({uniqueCourses.length} {uniqueCourses.length === 1 ? 'course' : 'courses'} in routine)
            </span>
          </div>
          {onAddCourse && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm hover:shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Course</span>
            </button>
          )}
        </div>

        {/* Course List */}
        {uniqueCourses.length === 0 ? (
          <div className="py-10 text-center">
            <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              No courses currently associated with this schedule.
            </p>
            {onAddCourse && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="mt-3 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
              >
                + Add your first course
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {uniqueCourses.map((course) => (
              <CourseRow
                key={course.code}
                course={course}
                onEdit={onUpdateCourse ? handleOpenEdit : undefined}
                onDelete={onDeleteCourse ? (c) => setDeleteTarget(c) : undefined}
              />
            ))}
          </div>
        )}
      </section>

      {/* Add / Edit Course Modal */}
      <CourseFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        editingCourse={editingCourse}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={Boolean(deleteTarget)}
        course={deleteTarget}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
};

export default RoutineCoursesTable;
