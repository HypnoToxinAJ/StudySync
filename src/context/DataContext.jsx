import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { routineService } from '../services/routineService';
import { attendanceService } from '../services/attendanceService';
import { marksService } from '../services/marksService';
import { cgpaService } from '../services/cgpaService';
import { tuitionService } from '../services/tuitionService';
import { expenseService } from '../services/expenseService';
import { shortcutService } from '../services/shortcutService';
import { focusService } from '../services/focusService';
import { alertService } from '../services/alertService';
import { useToast } from './ToastContext';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const { showToast } = useToast();

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
    setCourses(attendanceService.getCourses());
    setRoutines(routineService.getAll());
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
    routineService.add(data);
    refreshData();
    showToast('Routine entry added successfully!');
  };

  const updateRoutine = (id, data) => {
    routineService.update(id, data);
    refreshData();
    showToast('Routine entry updated!');
  };

  const deleteRoutine = (id) => {
    routineService.delete(id);
    refreshData();
    showToast('Routine entry removed.');
  };

  // --- Attendance & Missed-Class Handlers ---
  const recordMissedClass = (courseId, date, reason) => {
    attendanceService.recordMissedClass(courseId, date, reason);
    refreshData();
    showToast('Marked as Missed Class!', 'warning');
  };

  const recordAttendance = (courseId, status, date, reason) => {
    attendanceService.recordAttendance(courseId, status, date, reason);
    refreshData();
    showToast(status === 'missed' ? 'Marked as Missed Class!' : 'Attendance updated.', status === 'missed' ? 'warning' : 'info');
  };

  const undoLastMissed = (courseId) => {
    attendanceService.undoLastMissed(courseId);
    refreshData();
    showToast('Latest missed class record undone.');
  };

  const undoAttendance = (courseId) => {
    undoLastMissed(courseId);
  };

  const updateMissedRecord = (courseId, recordId, data) => {
    attendanceService.updateMissedRecord(courseId, recordId, data);
    refreshData();
    showToast('Missed class record updated.');
  };

  const deleteMissedRecord = (courseId, recordId) => {
    attendanceService.deleteMissedRecord(courseId, recordId);
    refreshData();
    showToast('Missed class record deleted.');
  };

  const addCourse = (data) => {
    attendanceService.addCourse(data);
    refreshData();
    showToast('New course added!');
  };

  const updateCourse = (id, data) => {
    attendanceService.updateCourse(id, data);
    refreshData();
    showToast('Course updated!');
  };

  const deleteCourse = (id) => {
    attendanceService.deleteCourse(id);
    refreshData();
    showToast('Course deleted.');
  };

  // --- Course Inline Assessment Handlers ---
  const addAssessmentToCourse = (courseId, assessmentData) => {
    marksService.addAssessmentToCourse(courseId, assessmentData);
    refreshData();
    showToast('Assessment added to course!');
  };

  const updateAssessmentInCourse = (courseId, assessmentId, updatedData) => {
    marksService.updateAssessmentInCourse(courseId, assessmentId, updatedData);
    refreshData();
    showToast('Assessment marks updated!');
  };

  const deleteAssessmentFromCourse = (courseId, assessmentId) => {
    marksService.deleteAssessmentFromCourse(courseId, assessmentId);
    refreshData();
    showToast('Assessment removed from course.');
  };

  const toggleAssessmentMissed = (courseId, assessmentId) => {
    marksService.toggleAssessmentMissed(courseId, assessmentId);
    refreshData();
    showToast('Assessment status toggled.');
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

  const addAssessment = (assessmentData) => {
    const list = storageService.get(storageService.KEYS.ASSESSMENTS, []);
    const newAst = { id: `ev-${Date.now()}`, ...assessmentData };
    list.push(newAst);
    storageService.set(storageService.KEYS.ASSESSMENTS, list);
    syncAssessmentTask(newAst);

    // Also sync to course if courseId matches
    if (assessmentData.courseId) {
      marksService.addAssessmentToCourse(assessmentData.courseId, newAst);
    }

    refreshData();
    showToast(`New ${assessmentData.type.toUpperCase()} scheduled!`);
  };

  const updateAssessment = (id, updatedData) => {
    const list = storageService.get(storageService.KEYS.ASSESSMENTS, []);
    const idx = list.findIndex(a => a.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updatedData };
      storageService.set(storageService.KEYS.ASSESSMENTS, list);
      syncAssessmentTask(list[idx]);
    }
    refreshData();
    showToast('Assessment updated!');
  };

  const deleteAssessment = (id) => {
    const list = storageService.get(storageService.KEYS.ASSESSMENTS, []);
    const filtered = list.filter(a => a.id !== id);
    storageService.set(storageService.KEYS.ASSESSMENTS, filtered);
    const tasksList = storageService.get(storageService.KEYS.TASKS, []);
    storageService.set(storageService.KEYS.TASKS, tasksList.filter(task => task.id !== `task-assessment-${id}`));
    refreshData();
    showToast('Assessment deleted.');
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

  const logTuitionClass = (studentId, sessionData) => {
    tuitionService.logClassSession(studentId, sessionData);
    refreshData();
    showToast('Tuition class logged successfully!');
  };

  // --- Expense Handlers ---
  const addTransaction = (txData) => {
    expenseService.addTransaction(txData);
    refreshData();
    showToast(txData.type === 'income' ? 'Income logged!' : 'Expense recorded!', txData.type === 'income' ? 'success' : 'warning');
  };

  const deleteTransaction = (id) => {
    expenseService.deleteTransaction(id);
    refreshData();
    showToast('Transaction removed.');
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
      addCourse,
      updateCourse,
      deleteCourse,
      // Inline course assessment actions
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
      logTuitionClass,
      // Expense actions
      addTransaction,
      deleteTransaction,
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
