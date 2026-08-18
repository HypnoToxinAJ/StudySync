import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { useData } from '../../../context/DataContext';
import { focusStorageService } from '../services/focusStorageService';

export const usePomodoro = () => {
  const { logFocusSession } = useData();

  const [timerState, setTimerState] = useState(focusStorageService.getPomodoroState);
  const {
    mode,
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    remainingSeconds,
    targetEndTime,
    isRunning,
    selectedTask,
    sessionsCompletedToday,
    dailyGoalSessions,
    soundEnabled,
    notificationsEnabled,
    ambientSound
  } = timerState;

  const intervalRef = useRef(null);

  // Helper to persist timerState to localStorage
  const updateTimerState = useCallback((updater) => {
    setTimerState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      focusStorageService.savePomodoroState(next);
      return next;
    });
  }, []);

  // Calculate duration in seconds for current mode
  const getModeDurationSeconds = useCallback((modeName = mode) => {
    if (modeName === 'shortBreak') return shortBreakDuration * 60;
    if (modeName === 'longBreak') return longBreakDuration * 60;
    return workDuration * 60;
  }, [mode, workDuration, shortBreakDuration, longBreakDuration]);

  // Audio Chime notification
  const playCompletionChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn('Audio chime playback warning:', e);
    }
  }, [soundEnabled]);

  // Browser Notification
  const sendBrowserNotification = useCallback((title, body) => {
    if (!notificationsEnabled) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch (e) {
        console.warn('Notification error:', e);
      }
    }
  }, [notificationsEnabled]);

  // Handle completion of a timer interval
  const handleSessionCompletion = useCallback(() => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    playCompletionChime();

    if (mode === 'work') {
      logFocusSession(workDuration, selectedTask);
      sendBrowserNotification('Focus Session Completed!', `Great job completing ${workDuration}m on "${selectedTask}". Time for a break!`);

      updateTimerState((prev) => ({
        mode: 'shortBreak',
        remainingSeconds: prev.shortBreakDuration * 60,
        isRunning: false,
        targetEndTime: null,
        sessionsCompletedToday: prev.sessionsCompletedToday + 1
      }));
    } else {
      sendBrowserNotification('Break Ended', 'Ready to dive back into deep study? Start your next focus session!');
      updateTimerState((prev) => ({
        mode: 'work',
        remainingSeconds: prev.workDuration * 60,
        isRunning: false,
        targetEndTime: null
      }));
    }
  }, [mode, workDuration, selectedTask, logFocusSession, playCompletionChime, sendBrowserNotification, updateTimerState]);

  // Reliable timestamp-based timer tick effect
  useEffect(() => {
    if (isRunning) {
      // Ensure targetEndTime is set
      if (!targetEndTime) {
        const newEndTime = Date.now() + remainingSeconds * 1000;
        updateTimerState({ targetEndTime: newEndTime });
      }

      intervalRef.current = setInterval(() => {
        setTimerState((prev) => {
          if (!prev.isRunning || !prev.targetEndTime) return prev;

          const secondsLeft = Math.max(0, Math.ceil((prev.targetEndTime - Date.now()) / 1000));

          if (secondsLeft <= 0) {
            clearInterval(intervalRef.current);
            setTimeout(() => handleSessionCompletion(), 50);
            return {
              ...prev,
              remainingSeconds: 0,
              isRunning: false,
              targetEndTime: null
            };
          }

          return { ...prev, remainingSeconds: secondsLeft };
        });
      }, 500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, targetEndTime, remainingSeconds, handleSessionCompletion, updateTimerState]);

  // Controls
  const startTimer = () => {
    const newEndTime = Date.now() + remainingSeconds * 1000;
    updateTimerState({
      isRunning: true,
      targetEndTime: newEndTime
    });
  };

  const pauseTimer = () => {
    updateTimerState({
      isRunning: false,
      targetEndTime: null
    });
  };

  const resetTimer = () => {
    const defaultSecs = getModeDurationSeconds(mode);
    updateTimerState({
      isRunning: false,
      remainingSeconds: defaultSecs,
      targetEndTime: null
    });
  };

  const skipSession = () => {
    const nextMode = mode === 'work' ? 'shortBreak' : 'work';
    const nextSecs = getModeDurationSeconds(nextMode);
    updateTimerState({
      mode: nextMode,
      remainingSeconds: nextSecs,
      isRunning: false,
      targetEndTime: null
    });
  };

  const switchMode = (newMode) => {
    const nextSecs = getModeDurationSeconds(newMode);
    updateTimerState({
      mode: newMode,
      remainingSeconds: nextSecs,
      isRunning: false,
      targetEndTime: null
    });
  };

  const updateSettings = (newSettings) => {
    updateTimerState((prev) => {
      const updated = { ...prev, ...newSettings };
      let newRemaining = updated.remainingSeconds;

      if (!updated.isRunning) {
        if (updated.mode === 'work') newRemaining = updated.workDuration * 60;
        else if (updated.mode === 'shortBreak') newRemaining = updated.shortBreakDuration * 60;
        else if (updated.mode === 'longBreak') newRemaining = updated.longBreakDuration * 60;
      }

      return {
        ...updated,
        remainingSeconds: newRemaining
      };
    });
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Browser notifications are not supported by your browser.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      updateTimerState({ notificationsEnabled: true });
    } else {
      updateTimerState({ notificationsEnabled: false });
    }
  };

  return {
    mode,
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    remainingSeconds,
    isRunning,
    selectedTask,
    sessionsCompletedToday,
    dailyGoalSessions,
    soundEnabled,
    notificationsEnabled,
    ambientSound,
    startTimer,
    pauseTimer,
    resetTimer,
    skipSession,
    switchMode,
    updateSettings,
    setSelectedTask: (task) => updateTimerState({ selectedTask: task }),
    setAmbientSound: (sound) => updateTimerState({ ambientSound: sound }),
    requestNotificationPermission
  };
};
