import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Calendar,
  CheckSquare,
  FileCheck2,
  GraduationCap,
  Banknote,
  Wallet,
  Zap,
  Plus,
  Pin,
  ExternalLink,
  Trash2,
  Edit2,
  RefreshCw,
  Eye,
  RotateCcw,
  CheckCircle2,
  Search,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { mockQuotes } from '../data/mockData';
import { shortcutService } from '../services/shortcutService';
import { cgpaService } from '../services/cgpaService';
import { tuitionService } from '../services/tuitionService';
import { expenseService } from '../services/expenseService';

export const DashboardPage = () => {
  const { user } = useAuth();
  const {
    activeAlerts,
    dismissAlert,
    restoreAlerts,
    shortcuts,
    addShortcut,
    togglePinShortcut,
    deleteShortcut,
    tasks,
    toggleTask,
    addTask,
    courses,
    routines,
    assessments,
    focusData
  } = useData();

  // Quote State
  const [quoteIndex, setQuoteIndex] = useState(0);
  const currentQuote = mockQuotes[quoteIndex % mockQuotes.length];

  // Shortcut State
  const [shortcutSearch, setShortcutSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isAddShortcutOpen, setIsAddShortcutOpen] = useState(false);
  const [newShortcut, setNewShortcut] = useState({ name: '', url: '', category: 'AI Tools' });

  // Task State
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Greeting calculation
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

  // Key metrics calculation
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayClasses = routines.filter(r => r.dayOfWeek.toLowerCase() === todayName.toLowerCase());

  const attendanceRisks = courses.filter(c => c.missedClasses >= Math.floor(c.credit || 3));
  const upcomingAssessments = assessments.filter(a => a.date >= new Date().toISOString().split('T')[0]);

  const { cgpa } = cgpaService.calculateOverallCGPA();
  const tuitionAnalytics = tuitionService.getAnalytics();
  const financialSummary = expenseService.getFinancialSummary();

  const categories = ['All', ...new Set(shortcuts.map(s => s.category))];
  const filteredShortcuts = shortcuts.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(shortcutSearch.toLowerCase()) || s.url.toLowerCase().includes(shortcutSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddShortcutSubmit = (e) => {
    e.preventDefault();
    if (!newShortcut.name || !newShortcut.url) return;
    const { icon, color } = shortcutService.suggestIconAndColor(newShortcut.url);
    addShortcut({ ...newShortcut, icon, color });
    setNewShortcut({ name: '', url: '', category: 'AI Tools' });
    setIsAddShortcutOpen(false);
  };

  const handleAddTaskSubmit = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addTask({ title: newTaskTitle, dueDate: new Date().toISOString().split('T')[0], priority: 'medium', category: 'academic' });
    setNewTaskTitle('');
  };

  return (
    <div className="space-y-8">
      {/* Header Greeting Banner */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-brand-700 via-brand-600 to-indigo-800 text-white shadow-xl shadow-brand-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-brand-200 text-xs font-semibold uppercase tracking-widest mb-1">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span>Academic Workspace</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {greeting}, {user?.name || 'Student'}!
            </h2>
            <p className="mt-1 text-sm text-brand-100 max-w-xl">
              {user?.university || 'University'} • {user?.department || 'Department'} ({user?.semester || 'Semester'})
            </p>
          </div>

          {/* Productivity Pill & Quote Rotator */}
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 max-w-md">
            <div className="flex items-center justify-between text-xs text-brand-200 mb-1">
              <span className="font-semibold uppercase tracking-wider">Daily Inspiration</span>
              <button
                onClick={() => setQuoteIndex(prev => prev + 1)}
                className="hover:text-white transition-colors"
                title="Refresh Quote"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs font-medium italic text-slate-100">
              "{currentQuote.quote}"
            </p>
            <p className="text-[10px] text-brand-300 font-bold mt-1 text-right">
              — {currentQuote.author}
            </p>
          </div>
        </div>
      </div>

      {/* QUICK SECTION METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Today's Schedule"
          value={`${todayClasses.length} Classes`}
          subtext={todayClasses.length > 0 ? `Next: ${todayClasses[0].courseId} (${todayClasses[0].startTime})` : 'No classes today!'}
          icon={Calendar}
          color="indigo"
          actionLabel="View Routine"
          onClick={() => window.location.hash = '/routine'}
        />
        <StatCard
          title="Attendance Risk"
          value={`${attendanceRisks.length} Courses`}
          subtext={attendanceRisks.length === 0 ? 'All courses safe & safe attendance' : `${attendanceRisks.map(c=>c.courseId).join(', ')} at risk!`}
          icon={CheckSquare}
          color={attendanceRisks.length > 0 ? 'rose' : 'emerald'}
          actionLabel="Check Attendance"
          onClick={() => window.location.hash = '/attendance'}
        />
        <StatCard
          title="Current CGPA"
          value={`${cgpa.toFixed(2)} / 4.00`}
          subtext="Calculated across all completed semesters"
          icon={GraduationCap}
          color="cyan"
          actionLabel="Predict Target"
          onClick={() => window.location.hash = '/cgpa'}
        />
        <StatCard
          title="Tuition Earned"
          value={`৳ ${tuitionAnalytics.totalReceivedIncome}`}
          subtext={`Pending: ৳${tuitionAnalytics.totalOutstandingIncome}`}
          icon={Banknote}
          color="emerald"
          actionLabel="Manage Tuition"
          onClick={() => window.location.hash = '/tuition'}
        />
      </div>

      {/* ALERT WIDGETS SECTION */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Priority Alerts & Reminders ({activeAlerts.length})</span>
            </h3>
            <button
              onClick={restoreAlerts}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Dismissed Alerts</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {activeAlerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-2xl border backdrop-blur-sm flex items-start justify-between space-x-4 ${
                    alert.priority === 'high'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant={alert.priority === 'high' ? 'rose' : 'amber'}>
                        {alert.type}
                      </Badge>
                      <span className="text-[11px] font-bold opacity-80">{alert.course}</span>
                    </div>
                    <h4 className="text-sm font-bold">{alert.title}</h4>
                    <p className="text-xs opacity-90 mt-1">{alert.message}</p>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-xs font-bold opacity-70 hover:opacity-100 px-2 py-1 bg-black/10 rounded-lg shrink-0"
                  >
                    Dismiss
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* PERSONAL SHORTCUTS HUB */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Personal Web & App Shortcuts
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Instant one-click launcher for ChatGPT, Claude, Drive, GitHub, and university portals
            </p>
          </div>

          <button
            onClick={() => setIsAddShortcutOpen(true)}
            className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Shortcut</span>
          </button>
        </div>

        {/* Category Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search shortcuts..."
              value={shortcutSearch}
              onChange={(e) => setShortcutSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-brand-500 rounded-xl outline-none"
            />
          </div>
        </div>

        {/* Shortcuts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
          {filteredShortcuts.map((sc) => (
            <motion.div
              key={sc.id}
              whileHover={{ y: -3, scale: 1.02 }}
              className="relative group p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-brand-500/50 transition-all flex flex-col items-center text-center cursor-pointer"
            >
              {/* Pin Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinShortcut(sc.id);
                }}
                className={`absolute top-2 right-2 p-1 rounded-lg transition-colors ${
                  sc.pinned ? 'text-amber-500' : 'text-slate-300 opacity-0 group-hover:opacity-100'
                }`}
              >
                <Pin className="w-3.5 h-3.5 fill-current" />
              </button>

              <a
                href={sc.url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center w-full"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold mb-2 shadow-md"
                  style={{ backgroundColor: sc.color || '#4F46E5' }}
                >
                  {sc.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-full">
                  {sc.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-full mt-0.5">
                  {sc.category}
                </span>
              </a>

              {/* Delete Hover Action */}
              <button
                onClick={() => deleteShortcut(sc.id)}
                className="absolute bottom-1 right-2 p-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* TASK OVERVIEW & DAILY CHECKLIST */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <CheckSquare className="w-5 h-5 text-brand-500" />
              <span>Today's Task Overview</span>
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              {tasks.filter(t => t.completed).length} / {tasks.length} Completed
            </span>
          </div>

          {/* Quick Add Task Input */}
          <form onSubmit={handleAddTaskSubmit} className="flex space-x-2">
            <input
              type="text"
              placeholder="Add a new academic or personal task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 px-4 py-2 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-brand-500 rounded-xl outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md"
            >
              Add Task
            </button>
          </form>

          {/* Tasks List */}
          <div className="space-y-2 pt-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                  task.completed
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/40 dark:border-slate-800 text-slate-400 line-through'
                    : 'bg-slate-50/80 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-white hover:border-brand-500'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                    task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {task.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs font-semibold">{task.title}</span>
                </div>
                <Badge variant={task.category === 'academic' ? 'indigo' : 'emerald'} size="sm">
                  {task.category}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* FOCUS & STUDY SUMMARY PANEL */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <span>Focus Minutes</span>
              </h3>
              <Badge variant="amber">{focusData.currentStreakDays} Day Streak</Badge>
            </div>
            <div className="mt-4 text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <h4 className="text-4xl font-extrabold text-brand-600 dark:text-brand-400 tracking-tight">
                {focusData.totalMinutesThisWeek}
              </h4>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
                Minutes Focused This Week
              </p>
            </div>
          </div>

          <button
            onClick={() => window.location.hash = '/focus'}
            className="w-full py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Launch Distraction-Free Focus Mode</span>
          </button>
        </div>
      </div>

      {/* Add Shortcut Modal */}
      <Modal isOpen={isAddShortcutOpen} onClose={() => setIsAddShortcutOpen(false)} title="Add Personal Shortcut">
        <form onSubmit={handleAddShortcutSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Shortcut Name</label>
            <input
              type="text"
              placeholder="e.g. Overleaf LaTeX"
              value={newShortcut.name}
              onChange={(e) => setNewShortcut({ ...newShortcut, name: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Website URL</label>
            <input
              type="url"
              placeholder="https://www.overleaf.com"
              value={newShortcut.url}
              onChange={(e) => setNewShortcut({ ...newShortcut, url: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
            <select
              value={newShortcut.category}
              onChange={(e) => setNewShortcut({ ...newShortcut, category: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              <option value="AI Tools">AI Tools</option>
              <option value="Academic Cloud">Academic Cloud</option>
              <option value="University Portal">University Portal</option>
              <option value="Coding">Coding</option>
              <option value="Email">Email</option>
              <option value="Personal">Personal</option>
            </select>
          </div>
          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsAddShortcutOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl shadow-md"
            >
              Add Shortcut
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
