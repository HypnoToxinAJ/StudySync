/**
 * Utility for preserving active weekly recurring routines into historical calendar occurrences
 * when resetting an academic semester.
 */

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const archiveRoutineEvents = {
  /**
   * Generates dated, read-only calendar occurrences from recurring routines
   * up to the current reset timestamp.
   *
   * @param {Array} routines - Array of active routine definitions
   * @param {string} semesterId - Identifier or name of the semester being archived
   * @param {number} weeksBack - How many weeks of history to generate (defaults to 16 weeks)
   * @returns {Array} List of archived calendar events
   */
  generateArchivedOccurrences: (routines = [], semesterId = 'Previous Semester', weeksBack = 16) => {
    if (!Array.isArray(routines) || routines.length === 0) {
      return [];
    }

    const now = new Date();
    const archivedEvents = [];
    const timestamp = now.toISOString();

    // Iterate over the past `weeksBack` weeks
    for (let w = 0; w < weeksBack; w++) {
      routines.forEach((rt) => {
        const targetDayIndex = DAYS_OF_WEEK.indexOf(rt.dayOfWeek);
        if (targetDayIndex === -1) return;

        const currentDayIndex = now.getDay();
        let daysAgo = (currentDayIndex - targetDayIndex) + (w * 7);
        if (daysAgo < 0) {
          daysAgo += 7;
        }

        const occurrenceDate = new Date(now);
        occurrenceDate.setDate(now.getDate() - daysAgo);

        // Only archive dates that are today or in the past
        if (occurrenceDate <= now) {
          const dateStr = occurrenceDate.toISOString().split('T')[0];
          const eventId = `archived-routine-${rt.id || rt.courseId}-${dateStr}`;

          archivedEvents.push({
            id: eventId,
            source: 'archived-routine',
            readOnly: true,
            semesterId: semesterId || 'Previous Semester',
            archivedAt: timestamp,
            courseId: rt.courseId,
            courseTitle: rt.courseTitle || rt.courseId,
            classType: rt.classType || 'lecture',
            date: dateStr,
            dayOfWeek: rt.dayOfWeek,
            startTime: rt.startTime,
            endTime: rt.endTime,
            room: rt.room || '',
            building: rt.building || '',
            faculty: rt.faculty || '',
            color: '#64748B' // Slate grey for historical archived view
          });
        }
      });
    }

    // Deduplicate by ID
    const uniqueMap = new Map();
    archivedEvents.forEach(item => {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });

    return Array.from(uniqueMap.values());
  }
};

export default archiveRoutineEvents;
