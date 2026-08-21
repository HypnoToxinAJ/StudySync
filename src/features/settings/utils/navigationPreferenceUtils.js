import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  FileCheck2,
  GraduationCap,
  Calculator,
  Banknote,
  Wallet,
  Zap
} from 'lucide-react';

export const NAVIGATION_SECTIONS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    description: 'Central academic overview and quick actions',
    locked: true
  },
  {
    id: 'routine',
    label: 'Class Routine',
    path: '/routine',
    icon: CalendarDays,
    description: 'Weekly timetable and academic calendar schedule'
  },
  {
    id: 'attendance',
    label: 'Attendance & CT Marks',
    path: '/attendance',
    icon: CheckSquare,
    description: 'Missed classes tracking, warning levels & CT marks'
  },
  {
    id: 'assessments',
    label: 'Tests & Assignments',
    path: '/assessments',
    icon: FileCheck2,
    description: 'Deadlines, quiz exams and assignment submissions'
  },
  {
    id: 'cgpa',
    label: 'CGPA Calculator',
    path: '/cgpa',
    icon: GraduationCap,
    description: 'CUET official portal sync & term-wise grade simulation'
  },
  {
    id: 'math-tools',
    label: 'Math Tools',
    path: '/math-tools',
    icon: Calculator,
    description: 'Desmos graphing, scientific, and 3D calculators'
  },
  {
    id: 'tuition',
    label: 'Tuition Tracker',
    path: '/tuition',
    icon: Banknote,
    description: 'Private tutoring schedules, classes & payment logs'
  },
  {
    id: 'expenses',
    label: 'Expense Tracker',
    path: '/expenses',
    icon: Wallet,
    description: 'Mess budget, personal expenses & bKash/Nagad balances'
  },
  {
    id: 'focus',
    label: 'Focus Mode',
    path: '/focus',
    icon: Zap,
    description: 'Distraction-free YouTube study & PDF document reader'
  }
];

export const DEFAULT_SECTION_ORDER = [
  'dashboard',
  'routine',
  'attendance',
  'assessments',
  'cgpa',
  'math-tools',
  'tuition',
  'expenses',
  'focus'
];

const PREF_STORAGE_KEY = 'studysync_sidebar_preferences';

export const navigationPreferenceUtils = {
  getPreferences: () => {
    try {
      const raw = localStorage.getItem(PREF_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.sectionOrder)) {
          // Ensure all known sections are present in order
          const missing = DEFAULT_SECTION_ORDER.filter(id => !parsed.sectionOrder.includes(id));
          return {
            sectionOrder: [...parsed.sectionOrder, ...missing],
            hiddenSections: Array.isArray(parsed.hiddenSections) ? parsed.hiddenSections : []
          };
        }
      }
    } catch (e) {
      console.error('Error reading sidebar preferences:', e);
    }
    return {
      sectionOrder: [...DEFAULT_SECTION_ORDER],
      hiddenSections: []
    };
  },

  savePreferences: (preferences) => {
    try {
      localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.error('Error saving sidebar preferences:', e);
    }
  },

  toggleSectionVisibility: (sectionId, makeVisible) => {
    if (sectionId === 'dashboard') return navigationPreferenceUtils.getPreferences(); // Dashboard locked

    const current = navigationPreferenceUtils.getPreferences();
    let hidden = [...current.hiddenSections];
    if (makeVisible) {
      hidden = hidden.filter(id => id !== sectionId);
    } else {
      if (!hidden.includes(sectionId)) {
        hidden.push(sectionId);
      }
    }
    const updated = { ...current, hiddenSections: hidden };
    navigationPreferenceUtils.savePreferences(updated);
    return updated;
  },

  reorderSections: (newOrder) => {
    const current = navigationPreferenceUtils.getPreferences();
    // Ensure dashboard is always index 0
    const filtered = newOrder.filter(id => id !== 'dashboard');
    const updatedOrder = ['dashboard', ...filtered];

    const updated = { ...current, sectionOrder: updatedOrder };
    navigationPreferenceUtils.savePreferences(updated);
    return updated;
  },

  resetPreferences: () => {
    const defaultPrefs = {
      sectionOrder: [...DEFAULT_SECTION_ORDER],
      hiddenSections: []
    };
    navigationPreferenceUtils.savePreferences(defaultPrefs);
    return defaultPrefs;
  }
};

export default navigationPreferenceUtils;
