/**
 * Storage Schema Migrations for StudySync
 * Ensures safe migration for sidebar customization, fixed BDT currency, and routine calendar archival.
 */

const STORAGE_VERSION_KEY = 'studysync_storage_version';
const CURRENT_VERSION = '2.2.0';

const combineDateTime = (date, time) => {
  if (!date || !time) return null;
  const value = `${date}T${time}:00`;
  return Number.isNaN(new Date(value).getTime()) ? null : value;
};

const migrateAssessments = () => {
  const raw = localStorage.getItem('studysync_assessments');
  if (!raw) return;
  const assessments = JSON.parse(raw);
  if (!Array.isArray(assessments)) return;

  const migrated = assessments.map(assessment => {
    const links = Array.isArray(assessment.links) ? assessment.links.map((link, index) => {
      const legacyTimestamp = new Date(0).toISOString();
      return {
        ...link,
        id: link.id || `legacy-link-${assessment.id || 'assessment'}-${index}`,
        label: link.label || link.url || 'Related link',
        type: link.type || 'Other',
        createdAt: link.createdAt || legacyTimestamp,
        updatedAt: link.updatedAt || link.createdAt || legacyTimestamp
      };
    }) : [];

    if (assessment.type === 'assignment') {
      const deadlineDate = assessment.deadlineDate || assessment.dueDate || assessment.date || null;
      const deadlineTime = assessment.deadlineTime || assessment.dueTime || assessment.startTime || null;
      return {
        ...assessment,
        deadlineDate,
        deadlineTime,
        deadlineAt: assessment.deadlineAt || combineDateTime(deadlineDate, deadlineTime),
        links
      };
    }

    if (assessment.type === 'CT' || assessment.type === 'examination') {
      const endTime = assessment.endTime || null;
      return {
        ...assessment,
        endTime,
        startAt: assessment.startAt || combineDateTime(assessment.date, assessment.startTime),
        endAt: assessment.endAt || combineDateTime(assessment.date, endTime),
        links
      };
    }

    return { ...assessment, links };
  });
  localStorage.setItem('studysync_assessments', JSON.stringify(migrated));

  const tasksRaw = localStorage.getItem('studysync_tasks');
  const tasks = tasksRaw ? JSON.parse(tasksRaw) : [];
  if (!Array.isArray(tasks)) return;
  migrated.filter(item => item.type === 'assignment' && item.deadlineAt).forEach(assignment => {
    const taskId = `task-assessment-${assignment.id}`;
    if (!tasks.some(task => task.id === taskId)) {
      tasks.push({
        id: taskId,
        assessmentId: assignment.id,
        generatedBy: 'assessment',
        title: `Submit ${assignment.title || assignment.courseId || 'assignment'}`,
        dueDate: assignment.deadlineDate,
        dueAt: assignment.deadlineAt,
        priority: assignment.priority || 'medium',
        category: 'academic',
        courseId: assignment.courseId,
        completed: false
      });
    }
  });
  localStorage.setItem('studysync_tasks', JSON.stringify(tasks));
};

export const storageMigrations = {
  runMigrations: () => {
    try {
      const currentStoredVersion = localStorage.getItem(STORAGE_VERSION_KEY);

      // 1. Migrate Sidebar Preferences
      const sidebarPrefRaw = localStorage.getItem('studysync_sidebar_preferences');
      if (!sidebarPrefRaw) {
        const defaultPreferences = {
          sectionOrder: [
            'dashboard',
            'routine',
            'attendance',
            'assessments',
            'cgpa',
            'math-tools',
            'tuition',
            'expenses',
            'focus'
          ],
          hiddenSections: []
        };
        localStorage.setItem('studysync_sidebar_preferences', JSON.stringify(defaultPreferences));
      }

      // 2. Normalize User Currency to BDT
      const userRaw = localStorage.getItem('studysync_user');
      if (userRaw) {
        try {
          const user = JSON.parse(userRaw);
          if (user && user.currency !== 'BDT') {
            user.currency = 'BDT';
            localStorage.setItem('studysync_user', JSON.stringify(user));
          }
        } catch (e) {
          // ignore
        }
      }

      // 3. Ensure Archived Routine Events array exists
      if (!localStorage.getItem('studysync_archived_routine_events')) {
        localStorage.setItem('studysync_archived_routine_events', JSON.stringify([]));
      }

      // 4. Normalize assessment scheduling without deleting legacy fields.
      if (currentStoredVersion !== CURRENT_VERSION) {
        migrateAssessments();
      }

      localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
    } catch (err) {
      console.warn('Storage migration failed silently:', err);
    }
  }
};

export default storageMigrations;
