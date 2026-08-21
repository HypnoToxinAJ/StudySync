import {
  initialUserData,
  initialCourses,
  initialRoutines,
  initialAssessments,
  initialSemesters,
  initialTuitionStudents,
  initialExpenses,
  initialShortcuts,
  initialNotes,
  initialMedications,
  initialTasks,
  initialFocusData
} from '../data/mockData';
import { storageMigrations } from '../utils/storageMigrations';

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
  SIDEBAR_PREFERENCES: 'studysync_sidebar_preferences',
  STORAGE_VERSION: 'studysync_storage_v2_1'
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
    if (!localStorage.getItem(KEYS.USER)) {
      storageService.set(KEYS.USER, { ...initialUserData, avatar: 'avatar-scholar' });
    } else {
      const existingUser = storageService.get(KEYS.USER, {});
      if (existingUser && !existingUser.avatar) {
        storageService.set(KEYS.USER, { ...existingUser, avatar: 'avatar-scholar' });
      }
    }
    if (!localStorage.getItem(KEYS.COURSES)) storageService.set(KEYS.COURSES, initialCourses);
    if (!localStorage.getItem(KEYS.ROUTINES)) storageService.set(KEYS.ROUTINES, initialRoutines);
    if (!localStorage.getItem(KEYS.ASSESSMENTS)) storageService.set(KEYS.ASSESSMENTS, initialAssessments);
    if (!localStorage.getItem(KEYS.SEMESTERS)) storageService.set(KEYS.SEMESTERS, initialSemesters);
    if (!localStorage.getItem(KEYS.TUITIONS)) storageService.set(KEYS.TUITIONS, initialTuitionStudents);
    if (!localStorage.getItem(KEYS.EXPENSES)) storageService.set(KEYS.EXPENSES, initialExpenses);
    if (!localStorage.getItem(KEYS.SHORTCUTS)) storageService.set(KEYS.SHORTCUTS, initialShortcuts);
    if (!localStorage.getItem(KEYS.NOTES)) storageService.set(KEYS.NOTES, initialNotes);
    if (!localStorage.getItem(KEYS.MEDICATIONS)) storageService.set(KEYS.MEDICATIONS, initialMedications);
    if (!localStorage.getItem(KEYS.MEDICATION_SCHEDULES)) storageService.set(KEYS.MEDICATION_SCHEDULES, []);
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

    // Run safe data migration for courses & storage schema
    storageService.migrateCourseData();
    storageMigrations.runMigrations();
  },

  // Reset to default mock data
  resetAll: () => {
    localStorage.clear();
    storageService.initialize();
  },

  KEYS
};
