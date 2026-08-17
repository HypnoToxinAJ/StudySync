import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDiscord, faGithub, faGoogleDrive, faLinkedin, faStackOverflow, faXTwitter } from '@fortawesome/free-brands-svg-icons';
import {
  Sparkles,
  Calendar,
  CheckSquare,
  FileText,
  Pill,
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
  AlertTriangle,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { StatCard } from '../components/common/StatCard';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ShortcutIconResolver } from '../components/common/shortcutIconResolver';
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
    dismissAllAlerts,
    restoreAlerts,
    shortcuts,
    addShortcut,
    togglePinShortcut,
    deleteShortcut,
    notes,
    addNote,
    updateNote,
    togglePinNote,
    archiveNote,
    toggleChecklistItem,
    medications,
    addMedication,
    updateMedication,
    toggleMedicationStatus,
    logMedicationDose,
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

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: '',
    color: 'amber',
    labelsText: '',
    checklistMode: false,
    checklistText: '',
  });
  const [editingNoteId, setEditingNoteId] = useState(null);

  const [isMedicationModalOpen, setIsMedicationModalOpen] = useState(false);
  const [medicationForm, setMedicationForm] = useState({
    name: '',
    dosageText: '',
    form: 'Tablet',
    instructions: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    scheduleTimesText: '08:00',
    selectedDaysText: 'Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday',
    color: 'blue',
    status: 'Active',
  });
  const [editingMedicationId, setEditingMedicationId] = useState(null);

  // Task State
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Confirm dismiss-all alert state
  const [isConfirmDismissAllOpen, setIsConfirmDismissAllOpen] = useState(false);

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

  const visibleNotes = [...notes]
    .filter((note) => !note.archived)
    .sort((left, right) => Number(right.pinned) - Number(left.pinned) || new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0));

  const activeMedications = [...medications]
    .filter((medication) => medication.status !== 'Archived')
    .sort((left, right) => Number(right.status === 'Active') - Number(left.status === 'Active') || new Date(left.startDate || 0) - new Date(right.startDate || 0));

  const noteColors = {
    amber: 'bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-100',
    sky: 'bg-sky-500/10 border-sky-500/25 text-sky-800 dark:text-sky-100',
    violet: 'bg-violet-500/10 border-violet-500/25 text-violet-800 dark:text-violet-100',
    emerald: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-100',
    rose: 'bg-rose-500/10 border-rose-500/25 text-rose-800 dark:text-rose-100',
  };

  const medicationColors = {
    blue: 'bg-blue-500/10 border-blue-500/25 text-blue-800 dark:text-blue-100',
    emerald: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-100',
    amber: 'bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-100',
    rose: 'bg-rose-500/10 border-rose-500/25 text-rose-800 dark:text-rose-100',
    violet: 'bg-violet-500/10 border-violet-500/25 text-violet-800 dark:text-violet-100',
  };

  const shortcutBrandIcons = {
    github: faGithub,
    'google-drive': faGoogleDrive,
    linkedin: faLinkedin,
    discord: faDiscord,
    'x-twitter': faXTwitter,
    'stack-overflow': faStackOverflow,
  };

  const renderShortcutIcon = (shortcut) => {
    if (shortcut?.icon?.type === 'brand') {
      const brandIcon = shortcutBrandIcons[shortcut.icon.name];
      if (brandIcon) {
        return <FontAwesomeIcon icon={brandIcon} className="w-4 h-4 text-white" />;
      }
    }

    const label = shortcut?.displayName || shortcut?.name || 'SC';
    return <span className="text-[11px] font-extrabold text-white">{label.slice(0, 2).toUpperCase()}</span>;
  };

  const openNoteComposer = (note = null) => {
    setEditingNoteId(note?.id || null);
    setNoteForm({
      title: note?.title || '',
      content: note?.content || '',
      color: note?.color || 'amber',
      labelsText: (note?.labels || []).join(', '),
      checklistMode: Boolean(note?.checklistMode),
      checklistText: (note?.checklistItems || []).map((item) => item.text).join('\n'),
    });
    setIsNoteModalOpen(true);
  };

  const openMedicationComposer = (medication = null) => {
    setEditingMedicationId(medication?.id || null);
    setMedicationForm({
      name: medication?.name || '',
      dosageText: medication?.dosageText || '',
      form: medication?.form || 'Tablet',
      instructions: medication?.instructions || '',
      description: medication?.description || '',
      startDate: medication?.startDate || new Date().toISOString().split('T')[0],
      endDate: medication?.endDate || new Date().toISOString().split('T')[0],
      scheduleTimesText: (medication?.scheduleTimes || ['08:00']).join(', '),
      selectedDaysText: (medication?.selectedDays || ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']).join(', '),
      color: medication?.color || 'blue',
      status: medication?.status || 'Active',
    });
    setIsMedicationModalOpen(true);
  };

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

  const handleNoteSubmit = (e) => {
    e.preventDefault();
    if (!noteForm.title.trim() && !noteForm.content.trim()) return;

    const checklistItems = noteForm.checklistMode
      ? noteForm.checklistText
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean)
          .map((text, index) => ({ id: `note-item-${Date.now()}-${index}`, text, completed: false }))
      : [];

    const payload = {
      title: noteForm.title.trim(),
      content: noteForm.content.trim(),
      color: noteForm.color,
      labels: noteForm.labelsText.split(',').map((label) => label.trim()).filter(Boolean),
      checklistMode: noteForm.checklistMode,
      checklistItems,
      archived: false,
    };

    if (editingNoteId) {
      updateNote(editingNoteId, payload);
    } else {
      addNote(payload);
    }

    setIsNoteModalOpen(false);
    setEditingNoteId(null);
  };

  const handleMedicationSubmit = (e) => {
    e.preventDefault();
    if (!medicationForm.name.trim()) return;

    const payload = {
      name: medicationForm.name.trim(),
      dosageText: medicationForm.dosageText.trim(),
      form: medicationForm.form,
      instructions: medicationForm.instructions.trim(),
      description: medicationForm.description.trim(),
      startDate: medicationForm.startDate,
      endDate: medicationForm.endDate,
      scheduleTimes: medicationForm.scheduleTimesText.split(',').map((item) => item.trim()).filter(Boolean),
      selectedDays: medicationForm.selectedDaysText.split(',').map((item) => item.trim()).filter(Boolean),
      color: medicationForm.color,
      status: medicationForm.status,
    };

    if (editingMedicationId) {
      updateMedication(editingMedicationId, payload);
    } else {
      addMedication(payload);
    }

    setIsMedicationModalOpen(false);
    setEditingMedicationId(null);
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
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between h-[420px] gap-3">
          <div className="flex items-center justify-between gap-3 shrink-0">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Notes</p>
              <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">{visibleNotes.length} active notes</h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto overflow-x-hidden pr-1.5 my-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            {visibleNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => openNoteComposer(note)}
                className={`w-full text-left rounded-2xl border px-3 py-3 transition-all hover:-translate-y-0.5 ${noteColors[note.color] || noteColors.violet}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{note.title}</p>
                    <p className="mt-1 text-xs leading-5 opacity-90 line-clamp-2">{note.content}</p>
                  </div>
                  {note.pinned && <Pin className="w-4 h-4 shrink-0" />}
                </div>
              </button>
            ))}
            {visibleNotes.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 px-3 py-4 text-xs text-slate-500 dark:text-slate-400">
                No notes yet. Capture a revision, a reminder, or a checklist.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => openNoteComposer()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-white transition-colors shrink-0 pt-2.5 border-t border-slate-100 dark:border-slate-800"
          >
            <Edit2 className="w-4 h-4" />
            <span>New Note</span>
          </button>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between h-[420px] gap-3">
          <div className="flex items-center justify-between gap-3 shrink-0">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Medication</p>
              <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">{activeMedications.filter((medication) => medication.status === 'Active').length} active plans</h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 flex items-center justify-center">
              <Pill className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto overflow-x-hidden pr-1.5 my-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
            {activeMedications.map((medication) => (
              <button
                key={medication.id}
                type="button"
                onClick={() => openMedicationComposer(medication)}
                className={`w-full text-left rounded-2xl border px-3 py-3 transition-all hover:-translate-y-0.5 ${medicationColors[medication.color] || medicationColors.blue}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{medication.name}</p>
                    <p className="mt-1 text-xs leading-5 opacity-90 truncate">{medication.dosageText || medication.instructions}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/70 dark:bg-slate-950/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wide">
                    {medication.status}
                  </span>
                </div>
              </button>
            ))}
            {activeMedications.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 px-3 py-4 text-xs text-slate-500 dark:text-slate-400">
                No medication plans saved yet.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => openMedicationComposer()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-white transition-colors shrink-0 pt-2.5 border-t border-slate-100 dark:border-slate-800"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medication</span>
          </button>
        </div>
      </div>

      {/* ALERT WIDGETS SECTION */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Priority Alerts & Reminders ({activeAlerts.length})</span>
            </h3>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsConfirmDismissAllOpen(true)}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Dismiss All</span>
              </button>
              <button
                onClick={restoreAlerts}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Alerts</span>
              </button>
            </div>
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
                  <ShortcutIconResolver shortcut={sc} className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-full">
                  {sc.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-full mt-0.5">
                  {sc.category || shortcutService.getShortcutLabel(sc)}
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

      <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title={editingNoteId ? 'Edit Note' : 'New Note'} maxWidth="max-w-2xl">
        <form onSubmit={handleNoteSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Title</label>
              <input
                type="text"
                value={noteForm.title}
                onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                placeholder="Revision note, reminder, checklist..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Accent Color</label>
              <select
                value={noteForm.color}
                onChange={(e) => setNoteForm({ ...noteForm, color: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <option value="amber">Amber</option>
                <option value="sky">Sky</option>
                <option value="violet">Violet</option>
                <option value="emerald">Emerald</option>
                <option value="rose">Rose</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Content</label>
            <textarea
              rows="5"
              value={noteForm.content}
              onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
              placeholder="Write the note here..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Labels</label>
            <input
              type="text"
              value={noteForm.labelsText}
              onChange={(e) => setNoteForm({ ...noteForm, labelsText: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              placeholder="academic, revision, urgent"
            />
          </div>
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Checklist mode</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Enter one item per line to create a checklist note.</p>
            </div>
            <button
              type="button"
              onClick={() => setNoteForm({ ...noteForm, checklistMode: !noteForm.checklistMode })}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${noteForm.checklistMode ? 'bg-brand-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}
            >
              {noteForm.checklistMode ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          {noteForm.checklistMode && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Checklist items</label>
              <textarea
                rows="4"
                value={noteForm.checklistText}
                onChange={(e) => setNoteForm({ ...noteForm, checklistText: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                placeholder="Item 1\nItem 2\nItem 3"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsNoteModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md">
              {editingNoteId ? 'Update Note' : 'Save Note'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isMedicationModalOpen} onClose={() => setIsMedicationModalOpen(false)} title={editingMedicationId ? 'Edit Medication' : 'Add Medication'} maxWidth="max-w-2xl">
        <form onSubmit={handleMedicationSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Name</label>
              <input
                type="text"
                value={medicationForm.name}
                onChange={(e) => setMedicationForm({ ...medicationForm, name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                placeholder="Medication name"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Form</label>
              <select
                value={medicationForm.form}
                onChange={(e) => setMedicationForm({ ...medicationForm, form: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Drops">Drops</option>
                <option value="Syrup">Syrup</option>
                <option value="Inhaler">Inhaler</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Dosage</label>
            <input
              type="text"
              value={medicationForm.dosageText}
              onChange={(e) => setMedicationForm({ ...medicationForm, dosageText: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              placeholder="1 tablet after dinner"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
              <input
                type="date"
                value={medicationForm.startDate}
                onChange={(e) => setMedicationForm({ ...medicationForm, startDate: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">End Date</label>
              <input
                type="date"
                value={medicationForm.endDate}
                onChange={(e) => setMedicationForm({ ...medicationForm, endDate: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Schedule times</label>
            <input
              type="text"
              value={medicationForm.scheduleTimesText}
              onChange={(e) => setMedicationForm({ ...medicationForm, scheduleTimesText: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              placeholder="08:00, 20:30"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Days</label>
            <input
              type="text"
              value={medicationForm.selectedDaysText}
              onChange={(e) => setMedicationForm({ ...medicationForm, selectedDaysText: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              placeholder="Sunday, Monday, Tuesday"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Accent Color</label>
              <select
                value={medicationForm.color}
                onChange={(e) => setMedicationForm({ ...medicationForm, color: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <option value="blue">Blue</option>
                <option value="emerald">Emerald</option>
                <option value="amber">Amber</option>
                <option value="rose">Rose</option>
                <option value="violet">Violet</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select
                value={medicationForm.status}
                onChange={(e) => setMedicationForm({ ...medicationForm, status: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Instructions</label>
            <textarea
              rows="4"
              value={medicationForm.instructions}
              onChange={(e) => setMedicationForm({ ...medicationForm, instructions: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
              placeholder="Take after breakfast with water..."
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              rows="3"
              value={medicationForm.description}
              onChange={(e) => setMedicationForm({ ...medicationForm, description: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
              placeholder="Optional short reminder text..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsMedicationModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md">
              {editingMedicationId ? 'Update Medication' : 'Save Medication'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmDismissAllOpen}
        onClose={() => setIsConfirmDismissAllOpen(false)}
        onConfirm={() => {
          dismissAllAlerts();
          setIsConfirmDismissAllOpen(false);
        }}
        title="Dismiss All Priority Alerts?"
        message={`Are you sure you want to dismiss all ${activeAlerts.length} active alerts? You can undo this action from the toast notification.`}
      />
    </div>
  );
};
