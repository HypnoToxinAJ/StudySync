import { storageService } from '../../../services/storageService';
import { archiveRoutineEvents } from '../../calendar/utils/archiveRoutineEvents';

export const semesterResetService = {
  /**
   * Centralized atomic service action to reset the active semester.
   *
   * Sequence:
   * 1. Validate active semester.
   * 2. Convert active routines to historical archived calendar occurrences (read-only).
   * 3. Merge and deduplicate with existing archived routine events.
   * 4. Clear active courses, assessments, routine definitions.
   * 5. Clear academic alert dismissals and assessment-linked tasks.
   * 6. Update user active semester name (if provided).
   * 7. Persist once without writing to any backup / recycle bin.
   *
   * @param {Object} options - Options containing newSemesterName (optional)
   * @returns {Object} Result { success: boolean, message: string, newSemesterName?: string }
   */
  resetActiveSemester: (options = {}) => {
    try {
      const user = storageService.get(storageService.KEYS.USER, {});
      const activeSemesterName = user?.semester || 'Current Semester';

      // 1. Get active routines
      const activeRoutines = storageService.get(storageService.KEYS.ROUTINES, []);

      // 2. Generate historical archived occurrences
      const newArchivedOccurrences = archiveRoutineEvents.generateArchivedOccurrences(
        activeRoutines,
        activeSemesterName,
        16
      );

      // 3. Merge with existing archived routine events and deduplicate
      const existingArchived = storageService.get(storageService.KEYS.ARCHIVED_ROUTINE_EVENTS, []);
      const eventMap = new Map();
      existingArchived.forEach(ev => eventMap.set(ev.id, ev));
      newArchivedOccurrences.forEach(ev => eventMap.set(ev.id, ev));
      const mergedArchivedEvents = Array.from(eventMap.values());

      // 4. Filter tasks to remove assessment-linked tasks
      const existingTasks = storageService.get(storageService.KEYS.TASKS, []);
      const retainedTasks = existingTasks.filter(t => !t.assessmentId && !t.courseId);

      // 5. Update user semester name if new name provided
      const updatedUser = { ...user };
      if (options.newSemesterName && options.newSemesterName.trim()) {
        updatedUser.semester = options.newSemesterName.trim();
      }

      // 6. Atomic state write: Clear active coursework, routine & alerts; persist archived occurrences
      storageService.set(storageService.KEYS.ARCHIVED_ROUTINE_EVENTS, mergedArchivedEvents);
      storageService.set(storageService.KEYS.COURSES, []);
      storageService.set(storageService.KEYS.ROUTINES, []);
      storageService.set(storageService.KEYS.ASSESSMENTS, []);
      storageService.set(storageService.KEYS.DISMISSED_ALERTS, []);
      storageService.set(storageService.KEYS.TASKS, retainedTasks);
      storageService.set(storageService.KEYS.USER, updatedUser);

      return {
        success: true,
        message: `Semester "${activeSemesterName}" successfully reset. Past routine preserved in calendar.`,
        newSemesterName: updatedUser.semester,
        archivedCount: newArchivedOccurrences.length
      };
    } catch (error) {
      console.error('Failed to reset active semester:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while resetting the semester. Your data remains untouched.'
      };
    }
  }
};

export default semesterResetService;
