import React, { useState } from 'react';
import { Calendar, CheckCircle2, Loader2, RefreshCw, Download } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { routineApi } from '../../../services/routineApi';

// Helper to generate and download an .ics iCalendar file for Google Calendar / Apple Calendar
const exportIcsCalendar = (routines = []) => {
  if (!routines || routines.length === 0) return;

  const DAY_TO_BYDAY = {
    Sunday: 'SU',
    Monday: 'MO',
    Tuesday: 'TU',
    Wednesday: 'WE',
    Thursday: 'TH',
    Friday: 'FR',
    Saturday: 'SA'
  };

  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const nowIso = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StudySync//Class Routine//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:StudySync Class Routine'
  ];

  routines.forEach((r, idx) => {
    const byDay = DAY_TO_BYDAY[r.dayOfWeek] || 'MO';
    const sTime = (r.startTime || '08:00').replace(':', '') + '00';
    const eTime = (r.endTime || '09:00').replace(':', '') + '00';

    // Find next date matching dayOfWeek
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = dayNames.indexOf(r.dayOfWeek);
    const dayDiff = targetDayIndex >= 0 ? (targetDayIndex - now.getDay() + 7) % 7 : 0;
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + (dayDiff === 0 ? 7 : dayDiff));
    const dtDateStr = `${targetDate.getFullYear()}${pad(targetDate.getMonth() + 1)}${pad(targetDate.getDate())}`;

    icsContent.push(
      'BEGIN:VEVENT',
      `UID:studysync-${r.id || idx}-${dtDateStr}@studysync.local`,
      `DTSTAMP:${nowIso}`,
      `DTSTART:${dtDateStr}T${sTime}`,
      `DTEND:${dtDateStr}T${eTime}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`,
      `SUMMARY:${r.courseId || r.course_code}: ${r.courseTitle || r.course_title}`,
      `DESCRIPTION:Class Type: ${r.classType || 'Theory'}\\nRoom: ${r.room || 'TBA'}\\nFaculty: ${r.teacherName || r.faculty || 'TBA'}`,
      `LOCATION:${r.room || ''}${r.building ? ` • ${r.building}` : ''}`.trim(),
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'studysync_class_routine.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const GoogleCalendarSyncWidget = ({ routines = [] }) => {
  const { user, session, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const [syncState, setSyncState] = useState('idle'); // 'idle' | 'syncing' | 'success'

  // Determine actual connection state from user authentication
  const isGoogleConnected =
    user?.provider === 'google' ||
    Boolean(user?.email && user?.provider?.toLowerCase().includes('google'));

  const handleConnect = async () => {
    try {
      if (loginWithGoogle) {
        await loginWithGoogle({
          scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar'
        });
      }
    } catch (error) {
      showToast(error.message || 'Could not initiate Google Calendar connection.', 'error');
    }
  };

  const handleSyncNow = async () => {
    if (syncState === 'syncing') return;
    setSyncState('syncing');

    try {
      // Call backend Google Calendar sync endpoint
      const response = await routineApi.syncCalendar({
        google_access_token: session?.provider_token || null
      });

      setSyncState('success');
      showToast(response?.message || 'Routine synced successfully with Google Calendar!', 'success');

      // Return to idle connected state after showing success indicator
      setTimeout(() => {
        setSyncState('idle');
      }, 3500);
    } catch (error) {
      setSyncState('idle');
      // If server is unavailable, inform gracefully
      showToast(error.message || 'Sync failed. You can also download the .ics file below.', 'warning');
    }
  };

  const handleExportIcs = () => {
    if (!routines || routines.length === 0) {
      showToast('No classes in routine to export.', 'info');
      return;
    }
    exportIcsCalendar(routines);
    showToast('Downloaded .ics file. Import directly into Google Calendar!', 'success');
  };

  if (!isGoogleConnected) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleConnect}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500/50 hover:bg-brand-50/40 dark:hover:bg-brand-950/20 shadow-sm transition-all duration-200"
          title="Sync your class routine with your Google Calendar."
        >
          <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
          <span>Connect Google Calendar</span>
        </button>

        <button
          type="button"
          onClick={handleExportIcs}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-brand-600 dark:hover:text-brand-400 shadow-sm transition-colors"
          title="Export routine as .ics (for Google Calendar, Outlook, Apple Calendar)"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Connected state
  return (
    <div className="inline-flex items-center gap-2 p-1 pl-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-xs font-semibold text-slate-700 dark:text-slate-200">
      {syncState === 'syncing' ? (
        <div className="inline-flex items-center gap-1.5 text-brand-600 dark:text-brand-400 pr-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="font-bold text-[11px]">Syncing your classes...</span>
        </div>
      ) : syncState === 'success' ? (
        <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 pr-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="font-bold text-[11px]">Routine synced successfully</span>
        </div>
      ) : (
        <>
          <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">
              Google Calendar Connected
            </span>
          </div>

          <button
            type="button"
            onClick={handleSyncNow}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors"
            title="Synchronize routines now"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Sync Now</span>
          </button>

          <button
            type="button"
            onClick={handleExportIcs}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Download .ics file"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
};

export default GoogleCalendarSyncWidget;
