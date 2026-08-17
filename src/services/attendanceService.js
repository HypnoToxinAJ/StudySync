import { storageService } from './storageService';

export const attendanceService = {
  getCourses: () => {
    return storageService.get(storageService.KEYS.COURSES, []);
  },

  saveCourses: (courses) => {
    storageService.set(storageService.KEYS.COURSES, courses);
  },

  // Validate supported course type & credit combinations
  validateCourseConfig: (courseType, credit) => {
    const numCredit = Number(credit);
    const normalizedType = String(courseType || 'theory').toLowerCase();

    if (normalizedType === 'theory') {
      if (numCredit === 3.0 || numCredit === 2.0) {
        return { isValid: true, message: '' };
      }
      return {
        isValid: false,
        message: `Theory course credit standard is 3.0 or 2.0 credits (received ${credit}).`
      };
    } else if (normalizedType === 'lab' || normalizedType === 'sessional') {
      if (numCredit === 1.5 || numCredit === 0.75) {
        return { isValid: true, message: '' };
      }
      return {
        isValid: false,
        message: `Lab/Sessional course credit standard is 1.5 or 0.75 credits (received ${credit}).`
      };
    }

    return {
      isValid: false,
      message: `Invalid course type "${courseType}". Supported types are theory, lab, and sessional.`
    };
  },

  // Rule A: 3-cr theory -> 39; 2-cr theory -> 26; 1.5-cr lab -> 13; 0.75-cr lab -> 6
  getTotalScheduledClasses: (course) => {
    const credit = Number(course?.credit || 3.0);
    const type = String(course?.courseType || 'theory').toLowerCase();

    if (type === 'theory') {
      if (credit === 3.0) return 39;
      if (credit === 2.0) return 26;
      return Math.round(credit * 13);
    } else {
      if (credit === 1.5) return 13;
      if (credit === 0.75) return 6;
      return Math.round(credit * 8.6667);
    }
  },

  // Maximum safe missed classes allowed without marks deduction
  getMaximumSafeMisses: (course) => {
    const credit = Number(course?.credit || 3.0);
    const type = String(course?.courseType || 'theory').toLowerCase();

    if (type === 'theory') {
      if (credit === 3.0) return 3;
      if (credit === 2.0) return 2;
      return Math.floor(credit);
    } else {
      if (credit === 1.5) return 1;
      if (credit === 0.75) return 0;
      return Math.floor(credit);
    }
  },

  getRemainingSafeMisses: (course) => {
    const maxSafe = attendanceService.getMaximumSafeMisses(course);
    const missed = Number(course?.missedClasses || 0);
    return Math.max(0, maxSafe - missed);
  },

  // Risk states: 'safe', 'limit_reached', 'at_risk', 'no_absence_allowed', 'deduction_triggered'
  getAttendanceRisk: (course) => {
    const maxSafe = attendanceService.getMaximumSafeMisses(course);
    const missed = Number(course?.missedClasses || 0);

    if (maxSafe === 0) {
      if (missed === 0) return 'no_absence_allowed';
      return 'deduction_triggered';
    }

    if (missed < maxSafe) return 'safe';
    if (missed === maxSafe) return 'limit_reached';
    return 'at_risk';
  },

  hasAttendanceDeductionRisk: (course) => {
    const risk = attendanceService.getAttendanceRisk(course);
    return risk === 'at_risk' || risk === 'deduction_triggered';
  },

  calculateAttendanceStats: (course) => {
    const credit = Number(course?.credit || 3.0);
    const courseType = String(course?.courseType || 'theory').toLowerCase();
    const totalScheduled = attendanceService.getTotalScheduledClasses(course);
    const allowedMissed = attendanceService.getMaximumSafeMisses(course);
    const missed = Number(course?.missedClasses || 0);
    const remainingSafe = attendanceService.getRemainingSafeMisses(course);
    const riskLevel = attendanceService.getAttendanceRisk(course);
    const hasDeductionRisk = attendanceService.hasAttendanceDeductionRisk(course);

    let riskLabel = 'Safe';
    let riskMessage = 'Missed classes within safe limit.';

    switch (riskLevel) {
      case 'safe':
        riskLabel = 'SAFE';
        riskMessage = `${remainingSafe} safe miss${remainingSafe === 1 ? '' : 'es'} remaining.`;
        break;
      case 'limit_reached':
        riskLabel = 'LIMIT REACHED';
        riskMessage = `Reached maximum safe misses (${allowedMissed}). Any further miss will trigger marks deduction!`;
        break;
      case 'at_risk':
        riskLabel = 'MARKS DEDUCTION RISK';
        riskMessage = `Exceeded safe limit of ${allowedMissed} miss${allowedMissed === 1 ? '' : 'es'}! Marks deduction applicable.`;
        break;
      case 'no_absence_allowed':
        riskLabel = 'NO ABSENCE ALLOWED';
        riskMessage = '0.75-credit course allows 0 missed classes.';
        break;
      case 'deduction_triggered':
        riskLabel = 'DEDUCTION TRIGGERED';
        riskMessage = 'Missed class recorded in 0.75-credit course! Marks deduction triggered.';
        break;
      default:
        break;
    }

    return {
      credit,
      courseType,
      totalScheduled,
      allowedMissed,
      missed,
      remainingSafe,
      riskLevel,
      riskLabel,
      riskMessage,
      hasDeductionRisk
    };
  },

  addCourse: (courseData) => {
    const courses = attendanceService.getCourses();
    const courseType = courseData.courseType || (Number(courseData.credit) < 2.0 ? 'lab' : 'theory');
    const isTheory = courseType === 'theory';

    const newCourse = {
      id: `course-${Date.now()}`,
      courseId: courseData.courseId || 'CSE-101',
      courseTitle: courseData.courseTitle || 'Untitled Course',
      credit: Number(courseData.credit || 3.0),
      courseType,
      faculty: courseData.faculty || '',
      semester: courseData.semester || '5th Semester',
      color: courseData.color || '#4F46E5',
      missedClasses: 0,
      totalClasses: 0,
      attendedClasses: 0,
      history: [],
      assessments: isTheory ? (courseData.assessments || []) : [],
      assessmentApplicable: isTheory,
      bestAssessmentCount: isTheory ? (Number(courseData.credit) === 2 ? 2 : 3) : 0,
      ...courseData
    };

    courses.push(newCourse);
    attendanceService.saveCourses(courses);
    return newCourse;
  },

  updateCourse: (id, updatedData) => {
    const courses = attendanceService.getCourses();
    const index = courses.findIndex(c => c.id === id);
    if (index !== -1) {
      const merged = { ...courses[index], ...updatedData };
      const courseType = merged.courseType || (Number(merged.credit) < 2.0 ? 'lab' : 'theory');
      const isTheory = courseType === 'theory';

      merged.courseType = courseType;
      merged.assessmentApplicable = isTheory;
      merged.bestAssessmentCount = isTheory ? (Number(merged.credit) === 2 ? 2 : 3) : 0;

      courses[index] = merged;
      attendanceService.saveCourses(courses);
      return courses[index];
    }
    return null;
  },

  deleteCourse: (id) => {
    const courses = attendanceService.getCourses();
    const filtered = courses.filter(c => c.id !== id);
    attendanceService.saveCourses(filtered);
    return filtered;
  },

  // Record a missed class
  recordMissedClass: (courseId, date = new Date().toISOString().split('T')[0], reason = '') => {
    const courses = attendanceService.getCourses();
    const index = courses.findIndex(c => c.id === courseId);
    if (index !== -1) {
      const course = courses[index];
      course.missedClasses = (course.missedClasses || 0) + 1;

      if (!course.history) course.history = [];
      const historyEntry = {
        id: `missed-${Date.now()}`,
        courseId,
        date,
        status: 'missed',
        classType: course.courseType || 'theory',
        reason: reason || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      course.history.unshift(historyEntry);

      courses[index] = course;
      attendanceService.saveCourses(courses);
      return historyEntry;
    }
    return null;
  },

  // Backwards compatibility helper for recordAttendance
  recordAttendance: (courseId, status, date = new Date().toISOString().split('T')[0], reason = '') => {
    if (status === 'missed') {
      return attendanceService.recordMissedClass(courseId, date, reason);
    }
    // If called with 'attended' for legacy compatibility, update history only
    const courses = attendanceService.getCourses();
    const index = courses.findIndex(c => c.id === courseId);
    if (index !== -1) {
      const course = courses[index];
      if (!course.history) course.history = [];
      course.history.unshift({
        id: `att-legacy-${Date.now()}`,
        courseId,
        date,
        status: 'attended',
        classType: course.courseType || 'theory',
        reason,
        createdAt: new Date().toISOString()
      });
      courses[index] = course;
      attendanceService.saveCourses(courses);
      return course;
    }
    return null;
  },

  // Undo latest missed class
  undoLastMissed: (courseId) => {
    const courses = attendanceService.getCourses();
    const index = courses.findIndex(c => c.id === courseId);
    if (index !== -1 && courses[index].history) {
      const course = courses[index];
      const missedIndex = course.history.findIndex(h => h.status === 'missed');
      if (missedIndex !== -1) {
        course.history.splice(missedIndex, 1);
        course.missedClasses = Math.max(0, (course.missedClasses || 0) - 1);
        courses[index] = course;
        attendanceService.saveCourses(courses);
        return course;
      }
    }
    return null;
  },

  undoLastAttendance: (courseId) => {
    return attendanceService.undoLastMissed(courseId);
  },

  // Edit a missed history record
  updateMissedRecord: (courseId, recordId, updatedData) => {
    const courses = attendanceService.getCourses();
    const cIndex = courses.findIndex(c => c.id === courseId);
    if (cIndex !== -1 && courses[cIndex].history) {
      const hIndex = courses[cIndex].history.findIndex(h => h.id === recordId);
      if (hIndex !== -1) {
        courses[cIndex].history[hIndex] = {
          ...courses[cIndex].history[hIndex],
          ...updatedData,
          updatedAt: new Date().toISOString()
        };
        attendanceService.saveCourses(courses);
        return courses[cIndex].history[hIndex];
      }
    }
    return null;
  },

  // Delete a specific missed history record
  deleteMissedRecord: (courseId, recordId) => {
    const courses = attendanceService.getCourses();
    const cIndex = courses.findIndex(c => c.id === courseId);
    if (cIndex !== -1 && courses[cIndex].history) {
      const hIndex = courses[cIndex].history.findIndex(h => h.id === recordId);
      if (hIndex !== -1) {
        const removed = courses[cIndex].history[hIndex];
        courses[cIndex].history.splice(hIndex, 1);
        if (removed.status === 'missed') {
          courses[cIndex].missedClasses = Math.max(0, (courses[cIndex].missedClasses || 0) - 1);
        }
        attendanceService.saveCourses(courses);
        return true;
      }
    }
    return false;
  },

  // Get missed history records (filtered)
  getMissedHistory: (courseId = null, filters = {}) => {
    const courses = attendanceService.getCourses();
    let records = [];

    courses.forEach(c => {
      if (!courseId || c.id === courseId || c.courseId === courseId) {
        (c.history || []).forEach(h => {
          if (h.status === 'missed') {
            records.push({
              ...h,
              courseCode: c.courseId,
              courseTitle: c.courseTitle,
              color: c.color,
              courseType: c.courseType || 'theory'
            });
          }
        });
      }
    });

    if (filters.courseType) {
      records = records.filter(r => r.courseType === filters.courseType);
    }
    if (filters.startDate) {
      records = records.filter(r => r.date >= filters.startDate);
    }
    if (filters.endDate) {
      records = records.filter(r => r.date <= filters.endDate);
    }

    records.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    return records;
  }
};
