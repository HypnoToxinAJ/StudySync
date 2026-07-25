import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import {
  Banknote,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Phone,
  BookOpen,
  DollarSign,
  TrendingUp,
  History,
  Trash2
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { tuitionService } from '../services/tuitionService';
import { Badge } from '../components/common/Badge';
import { CircularProgress } from '../components/common/CircularProgress';
import { Modal } from '../components/common/Modal';
import { Tabs } from '../components/common/Tabs';

export const TuitionPage = () => {
  const { tuitions, addTuitionStudent, logTuitionClass } = useData();

  const [activeTab, setActiveTab] = useState('cards'); // 'cards', 'calendar', 'analytics'
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isLogClassOpen, setIsLogClassOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Student Form state
  const [studentForm, setStudentForm] = useState({
    studentName: '',
    subject: 'Physics & Math',
    classGrade: 'Class 10 (SSC)',
    guardianContact: '+880 1711-987654',
    monthlyClasses: 12,
    monthlySalary: 8000,
    currency: 'BDT',
    expectedPaymentDate: '2026-08-05',
    cardColor: '#4F46E5',
    description: ''
  });

  // Class session form state
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().split('T')[0],
    duration: '1.5 hrs',
    topic: 'Chapter 4: Kinematics Numerical Practice',
    notes: 'Covered formulas and 10 board questions.'
  });

  const analytics = tuitionService.getAnalytics();
  const selectedStudent = tuitions.find(t => t.id === selectedStudentId) || tuitions[0];

  const handleAddStudentSubmit = (e) => {
    e.preventDefault();
    if (!studentForm.studentName) return;
    addTuitionStudent(studentForm);
    setIsAddStudentOpen(false);
  };

  const handleLogClassSubmit = (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    logTuitionClass(selectedStudentId, logForm);
    setIsLogClassOpen(false);
  };

  // FullCalendar events generation for tuition
  const tuitionEvents = [];
  tuitions.forEach(st => {
    (st.logs || []).forEach(lg => {
      tuitionEvents.push({
        id: lg.id,
        title: `Tuition: ${st.studentName} (${lg.topic})`,
        date: lg.date,
        backgroundColor: st.cardColor || '#10B981',
        borderColor: st.cardColor || '#10B981'
      });
    });
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Banknote className="w-6 h-6 text-brand-500" />
            <span>Private Tuition Tracker & Income Engine</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track private student classes, automated per-class salary calculations, and monthly payment status
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Tabs
            tabs={[
              { id: 'cards', label: 'Student Cards', count: tuitions.length },
              { id: 'calendar', label: 'Tuition Calendar' },
              { id: 'analytics', label: 'Income Analytics' }
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <button
            onClick={() => setIsAddStudentOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* FINANCIAL OVERVIEW BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Received Income</span>
          <h3 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            ৳ {analytics.totalReceivedIncome.toLocaleString()}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Expected Target: ৳{analytics.totalExpectedIncome.toLocaleString()}</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outstanding Pending Income</span>
          <h3 className="text-3xl font-extrabold text-amber-500 mt-2">
            ৳ {analytics.totalOutstandingIncome.toLocaleString()}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Pending payments to collect</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Classes Conducted</span>
          <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {analytics.totalCompletedClasses} / {analytics.totalPlannedClasses}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Across all private tuitions</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Rate / Class</span>
          <h3 className="text-3xl font-extrabold text-brand-600 dark:text-brand-400 mt-2">
            ৳ {analytics.averageValuePerClass}
          </h3>
          <p className="text-xs text-slate-500 mt-1">Value calculated per session</p>
        </div>
      </div>

      {/* TUITION STUDENT CARDS TAB */}
      {activeTab === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tuitions.map((student) => {
            const metrics = tuitionService.calculateStudentMetrics(student);
            return (
              <div
                key={student.id}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: student.cardColor }} />
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{student.studentName}</h3>
                    </div>
                    <Badge variant={student.paymentStatus === 'paid' ? 'emerald' : student.paymentStatus === 'overdue' ? 'rose' : 'amber'}>
                      {student.paymentStatus.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                    {student.subject} • {student.classGrade}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{student.guardianContact}</span>
                  </p>

                  {/* Class & Salary Math Box */}
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-slate-900 dark:text-white">
                        Monthly Salary: <span className="text-brand-600 dark:text-brand-400">৳ {metrics.salary.toLocaleString()}</span>
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        Earned So Far: <span className="text-emerald-600 dark:text-emerald-400 font-bold">৳ {metrics.earnedAmount.toLocaleString()}</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Per Class Rate: ৳ {metrics.perClassRate} / session
                      </p>
                    </div>

                    <CircularProgress
                      value={metrics.classProgressPercent}
                      size={60}
                      strokeWidth={5}
                      color={student.cardColor || '#4F46E5'}
                      label="Classes"
                    />
                  </div>

                  {/* History Log Snippet */}
                  <div className="mt-4 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent Conducted Sessions ({student.logs?.length || 0})</span>
                    {(student.logs || []).slice(0, 3).map((lg) => (
                      <div key={lg.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white truncate">{lg.topic}</p>
                          <span className="text-[10px] text-slate-400">{lg.date} • {lg.duration}</span>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    Remaining: {metrics.remainingClasses} classes
                  </span>

                  <button
                    onClick={() => {
                      setSelectedStudentId(student.id);
                      setIsLogClassOpen(true);
                    }}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Class Session</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TUITION CALENDAR TAB */}
      {activeTab === 'calendar' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek'
            }}
            events={tuitionEvents}
            height="600px"
          />
        </div>
      )}

      {/* INCOME ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Tuition Income Breakdown by Student (BDT ৳)
          </h3>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.studentBreakdown}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <RechartsTooltip />
                <Bar dataKey="earned" name="Earned Amount (৳)" fill="#10B981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="salary" name="Monthly Target Salary (৳)" fill="#4F46E5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ADD STUDENT MODAL */}
      <Modal isOpen={isAddStudentOpen} onClose={() => setIsAddStudentOpen(false)} title="Add Tuition Student">
        <form onSubmit={handleAddStudentSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Student Name</label>
            <input
              type="text"
              placeholder="e.g. Aaraf Rahman"
              value={studentForm.studentName}
              onChange={(e) => setStudentForm({ ...studentForm, studentName: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
              <input
                type="text"
                value={studentForm.subject}
                onChange={(e) => setStudentForm({ ...studentForm, subject: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Class / Grade</label>
              <input
                type="text"
                value={studentForm.classGrade}
                onChange={(e) => setStudentForm({ ...studentForm, classGrade: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Monthly Planned Classes</label>
              <input
                type="number"
                value={studentForm.monthlyClasses}
                onChange={(e) => setStudentForm({ ...studentForm, monthlyClasses: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Monthly Salary (৳ BDT)</label>
              <input
                type="number"
                value={studentForm.monthlySalary}
                onChange={(e) => setStudentForm({ ...studentForm, monthlySalary: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Guardian Contact Phone</label>
            <input
              type="text"
              value={studentForm.guardianContact}
              onChange={(e) => setStudentForm({ ...studentForm, guardianContact: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
            />
          </div>
          <div className="pt-2 flex justify-end space-x-2">
            <button type="button" onClick={() => setIsAddStudentOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
            <button type="submit" className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl shadow-md">Save Tuition Student</button>
          </div>
        </form>
      </Modal>

      {/* LOG CLASS SESSION MODAL */}
      <Modal isOpen={isLogClassOpen} onClose={() => setIsLogClassOpen(false)} title={`Log Conducted Class for ${selectedStudent?.studentName}`}>
        <form onSubmit={handleLogClassSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={logForm.date}
                onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Duration</label>
              <input
                type="text"
                value={logForm.duration}
                onChange={(e) => setLogForm({ ...logForm, duration: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Topic / Chapter Taught</label>
            <input
              type="text"
              value={logForm.topic}
              onChange={(e) => setLogForm({ ...logForm, topic: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notes / Performance</label>
            <textarea
              value={logForm.notes}
              onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
            />
          </div>
          <div className="pt-2 flex justify-end space-x-2">
            <button type="button" onClick={() => setIsLogClassOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
            <button type="submit" className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl shadow-md">Confirm Session</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
