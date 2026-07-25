import { storageService } from './storageService';

export const focusService = {
  getData: () => {
    return storageService.get(storageService.KEYS.FOCUS, {
      totalMinutesThisWeek: 420,
      sessionsCompletedThisWeek: 16,
      currentStreakDays: 5,
      dailyGoalMinutes: 90,
      history: []
    });
  },

  logSession: (minutes, taskName) => {
    const data = focusService.getData();
    data.totalMinutesThisWeek += minutes;
    data.sessionsCompletedThisWeek += 1;
    data.history.unshift({
      date: new Date().toISOString().split('T')[0],
      minutes,
      task: taskName || "Focus Study Session"
    });
    storageService.set(storageService.KEYS.FOCUS, data);
    return data;
  }
};
