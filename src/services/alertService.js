import { storageService } from './storageService';
import { attendanceService } from './attendanceService';
import { expenseService } from './expenseService';

const TUITION_KEYWORDS = [
  'tuition',
  'tuition class',
  'tuition payment',
  'tuition fee',
  'tuition income',
  'tuition student',
  'overdue tuition'
];

export const isTuitionRelated = (alert) => {
  if (!alert) return false;
  const fields = [
    alert.source,
    alert.module,
    alert.category,
    alert.type,
    alert.title,
    alert.message,
    alert.course
  ]
    .filter(Boolean)
    .map(val => String(val).toLowerCase());

  return fields.some(field => TUITION_KEYWORDS.some(kw => field.includes(kw)));
};

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

  dismissAllAlerts: (alertsToDismiss = []) => {
    const dismissed = alertService.getDismissedAlertIds();
    const newDismissedIds = [];
    alertsToDismiss.forEach(alert => {
      if (alert?.id && !dismissed.includes(alert.id)) {
        dismissed.push(alert.id);
        newDismissedIds.push(alert.id);
      }
    });
    storageService.set(storageService.KEYS.DISMISSED_ALERTS, dismissed);
    return newDismissedIds;
  },

  undoDismissAlerts: (alertIdsToRestore = []) => {
    let dismissed = alertService.getDismissedAlertIds();
    dismissed = dismissed.filter(id => !alertIdsToRestore.includes(id));
    storageService.set(storageService.KEYS.DISMISSED_ALERTS, dismissed);
  },

  restoreAllAlerts: () => {
    storageService.set(storageService.KEYS.DISMISSED_ALERTS, []);
  },

  // Synthesize unified list of active alert widgets (centralized selector filtering out all tuition alerts)
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
          source: 'assessments',
          module: 'assessments',
          title: ast.title || `${ast.type?.toUpperCase()} - ${ast.courseId}`,
          course: ast.courseId,
          date: `${ast.date} ${ast.startTime || ''}`,
          remainingTime: `${ast.date === today ? 'Today' : 'Upcoming'}`,
          type: ast.type || 'Assessment',
          priority,
          category,
          actionPath,
          message: `Syllabus: ${ast.syllabus || 'Review lecture notes'}`,
          dismissible: true
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
          source: 'attendance',
          module: 'attendance',
          title: `Attendance Warning: ${c.courseId}`,
          course: c.courseTitle,
          date: 'Immediate Action',
          remainingTime: `${stats.missed} Missed / ${stats.allowedMissed} Allowed`,
          type: 'Attendance Risk',
          priority: 'high',
          category: 'Attendance',
          actionPath: '/attendance',
          message: `You have missed ${stats.missed} classes out of ${stats.allowedMissed} allowed limit. Further absences may deduct marks!`,
          dismissible: true
        });
      }
    });

    // 3. Expense Budget Limit alerts
    const summary = expenseService.getFinancialSummary();
    if (summary.budgetUsedPercentage >= 85) {
      const id = `alert-budget-warning`;
      alerts.push({
        id,
        source: 'expenses',
        module: 'expenses',
        title: `Monthly Budget Limit Warning`,
        course: 'Personal Expenses',
        date: 'Current Month',
        remainingTime: `${summary.budgetUsedPercentage}% Budget Spent`,
        type: 'Expense Alert',
        priority: 'high',
        category: 'Finance',
        actionPath: '/expenses',
        message: `You have spent ৳${summary.monthlyExpense} out of ৳${summary.budgetLimit} monthly budget limit!`,
        dismissible: true
      });
    }

    // Filter out tuition-related items and user-dismissed alerts at the centralized service level
    return alerts.filter(alert => !isTuitionRelated(alert) && !dismissed.includes(alert.id));
  }
};
