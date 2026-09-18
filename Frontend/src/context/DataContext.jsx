import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { routineService } from '../services/routineService';
import { routineApi } from '../services/routineApi';
import { assessmentApi } from '../services/assessmentApi';
import { attendanceService } from '../services/attendanceService';
import { marksService } from '../services/marksService';
import { cgpaService } from '../services/cgpaService';
import { tuitionService } from '../services/tuitionService';
import { expenseService } from '../services/expenseService';
import { shortcutService } from '../services/shortcutService';
import { focusService } from '../services/focusService';
import { alertService } from '../services/alertService';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const { showToast } = useToast();
  const { providerToken } = useAuth();

  const [courses, setCourses] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [tuitions, setTuitions] = useState([]);
  const [expenses, setExpenses] = useState({ budgetLimit: 12000, accounts: [], transactions: [] });
  const [shortcuts, setShortcuts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [medications, setMedications] = useState([]);
  const [medicationSchedules, setMedicationSchedules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [focusData, setFocusData] = useState({ totalMinutesThisWeek: 0, sessionsCompletedThisWeek: 0 });
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [sidebarPreferences, setSidebarPreferences] = useState(null);

  // Reload all domain states from storage
  const refreshData = () => {
    storageService.initialize();
    const loadedRoutines = routineService.getAll();
    // Keep courses synchronized with class routine courses
    attendanceService.syncCoursesWithRoutines(loadedRoutines);
    setCourses(attendanceService.getCourses());
    setRoutines(loadedRoutines);
    setAssessments(storageService.get(storageService.KEYS.ASSESSMENTS, []));
    setSemesters(cgpaService.getSemesters());
    setTuitions(tuitionService.getStudents());
    setExpenses(expenseService.getData());
    setShortcuts(shortcutService.getAll());
    setNotes(storageService.get(storageService.KEYS.NOTES, []));
    setMedications(storageService.get(storageService.KEYS.MEDICATIONS, []));
    setMedicationSchedules(storageService.get(storageService.KEYS.MEDICATION_SCHEDULES, []));
    setTasks(storageService.get(storageService.KEYS.TASKS, []));
    setFocusData(focusService.getData());
    setActiveAlerts(alertService.getActiveAlerts());
    setSidebarPreferences(storageService.get(storageService.KEYS.SIDEBAR_PREFERENCES, null));
  };

  useEffect(() => {
    refreshData();
    const handleSync = () => refreshData();
    globalThis.addEventListener('studysync:synced', handleSync);
    return () => globalThis.removeEventListener('studysync:synced', handleSync);
  }, []);

  const updateSidebarPreferences = (preferences) => {
    storageService.set(storageService.KEYS.SIDEBAR_PREFERENCES, preferences);
    setSidebarPreferences(preferences);
  };

  // --- Routine Handlers ---
  const addRoutine = (data) => {
    const conflicts = routineService.detectConflicts(data);
    if (conflicts.length > 0) {
      showToast(`Schedule Conflict Detected with ${conflicts[0].courseId} (${conflicts[0].startTime}-${conflicts[0].endTime})`, 'warning');
    }
    const created = routineService.add(data);
    // Sync newly added routine course to attendance & CT
    attendanceService.syncCoursesWithRoutines(routineService.getAll());
    refreshData();
    showToast('Routine entry added successfully!');
    void routineApi.create(created).catch(error => {
      showToast(error.message || 'The class is saved locally but could not reach the server.', 'warning');
    });
  };

  const updateRoutine = (id, data) => {
    const updated = routineService.update(id, data);
    attendanceService.syncCoursesWithRoutines(routineService.getAll());
    refreshData();
    showToast('Routine entry updated!');
    if (updated) {
      void routineApi.update(id, updated).catch(error => {
        showToast(error.message || 'The update is saved locally but could not reach the server.', 'warning');
      });
    }
  };

  const deleteRoutine = (id) => {
    routineService.delete(id);
    refreshData();
    showToast('Routine entry removed.');
    void routineApi.delete(id).catch(error => {
      if (error.status !== 404) {
        showToast(error.message || 'The class was removed locally but not from the server.', 'warning');
      }
    });
  };

  // --- Attendance & Missed-Class Handlers ---
  const recordMissedClass = (courseId, date, reason) => {
    return recordAttendance(courseId, 'ABSENT', date, reason);
  };

  const recordAttendance = (courseId, status, date, reason) => {
    const res = attendanceService.recordAttendance(courseId, status, date, reason);
    if (res && res.success === false) {
      showToast(res.error || 'Failed to record attendance.', 'warning');
      return false;
    }
    refreshData();
    const isAbsent = String(status || '').toUpperCase() === 'ABSENT';
    showToast(isAbsent ? 'Marked as Absent!' : 'Attendance marked as Present!', isAbsent ? 'warning' : 'success');
    return true;
  };

  const undoLastMissed = (courseId) => {
    attendanceService.undoLastAttendance(courseId);
    refreshData();
    showToast('Latest attendance record undone.');
  };

  const undoAttendance = (courseId) => {
    undoLastMissed(courseId);
  };

  const updateMissedRecord = (courseId, recordId, data) => {
    attendanceService.updateMissedRecord?.(courseId, recordId, data);
    refreshData();
    showToast('Record updated.');
  };

  const deleteAttendanceRecord = (courseId, recordId) => {
    const ok = attendanceService.deleteAttendanceRecord(courseId, recordId);
    if (ok) {
      refreshData();
      showToast('Attendance record deleted.');
    }
    return ok;
  };

  const deleteMissedRecord = (courseId, recordId) => {
    return deleteAttendanceRecord(courseId, recordId);
  };

  const addCourse = (data) => {
    const created = attendanceService.addCourse(data);
    refreshData();
    showToast('New course added!');
    return created;
  };

  const updateCourse = (id, data) => {
    const updated = attendanceService.updateCourse(id, data);
    if (updated) {
      const allRoutines = routineService.getAll();
      const codeUpper = String(updated.courseId || '').trim().toUpperCase();
      const oldCodeUpper = data.oldCourseId ? String(data.oldCourseId).trim().toUpperCase() : codeUpper;
      let changed = false;
      const updatedRoutines = allRoutines.map(r => {
        const rCode = String(r.courseId || r.course_code || '').trim().toUpperCase();
        if (rCode === codeUpper || rCode === oldCodeUpper || String(r.id) === String(id)) {
          changed = true;
          const updatedSlot = {
            ...r,
            courseId: updated.courseId,
            courseTitle: data.courseTitle || updated.courseTitle || r.courseTitle,
            teacherName: data.faculty || data.teacherName || updated.faculty || r.teacherName,
            credit: data.credit !== undefined ? Number(data.credit) : updated.credit,
            courseType: updated.courseType || r.courseType,
            color: data.color || updated.color || r.color
          };
          void routineApi.update(r.id, updatedSlot).catch(() => {});
          return updatedSlot;
        }
        return r;
      });
      if (changed) {
        routineService.saveAll(updatedRoutines);
      }
    }
    refreshData();
    showToast('Course updated and synced with routine & backend!');
    return updated;
  };

  const deleteCourse = (id) => {
    attendanceService.deleteCourse(id);
    refreshData();
    showToast('Course, routine classes, attendance, and CT marks deleted.');
  };

  // --- Course CT Marks Handlers ---
  const addCTMark = (courseId, assessmentData) => {
    const res = marksService.addCTMarkToCourse(courseId, assessmentData);
    if (res && res.success === false) {
      showToast(res.error || 'Failed to add CT mark.', 'warning');
      return false;
    }
    refreshData();
    showToast('CT mark recorded successfully!');
    return true;
  };

  const updateCTMark = (courseId, assessmentId, updatedData) => {
    const res = marksService.updateCTMarkInCourse(courseId, assessmentId, updatedData);
    if (res && res.success === false) {
      showToast(res.error || 'Failed to update CT mark.', 'warning');
      return false;
    }
    refreshData();
    showToast('CT mark updated!');
    return true;
  };

  const deleteCTMark = (courseId, assessmentId) => {
    marksService.deleteCTMarkFromCourse(courseId, assessmentId);
    refreshData();
    showToast('CT mark removed.');
    return true;
  };

  // Backward-compatibility aliases
  const addAssessmentToCourse = (courseId, data) => addCTMark(courseId, data);
  const updateAssessmentInCourse = (courseId, id, data) => updateCTMark(courseId, id, data);
  const deleteAssessmentFromCourse = (courseId, id) => deleteCTMark(courseId, id);
  const toggleAssessmentMissed = (courseId, assessmentId) => {
    deleteCTMark(courseId, assessmentId);
  };

  // --- Assessment / Test & Assignment Handlers ---
  const syncAssessmentTask = (assessment) => {
    const taskId = `task-assessment-${assessment.id}`;
    const tasksList = storageService.get(storageService.KEYS.TASKS, []);
    const existingIndex = tasksList.findIndex(task => task.id === taskId);

    if (assessment.type !== 'assignment' || !assessment.deadlineAt) {
      if (existingIndex !== -1) {
        tasksList.splice(existingIndex, 1);
        storageService.set(storageService.KEYS.TASKS, tasksList);
      }
      return;
    }

    const generatedTask = {
      id: taskId,
      assessmentId: assessment.id,
      generatedBy: 'assessment',
      title: `Submit ${assessment.title || assessment.courseId || 'assignment'}`,
      dueDate: assessment.deadlineDate,
      dueAt: assessment.deadlineAt,
      priority: assessment.priority || 'medium',
      category: 'academic',
      courseId: assessment.courseId,
      completed: existingIndex === -1 ? false : tasksList[existingIndex].completed
    };
    if (existingIndex === -1) tasksList.unshift(generatedTask);
    else tasksList[existingIndex] = { ...tasksList[existingIndex], ...generatedTask };
    storageService.set(storageService.KEYS.TASKS, tasksList);
  };

  const addAssessment = async (assessmentData) => {
    // Local-first: save immediately
    const list = storageService.get(storageService.KEYS.ASSESSMENTS, []);
    const localId = `ev-${Date.now()}`;
    const newAst = { id: localId, ...assessmentData };
    list.push(newAst);
    storageService.set(storageService.KEYS.ASSESSMENTS, list);
    syncAssessmentTask(newAst);

    if (assessmentData.courseId) {
      marksService.addAssessmentToCourse(assessmentData.courseId, newAst);
    }

    refreshData();

    // Backend sync with Google Calendar integration
    try {
      const result = await assessmentApi.create(assessmentData, providerToken);
      // Update local record with server ID and Google data
      const updatedList = storageService.get(storageService.KEYS.ASSESSMENTS, []);
      const idx = updatedList.findIndex(a => a.id === localId);
      let finalRecord = { ...newAst, ...result, id: result.id || localId };
      if (idx !== -1) {
        updatedList[idx] = finalRecord;
        storageService.set(storageService.KEYS.ASSESSMENTS, updatedList);
      }
      refreshData();

      const calendarMsg = result.calendarStatus === 'created'
        ? ' and added to your Google Calendar'
        : result.calendarStatus?.startsWith('failed')
          ? ' (Calendar sync failed — you can retry later)'
          : '';
      showToast(`${assessmentData.type?.toUpperCase() || 'Assessment'} scheduled successfully${calendarMsg}!`);
      return finalRecord;
    } catch (error) {
      showToast(
        error.message || 'Assessment saved locally but could not reach the server.',
        'warning'
      );
      return newAst;
    }
  };

  const updateAssessment = async (id, updatedData) => {
    // Local-first update
    const list = storageService.get(storageService.KEYS.ASSESSMENTS, []);
    const idx = list.findIndex(a => a.id === id);
    let updatedRecord = { id, ...updatedData };
    if (idx !== -1) {
      updatedRecord = { ...list[idx], ...updatedData };
      list[idx] = updatedRecord;
      storageService.set(storageService.KEYS.ASSESSMENTS, list);
      syncAssessmentTask(list[idx]);
    }
    refreshData();

    // Backend sync
    try {
      const result = await assessmentApi.update(id, updatedData, providerToken);
      // Merge server response
      const currentList = storageService.get(storageService.KEYS.ASSESSMENTS, []);
      const currentIdx = currentList.findIndex(a => a.id === id);
      if (currentIdx !== -1) {
        currentList[currentIdx] = { ...currentList[currentIdx], ...result };
        updatedRecord = currentList[currentIdx];
        storageService.set(storageService.KEYS.ASSESSMENTS, currentList);
      }
      refreshData();

      const calendarMsg = result.calendarStatus === 'updated'
        ? ' Google Calendar event updated.'
        : result.calendarStatus === 'created'
          ? ' Google Calendar event created.'
          : '';
      showToast(`Assessment updated!${calendarMsg}`);
      return updatedRecord;
    } catch (error) {
      showToast(
        error.message || 'Update saved locally but could not reach the server.',
        'warning'
      );
      return updatedRecord;
    }
  };

  const deleteAssessment = async (id) => {
    // Local-first delete
    const list = storageService.get(storageService.KEYS.ASSESSMENTS, []);
    const filtered = list.filter(a => a.id !== id);
    storageService.set(storageService.KEYS.ASSESSMENTS, filtered);
    const tasksList = storageService.get(storageService.KEYS.TASKS, []);
    storageService.set(storageService.KEYS.TASKS, tasksList.filter(task => task.id !== `task-assessment-${id}`));
    refreshData();

    // Backend sync (also deletes Calendar event and Drive files)
    try {
      const result = await assessmentApi.delete(id, providerToken);
      if (result?.googleErrors?.length) {
        showToast('Assessment deleted, but some Google resources could not be cleaned up.', 'warning');
      } else {
        showToast('Assessment deleted.');
      }
    } catch (error) {
      if (error.status !== 404) {
        showToast(
          error.message || 'Deleted locally but could not reach the server.',
          'warning'
        );
      } else {
        showToast('Assessment deleted.');
      }
    }
  };

  // --- CGPA / Semester Handlers ---
  const addSemester = (name) => {
    cgpaService.addSemester(name);
    refreshData();
    showToast('New semester created!');
  };

  const addCourseToSemester = (semesterId, courseData) => {
    cgpaService.addCourseToSemester(semesterId, courseData);
    refreshData();
    showToast('Course added to semester!');
  };

  const deleteSemester = (id) => {
    cgpaService.deleteSemester(id);
    refreshData();
    showToast('Semester deleted.');
  };

  // --- Tuition Handlers ---
  const addTuitionStudent = (data) => {
    tuitionService.addStudent(data);
    refreshData();
    showToast('Tuition student added!');
  };

  const updateTuitionStudent = (id, data) => {
    const updated = tuitionService.updateStudent(id, data);
    refreshData();
    showToast(updated ? 'Tuition student updated!' : 'Tuition student not found.', updated ? 'success' : 'warning');
    return updated;
  };

  const deleteTuitionStudent = (id) => {
    tuitionService.deleteStudent(id);
    refreshData();
    showToast('Tuition student removed.');
  };

  const updateTuitionClassDate = (studentId, slotOrder, date) => {
    tuitionService.updateClassSlotDate(studentId, slotOrder, date);
    refreshData();
    showToast('Class date updated.');
  };

  const startNewTuitionMonth = (studentId, targetNewMonth = null) => {
    tuitionService.startNewMonth(studentId, targetNewMonth);
    refreshData();
    showToast('New tuition month started.');
  };

  const addTuitionNote = (studentId, content) => {
    const created = tuitionService.addStudentNote(studentId, content);
    refreshData();
    if (created) {
      showToast('Tuition note added.');
    } else {
      showToast('Tuition note cannot be empty.', 'warning');
    }
    return created;
  };

  const updateTuitionNote = (studentId, noteId, content) => {
    const updated = tuitionService.updateStudentNote(studentId, noteId, content);
    refreshData();
    if (updated) {
      showToast('Tuition note updated.');
    } else {
      showToast('Unable to update tuition note.', 'warning');
    }
    return updated;
  };

  const deleteTuitionNote = (studentId, noteId) => {
    const deleted = tuitionService.deleteStudentNote(studentId, noteId);
    refreshData();
    if (deleted) {
      showToast('Tuition note deleted.');
    } else {
      showToast('No tuition note found to delete.', 'warning');
    }
    return deleted;
  };

  const logTuitionClass = (studentId, sessionData) => {
    const logged = tuitionService.logClassSession?.(studentId, sessionData);
    if (logged === undefined || logged === null) {
      const fallback = tuitionService.updateClassSlotDate(studentId, sessionData?.slotOrder ?? 1, sessionData?.date ?? new Date().toISOString().slice(0, 10));
      refreshData();
      showToast(fallback ? 'Tuition class logged successfully!' : 'Tuition session update failed.', fallback ? 'success' : 'warning');
      return fallback;
    }
    refreshData();
    showToast('Tuition class logged successfully!');
    return logged;
  };

  // --- Expense Handlers ---
  const addTransaction = (txData) => {
    expenseService.addTransaction(txData);
    refreshData();
    showToast(txData.type === 'income' ? 'Income logged!' : 'Expense recorded!', txData.type === 'income' ? 'success' : 'warning');
  };

  const updateTransaction = (id, updatedData) => {
    expenseService.updateTransaction(id, updatedData);
    refreshData();
    showToast('Transaction updated.');
  };

  const deleteTransaction = (id) => {
    expenseService.deleteTransaction(id);
    refreshData();
    showToast('Transaction removed.');
  };

  const updateBudgetLimit = (newLimit) => {
    expenseService.updateBudgetLimit(newLimit);
    refreshData();
    showToast('Budget updated.');
  };

  const addDueBorrowRecord = (recordData) => {
    expenseService.addDueBorrowRecord(recordData);
    refreshData();
    showToast('Due/Borrow record added.');
  };

  const updateDueBorrowRecord = (id, updatedData) => {
    expenseService.updateDueBorrowRecord(id, updatedData);
    refreshData();
    showToast('Due/Borrow record updated.');
  };

  const deleteDueBorrowRecord = (id) => {
    expenseService.deleteDueBorrowRecord(id);
    refreshData();
    showToast('Due/Borrow record removed.');
  };

  const settleDueBorrowRecord = (id, settlementOptions = {}) => {
    expenseService.settleDueBorrowRecord(id, settlementOptions);
    refreshData();
    showToast('Due/Borrow record settled.');
  };

  const reopenDueBorrowRecord = (id) => {
    expenseService.reopenDueBorrowRecord(id);
    refreshData();
    showToast('Due/Borrow record reopened.');
  };

  // --- Shortcuts Handlers ---
  const addShortcut = (data) => {
    shortcutService.add(data);
    refreshData();
    showToast('Shortcut added!');
  };

  // --- Notes Handlers ---
  const addNote = (noteData) => {
    const list = storageService.get(storageService.KEYS.NOTES, []);
    const now = new Date().toISOString();
    const newNote = {
      id: `note-${Date.now()}`,
      title: '',
      content: '',
      color: 'violet',
      labels: [],
      pinned: false,
      archived: false,
      checklistMode: false,
      checklistItems: [],
      ...noteData,
      updatedAt: now,
      createdAt: noteData.createdAt || now,
    };
    list.unshift(newNote);
    storageService.set(storageService.KEYS.NOTES, list);
    refreshData();
    showToast('Note saved to dashboard!');
  };

  const updateNote = (id, updatedData) => {
    const list = storageService.get(storageService.KEYS.NOTES, []);
    const index = list.findIndex(note => note.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updatedData, updatedAt: new Date().toISOString() };
      storageService.set(storageService.KEYS.NOTES, list);
    }
    refreshData();
    showToast('Note updated.');
  };

  const togglePinNote = (id) => {
    const list = storageService.get(storageService.KEYS.NOTES, []);
    const index = list.findIndex(note => note.id === id);
    if (index !== -1) {
      list[index].pinned = !list[index].pinned;
      list[index].updatedAt = new Date().toISOString();
      storageService.set(storageService.KEYS.NOTES, list);
    }
    refreshData();
  };

  const archiveNote = (id) => {
    updateNote(id, { archived: true });
  };

  const toggleChecklistItem = (noteId, itemId) => {
    const list = storageService.get(storageService.KEYS.NOTES, []);
    const index = list.findIndex(note => note.id === noteId);
    if (index !== -1) {
      list[index] = {
        ...list[index],
        checklistItems: (list[index].checklistItems || []).map(item => item.id === itemId ? { ...item, completed: !item.completed } : item),
        updatedAt: new Date().toISOString(),
      };
      storageService.set(storageService.KEYS.NOTES, list);
    }
    refreshData();
  };

  // --- Medication Handlers ---
  const addMedication = (medData) => {
    const list = storageService.get(storageService.KEYS.MEDICATIONS, []);
    const now = new Date().toISOString();
    const newMedication = {
      id: `med-${Date.now()}`,
      name: '',
      dosageText: '',
      form: 'Tablet',
      instructions: '',
      description: '',
      startDate: '',
      endDate: '',
      scheduleTimes: [],
      selectedDays: [],
      status: 'Active',
      color: 'blue',
      ...medData,
      updatedAt: now,
      createdAt: medData.createdAt || now,
    };
    list.unshift(newMedication);
    storageService.set(storageService.KEYS.MEDICATIONS, list);
    refreshData();
    showToast('Medication plan added!');
  };

  const updateMedication = (id, updatedData) => {
    const list = storageService.get(storageService.KEYS.MEDICATIONS, []);
    const index = list.findIndex(medication => medication.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updatedData, updatedAt: new Date().toISOString() };
      storageService.set(storageService.KEYS.MEDICATIONS, list);
    }
    refreshData();
    showToast('Medication plan updated.');
  };

  const toggleMedicationStatus = (id) => {
    const list = storageService.get(storageService.KEYS.MEDICATIONS, []);
    const index = list.findIndex(medication => medication.id === id);
    if (index !== -1) {
      list[index].status = list[index].status === 'Active' ? 'Paused' : 'Active';
      list[index].updatedAt = new Date().toISOString();
      storageService.set(storageService.KEYS.MEDICATIONS, list);
    }
    refreshData();
  };

  const logMedicationDose = (medicationId, schedule = {}) => {
    const list = storageService.get(storageService.KEYS.MEDICATION_SCHEDULES, []);
    list.unshift({
      id: `medlog-${Date.now()}`,
      medicationId,
      status: schedule.status || 'taken',
      takenAt: new Date().toISOString(),
      scheduledFor: schedule.scheduledFor || null,
      note: schedule.note || '',
    });
    storageService.set(storageService.KEYS.MEDICATION_SCHEDULES, list);
    refreshData();
    showToast('Dose logged.');
  };

  const togglePinShortcut = (id) => {
    shortcutService.togglePin(id);
    refreshData();
  };

  const deleteShortcut = (id) => {
    shortcutService.delete(id);
    refreshData();
    showToast('Shortcut deleted.');
  };

  // --- Alert & Task Handlers ---
  const dismissAlert = (alertId) => {
    alertService.dismissAlert(alertId);
    refreshData();
    showToast('Alert dismissed');
  };

  const dismissAllAlerts = () => {
    const currentAlerts = alertService.getActiveAlerts();
    if (currentAlerts.length === 0) return;
    const dismissedIds = alertService.dismissAllAlerts(currentAlerts);
    refreshData();
    showToast('All visible notifications dismissed', 'info', {
      actionLabel: 'Undo',
      onAction: () => undoDismissAlerts(dismissedIds)
    });
  };

  const undoDismissAlerts = (ids) => {
    alertService.undoDismissAlerts(ids);
    refreshData();
    showToast('Dismissed notifications restored', 'success');
  };

  const restoreAlerts = () => {
    alertService.restoreAllAlerts();
    refreshData();
    showToast('All alerts restored to dashboard');
  };

  const toggleTask = (taskId) => {
    const list = storageService.get(storageService.KEYS.TASKS, []);
    const idx = list.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      list[idx].completed = !list[idx].completed;
      storageService.set(storageService.KEYS.TASKS, list);
    }
    refreshData();
  };

  const addTask = (taskData) => {
    const list = storageService.get(storageService.KEYS.TASKS, []);
    list.unshift({ id: `tk-${Date.now()}`, completed: false, ...taskData });
    storageService.set(storageService.KEYS.TASKS, list);
    refreshData();
    showToast('Task added to overview!');
  };

  // --- Focus Handlers ---
  const logFocusSession = (minutes, taskName) => {
    focusService.logSession(minutes, taskName);
    refreshData();
    showToast(`Great work! ${minutes} focus minutes recorded.`, 'success');
  };

  return (
    <DataContext.Provider value={{
      courses,
      routines,
      assessments,
      semesters,
      tuitions,
      expenses,
      shortcuts,
      notes,
      medications,
      medicationSchedules,
      tasks,
      focusData,
      activeAlerts,
      sidebarPreferences,
      refreshData,
      updateSidebarPreferences,
      // Routine actions
      addRoutine,
      updateRoutine,
      deleteRoutine,
      // Attendance & course actions
      recordAttendance,
      recordMissedClass,
      undoAttendance,
      undoLastMissed,
      updateMissedRecord,
      deleteMissedRecord,
      deleteAttendanceRecord,
      addCourse,
      updateCourse,
      deleteCourse,
      // Inline course assessment & CT actions
      addCTMark,
      updateCTMark,
      deleteCTMark,
      addAssessmentToCourse,
      updateAssessmentInCourse,
      deleteAssessmentFromCourse,
      toggleAssessmentMissed,
      // Assessments actions
      addAssessment,
      updateAssessment,
      deleteAssessment,
      // CGPA actions
      addSemester,
      addCourseToSemester,
      deleteSemester,
      // Tuition actions
      addTuitionStudent,
      updateTuitionStudent,
      deleteTuitionStudent,
      updateTuitionClassDate,
      startNewTuitionMonth,
      addTuitionNote,
      updateTuitionNote,
      deleteTuitionNote,
      logTuitionClass,
      // Expense actions
      addTransaction,
      updateTransaction,
      deleteTransaction,
      updateBudgetLimit,
      addDueBorrowRecord,
      updateDueBorrowRecord,
      deleteDueBorrowRecord,
      settleDueBorrowRecord,
      reopenDueBorrowRecord,
      // Shortcut actions
      addShortcut,
      togglePinShortcut,
      deleteShortcut,
      // Notes actions
      addNote,
      updateNote,
      togglePinNote,
      archiveNote,
      toggleChecklistItem,
      // Medication actions
      addMedication,
      updateMedication,
      toggleMedicationStatus,
      logMedicationDose,
      // Alert & Task actions
      dismissAlert,
      dismissAllAlerts,
      undoDismissAlerts,
      restoreAlerts,
      toggleTask,
      addTask,
      // Focus actions
      logFocusSession
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
