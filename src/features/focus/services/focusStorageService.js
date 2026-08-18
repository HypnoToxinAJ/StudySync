import { storageService } from '../../../services/storageService';

const POMODORO_STATE_KEY = 'studysync_pomodoro_state';

export const focusStorageService = {
  getPomodoroState: () => {
    return storageService.get(POMODORO_STATE_KEY, {
      mode: 'work', // 'work' | 'shortBreak' | 'longBreak'
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      remainingSeconds: 25 * 60,
      targetEndTime: null,
      isRunning: false,
      selectedTask: 'Database Indexing Study',
      sessionsCompletedToday: 0,
      dailyGoalSessions: 8,
      soundEnabled: true,
      notificationsEnabled: false,
      ambientSound: 'none' // 'none' | 'rain' | 'cafe' | 'forest'
    });
  },

  savePomodoroState: (state) => {
    storageService.set(POMODORO_STATE_KEY, state);
  }
};
