import { storageService } from './storageService';

export const routineService = {
  getAll: () => {
    return storageService.get(storageService.KEYS.ROUTINES, []);
  },

  saveAll: (routines) => {
    storageService.set(storageService.KEYS.ROUTINES, routines);
  },

  add: (routineData) => {
    const routines = routineService.getAll();
    const newRoutine = {
      id: `rt-${Date.now()}`,
      ...routineData
    };
    routines.push(newRoutine);
    routineService.saveAll(routines);
    return newRoutine;
  },

  update: (id, updatedData) => {
    const routines = routineService.getAll();
    const index = routines.findIndex(r => r.id === id);
    if (index !== -1) {
      routines[index] = { ...routines[index], ...updatedData };
      routineService.saveAll(routines);
      return routines[index];
    }
    return null;
  },

  delete: (id) => {
    const routines = routineService.getAll();
    const filtered = routines.filter(r => r.id !== id);
    routineService.saveAll(filtered);
    return filtered;
  },

  // Conflict detector algorithm: checks if a proposed routine overlaps with existing routines on the same day
  detectConflicts: (routineToTest, excludeId = null) => {
    const routines = routineService.getAll();
    const conflicts = [];

    const toMinutes = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const startMinutes = toMinutes(routineToTest.startTime);
    const endMinutes = toMinutes(routineToTest.endTime);

    routines.forEach(existing => {
      if (excludeId && existing.id === excludeId) return;
      if (existing.dayOfWeek === routineToTest.dayOfWeek) {
        const exStart = toMinutes(existing.startTime);
        const exEnd = toMinutes(existing.endTime);

        // Check time overlap condition
        if ((startMinutes < exEnd) && (endMinutes > exStart)) {
          conflicts.push(existing);
        }
      }
    });

    return conflicts;
  },

  // Get today's classes sorted chronologically
  getTodayClasses: (dayName) => {
    const routines = routineService.getAll();
    return routines
      .filter(r => r.dayOfWeek.toLowerCase() === dayName.toLowerCase())
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
};
