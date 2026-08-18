import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Settings,
  Volume2,
  VolumeX,
  Bell,
  CheckCircle2,
  Target,
  Flame
} from 'lucide-react';
import { usePomodoro } from '../hooks/usePomodoro';
import { useData } from '../../../context/DataContext';
import { Modal } from '../../../components/common/Modal';

export const PomodoroCard = () => {
  const { tasks } = useData();
  const {
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
    setSelectedTask,
    setAmbientSound,
    requestNotificationPermission
  } = usePomodoro();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    dailyGoalSessions
  });

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeTotalSeconds = () => {
    if (mode === 'shortBreak') return shortBreakDuration * 60;
    if (mode === 'longBreak') return longBreakDuration * 60;
    return workDuration * 60;
  };

  const totalSecs = getModeTotalSeconds();
  const progressPercentage = totalSecs > 0 ? ((totalSecs - remainingSeconds) / totalSecs) * 100 : 0;

  const handleOpenSettings = () => {
    setSettingsForm({
      workDuration,
      shortBreakDuration,
      longBreakDuration,
      dailyGoalSessions
    });
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    updateSettings({
      workDuration: Number(settingsForm.workDuration || 25),
      shortBreakDuration: Number(settingsForm.shortBreakDuration || 5),
      longBreakDuration: Number(settingsForm.longBreakDuration || 15),
      dailyGoalSessions: Number(settingsForm.dailyGoalSessions || 8)
    });
    setIsSettingsOpen(false);
  };

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl flex flex-col justify-between space-y-5 relative overflow-hidden">
      {/* Top Bar & Settings Trigger */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
            Pomodoro Focus
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => updateSettings({ soundEnabled: !soundEnabled })}
            className={`p-1.5 rounded-lg transition-colors ${
              soundEnabled ? 'text-brand-500 hover:bg-brand-500/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={soundEnabled ? 'Sound Enabled' : 'Sound Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={requestNotificationPermission}
            className={`p-1.5 rounded-lg transition-colors ${
              notificationsEnabled ? 'text-brand-500 hover:bg-brand-500/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={notificationsEnabled ? 'Notifications Enabled' : 'Enable Notifications'}
          >
            <Bell className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenSettings}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Configure Durations"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Switches */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
        <button
          onClick={() => switchMode('work')}
          className={`py-1.5 rounded-xl text-[11px] font-bold transition-all ${
            mode === 'work' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Focus ({workDuration}m)
        </button>
        <button
          onClick={() => switchMode('shortBreak')}
          className={`py-1.5 rounded-xl text-[11px] font-bold transition-all ${
            mode === 'shortBreak' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Short ({shortBreakDuration}m)
        </button>
        <button
          onClick={() => switchMode('longBreak')}
          className={`py-1.5 rounded-xl text-[11px] font-bold transition-all ${
            mode === 'longBreak' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Long ({longBreakDuration}m)
        </button>
      </div>

      {/* CIRCULAR TIMER DISPLAY */}
      <div className="flex flex-col items-center justify-center my-2 space-y-2">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-brand-600 dark:stroke-brand-500 transition-all duration-500"
              strokeWidth="6"
              strokeDasharray={276.46}
              strokeDashoffset={276.46 - (276.46 * progressPercentage) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white font-mono">
              {formatTime(remainingSeconds)}
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-400 mt-1">
              {mode === 'work' ? 'Deep Study' : 'Rest Break'}
            </span>
          </div>
        </div>

        {/* Sessions Goal Counter Pill */}
        <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
          <Target className="w-3.5 h-3.5 text-brand-500" />
          <span className="font-semibold">
            Today: <strong className="text-slate-900 dark:text-white">{sessionsCompletedToday}</strong> / {dailyGoalSessions} Sessions
          </span>
        </div>
      </div>

      {/* Task Selector Dropdown */}
      <div className="space-y-1">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Focus Target Task
        </label>
        <select
          value={selectedTask}
          onChange={(e) => setSelectedTask(e.target.value)}
          className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none truncate"
        >
          <option value="Database Indexing Study">Database Indexing Study</option>
          <option value="Computer Networks Lab">Computer Networks Lab</option>
          <option value="Software Engineering Sprint">Software Engineering Sprint</option>
          <option value="Complex Math Exercises">Complex Math Exercises</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.title}>
              {t.title}
            </option>
          ))}
        </select>
      </div>

      {/* Timer Controls Row */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          onClick={isRunning ? pauseTimer : startTimer}
          className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs text-white shadow-md flex items-center justify-center space-x-1.5 transition-all ${
            isRunning ? 'bg-rose-500 hover:bg-rose-600' : 'bg-brand-600 hover:bg-brand-700'
          }`}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isRunning ? 'Pause' : 'Start Focus'}</span>
        </button>

        <button
          onClick={resetTimer}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
          title="Reset Timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={skipSession}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
          title="Skip Session"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Ambient Sound Selection Pills */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
        <span className="text-slate-400 font-bold">Ambient:</span>
        <div className="flex space-x-1">
          {['none', 'rain', 'cafe', 'forest'].map((snd) => (
            <button
              key={snd}
              onClick={() => setAmbientSound(snd)}
              className={`px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider text-[9px] transition-all ${
                ambientSound === snd
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {snd}
            </button>
          ))}
        </div>
      </div>

      {/* SETTINGS MODAL */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Pomodoro Timer Settings"
      >
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Focus (mins)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={settingsForm.workDuration}
                onChange={(e) => setSettingsForm({ ...settingsForm, workDuration: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Short Break
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settingsForm.shortBreakDuration}
                onChange={(e) => setSettingsForm({ ...settingsForm, shortBreakDuration: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Long Break
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={settingsForm.longBreakDuration}
                onChange={(e) => setSettingsForm({ ...settingsForm, longBreakDuration: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Daily Target Sessions
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={settingsForm.dailyGoalSessions}
              onChange={(e) => setSettingsForm({ ...settingsForm, dailyGoalSessions: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl shadow-md"
            >
              Save Settings
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
