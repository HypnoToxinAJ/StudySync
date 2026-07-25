import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Zap,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Flame,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Badge } from '../components/common/Badge';

export const FocusPage = () => {
  const { focusData, logFocusSession, tasks } = useData();

  const [mode, setMode] = useState('work'); // 'work' (25m), 'shortBreak' (5m), 'longBreak' (15m)
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTask, setSelectedTask] = useState('Database Indexing Study');
  const [ambientSound, setAmbientSound] = useState('none'); // 'none', 'rain', 'cafe', 'forest'

  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      // Trigger confetti celebration
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      if (mode === 'work') {
        logFocusSession(25, selectedTask);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, selectedTask, logFocusSession]);

  const switchMode = (newMode, minutes) => {
    setMode(newMode);
    setTimeLeft(minutes * 60);
    setIsRunning(false);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? 25 * 60 : mode === 'shortBreak' ? 5 * 60 : 15 * 60);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = mode === 'work'
    ? ((25 * 60 - timeLeft) / (25 * 60)) * 100
    : mode === 'shortBreak'
    ? ((5 * 60 - timeLeft) / (5 * 60)) * 100
    : ((15 * 60 - timeLeft) / (15 * 60)) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold border border-amber-500/20">
          <Flame className="w-4 h-4 fill-current text-amber-500" />
          <span>{focusData.currentStreakDays} Day Focus Streak</span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Distraction-Free Learning Station
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Pomodoro intervals, ambient white noise, and focused study minutes tracking
        </p>
      </div>

      {/* TIMER CARD CONTAINER */}
      <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center space-y-8 text-center relative overflow-hidden">
        {/* Interval Mode Switches */}
        <div className="flex space-x-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => switchMode('work', 25)}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'work' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            25m Focus Session
          </button>
          <button
            onClick={() => switchMode('shortBreak', 5)}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'shortBreak' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            5m Short Break
          </button>
          <button
            onClick={() => switchMode('longBreak', 15)}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'longBreak' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            15m Long Break
          </button>
        </div>

        {/* Big Digital Timer Display */}
        <div className="relative">
          <h1 className="text-7xl sm:text-8xl font-black text-slate-900 dark:text-white tracking-tighter font-mono">
            {formatTime(timeLeft)}
          </h1>
          <p className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest mt-2">
            {mode === 'work' ? 'Deep Study Session' : 'Rest & Recharge'}
          </p>
        </div>

        {/* Task Selection Dropdown */}
        <div className="w-full max-w-md">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 text-left">
            Select Target Study Task
          </label>
          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            className="w-full px-4 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
          >
            <option value="Database Indexing & Normalization">Database Indexing & Normalization</option>
            <option value="Computer Networks Packet Tracer Lab">Computer Networks Packet Tracer Lab</option>
            <option value="Software Engineering Agile Sprint">Software Engineering Agile Sprint</option>
            <option value="Complex Integration Math Exercises">Complex Integration Math Exercises</option>
            {tasks.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
          </select>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTimer}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all ${
              isRunning ? 'bg-rose-500 hover:bg-rose-600' : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {isRunning ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
          </button>
          <button
            onClick={resetTimer}
            className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
            title="Reset Timer"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
        </div>

        {/* AMBIENT WHITE NOISE SIMULATION */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 w-full max-w-md flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
            <Volume2 className="w-4 h-4 text-brand-500" />
            <span>Ambient Sound Simulation:</span>
          </span>
          <div className="flex space-x-2">
            {['none', 'rain', 'cafe', 'forest'].map(sound => (
              <button
                key={sound}
                onClick={() => setAmbientSound(sound)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg uppercase tracking-wider transition-all ${
                  ambientSound === sound
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {sound}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
