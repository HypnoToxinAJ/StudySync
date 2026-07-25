import React, { useState } from 'react';
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
  MapPin,
  User,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Copy
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { Tabs } from '../components/common/Tabs';
import { routineService } from '../services/routineService';

export const RoutinePage = () => {
  const { routines, addRoutine, updateRoutine, deleteRoutine, recordAttendance, assessments } = useData();

  const [activeTab, setActiveTab] = useState('weekly'); // 'weekly', 'monthly', 'today'
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);

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

  const [conflictWarning, setConflictWarning] = useState(null);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // FullCalendar merged events generation (routines + class tests + assignments)
  const fullCalendarEvents = [];

  // 1. Generate recurring monthly events from routine
  routines.forEach(r => {
    fullCalendarEvents.push({
      id: r.id,
      title: `${r.courseId} (${r.room})`,
      daysOfWeek: [days.indexOf(r.dayOfWeek)],
      startTime: r.startTime,
      endTime: r.endTime,
      backgroundColor: r.color || '#4F46E5',
      borderColor: r.color || '#4F46E5',
      extendedProps: { ...r, eventType: 'routine' }
    });
  });

  // 2. Merged CTs & Assignments
  assessments.forEach(ast => {
    fullCalendarEvents.push({
      id: ast.id,
      title: `[${ast.type.toUpperCase()}] ${ast.courseId}: ${ast.title}`,
      start: `${ast.date}T${ast.startTime || '10:00:00'}`,
      end: `${ast.date}T${ast.endTime || '11:00:00'}`,
      backgroundColor: ast.type === 'CT' ? '#F59E0B' : ast.type === 'assignment' ? '#06B6D4' : '#EF4444',
      borderColor: ast.type === 'CT' ? '#D97706' : ast.type === 'assignment' ? '#0891B2' : '#DC2626',
      extendedProps: { ...ast, eventType: 'assessment' }
    });
  });

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
      color: '#4F46E5',
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
    const updated = { ...form, [key]: val };
    setForm(updated);

    // Live conflict detection check
    const conflicts = routineService.detectConflicts(updated, editingRoutine?.id);
    if (conflicts.length > 0) {
      setConflictWarning(`Overlap detected with ${conflicts[0].courseId} (${conflicts[0].startTime}-${conflicts[0].endTime}) on ${conflicts[0].dayOfWeek}`);
    } else {
      setConflictWarning(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingRoutine) {
      updateRoutine(editingRoutine.id, form);
    } else {
      addRoutine(form);
    }
    setIsEditorOpen(false);
  };

  const handleDuplicate = (routine) => {
    const duplicated = {
      ...routine,
      id: undefined,
      courseTitle: `${routine.courseTitle} (Copy)`,
    };
    addRoutine(duplicated);
  };

  // Today's classes
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayClasses = routines.filter(r => r.dayOfWeek.toLowerCase() === todayDayName.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <CalendarIcon className="w-6 h-6 text-brand-500" />
            <span>Class Routine & Academic Calendar</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage weekly lectures, lab sessions, conflict detection, and FullCalendar views
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Tabs
            tabs={[
              { id: 'weekly', label: 'Weekly Routine' },
              { id: 'monthly', label: 'Academic Calendar' },
              { id: 'today', label: `Today's Schedule (${todayClasses.length})` }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {/* WEEKLY ROUTINE GRID */}
      {activeTab === 'weekly' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map((day) => {
            const dayRoutines = routines.filter(r => r.dayOfWeek === day);
            const isToday = day === todayDayName;

            return (
              <div
                key={day}
                className={`p-4 rounded-2xl border transition-all ${
                  isToday
                    ? 'bg-brand-500/5 border-brand-500/40 ring-2 ring-brand-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <span className={`text-xs font-extrabold uppercase tracking-wider ${
                    isToday ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {day}
                  </span>
                  {isToday && (
                    <Badge variant="indigo" size="sm">Today</Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {dayRoutines.length === 0 ? (
                    <p className="text-[11px] text-slate-400 py-6 text-center italic">
                      No classes scheduled
                    </p>
                  ) : (
                    dayRoutines.map((rt) => (
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
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{rt.room} ({rt.building})</span>
                          </div>
                          {rt.faculty && (
                            <div className="flex items-center space-x-1 truncate">
                              <User className="w-3 h-3" />
                              <span className="truncate">{rt.faculty}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MONTHLY ACADEMIC FULLCALENDAR */}
      {activeTab === 'monthly' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={fullCalendarEvents}
            height="650px"
          />
        </div>
      )}

      {/* TODAY'S CLASSES & ATTENDANCE CHECK-IN */}
      {activeTab === 'today' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Today's Schedule & Quick Check-In ({todayDayName})
          </h3>

          {todayClasses.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              No classes scheduled for today. Enjoy your study or rest session!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{cls.courseId}</span>
                      <Badge variant="indigo">{cls.classType}</Badge>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{cls.courseTitle}</h4>
                    <p className="text-xs text-slate-500 mt-1 flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cls.startTime} - {cls.endTime}</span>
                      <MapPin className="w-3.5 h-3.5 text-slate-400 ml-2" />
                      <span>{cls.room}</span>
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">Record Attendance:</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => recordAttendance(cls.courseId, 'attended')}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center space-x-1 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Attended</span>
                      </button>
                      <button
                        onClick={() => recordAttendance(cls.courseId, 'missed')}
                        className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl flex items-center space-x-1 shadow-sm"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Missed</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ROUTINE EDITOR MODAL */}
      <Modal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} title={editingRoutine ? "Edit Class Routine" : "Add New Class Routine"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {conflictWarning && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{conflictWarning}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
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

          <div className="grid grid-cols-3 gap-3">
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

          <div className="grid grid-cols-3 gap-3">
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
    </div>
  );
};
