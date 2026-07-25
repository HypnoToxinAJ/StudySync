import { storageService } from './storageService';
import { attendanceService } from './attendanceService';
import { tuitionService } from './tuitionService';
import { expenseService } from './expenseService';

export const alertService = {
  getDismissedAlertIds: () => {
    return storageService.get(storageService.KEYS.DISMISSED_ALERTS, []);
  },

  dismissAlert: (alertId) => {
    const dismissed = alertService.getDismissedAlertIds();
    if (!dismissed.includes(alertId)) {
      dismissed.push(alertId);
      storageService.set(storageService.KEYS.DISMISSED_ALERTS, dismissed);
    }
  },

  restoreAllAlerts: () => {
    storageService.set(storageService.KEYS.DISMISSED_ALERTS, []);
  },

  // Synthesize unified list of active alert widgets
  getActiveAlerts: () => {
    const dismissed = alertService.getDismissedAlertIds();
    const alerts = [];

    // 1. Assessment / CT / Assignment / Exam alerts
    const assessments = storageService.get(storageService.KEYS.ASSESSMENTS, []);
    const today = new Date().toISOString().split('T')[0];

    assessments.forEach(ast => {
      if (ast.date >= today) {
        const id = `alert-ast-${ast.id}`;
        let priority = ast.priority || 'medium';
        let category = 'Academic';
        let actionPath = '/assessments';

        alerts.push({
          id,
          title: ast.title,
          course: ast.courseId,
          date: `${ast.date} ${ast.startTime || ''}`,
          remainingTime: `${ast.date === today ? 'Today' : 'Upcoming'}`,
          type: ast.type,
          priority,
          category,
          actionPath,
          message: `Syllabus: ${ast.syllabus || 'Review lecture notes'}`
        });
      }
    });

    // 2. Attendance risk alerts
    const courses = attendanceService.getCourses();
    courses.forEach(c => {
      const stats = attendanceService.calculateAttendanceStats(c);
      if (stats.riskLevel === 'limit_reached' || stats.riskLevel === 'at_risk') {
        const id = `alert-att-${c.id}`;
        alerts.push({
          id,
          title: `Attendance Warning: ${c.courseId}`,
          course: c.courseTitle,
          date: 'Immediate Action',
          remainingTime: `${stats.missed} Missed / ${stats.allowedMissed} Allowed`,
          type: 'Attendance Risk',
          priority: 'high',
          category: 'Attendance',
          actionPath: '/attendance',
          message: `You have missed ${stats.missed} classes out of ${stats.allowedMissed} allowed limit. Further absences may deduct marks!`
        });
      }
    });

    // 3. Tuition overdue alerts
    const tuitions = tuitionService.getStudents();
    tuitions.forEach(t => {
      if (t.paymentStatus === 'overdue' || t.paymentStatus === 'pending') {
        const id = `alert-tuition-${t.id}`;
        alerts.push({
          id,
          title: `Tuition Payment Pending: ${t.studentName}`,
          course: `${t.subject} (${t.classGrade})`,
          date: t.expectedPaymentDate || 'This Month',
          remainingTime: `৳ ${t.monthlySalary}`,
          type: 'Tuition Income',
          priority: 'medium',
          category: 'Finance',
          actionPath: '/tuition',
          message: `Expected salary of ৳${t.monthlySalary} is pending. Guardian: ${t.guardianContact}`
        });
      }
    });

    // 4. Expense Budget Limit alerts
    const summary = expenseService.getFinancialSummary();
    if (summary.budgetUsedPercentage >= 85) {
      const id = `alert-budget-warning`;
      alerts.push({
        id,
        title: `Monthly Budget Limit Warning`,
        course: 'Personal Expenses',
        date: 'Current Month',
        remainingTime: `${summary.budgetUsedPercentage}% Budget Spent`,
        type: 'Expense Alert',
        priority: 'high',
        category: 'Finance',
        actionPath: '/expenses',
        message: `You have spent ৳${summary.monthlyExpense} out of ৳${summary.budgetLimit} monthly budget limit!`
      });
    }

    // Filter out user-dismissed alerts
    return alerts.filter(a => !dismissed.includes(a.id));
  }
};
