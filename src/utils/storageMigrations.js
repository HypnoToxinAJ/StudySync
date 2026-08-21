/**
 * Storage Schema Migrations for StudySync
 * Ensures safe migration for sidebar customization, fixed BDT currency, and routine calendar archival.
 */

const STORAGE_VERSION_KEY = 'studysync_storage_version';
const CURRENT_VERSION = '2.1.0';

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

      localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
    } catch (err) {
      console.warn('Storage migration failed silently:', err);
    }
  }
};

export default storageMigrations;
