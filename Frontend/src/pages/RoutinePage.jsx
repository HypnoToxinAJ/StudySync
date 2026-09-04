import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Calendar, AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Modal } from '../components/common/Modal';
import { routineService, COURSE_COLOR_PRESETS } from '../services/routineService';
import { routineApi } from '../services/routineApi';
import { RoutineImportButton } from '../features/routine/components/RoutineImportButton';
import { ImageImportModal } from '../features/routine/components/ImageImportModal';
import { routineImportService } from '../features/routine/services/routineImportService';
import { deriveSectionFromGroup } from '../features/routine/utils/groupSectionUtils';
import { NextClassCard } from '../features/routine/components/NextClassCard';
import { WeekNavigator } from '../features/routine/components/WeekNavigator';
import { HorizontalWeeklyTimetable } from '../features/routine/components/HorizontalWeeklyTimetable';
import { RoutineCoursesTable } from '../features/routine/components/RoutineCoursesTable';
import { GoogleCalendarSyncWidget } from '../features/routine/components/GoogleCalendarSyncWidget';
import { ResetScheduleModal } from '../features/routine/components/ResetScheduleModal';

const ALL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper to get week start date based on starting day
const getWeekStartDate = (date, startDay = 'Monday') => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayIndex = d.getDay(); // 0 = Sun, 1 = Mon, ...
  if (startDay === 'Sunday') {
    d.setDate(d.getDate() - dayIndex);
  } else {
    const diff = dayIndex === 0 ? -6 : 1 - dayIndex;
    d.setDate(d.getDate() + diff);
  }
  return d;
};

export const RoutinePage = () => {
  const {
    routines: contextRoutines,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    courses,
    refreshData
  } = useData();

  const [serverRoutines, setServerRoutines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [routineRefreshToken, setRoutineRefreshToken] = useState(0);

  // Modals & form state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [conflictWarning, setConflictWarning] = useState(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const [form, setForm] = useState({
    courseId: 'CSE-311',
    courseTitle: 'Database Management Systems',
    faculty: 'Dr. Al-Mamun',
    teacherName: 'Dr. Al-Mamun',
    credit: 3,
    courseType: 'theory',
    classType: 'theory',
    dayOfWeek: 'Monday',
    startTime: '08:00',
    endTime: '08:50',
    room: 'Room 304',
    building: 'Academic Building 2',
    group: '',
    section: '',
    effectiveStartDate: '',
    effectiveEndDate: '',
    color: '#4F46E5',
    repeatWeekly: true,
    notes: ''
  });

  // Fetch routines from server API and merge
  const fetchRoutines = async () => {
    setFetchError('');
    try {
      const data = await routineApi.list();
      const fetched = Array.isArray(data) ? data : data?.results || [];
      setServerRoutines(fetched);

      // Merge into routineService if there are changes
      const byId = new Map(routineService.getAll().map((item) => [String(item.id), item]));
      fetched.forEach((item) => byId.set(String(item.id), item));
      const merged = [...byId.values()];
      if (JSON.stringify(merged) !== JSON.stringify(routineService.getAll())) {
        routineService.saveAll(merged);
        refreshData();
      }
    } catch (err) {
      setFetchError(err.message || 'Could not fetch routines from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchRoutines();
  }, [routineRefreshToken]);

  // Combined routines (server + context / storage)
  const allRoutines = useMemo(() => {
    const byId = new Map();
    [...(contextRoutines || []), ...serverRoutines].forEach((routine) => {
      const key = String(routine.id);
      const current = byId.get(key);
      const currentUpdated = Date.parse(current?.updatedAt || '') || 0;
      const candidateUpdated = Date.parse(routine.updatedAt || '') || 0;
      if (!current || candidateUpdated >= currentUpdated) {
        byId.set(key, routine);
      }
    });
    return [...byId.values()].sort((a, b) =>
      String(a.startTime || '').localeCompare(String(b.startTime || ''))
    );
  }, [contextRoutines, serverRoutines]);

  // Determine visible days: Monday to Friday by default, include Sunday if Sunday classes exist
  const visibleDays = useMemo(() => {
    const hasSunday = allRoutines.some((r) => r.dayOfWeek?.toLowerCase() === 'sunday');
    const hasSaturday = allRoutines.some((r) => r.dayOfWeek?.toLowerCase() === 'saturday');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    if (hasSunday) days.unshift('Sunday');
    if (hasSaturday) days.push('Saturday');
    return days;
  }, [allRoutines]);

  const startDayName = visibleDays[0] || 'Monday';

  // Week navigation state
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    getWeekStartDate(new Date(), startDayName)
  );

  // If visibleDays shifts starting day, re-align week start
  useEffect(() => {
    setCurrentWeekStart((prev) => getWeekStartDate(prev, startDayName));
  }, [startDayName]);

  const handlePrevWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleToday = () => {
    setCurrentWeekStart(getWeekStartDate(new Date(), startDayName));
  };

  const isCurrentWeek = useMemo(() => {
    const todayWeekStart = getWeekStartDate(new Date(), startDayName);
    return todayWeekStart.getTime() === currentWeekStart.getTime();
  }, [currentWeekStart, startDayName]);

  // Compute exact dates for visible day headers
  const weekDates = useMemo(() => {
    const dates = {};
    visibleDays.forEach((day, index) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + index);
      dates[day] = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    return dates;
  }, [currentWeekStart, visibleDays]);

  // Filter effective routines for the selected week
  const effectiveRoutines = useMemo(() => {
    const weekStartStr = currentWeekStart.toISOString().split('T')[0];
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + visibleDays.length - 1);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    return allRoutines.filter((r) => {
      if (r.effectiveStartDate && r.effectiveStartDate > weekEndStr) return false;
      if (r.effectiveEndDate && r.effectiveEndDate < weekStartStr) return false;
      return true;
    });
  }, [allRoutines, currentWeekStart, visibleDays]);

  // Add / Edit Handlers
  const handleOpenAdd = () => {
    setEditingRoutine(null);
    setForm({
      courseId: 'CSE-311',
      courseTitle: 'Database Management Systems',
      faculty: 'Dr. Al-Mamun',
      teacherName: 'Dr. Al-Mamun',
      credit: 3,
      courseType: 'theory',
      classType: 'theory',
      dayOfWeek: visibleDays[0] || 'Monday',
      startTime: '09:00',
      endTime: '10:00',
      room: 'Room 304',
      building: 'Academic Building 2',
      group: '',
      section: '',
      effectiveStartDate: '',
      effectiveEndDate: '',
      color: routineService.getColorForCourse('CSE-311'),
      repeatWeekly: true,
      notes: ''
    });
    setConflictWarning(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (routine) => {
    setEditingRoutine(routine);
    setForm({
      ...routine,
      teacherName: routine.teacherName || routine.faculty || '',
      faculty: routine.teacherName || routine.faculty || '',
      credit: routine.credit || 0,
      courseType: routine.courseType || (routine.classType === 'lecture' ? 'theory' : routine.classType) || 'theory',
      classType: routine.classType === 'lecture' ? 'theory' : routine.classType,
      group: routine.group || '',
      section: routine.section || '',
      effectiveStartDate: routine.effectiveStartDate || '',
      effectiveEndDate: routine.effectiveEndDate || ''
    });
    setConflictWarning(null);
    setIsEditorOpen(true);
  };

  const handleFormChange = (key, val) => {
    let updated = { ...form, [key]: val };

    if (key === 'courseId') {
      updated.color = routineService.getColorForCourse(val);
    }
    if (key === 'group') updated.section = deriveSectionFromGroup(val);
    if (key === 'teacherName') updated.faculty = val;
    if (key === 'classType') updated.courseType = val;

    setForm(updated);

    const conflicts = routineService.detectConflicts(updated, editingRoutine?.id);
    if (conflicts.length > 0) {
      setConflictWarning(
        `Overlap detected with ${conflicts[0].courseId} (${conflicts[0].startTime}-${conflicts[0].endTime}) on ${conflicts[0].dayOfWeek}`
      );
    } else {
      setConflictWarning(null);
    }
  };

  const handleColorSelect = (color) => {
    handleFormChange('color', color);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.endTime <= form.startTime) {
      setConflictWarning('End time must be later than start time.');
      return;
    }
    if (form.effectiveStartDate && form.effectiveEndDate && form.effectiveEndDate < form.effectiveStartDate) {
      setConflictWarning('Effective end date must be on or after the start date.');
      return;
    }
    if (form.courseId && form.color) {
      routineService.setCourseColor(form.courseId, form.color);
    }
    if (editingRoutine) {
      updateRoutine(editingRoutine.id, form);
    } else {
      addRoutine(form);
    }
    setIsEditorOpen(false);
  };

  const handleDuplicate = (routine) => {
    const { id, importId, createdAt, updatedAt, ...copy } = routine;
    addRoutine({
      ...copy,
      source: 'manual',
      manuallyEdited: false,
      courseTitle: `${routine.courseTitle} (Copy)`
    });
  };

  const handleDeleteRoutine = (routineId) => {
    setServerRoutines((current) => current.filter((item) => item.id !== routineId));
    deleteRoutine(routineId);
  };

  const lastImport = routineImportService.getLastImport();
  const undoLastImport = () => {
    if (
      !lastImport ||
      !window.confirm(
        `Undo routine import from ${lastImport.sourceFile?.name || 'uploaded file'}? Only records changed by that import will be restored.`
      )
    )
      return;
    routineImportService.undoLastImport();
    refreshData();
    setRoutineRefreshToken((token) => token + 1);
  };

  const handleImageImported = (importedRoutines) => {
    const manualRoutines = routineService.getAll().filter((item) => item.source !== 'ocr-import');
    routineService.saveAll([...manualRoutines, ...importedRoutines]);
    refreshData();
    setRoutineRefreshToken((token) => token + 1);
  };

  return (
    <div className="space-y-6">
      {/* 2. PAGE HEADER */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-brand-500" />
            <span>Class Routine</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Your weekly academic schedule at a glance
          </p>
        </div>

        {/* Action Controls: Google Calendar, Import, Add Class */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <GoogleCalendarSyncWidget routines={allRoutines} />

          <RoutineImportButton onClick={() => setIsImportOpen(true)} />

          {lastImport && (
            <button
              type="button"
              onClick={undoLastImport}
              className="px-3.5 py-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl transition-colors hover:bg-amber-100"
            >
              Undo last import
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 rounded-xl shadow-xs transition-colors shrink-0"
            title="Reset routine or workspace data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-glow-indigo transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Class</span>
          </button>
        </div>
      </header>

      {/* Network / Cached banner */}
      {fetchError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
          <span>{fetchError} Displaying locally cached classes.</span>
          <button
            type="button"
            onClick={() => void fetchRoutines()}
            className="inline-flex items-center gap-1 font-bold hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* 4. NEXT CLASS */}
      <NextClassCard routines={allRoutines} isLoading={isLoading} />

      {/* 5. WEEK NAVIGATION */}
      <WeekNavigator
        currentWeekStart={currentWeekStart}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
        isCurrentWeek={isCurrentWeek}
        visibleDays={visibleDays}
      />

      {/* 6. HORIZONTAL WEEKLY TIMETABLE */}
      <HorizontalWeeklyTimetable
        routines={effectiveRoutines}
        visibleDays={visibleDays}
        weekDates={weekDates}
        isLoading={isLoading}
        onEdit={handleOpenEdit}
        onDuplicate={handleDuplicate}
        onDelete={handleDeleteRoutine}
      />

      {/* 11. COURSES SECTION */}
      <RoutineCoursesTable
        routines={effectiveRoutines}
        allCourses={courses}
        isLoading={isLoading}
      />

      {/* OCR Image Import Modal */}
      <ImageImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={handleImageImported}
        onManualEntry={handleOpenAdd}
      />

      {/* Reset Schedule & Workspace Modal */}
      <ResetScheduleModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        serverRoutines={serverRoutines}
        onResetCompleted={() => {
          refreshData();
          setRoutineRefreshToken((token) => token + 1);
        }}
      />

      {/* Add / Edit Class Routine Modal */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editingRoutine ? 'Edit Class Routine' : 'Add New Class Routine'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {editingRoutine?.source === 'ocr-import' && (
            <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
              Imported{editingRoutine.manuallyEdited ? ' · manually edited' : ''}. Saving changes keeps this class linked to its import history.
            </p>
          )}

          {conflictWarning && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{conflictWarning}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="routine-course-id" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Course Code
              </label>
              <input
                id="routine-course-id"
                type="text"
                value={form.courseId}
                onChange={(e) => handleFormChange('courseId', e.target.value)}
                placeholder="e.g. CSE 2201"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="routine-course-title" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Course Title
              </label>
              <input
                id="routine-course-title"
                type="text"
                value={form.courseTitle}
                onChange={(e) => handleFormChange('courseTitle', e.target.value)}
                placeholder="Data Structures"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="routine-credit" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Credit
              </label>
              <input
                id="routine-credit"
                type="number"
                min="0"
                step="0.25"
                value={form.credit}
                onChange={(e) => handleFormChange('credit', Number(e.target.value))}
                className="w-full min-h-11 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
            <div>
              <label htmlFor="routine-group" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Group
              </label>
              <input
                id="routine-group"
                value={form.group}
                onChange={(e) => handleFormChange('group', e.target.value.toUpperCase())}
                placeholder="e.g. B2"
                className="w-full min-h-11 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
            <div>
              <label htmlFor="routine-section" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Section
              </label>
              <input
                id="routine-section"
                value={form.section}
                onChange={(e) => handleFormChange('section', e.target.value.toUpperCase())}
                placeholder="e.g. B"
                className="w-full min-h-11 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Course Color
              <span className="font-normal text-slate-400 ml-1">
                (applies to all {form.courseId || 'course'} sessions)
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {COURSE_COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorSelect(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                    form.color === color
                      ? 'border-slate-900 dark:border-white ring-2 ring-offset-2 ring-brand-500'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="w-8 h-8 rounded-full cursor-pointer border-0 p-0"
                title="Custom color"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="routine-day" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Day of Week
              </label>
              <select
                id="routine-day"
                value={form.dayOfWeek}
                onChange={(e) => handleFormChange('dayOfWeek', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              >
                {ALL_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="routine-start-time" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Start Time
              </label>
              <input
                id="routine-start-time"
                type="time"
                value={form.startTime}
                onChange={(e) => handleFormChange('startTime', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="routine-end-time" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                End Time
              </label>
              <input
                id="routine-end-time"
                type="time"
                value={form.endTime}
                onChange={(e) => handleFormChange('endTime', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="routine-class-type" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Class Type
              </label>
              <select
                id="routine-class-type"
                value={form.classType}
                onChange={(e) => handleFormChange('classType', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              >
                <option value="theory">Theory</option>
                <option value="lab">Lab</option>
                <option value="sessional">Sessional</option>
                <option value="tutorial">Tutorial</option>
              </select>
            </div>
            <div>
              <label htmlFor="routine-room" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Room No
              </label>
              <input
                id="routine-room"
                type="text"
                value={form.room}
                onChange={(e) => handleFormChange('room', e.target.value)}
                placeholder="Room 305"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
            <div>
              <label htmlFor="routine-building" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Building
              </label>
              <input
                id="routine-building"
                type="text"
                value={form.building}
                onChange={(e) => handleFormChange('building', e.target.value)}
                placeholder="Acad. Bldg 2"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="routine-teacher" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Faculty / Teacher
            </label>
            <input
              id="routine-teacher"
              type="text"
              value={form.teacherName}
              onChange={(e) => handleFormChange('teacherName', e.target.value)}
              placeholder="Dr. Al-Mamun"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="routine-effective-start" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Effective start date
              </label>
              <input
                id="routine-effective-start"
                type="date"
                value={form.effectiveStartDate}
                onChange={(e) => handleFormChange('effectiveStartDate', e.target.value)}
                className="w-full min-h-11 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
            <div>
              <label htmlFor="routine-effective-end" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Effective end date
              </label>
              <input
                id="routine-effective-end"
                type="date"
                value={form.effectiveEndDate}
                onChange={(e) => handleFormChange('effectiveEndDate', e.target.value)}
                className="w-full min-h-11 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md"
            >
              Save Class Routine
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RoutinePage;
