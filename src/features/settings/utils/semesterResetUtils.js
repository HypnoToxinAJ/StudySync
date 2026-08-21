import { storageService } from '../../../services/storageService';
import { archiveRoutineEvents } from '../../calendar/utils/archiveRoutineEvents';

export const semesterResetUtils = {
  /**
   * Inspects current state and calculates counts of records that will be
   * removed vs preserved when resetting the active semester.
   */
  getActiveSemesterSummary: () => {
    const user = storageService.get(storageService.KEYS.USER, {});
    const courses = storageService.get(storageService.KEYS.COURSES, []);
    const routines = storageService.get(storageService.KEYS.ROUTINES, []);
    const assessments = storageService.get(storageService.KEYS.ASSESSMENTS, []);
    const archivedRoutineEventsList = storageService.get(storageService.KEYS.ARCHIVED_ROUTINE_EVENTS, []);

    const semesterName = user?.semester || 'Current Active Semester';
    const semesterId = user?.semester || 'active_semester';

    // Count missed classes across active courses
    let totalMissedClasses = 0;
    courses.forEach(c => {
      if (Array.isArray(c.missedDates)) {
        totalMissedClasses += c.missedDates.length;
      } else if (typeof c.missedClasses === 'number') {
        totalMissedClasses += c.missedClasses;
      }
    });

    // Preview preserved routine calendar events
    const generatedArchived = archiveRoutineEvents.generateArchivedOccurrences(
      routines,
      semesterName,
      16
    );

    return {
      semesterName,
      semesterId,
      department: user?.department || 'Engineering',
      coursesCount: courses.length,
      assessmentsCount: assessments.length,
      routinesCount: routines.length,
      missedClassesCount: totalMissedClasses,
      preservedRoutineEventsCount: generatedArchived.length,
      existingArchivedEventsCount: archivedRoutineEventsList.length
    };
  }
};

export default semesterResetUtils;
