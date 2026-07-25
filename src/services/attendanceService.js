import { storageService } from './storageService';

export const attendanceService = {
  getCourses: () => {
    return storageService.get(storageService.KEYS.COURSES, []);
  },

  saveCourses: (courses) => {
    storageService.set(storageService.KEYS.COURSES, courses);
  },

  addCourse: (courseData) => {
    const courses = attendanceService.getCourses();
    const newCourse = {
      id: `course-${Date.now()}`,
      totalClasses: 0,
      attendedClasses: 0,
      missedClasses: 0,
      attendanceGoal: 80,
      assessments: [],
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
      courses[index] = { ...courses[index], ...updatedData };
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

  // Core Rule Engine: For an n-credit course, student can miss up to n classes safely.
  // Allowed absences = Math.floor(credit * ratio) [default ratio = 1.0]
  calculateAttendanceStats: (course) => {
    const settings = storageService.get(storageService.KEYS.SETTINGS, {});
    const allowedRatio = settings?.attendanceRules?.defaultAllowedRatio || 1.0;

    const credit = Number(course.credit || 3.0);
    const allowedMissed = Math.floor(credit * allowedRatio);
    const missed = Number(course.missedClasses || 0);
    const attended = Number(course.attendedClasses || 0);
    const total = Number(course.totalClasses || (attended + missed));

    const remainingSafe = Math.max(0, allowedMissed - missed);
    const percentage = total > 0 ? ((attended / total) * 100).toFixed(1) : "100.0";

    let riskLevel = 'safe'; // 'safe', 'warning', 'limit_reached', 'at_risk'
    if (missed === allowedMissed && allowedMissed > 0) {
      riskLevel = 'limit_reached';
    } else if (missed > allowedMissed) {
      riskLevel = 'at_risk';
    } else if (missed === allowedMissed - 1 && allowedMissed > 1) {
      riskLevel = 'warning';
    }

    return {
      credit,
      allowedMissed,
      missed,
      attended,
      total,
      remainingSafe,
      percentage: Number(percentage),
      riskLevel
    };
  },

  // Mark attendance shortcut (attended / missed)
  recordAttendance: (courseId, status, date = new Date().toISOString().split('T')[0]) => {
    const courses = attendanceService.getCourses();
    const index = courses.findIndex(c => c.id === courseId);
    if (index !== -1) {
      const course = courses[index];
      course.totalClasses = (course.totalClasses || 0) + 1;
      if (status === 'attended') {
        course.attendedClasses = (course.attendedClasses || 0) + 1;
      } else if (status === 'missed') {
        course.missedClasses = (course.missedClasses || 0) + 1;
      }

      // Add to history log
      if (!course.history) course.history = [];
      course.history.unshift({
        id: `att-hist-${Date.now()}`,
        date,
        status,
        timestamp: new Date().toISOString()
      });

      courses[index] = course;
      attendanceService.saveCourses(courses);
      return course;
    }
    return null;
  },

  // Undo latest attendance entry
  undoLastAttendance: (courseId) => {
    const courses = attendanceService.getCourses();
    const index = courses.findIndex(c => c.id === courseId);
    if (index !== -1 && courses[index].history && courses[index].history.length > 0) {
      const course = courses[index];
      const last = course.history.shift();
      course.totalClasses = Math.max(0, (course.totalClasses || 0) - 1);
      if (last.status === 'attended') {
        course.attendedClasses = Math.max(0, (course.attendedClasses || 0) - 1);
      } else if (last.status === 'missed') {
        course.missedClasses = Math.max(0, (course.missedClasses || 0) - 1);
      }
      courses[index] = course;
      attendanceService.saveCourses(courses);
      return course;
    }
    return null;
  }
};
