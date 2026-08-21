import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useData } from '../../context/DataContext';
import { Calendar, FileCheck2, BookOpen, Banknote, Wallet, Link } from 'lucide-react';
import { combineLocalDateTime } from '../../utils/assessmentUtils';
import { RelatedLinksManager } from '../assessments/RelatedLinksManager';

export const QuickAddModal = ({ isOpen, onClose }) => {
  const { addRoutine, addAssessment, addCourse, addTuitionStudent, addTransaction, addShortcut, courses } = useData();
  const [activeType, setActiveType] = useState('routine');

  // Form states
  const [routineForm, setRoutineForm] = useState({ courseId: 'CSE-311', courseTitle: 'Database Systems', dayOfWeek: 'Sunday', startTime: '09:40', endTime: '10:30', room: 'Room 304', classType: 'lecture' });
  const [astForm, setAstForm] = useState({ title: '', courseId: 'CSE-311', courseTitle: 'Database Management Systems', type: 'CT', date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '11:00', deadlineDate: new Date().toISOString().split('T')[0], deadlineTime: '23:59', marks: 20, syllabus: '', details: '', priority: 'medium', reminderTime: '24h', notes: '', attachments: [], links: [] });
  const [astError, setAstError] = useState('');
  const [txForm, setTxForm] = useState({ title: '', amount: '', type: 'expense', category: 'Food & Mess', accountId: 'acc-1' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeType === 'routine') {
      addRoutine(routineForm);
    } else if (activeType === 'assessment') {
      if (!astForm.title) return;
      if (astForm.type !== 'assignment' && (!astForm.date || !astForm.startTime || !astForm.endTime || astForm.endTime <= astForm.startTime)) {
        setAstError('Enter a valid date and an end time later than the start time.');
        return;
      }
      if (astForm.type === 'assignment' && (!astForm.deadlineDate || !astForm.deadlineTime)) {
        setAstError('Enter both the submission deadline date and time.');
        return;
      }
      if (astForm.type === 'assignment' ? !astForm.details.trim() : !astForm.syllabus.trim()) {
        setAstError(astForm.type === 'assignment' ? 'Enter assignment details.' : 'Enter the syllabus or coverage.');
        return;
      }
      const common = { title: astForm.title.trim(), courseId: astForm.courseId, courseTitle: astForm.courseTitle, type: astForm.type, marks: astForm.marks, priority: astForm.priority, reminderTime: astForm.reminderTime, notes: astForm.notes.trim(), attachments: [], links: astForm.links };
      const payload = astForm.type === 'assignment'
        ? { ...common, details: astForm.details, deadlineDate: astForm.deadlineDate, deadlineTime: astForm.deadlineTime, deadlineAt: combineLocalDateTime(astForm.deadlineDate, astForm.deadlineTime) }
        : { ...common, syllabus: astForm.syllabus, date: astForm.date, startTime: astForm.startTime, endTime: astForm.endTime, startAt: combineLocalDateTime(astForm.date, astForm.startTime), endAt: combineLocalDateTime(astForm.date, astForm.endTime) };
      addAssessment(payload);
      setAstError('');
    } else if (activeType === 'expense') {
      if (!txForm.title || !txForm.amount) return;
      addTransaction(txForm);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Add Record" maxWidth="max-w-lg">
      <div className="space-y-5">
        {/* Type Selector */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setActiveType('routine')}
            className={`flex items-center justify-center space-x-2 py-2 text-xs font-bold rounded-lg transition-all ${
              activeType === 'routine' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Routine</span>
          </button>
          <button
            onClick={() => setActiveType('assessment')}
            className={`flex items-center justify-center space-x-2 py-2 text-xs font-bold rounded-lg transition-all ${
              activeType === 'assessment' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>CT / Test</span>
          </button>
          <button
            onClick={() => setActiveType('expense')}
            className={`flex items-center justify-center space-x-2 py-2 text-xs font-bold rounded-lg transition-all ${
              activeType === 'expense' ? 'bg-white dark:bg-slate-900 text-brand-600 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Transaction</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeType === 'routine' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Course ID & Title</label>
                <input
                  type="text"
                  value={routineForm.courseId}
                  onChange={(e) => setRoutineForm({ ...routineForm, courseId: e.target.value })}
                  placeholder="e.g. CSE-311 Database Systems"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Day of Week</label>
                  <select
                    value={routineForm.dayOfWeek}
                    onChange={(e) => setRoutineForm({ ...routineForm, dayOfWeek: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Room No</label>
                  <input
                    type="text"
                    value={routineForm.room}
                    onChange={(e) => setRoutineForm({ ...routineForm, room: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={routineForm.startTime}
                    onChange={(e) => setRoutineForm({ ...routineForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    value={routineForm.endTime}
                    onChange={(e) => setRoutineForm({ ...routineForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>
            </>
          )}

          {activeType === 'assessment' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Assessment Title</label>
                <input
                  type="text"
                  value={astForm.title}
                  onChange={(e) => setAstForm({ ...astForm, title: e.target.value })}
                  placeholder="e.g. CT 3: SQL Normalization"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Course ID and title</label>
                <select
                  value={astForm.courseId}
                  onChange={(e) => {
                    const course = courses.find(item => item.courseId === e.target.value);
                    setAstForm({ ...astForm, courseId: e.target.value, courseTitle: course?.courseTitle || '' });
                  }}
                  className="w-full min-h-11 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {courses.map(course => <option key={course.id} value={course.courseId}>{course.courseId} · {course.courseTitle}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Type</label>
                  <select
                    value={astForm.type}
                    onChange={(e) => setAstForm({ ...astForm, type: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="CT">Class Test (CT)</option>
                    <option value="assignment">Assignment</option>
                    <option value="examination">Exam</option>
                  </select>
                </div>
                <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Marks</label><input type="number" min="0" value={astForm.marks} onChange={(e) => setAstForm({ ...astForm, marks: Number(e.target.value) })} className="w-full min-h-11 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" /></div>
              </div>
              {astForm.type === 'assignment' ? (
                <><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Submission deadline date</label><input type="date" value={astForm.deadlineDate} onChange={(e) => setAstForm({ ...astForm, deadlineDate: e.target.value })} className="w-full min-h-11 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" required /></div>
                  <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Submission deadline time</label><input type="time" value={astForm.deadlineTime} onChange={(e) => setAstForm({ ...astForm, deadlineTime: e.target.value })} className="w-full min-h-11 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" required /></div>
                </div><div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Assignment details</label><textarea rows={2} value={astForm.details} onChange={(e) => setAstForm({ ...astForm, details: e.target.value })} className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" required /></div></>
              ) : (
                <><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label><input type="date" value={astForm.date} onChange={(e) => setAstForm({ ...astForm, date: e.target.value })} className="w-full min-h-11 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" required /></div>
                  <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Start time</label><input type="time" value={astForm.startTime} onChange={(e) => setAstForm({ ...astForm, startTime: e.target.value })} className="w-full min-h-11 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" required /></div>
                  <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">End time</label><input type="time" value={astForm.endTime} onChange={(e) => setAstForm({ ...astForm, endTime: e.target.value })} className="w-full min-h-11 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" required /></div>
                </div><div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Syllabus or coverage</label><textarea rows={2} value={astForm.syllabus} onChange={(e) => setAstForm({ ...astForm, syllabus: e.target.value })} className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" required /></div></>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Priority</label><select value={astForm.priority} onChange={(e) => setAstForm({ ...astForm, priority: e.target.value })} className="w-full min-h-11 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Reminder time</label><select value={astForm.reminderTime} onChange={(e) => setAstForm({ ...astForm, reminderTime: e.target.value })} className="w-full min-h-11 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"><option value="12h">12 hours before</option><option value="24h">24 hours before</option><option value="48h">48 hours before</option></select></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notes</label><textarea rows={2} value={astForm.notes} onChange={(e) => setAstForm({ ...astForm, notes: e.target.value })} className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl" /></div>
              <RelatedLinksManager links={astForm.links} onChange={(links) => setAstForm({ ...astForm, links })} />
              {astError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{astError}</p>}
            </>
          )}

          {activeType === 'expense' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={txForm.title}
                  onChange={(e) => setTxForm({ ...txForm, title: e.target.value })}
                  placeholder="e.g. Mess Dining Bill"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (৳ BDT)</label>
                  <input
                    type="number"
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    placeholder="500"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Transaction Type</label>
                  <select
                    value={txForm.type}
                    onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="pt-3 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md"
            >
              Save Record
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
