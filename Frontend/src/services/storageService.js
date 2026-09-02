import {
  initialExpenses,
  initialShortcuts,
} from '../data/mockData.js';
import { storageMigrations } from '../utils/storageMigrations.js';
import { apiClient } from './apiClient.js';

const KEYS = {
  USER: 'studysync_user',
  COURSES: 'studysync_courses',
  ROUTINES: 'studysync_routines',
  ASSESSMENTS: 'studysync_assessments',
  SEMESTERS: 'studysync_semesters',
  TUITIONS: 'studysync_tuitions',
  EXPENSES: 'studysync_expenses',
  SHORTCUTS: 'studysync_shortcuts',
  NOTES: 'studysync_notes',
  MEDICATIONS: 'studysync_medications',
  MEDICATION_SCHEDULES: 'studysync_medication_schedules',
  TASKS: 'studysync_tasks',
  FOCUS: 'studysync_focus',
  DISMISSED_ALERTS: 'studysync_dismissed_alerts',
  SETTINGS: 'studysync_settings',
  CUET_RESULTS: 'studysync_cuet_results',
  REMEMBERED_STUDENT_ID: 'studysync_remembered_student_id',
  MANUAL_SEMESTERS_ARCHIVE: 'studysync_manual_semesters_archive',
  ARCHIVED_ROUTINE_EVENTS: 'studysync_archived_routine_events',
  ROUTINE_IMPORTS: 'studysync_routine_imports',
  SIDEBAR_PREFERENCES: 'studysync_sidebar_preferences',
  STORAGE_VERSION: 'studysync_storage_v2_3'
};

const ACTIVE_USER_KEY = 'studysync_active_user_id';
const PENDING_SYNC_KEYS_KEY = 'studysync_pending_sync_keys';
const EXTRA_SYNC_KEYS = [
  'studysync_course_colors',
  'studysync_youtube_wishlist',
  'studysync_recent_youtube_resources',
  'studysync_pomodoro_state',
  'studysync_focus_preferences'
];
const NON_SYNC_KEYS = new Set([KEYS.USER, KEYS.REMEMBERED_STUDENT_ID, KEYS.STORAGE_VERSION]);
const SYNC_KEYS = new Set([...Object.values(KEYS), ...EXTRA_SYNC_KEYS].filter(key => !NON_SYNC_KEYS.has(key)));
const revisions = new Map();
const pendingTimers = new Map();
let hydrating = false;

const DEFAULT_SETTINGS = {
  attendanceRules: { defaultAllowedRatio: 1.0 },
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
};

const WORKSPACE_DEFAULTS = {
  [KEYS.COURSES]: [],
  [KEYS.ROUTINES]: [],
  [KEYS.ASSESSMENTS]: [],
  [KEYS.SEMESTERS]: [],
  [KEYS.TUITIONS]: [],
  [KEYS.EXPENSES]: {
    budgetLimit: 12000,
    accounts: initialExpenses.accounts.map(account => ({ ...account, balance: 0, openingBalance: 0 })),
    transactions: [],
    dueBorrowRecords: []
  },
  [KEYS.SHORTCUTS]: initialShortcuts,
  [KEYS.NOTES]: [],
  [KEYS.MEDICATIONS]: [],
  [KEYS.MEDICATION_SCHEDULES]: [],
  [KEYS.TASKS]: [],
  [KEYS.FOCUS]: { totalMinutesThisWeek: 0, sessionsCompletedThisWeek: 0, currentStreakDays: 0, dailyGoalMinutes: 90, history: [] },
  [KEYS.DISMISSED_ALERTS]: [],
  [KEYS.ROUTINE_IMPORTS]: [],
  [KEYS.ARCHIVED_ROUTINE_EVENTS]: [],
  [KEYS.SETTINGS]: DEFAULT_SETTINGS
};

const writeLocal = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const pendingSyncKeys = () => {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_SYNC_KEYS_KEY) || '[]');
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
};
const markPending = key => localStorage.setItem(PENDING_SYNC_KEYS_KEY, JSON.stringify([...pendingSyncKeys(), key]));
const clearPending = key => {
  const keys = pendingSyncKeys();
  keys.delete(key);
  localStorage.setItem(PENDING_SYNC_KEYS_KEY, JSON.stringify([...keys]));
};

const profilePayload = user => ({
  name: user.name,
  university: user.university,
  department: user.department,
  semester: user.semester,
  studentId: user.studentId,
  currency: user.currency,
  themePreference: user.themePreference,
  weeklyClassDays: user.weeklyClassDays,
  academicGoals: user.academicGoals,
  avatar: user.avatar,
  customAvatarImage: user.customAvatarImage
});

const dispatchSyncEvent = (name, detail = {}) => {
  globalThis.dispatchEvent?.(new CustomEvent(name, { detail }));
};

const persistProfile = user => {
  clearTimeout(pendingTimers.get(KEYS.USER));
  pendingTimers.set(KEYS.USER, setTimeout(async () => {
    try {
      const updated = await apiClient.patch('/auth/me/', profilePayload(user));
      hydrating = true;
      writeLocal(KEYS.USER, updated);
      hydrating = false;
      dispatchSyncEvent('studysync:profile-synced', { user: updated });
    } catch (error) {
      dispatchSyncEvent('studysync:sync-error', { key: KEYS.USER, error });
    }
  }, 350));
};

const persistDocument = key => {
  const batchKey = '__workspace_sync_batch__';
  clearTimeout(pendingTimers.get(batchKey));
  pendingTimers.set(batchKey, setTimeout(async () => {
    try {
      await storageService.syncFromServer();
    } catch (error) {
      dispatchSyncEvent('studysync:sync-error', { key, error });
    }
  }, 350));
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
      writeLocal(key, value);
      if (!hydrating && apiClient.hasSession()) {
        if (key === KEYS.USER) persistProfile(value);
        else if (SYNC_KEYS.has(key)) {
          markPending(key);
          persistDocument(key, value);
        }
      }
    } catch (e) {
      console.error(`Error writing ${key} to localStorage:`, e);
    }
  },

  // Migration helper to normalize courses for missed-class tracking & course types
  migrateCourseData: () => {
    const existingCourses = storageService.get(KEYS.COURSES, null);
    if (!existingCourses || !Array.isArray(existingCourses)) return;

    let hasChanges = false;
    const updatedCourses = existingCourses.map(course => {
      let modified = false;
      const titleLower = String(course.courseTitle || '').toLowerCase();
      const codeLower = String(course.courseId || '').toLowerCase();
      const credit = Number(course.credit || 3.0);

      // Infer courseType if missing
      let courseType = course.courseType;
      if (!courseType) {
        modified = true;
        if (titleLower.includes('lab') || codeLower.includes('lab')) {
          courseType = 'lab';
        } else if (titleLower.includes('sessional') || codeLower.includes('sessional')) {
          courseType = 'sessional';
        } else if (credit === 1.5 || credit === 0.75) {
          courseType = 'lab';
        } else if (credit === 3.0 || credit === 2.0) {
          courseType = 'theory';
        } else {
          courseType = 'theory';
          course.requiresReview = true;
        }
      }

      const isTheory = courseType === 'theory';
      const assessmentApplicable = isTheory;
      const bestAssessmentCount = isTheory ? (credit === 2.0 ? 2 : 3) : 0;

      if (course.courseType !== courseType) {
        course.courseType = courseType;
        modified = true;
      }
      if (course.assessmentApplicable !== assessmentApplicable) {
        course.assessmentApplicable = assessmentApplicable;
        modified = true;
      }
      if (course.bestAssessmentCount !== bestAssessmentCount) {
        course.bestAssessmentCount = bestAssessmentCount;
        modified = true;
      }
      if (course.missedClasses === undefined) {
        course.missedClasses = Number(course.missedClasses || 0);
        modified = true;
      }
      if (!course.history) {
        course.history = [];
        modified = true;
      }

      if (modified) hasChanges = true;
      return course;
    });

    if (hasChanges) {
      storageService.set(KEYS.COURSES, updatedCourses);
    }
  },

  // Initialize all storage keys with mock data if not present
  initialize: () => {
    hydrating = true;
    if (localStorage.getItem(KEYS.USER)) {
      const existingUser = storageService.get(KEYS.USER, {});
      if (existingUser && !existingUser.avatar) {
        storageService.set(KEYS.USER, { ...existingUser, avatar: 'avatar-scholar' });
      }
    }
    Object.entries(WORKSPACE_DEFAULTS).forEach(([key, value]) => {
      if (!localStorage.getItem(key)) storageService.set(key, value);
    });

    // Run safe data migration for courses & storage schema
    storageService.migrateCourseData();
    storageMigrations.runMigrations();
    hydrating = false;
  },

  syncFromServer: async () => {
    if (!apiClient.hasSession()) return { documents: {} };
    const response = await apiClient.get('/sync/');
    const remoteDocuments = response?.documents || {};
    const dirtyKeys = pendingSyncKeys();
    hydrating = true;
    Object.entries(remoteDocuments).forEach(([key, document]) => {
      if (!SYNC_KEYS.has(key)) return;
      revisions.set(key, document.revision);
      if (!dirtyKeys.has(key)) writeLocal(key, document.data);
    });
    hydrating = false;

    if (Object.keys(remoteDocuments).length === 0) {
      const documents = {};
      SYNC_KEYS.forEach(key => {
        const value = storageService.get(key, undefined);
        if (value !== undefined) documents[key] = { data: value, baseRevision: 0 };
      });
      if (Object.keys(documents).length) {
        const uploaded = await apiClient.put('/sync/', { documents });
        Object.entries(uploaded.documents || {}).forEach(([key, document]) => {
          revisions.set(key, document.revision);
          clearPending(key);
        });
      }
    } else if (dirtyKeys.size) {
      const documents = {};
      dirtyKeys.forEach(key => {
        if (!SYNC_KEYS.has(key)) return;
        const value = storageService.get(key, undefined);
        if (value !== undefined) {
          documents[key] = { data: value, baseRevision: remoteDocuments[key]?.revision || 0 };
        }
      });
      if (Object.keys(documents).length) {
        const uploaded = await apiClient.put('/sync/', { documents });
        Object.entries(uploaded.documents || {}).forEach(([key, document]) => {
          revisions.set(key, document.revision);
          clearPending(key);
        });
      }
    }
    dispatchSyncEvent('studysync:synced', { documents: remoteDocuments });
    return response;
  },

  prepareForUser: async userId => {
    const activeUserId = localStorage.getItem(ACTIVE_USER_KEY);
    if (activeUserId !== String(userId)) {
      pendingTimers.forEach(timer => clearTimeout(timer));
      pendingTimers.clear();
      SYNC_KEYS.forEach(key => localStorage.removeItem(key));
      revisions.clear();
      localStorage.removeItem(PENDING_SYNC_KEYS_KEY);
      localStorage.setItem(ACTIVE_USER_KEY, String(userId));
      storageService.initialize();
    }
    return storageService.syncFromServer();
  },

  clearWorkspaceCache: () => {
    pendingTimers.forEach(timer => clearTimeout(timer));
    pendingTimers.clear();
    SYNC_KEYS.forEach(key => localStorage.removeItem(key));
    revisions.clear();
    localStorage.removeItem(ACTIVE_USER_KEY);
    localStorage.removeItem(PENDING_SYNC_KEYS_KEY);
  },

  hydrateUser: user => {
    hydrating = true;
    writeLocal(KEYS.USER, user);
    hydrating = false;
    dispatchSyncEvent('studysync:profile-hydrated', { user });
  },

  flushPending: () => storageService.syncFromServer(),

  // Reset workspace data without destroying the authenticated session.
  resetAll: async () => {
    pendingTimers.forEach(timer => clearTimeout(timer));
    pendingTimers.clear();
    if (apiClient.hasSession()) await apiClient.delete('/sync/');
    SYNC_KEYS.forEach(key => localStorage.removeItem(key));
    revisions.clear();
    localStorage.removeItem(PENDING_SYNC_KEYS_KEY);
    storageService.initialize();
    if (apiClient.hasSession()) await storageService.syncFromServer();
  },

  KEYS,
  SYNC_KEYS
};
