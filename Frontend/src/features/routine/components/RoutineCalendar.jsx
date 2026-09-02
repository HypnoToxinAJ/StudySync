import React, { useEffect, useMemo, useState } from 'react';
import { Clock, Copy, Edit, RefreshCw, Trash2, User } from 'lucide-react';
import { Badge } from '../../../components/common/Badge.jsx';
import { routineApi } from '../../../services/routineApi.js';


const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

export const RoutineCalendar = ({
  localRoutines = [],
  assessmentsByDay = {},
  renderAssessment,
  onEdit,
  onDuplicate,
  onDelete,
  onRoutinesFetched,
  refreshToken = 0
}) => {
  const [serverRoutines, setServerRoutines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRoutines = async () => {
    setError('');
    try {
      const data = await routineApi.list();
      const fetched = Array.isArray(data) ? data : data?.results || [];
      setServerRoutines(fetched);
      onRoutinesFetched?.(fetched);
    } catch (nextError) {
      setError(nextError.message || 'Could not refresh routines from the server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchRoutines();
  }, [refreshToken]);

  const routines = useMemo(() => {
    const byId = new Map();
    [...localRoutines, ...serverRoutines].forEach(routine => {
      const key = String(routine.id);
      const current = byId.get(key);
      const currentUpdated = Date.parse(current?.updatedAt || '') || 0;
      const candidateUpdated = Date.parse(routine.updatedAt || '') || 0;
      if (!current || candidateUpdated >= currentUpdated) byId.set(key, routine);
    });
    return [...byId.values()].sort((left, right) =>
      String(left.startTime || '').localeCompare(String(right.startTime || ''))
    );
  }, [serverRoutines, localRoutines]);

  const deleteRoutine = routine => {
    setServerRoutines(current => current.filter(item => item.id !== routine.id));
    onDelete?.(routine.id);
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
          <span>{error} Showing locally cached classes.</span>
          <button type="button" onClick={() => void fetchRoutines()} className="inline-flex items-center gap-1 font-bold">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {WEEKDAYS.map(day => {
          const dayRoutines = routines.filter(routine => routine.dayOfWeek === day);
          const dayAssessments = assessmentsByDay[day] || [];
          const isToday = day === today;

          return (
            <section
              key={day}
              className={`min-h-44 p-4 rounded-2xl border transition-all ${isToday
                ? 'bg-brand-500/5 border-brand-500/50 ring-2 ring-brand-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                <h3 className={`text-xs font-extrabold uppercase tracking-wider ${isToday
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {day}
                </h3>
                {isToday && <Badge variant="indigo" size="sm">Today</Badge>}
              </div>

              <div className="space-y-3">
                {isLoading && routines.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-6 text-center">Loading classes...</p>
                ) : dayRoutines.length === 0 && dayAssessments.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-6 text-center italic">No classes scheduled</p>
                ) : (
                  <>
                    {dayRoutines.map(routine => (
                      <article
                        key={routine.id}
                        className="group p-3 rounded-xl border border-white/10 text-white shadow-sm transition-transform hover:scale-[1.02] relative"
                        style={{ backgroundColor: routine.color || '#4F46E5' }}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-md">
                            {routine.classType || 'theory'}
                          </span>
                          <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 flex items-center gap-1 transition-opacity bg-black/30 p-1 rounded-lg">
                            <button type="button" onClick={() => onEdit?.(routine)} aria-label={`Edit ${routine.courseId}`}>
                              <Edit className="w-3 h-3" />
                            </button>
                            <button type="button" onClick={() => onDuplicate?.(routine)} aria-label={`Duplicate ${routine.courseId}`}>
                              <Copy className="w-3 h-3" />
                            </button>
                            <button type="button" onClick={() => deleteRoutine(routine)} aria-label={`Delete ${routine.courseId}`}>
                              <Trash2 className="w-3 h-3 text-rose-200" />
                            </button>
                          </div>
                        </div>

                        <h4 className="text-xs font-bold mt-2 leading-tight">{routine.courseId}</h4>
                        <p className="text-[11px] opacity-90 line-clamp-2">{routine.courseTitle}</p>
                        {routine.source === 'ocr-import' && (
                          <p className="mt-1 text-[9px] font-bold uppercase tracking-wide opacity-90">Gemini import</p>
                        )}

                        <div className="mt-2 pt-2 border-t border-white/20 text-[10px] space-y-1 opacity-90">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{routine.startTime} - {routine.endTime}</span>
                          </div>
                          {routine.room && <p className="truncate">{routine.room}</p>}
                          {routine.faculty && (
                            <div className="flex items-center gap-1 truncate">
                              <User className="w-3 h-3" />
                              <span className="truncate">{routine.faculty}</span>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                    {dayAssessments.length > 0 && (
                      <div className="space-y-2 pt-1">{dayAssessments.map(renderAssessment)}</div>
                    )}
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default RoutineCalendar;
