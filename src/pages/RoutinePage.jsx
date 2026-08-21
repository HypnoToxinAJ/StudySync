import React, { useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit,
  Clock,
  User,
  AlertTriangle,
  Copy,
  FileText,
  ClipboardList
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { Tabs } from '../components/common/Tabs';
import { routineService, COURSE_COLOR_PRESETS } from '../services/routineService';

const ASSESSMENT_COLORS = {
  CT: { bg: '#F59E0B', border: '#D97706', label: 'Class Test' },
  assignment: { bg: '#06B6D4', border: '#0891B2', label: 'Assignment' },
  examination: { bg: '#EF4444', border: '#DC2626', label: 'Exam' }
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

export const RoutinePage = () => {
  const { routines, addRoutine, updateRoutine, deleteRoutine, assessments, archivedRoutineEvents } = useData();

  const [activeTab, setActiveTab] = useState('weekly');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [conflictWarning, setConflictWarning] = useState(null);
  const [showArchivedHistory, setShowArchivedHistory] = useState(true);
  const [selectedArchivedEvent, setSelectedArchivedEvent] = useState(null);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const [form, setForm] = useState({
    courseId: 'CSE-311',
    courseTitle: 'Database Management Systems',
    faculty: 'Dr. Al-Mamun',
    classType: 'lecture',
    dayOfWeek: 'Sunday',
    startTime: '08:00',
    endTime: '08:50',
    room: 'Room 304',
    building: 'Academic Building 2',
    color: '#4F46E5',
    repeatWeekly: true,
    notes: ''
  });

  const assessmentsByDay = useMemo(() => {
    const map = {};
    WEEKDAYS.forEach(d => { map[d] = []; });

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    assessments.forEach(ast => {
      const date = new Date(ast.date + 'T12:00:00');
      if (date >= startOfWeek && date <= endOfWeek) {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        if (map[dayName]) {
          map[dayName].push(ast);
        }
      }
    });
    Object.keys(map).forEach(d => {
      map[d].sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
    });
    return map;
  }, [assessments]);

  const fullCalendarEvents = useMemo(() => {
    const events = [];

    // 1. Active weekly recurring routine classes
    routines.forEach(r => {
      events.push({
        id: r.id,
        title: `${r.courseId} · ${r.classType}`,
        daysOfWeek: [days.indexOf(r.dayOfWeek)],
        startTime: r.startTime,
        endTime: r.endTime,
        backgroundColor: r.color || '#4F46E5',
        borderColor: r.color || '#4F46E5',
        extendedProps: { ...r, eventType: 'routine' }
      });
    });

    // 2. Archived historical routine occurrences (read-only calendar preservation)
    if (showArchivedHistory && Array.isArray(archivedRoutineEvents)) {
      archivedRoutineEvents.forEach(arch => {
        events.push({
          id: arch.id,
          title: `[Archived] ${arch.courseId} · ${arch.classType}`,
          start: `${arch.date}T${arch.startTime || '08:00'}:00`,
          end: `${arch.date}T${arch.endTime || '09:00'}:00`,
          backgroundColor: '#64748B',
          borderColor: '#475569',
          extendedProps: { ...arch, eventType: 'archived-routine' }
        });
      });
    }

    // 3. Tests & Assessments
    assessments.forEach(ast => {
      const colors = ASSESSMENT_COLORS[ast.type] || ASSESSMENT_COLORS.CT;
      events.push({
        id: ast.id,
        title: `${colors.label}: ${ast.courseId}`,
        start: `${ast.date}T${ast.startTime || '10:00:00'}`,
        end: `${ast.date}T${ast.endTime || '11:00:00'}`,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        extendedProps: { ...ast, eventType: 'assessment' }
      });
    });

    return events;
  }, [routines, assessments, archivedRoutineEvents, showArchivedHistory, days]);

  const handleOpenAdd = () => {
    setEditingRoutine(null);
    setForm({
      courseId: 'CSE-311',
      courseTitle: 'Database Management Systems',
      faculty: 'Dr. Al-Mamun',
      classType: 'lecture',
      dayOfWeek: 'Sunday',
      startTime: '09:40',
      endTime: '10:30',
      room: 'Room 304',
      building: 'Academic Building 2',
      color: routineService.getColorForCourse('CSE-311'),
      repeatWeekly: true,
      notes: ''
    });
    setConflictWarning(null);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (routine) => {
    setEditingRoutine(routine);
    setForm(routine);
    setConflictWarning(null);
    setIsEditorOpen(true);
  };

  const handleFormChange = (key, val) => {
    let updated = { ...form, [key]: val };

    if (key === 'courseId') {
      updated.color = routineService.getColorForCourse(val);
    }

    setForm(updated);

    const conflicts = routineService.detectConflicts(updated, editingRoutine?.id);
    if (conflicts.length > 0) {
      setConflictWarning(`Overlap detected with ${conflicts[0].courseId} (${conflicts[0].startTime}-${conflicts[0].endTime}) on ${conflicts[0].dayOfWeek}`);
    } else {
      setConflictWarning(null);
    }
  };

  const handleColorSelect = (color) => {
    handleFormChange('color', color);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
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
    addRoutine({
      ...routine,
      id: undefined,
      courseTitle: `${routine.courseTitle} (Copy)`,
    });
  };

  const renderAssessmentBadge = (ast) => {
    const colors = ASSESSMENT_COLORS[ast.type] || ASSESSMENT_COLORS.CT;
    const Icon = ast.type === 'assignment' ? ClipboardList : FileText;
    return (
      <div
        key={ast.id}
        className="p-2.5 rounded-xl border-2 border-dashed text-left"
        style={{ borderColor: colors.bg, backgroundColor: `${colors.bg}15` }}
      >
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3 shrink-0" style={{ color: colors.bg }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.bg }}>
            {colors.label}
          </span>
        </div>
        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-1">{ast.courseId}</p>
        <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">{ast.title}</p>
        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {ast.date} {ast.startTime && `· ${ast.startTime}`}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <CalendarIcon className="w-6 h-6 text-brand-500" />
            <span>Class Routine & Academic Calendar</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Weekly lectures, lab sessions, and synced class tests & assignments
          </p>
        </div>

        <div className="flex flex-col xs:flex-row items-stretch sm:items-center gap-3">
          <Tabs
            tabs={[
              { id: 'weekly', label: 'Weekly Routine' },
              { id: 'monthly', label: 'Academic Calendar' }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {activeTab === 'weekly' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {WEEKDAYS.map((day) => {
            const dayRoutines = routines.filter(r => r.dayOfWeek === day);
            const dayAssessments = assessmentsByDay[day] || [];
            const isToday = day === todayDayName;

            return (
              <div
                key={day}
                className={`p-4 rounded-2xl border transition-all ${isToday
                    ? 'bg-brand-500/5 border-brand-500/40 ring-2 ring-brand-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                  }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <span className={`text-xs font-extrabold uppercase tracking-wider ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                    {day}
                  </span>
                  {isToday && <Badge variant="indigo" size="sm">Today</Badge>}
                </div>

                <div className="space-y-3">
                  {dayRoutines.length === 0 && dayAssessments.length === 0 ? (
                    <p className="text-[11px] text-slate-400 py-6 text-center italic">
                      No classes scheduled
                    </p>
                  ) : (
                    <>
                      {dayRoutines.map((rt) => (
                        <div
                          key={rt.id}
                          className="group p-3 rounded-xl border text-white shadow-sm transition-all hover:scale-[1.02] relative"
                          style={{ backgroundColor: rt.color || '#4F46E5' }}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-md">
                              {rt.classType}
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity bg-black/30 p-1 rounded-lg">
                              <button onClick={() => handleOpenEdit(rt)} title="Edit">
                                <Edit className="w-3 h-3 text-white" />
                              </button>
                              <button onClick={() => handleDuplicate(rt)} title="Duplicate">
                                <Copy className="w-3 h-3 text-white" />
                              </button>
                              <button onClick={() => deleteRoutine(rt.id)} title="Delete">
                                <Trash2 className="w-3 h-3 text-rose-300" />
                              </button>
                            </div>
                          </div>

                          <h4 className="text-xs font-bold mt-2 leading-tight">{rt.courseId}</h4>
                          <p className="text-[11px] opacity-90 truncate">{rt.courseTitle}</p>

                          <div className="mt-2 pt-2 border-t border-white/20 text-[10px] space-y-0.5 opacity-90">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{rt.startTime} - {rt.endTime}</span>
                            </div>
                            {rt.faculty && (
                              <div className="flex items-center space-x-1 truncate">
                                <User className="w-3 h-3" />
                                <span className="truncate">{rt.faculty}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {dayAssessments.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {dayAssessments.map(renderAssessmentBadge)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Legend:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Active Classes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-slate-500" />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Archived Routine History</span>
              </div>
              {Object.entries(ASSESSMENT_COLORS).map(([key, val]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: val.bg }} />
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{val.label}</span>
                </div>
              ))}
            </div>

            {/* Archived Routine Filter Toggle */}
            {archivedRoutineEvents?.length > 0 && (
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showArchivedHistory}
                  onChange={(e) => setShowArchivedHistory(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>Show Archived History ({archivedRoutineEvents.length})</span>
              </label>
            )}
          </div>

          <div className="p-3 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-x-auto">
            <div className="calendar-responsive min-w-[320px]">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                buttonText={{
                  today: 'Today',
                  month: 'Month',
                  week: 'Week',
                  day: 'Day'
                }}
                events={fullCalendarEvents}
                height="auto"
                contentHeight="auto"
                aspectRatio={1.5}
                eventDisplay="block"
                dayMaxEvents={3}
                moreLinkClick="popover"
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
                slotMinTime="07:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={false}
                nowIndicator={true}
                eventClick={(info) => {
                  const props = info.event.extendedProps;
                  if (props?.eventType === 'archived-routine') {
                    setSelectedArchivedEvent(props);
                  }
                }}
                eventDidMount={(info) => {
                  info.el.title = info.event.title;
                }}
              />
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} title={editingRoutine ? 'Edit Class Routine' : 'Add New Class Routine'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {conflictWarning && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{conflictWarning}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Course Code</label>
              <input
                type="text"
                value={form.courseId}
                onChange={(e) => handleFormChange('courseId', e.target.value)}
                placeholder="e.g. CSE-311"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Course Title</label>
              <input
                type="text"
                value={form.courseTitle}
                onChange={(e) => handleFormChange('courseTitle', e.target.value)}
                placeholder="Database Systems"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Course Color
              <span className="font-normal text-slate-400 ml-1">(same color applies to all {form.courseId || 'course'} sessions)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {COURSE_COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorSelect(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${form.color === color ? 'border-slate-900 dark:border-white ring-2 ring-offset-2 ring-brand-500' : 'border-transparent'
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Day of Week</label>
              <select
                value={form.dayOfWeek}
                onChange={(e) => handleFormChange('dayOfWeek', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              >
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => handleFormChange('startTime', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">End Time</label>
              <input
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Class Type</label>
              <select
                value={form.classType}
                onChange={(e) => handleFormChange('classType', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              >
                <option value="lecture">Lecture</option>
                <option value="lab">Lab</option>
                <option value="tutorial">Tutorial</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Room No</label>
              <input
                type="text"
                value={form.room}
                onChange={(e) => handleFormChange('room', e.target.value)}
                placeholder="Room 304"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Building</label>
              <input
                type="text"
                value={form.building}
                onChange={(e) => handleFormChange('building', e.target.value)}
                placeholder="Acad. Bldg 2"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Faculty / Teacher</label>
            <input
              type="text"
              value={form.faculty}
              onChange={(e) => handleFormChange('faculty', e.target.value)}
              placeholder="Dr. Al-Mamun"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsEditorOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl shadow-md"
            >
              Save Class Routine
            </button>
          </div>
        </form>
      </Modal>

      {/* Archived Routine Event Details Modal */}
      <Modal
        isOpen={Boolean(selectedArchivedEvent)}
        onClose={() => setSelectedArchivedEvent(null)}
        title="Archived Routine Entry"
      >
        {selectedArchivedEvent && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-[10px]">
                  Read-Only Calendar History
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  Semester: {selectedArchivedEvent.semesterId}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  {selectedArchivedEvent.courseId} · {selectedArchivedEvent.courseTitle}
                </h4>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedArchivedEvent.classType?.toUpperCase()} {selectedArchivedEvent.faculty ? `• Faculty: ${selectedArchivedEvent.faculty}` : ''}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Date & Time</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedArchivedEvent.date} ({selectedArchivedEvent.startTime} - {selectedArchivedEvent.endTime})
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Location</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedArchivedEvent.room || 'N/A'}, {selectedArchivedEvent.building || ''}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic text-center">
              This is a preserved historical routine occurrence from a previous semester and cannot be modified.
            </p>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedArchivedEvent(null)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
