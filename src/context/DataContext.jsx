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
  const [tasks, setTasks] = useState([]);
  const [focusData, setFocusData] = useState({ totalMinutesThisWeek: 0, sessionsCompletedThisWeek: 0 });
  const [activeAlerts, setActiveAlerts] = useState([]);

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
    setTasks(storageService.get(storageService.KEYS.TASKS, []));
    setFocusData(focusService.getData());
    setActiveAlerts(alertService.getActiveAlerts());
  };

  useEffect(() => {
    refreshData();
  }, []);

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

  // --- Attendance Handlers ---
  const recordAttendance = (courseId, status) => {
    attendanceService.recordAttendance(courseId, status);
    refreshData();
    showToast(status === 'attended' ? 'Marked as Attended!' : 'Marked as Missed!', status === 'attended' ? 'success' : 'warning');
  };

  const undoAttendance = (courseId) => {
    attendanceService.undoLastAttendance(courseId);
    refreshData();
    showToast('Attendance record undone.');
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

  // --- Assessment / Test & Assignment Handlers ---
  const addAssessment = (assessmentData) => {
    const list = storageService.get(storageService.KEYS.ASSESSMENTS, []);
    const newAst = { id: `ev-${Date.now()}`, ...assessmentData };
    list.push(newAst);
    storageService.set(storageService.KEYS.ASSESSMENTS, list);

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
    }
    refreshData();
    showToast('Assessment updated!');
  };

  const deleteAssessment = (id) => {
    const list = storageService.get(storageService.KEYS.ASSESSMENTS, []);
    const filtered = list.filter(a => a.id !== id);
    storageService.set(storageService.KEYS.ASSESSMENTS, filtered);
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
      tasks,
      focusData,
      activeAlerts,
      refreshData,
      // Routine actions
      addRoutine,
      updateRoutine,
      deleteRoutine,
      // Attendance & course actions
      recordAttendance,
      undoAttendance,
      addCourse,
      updateCourse,
      deleteCourse,
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
      // Alert & Task actions
      dismissAlert,
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
