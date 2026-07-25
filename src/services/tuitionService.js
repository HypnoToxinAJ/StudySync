import { storageService } from './storageService';

export const tuitionService = {
  getStudents: () => {
    return storageService.get(storageService.KEYS.TUITIONS, []);
  },

  saveStudents: (students) => {
    storageService.set(storageService.KEYS.TUITIONS, students);
  },

  addStudent: (studentData) => {
    const students = tuitionService.getStudents();
    const newStudent = {
      id: `tu-${Date.now()}`,
      completedClasses: 0,
      monthlyClasses: 12,
      monthlySalary: 8000,
      currency: "BDT",
      paymentStatus: "pending",
      cardColor: "#4F46E5",
      logs: [],
      ...studentData
    };
    students.push(newStudent);
    tuitionService.saveStudents(students);
    return newStudent;
  },

  updateStudent: (id, updatedData) => {
    const students = tuitionService.getStudents();
    const index = students.findIndex(s => s.id === id);
    if (index !== -1) {
      students[index] = { ...students[index], ...updatedData };
      tuitionService.saveStudents(students);
      return students[index];
    }
    return null;
  },

  deleteStudent: (id) => {
    const students = tuitionService.getStudents();
    const filtered = students.filter(s => s.id !== id);
    tuitionService.saveStudents(filtered);
    return filtered;
  },

  // Calculate per-class earnings and salary progress
  calculateStudentMetrics: (student) => {
    const planned = Number(student.monthlyClasses || 12);
    const salary = Number(student.monthlySalary || 0);
    const completed = Number(student.completedClasses || (student.logs?.length || 0));

    const perClassRate = planned > 0 ? (salary / planned) : 0;
    const earnedAmount = Math.round(completed * perClassRate);
    const remainingAmount = Math.max(0, salary - earnedAmount);
    const remainingClasses = Math.max(0, planned - completed);
    const classProgressPercent = planned > 0 ? Math.min(100, Math.round((completed / planned) * 100)) : 0;

    return {
      planned,
      completed,
      remainingClasses,
      salary,
      perClassRate: Math.round(perClassRate),
      earnedAmount,
      remainingAmount,
      classProgressPercent
    };
  },

  // Log a conducted class session
  logClassSession: (studentId, sessionData) => {
    const students = tuitionService.getStudents();
    const index = students.findIndex(s => s.id === studentId);
    if (index !== -1) {
      const student = students[index];
      const newLog = {
        id: `tl-${Date.now()}`,
        date: sessionData.date || new Date().toISOString().split('T')[0],
        duration: sessionData.duration || "1.5 hrs",
        topic: sessionData.topic || "General Discussion",
        status: sessionData.status || "completed",
        notes: sessionData.notes || ""
      };
      if (!student.logs) student.logs = [];
      student.logs.unshift(newLog);
      student.completedClasses = student.logs.filter(l => l.status === 'completed').length;
      students[index] = student;
      tuitionService.saveStudents(students);
      return student;
    }
    return null;
  },

  // Get aggregated tuition financial analytics
  getAnalytics: () => {
    const students = tuitionService.getStudents();
    let totalExpectedIncome = 0;
    let totalReceivedIncome = 0;
    let totalOutstandingIncome = 0;
    let totalCompletedClasses = 0;
    let totalPlannedClasses = 0;

    const studentBreakdown = [];

    students.forEach(st => {
      const metrics = tuitionService.calculateStudentMetrics(st);
      totalExpectedIncome += metrics.salary;
      totalPlannedClasses += metrics.planned;
      totalCompletedClasses += metrics.completed;

      if (st.paymentStatus === 'paid') {
        totalReceivedIncome += metrics.salary;
      } else {
        totalReceivedIncome += metrics.earnedAmount;
        totalOutstandingIncome += metrics.remainingAmount;
      }

      studentBreakdown.push({
        name: st.studentName,
        earned: metrics.earnedAmount,
        salary: metrics.salary,
        completed: metrics.completed,
        planned: metrics.planned
      });
    });

    const averageValuePerClass = totalCompletedClasses > 0 
      ? Math.round(totalReceivedIncome / totalCompletedClasses) 
      : (totalPlannedClasses > 0 ? Math.round(totalExpectedIncome / totalPlannedClasses) : 0);

    return {
      totalExpectedIncome,
      totalReceivedIncome,
      totalOutstandingIncome,
      totalCompletedClasses,
      totalPlannedClasses,
      averageValuePerClass,
      studentBreakdown
    };
  }
};
