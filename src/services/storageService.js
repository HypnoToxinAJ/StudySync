import {
  initialUserData,
  initialCourses,
  initialRoutines,
  initialAssessments,
  initialSemesters,
  initialTuitionStudents,
  initialExpenses,
  initialShortcuts,
  initialTasks,
  initialFocusData
} from '../data/mockData';

const KEYS = {
  USER: 'studysync_user',
  COURSES: 'studysync_courses',
  ROUTINES: 'studysync_routines',
  ASSESSMENTS: 'studysync_assessments',
  SEMESTERS: 'studysync_semesters',
  TUITIONS: 'studysync_tuitions',
  EXPENSES: 'studysync_expenses',
  SHORTCUTS: 'studysync_shortcuts',
  TASKS: 'studysync_tasks',
  FOCUS: 'studysync_focus',
  DISMISSED_ALERTS: 'studysync_dismissed_alerts',
  SETTINGS: 'studysync_settings'
};

export const storageService = {
  // Read key from localStorage or initialize with default
  get: (key, defaultValue) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e);
      return defaultValue;
    }
  },

  // Save key to localStorage
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing ${key} to localStorage:`, e);
    }
  },

  // Initialize all storage keys with mock data if not present
  initialize: () => {
    if (!localStorage.getItem(KEYS.USER)) storageService.set(KEYS.USER, initialUserData);
    if (!localStorage.getItem(KEYS.COURSES)) storageService.set(KEYS.COURSES, initialCourses);
    if (!localStorage.getItem(KEYS.ROUTINES)) storageService.set(KEYS.ROUTINES, initialRoutines);
    if (!localStorage.getItem(KEYS.ASSESSMENTS)) storageService.set(KEYS.ASSESSMENTS, initialAssessments);
    if (!localStorage.getItem(KEYS.SEMESTERS)) storageService.set(KEYS.SEMESTERS, initialSemesters);
    if (!localStorage.getItem(KEYS.TUITIONS)) storageService.set(KEYS.TUITIONS, initialTuitionStudents);
    if (!localStorage.getItem(KEYS.EXPENSES)) storageService.set(KEYS.EXPENSES, initialExpenses);
    if (!localStorage.getItem(KEYS.SHORTCUTS)) storageService.set(KEYS.SHORTCUTS, initialShortcuts);
    if (!localStorage.getItem(KEYS.TASKS)) storageService.set(KEYS.TASKS, initialTasks);
    if (!localStorage.getItem(KEYS.FOCUS)) storageService.set(KEYS.FOCUS, initialFocusData);
    if (!localStorage.getItem(KEYS.DISMISSED_ALERTS)) storageService.set(KEYS.DISMISSED_ALERTS, []);
    if (!localStorage.getItem(KEYS.SETTINGS)) storageService.set(KEYS.SETTINGS, {
      attendanceRules: { defaultAllowedRatio: 1.0 }, // 1 miss per credit
      gradingScale: [
        { grade: 'A+', point: 4.00, minMark: 80 },
        { grade: 'A', point: 3.75, minMark: 75 },
        { grade: 'A-', point: 3.50, minMark: 70 },
        { grade: 'B+', point: 3.25, minMark: 65 },
        { grade: 'B', point: 3.00, minMark: 60 },
        { grade: 'B-', point: 2.75, minMark: 55 },
        { grade: 'C+', point: 2.50, minMark: 50 },
        { grade: 'C', point: 2.25, minMark: 45 },
        { grade: 'D', point: 2.00, minMark: 40 },
        { grade: 'F', point: 0.00, minMark: 0 }
      ]
    });
  },

  // Reset to default mock data
  resetAll: () => {
    localStorage.clear();
    storageService.initialize();
  },

  KEYS
};
