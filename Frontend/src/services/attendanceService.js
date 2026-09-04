import { storageService } from './storageService.js';
import { courseApi } from './courseApi.js';

export const COURSE_TYPES = {
  THEORY: 'THEORY',
  SESSIONAL: 'SESSIONAL',
  LAB: 'LAB'
};

export const normalizeCourseType = (type) => {
  const str = String(type || 'THEORY').trim().toUpperCase();
  if (str.includes('LAB')) return COURSE_TYPES.LAB;
  if (str.includes('SESSIONAL')) return COURSE_TYPES.SESSIONAL;
  return COURSE_TYPES.THEORY;
};

export const attendanceService = {
  getCourses: () => {
    const raw = storageService.get(storageService.KEYS.COURSES, []);
    // Ensure all courses have normalized types and required numeric fields
    return raw.map(course => {
      const missed = Number(course.missedClasses || 0);
      const total = Number(
        course.totalClasses !== undefined && course.totalClasses !== null
          ? course.totalClasses
          : (course.attendedClasses !== undefined ? Number(course.attendedClasses) + missed : (missed > 0 ? missed + 27 : 30))
      );
      const attended = Number(
        course.attendedClasses !== undefined && course.attendedClasses !== null
          ? course.attendedClasses
          : Math.max(0, total - missed)
      );

      return {
        ...course,
        courseType: normalizeCourseType(course.courseType || course.classType),
        credit: Number(course.credit || 3.0),
        totalClasses: total,
        attendedClasses: attended,
        missedClasses: missed,
        history: Array.isArray(course.history) ? course.history : [],
        assessments: Array.isArray(course.assessments) ? course.assessments : []
      };
    });
  },

  saveCourses: (courses) => {
    storageService.set(storageService.KEYS.COURSES, courses);
  },

  isTheory: (course) => {
    return normalizeCourseType(course?.courseType || course?.classType) === COURSE_TYPES.THEORY;
  },

  // Maximum safe missed classes allowed without marks deduction (THEORY ONLY)
  getMaximumSafeMisses: (course) => {
    if (!attendanceService.isTheory(course)) {
      return null; // Not applicable for Sessional/Lab
    }
    const credit = Number(course?.credit || 3.0);
    // Formula: maxSafeMissed = credits (e.g. 3-credit -> 3, 2-credit -> 2)
    return Math.max(1, Math.round(credit));
  },

  getRemainingSafeMisses: (course) => {
    const maxSafe = attendanceService.getMaximumSafeMisses(course);
    if (maxSafe === null) return null;
    const missed = Number(course?.missedClasses || 0);
    return Math.max(0, maxSafe - missed);
  },

  // Risk status: 'SAFE', 'LIMIT_REACHED', 'MARKS_DEDUCTION_RISK' for Theory; 'TRACKING' for Lab/Sessional
  getAttendanceRisk: (course) => {
    if (!attendanceService.isTheory(course)) {
      return 'TRACKING';
    }
    const maxSafe = attendanceService.getMaximumSafeMisses(course);
    const missed = Number(course?.missedClasses || 0);

    if (missed < maxSafe) return 'SAFE';
    if (missed === maxSafe) return 'LIMIT_REACHED';
    return 'MARKS_DEDUCTION_RISK';
  },

  calculateAttendanceStats: (course) => {
    const credit = Number(course?.credit || 3.0);
    const courseType = normalizeCourseType(course?.courseType || course?.classType);
    const isTheoryCourse = courseType === COURSE_TYPES.THEORY;
    const totalClasses = Number(course?.totalClasses ?? ((course?.attendedClasses || 0) + (course?.missedClasses || 0)));
    const attendedClasses = Number(course?.attendedClasses || 0);
    const missedClasses = Number(course?.missedClasses || 0);

    // Percentage: (attendedClasses / totalClasses) * 100
    const percentage = totalClasses > 0
      ? Number(((attendedClasses / totalClasses) * 100).toFixed(1))
      : 100.0;

    if (!isTheoryCourse) {
      return {
        credit,
        courseType,
        isTheory: false,
        totalClasses,
        attendedClasses,
        missedClasses,
        percentage,
        maxSafeMissed: null,
        remainingSafe: null,
        status: 'TRACKING',
        statusLabel: 'TRACKING',
        statusMessage: 'Normal attendance tracking active (missed-class penalty limit not applicable).',
        hasDeductionRisk: false,
        isLimitReached: false
      };
    }

    const maxSafeMissed = attendanceService.getMaximumSafeMisses(course);
    const remainingSafe = Math.max(0, maxSafeMissed - missedClasses);
    const riskStatus = attendanceService.getAttendanceRisk(course);

    let statusLabel = 'SAFE';
    let statusMessage = `You can safely miss ${remainingSafe} more class${remainingSafe === 1 ? '' : 'es'}.`;

    if (riskStatus === 'LIMIT_REACHED') {
      statusLabel = 'LIMIT REACHED';
      statusMessage = 'You have reached the maximum safe missed-class limit. Your next absence may trigger a marks deduction.';
    } else if (riskStatus === 'MARKS_DEDUCTION_RISK') {
      const exceededBy = missedClasses - maxSafeMissed;
      statusLabel = 'MARKS DEDUCTION RISK';
      statusMessage = `You have exceeded the maximum safe missed-class limit by ${exceededBy} class${exceededBy === 1 ? '' : 'es'}. Marks deduction risk is active.`;
    }

    return {
      credit,
      courseType,
      isTheory: true,
      totalClasses,
      attendedClasses,
      missedClasses,
      percentage,
      maxSafeMissed,
      remainingSafe,
      status: riskStatus,
      statusLabel,
      statusMessage,
      hasDeductionRisk: riskStatus === 'MARKS_DEDUCTION_RISK',
      isLimitReached: riskStatus === 'LIMIT_REACHED'
    };
  },

  getOverallAttendanceStats: (courses = null) => {
    const list = courses || attendanceService.getCourses();
    let totalClasses = 0;
    let attendedClasses = 0;
    let missedClasses = 0;
    let theoryCoursesCount = 0;
    let atRiskCount = 0;

    list.forEach(course => {
      const stats = attendanceService.calculateAttendanceStats(course);
      totalClasses += stats.totalClasses;
      attendedClasses += stats.attendedClasses;
      missedClasses += stats.missedClasses;
      if (stats.isTheory) {
        theoryCoursesCount += 1;
        if (stats.hasDeductionRisk || stats.isLimitReached) {
          atRiskCount += 1;
        }
      }
    });

    const overallPercentage = totalClasses > 0
      ? Number(((attendedClasses / totalClasses) * 100).toFixed(1))
      : 100.0;

    return {
      overallPercentage,
      totalClasses,
      attendedClasses,
      missedClasses,
      theoryCoursesCount,
      atRiskCount,
      totalCourses: list.length
    };
  },

  // Record Attendance: handles both PRESENT and ABSENT with duplicate date validation
  recordAttendance: (courseId, status, date = new Date().toISOString().split('T')[0], reason = '') => {
    const courses = attendanceService.getCourses();
    const index = courses.findIndex(c => c.id === courseId || c.courseId === courseId);
    if (index === -1) {
      return { success: false, error: 'Course not found.' };
    }

    const course = { ...courses[index] };
    const normalizedStatus = String(status || '').toUpperCase() === 'ABSENT' ? 'ABSENT' : 'PRESENT';

    if (!course.history) course.history = [];

    // Duplicate prevention: cannot record attendance for same course on same date
    const isDuplicate = course.history.some(h => (h.date || '').split('T')[0] === date);
    if (isDuplicate) {
      return {
        success: false,
        error: `Attendance record already exists for ${course.courseId} on ${date}. Duplicate entries are not allowed.`
      };
    }

    // Automatically update counters
    course.totalClasses = (course.totalClasses || 0) + 1;
    if (normalizedStatus === 'ABSENT') {
      course.missedClasses = (course.missedClasses || 0) + 1;
    } else {
      course.attendedClasses = (course.attendedClasses || 0) + 1;
    }

    const historyEntry = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      courseId: course.id,
      courseCode: course.courseId,
      courseTitle: course.courseTitle,
      date,
      status: normalizedStatus,
      classType: course.courseType,
      reason: reason || '',
      createdAt: new Date().toISOString()
    };

    course.history.unshift(historyEntry);
    courses[index] = course;
    attendanceService.saveCourses(courses);

    // Sync to backend asynchronously if available
    void courseApi.update(course.id, {
      totalClasses: course.totalClasses,
      attendedClasses: course.attendedClasses,
      missedClasses: course.missedClasses,
      history: course.history
    }).catch(() => {
      // Local copy safely updated
    });

    return { success: true, course, record: historyEntry };
  },

  // Helper for backward compatibility with older UI calls
  recordMissedClass: (courseId, date = new Date().toISOString().split('T')[0], reason = '') => {
    return attendanceService.recordAttendance(courseId, 'ABSENT', date, reason);
  },

  deleteAttendanceRecord: (courseId, recordId) => {
    const courses = attendanceService.getCourses();
    const index = courses.findIndex(c => c.id === courseId || c.courseId === courseId);
    if (index === -1) return false;

    const course = { ...courses[index] };
    if (!course.history) return false;

    const hIndex = course.history.findIndex(h => h.id === recordId);
    if (hIndex === -1) return false;

    const removed = course.history[hIndex];
    course.history.splice(hIndex, 1);

    course.totalClasses = Math.max(0, (course.totalClasses || 1) - 1);
    const statusUpper = String(removed.status || '').toUpperCase();
    if (statusUpper === 'ABSENT' || statusUpper === 'MISSED') {
      course.missedClasses = Math.max(0, (course.missedClasses || 1) - 1);
    } else {
      course.attendedClasses = Math.max(0, (course.attendedClasses || 1) - 1);
    }

    courses[index] = course;
    attendanceService.saveCourses(courses);

    void courseApi.update(course.id, {
      totalClasses: course.totalClasses,
      attendedClasses: course.attendedClasses,
      missedClasses: course.missedClasses,
      history: course.history
    }).catch(() => {});

    return true;
  },

  undoLastAttendance: (courseId) => {
    const courses = attendanceService.getCourses();
    const course = courses.find(c => c.id === courseId || c.courseId === courseId);
    if (course && course.history && course.history.length > 0) {
      return attendanceService.deleteAttendanceRecord(course.id, course.history[0].id);
    }
    return false;
  },

  undoLastMissed: (courseId) => {
    return attendanceService.undoLastAttendance(courseId);
  },

  deleteMissedRecord: (courseId, recordId) => {
    return attendanceService.deleteAttendanceRecord(courseId, recordId);
  },

  // Synchronize courses directly with class routines!
  syncCoursesWithRoutines: (routines = []) => {
    if (!Array.isArray(routines)) return attendanceService.getCourses();

    const existingCourses = attendanceService.getCourses();
    const courseMap = new Map();

    // Index existing courses by normalized code
    existingCourses.forEach(c => {
      const code = String(c.courseId || c.code || '').trim().toUpperCase();
      if (code) courseMap.set(code, { ...c });
    });

    // Extract unique courses from routines
    routines.forEach(routine => {
      const code = String(routine.courseId || routine.course_code || '').trim().toUpperCase();
      if (!code) return;

      const title = routine.courseTitle || routine.course_title || code;
      const credit = Number(routine.credit) || (courseMap.get(code)?.credit ?? 3.0);
      const rawType = routine.courseType || routine.classType || 'THEORY';
      const courseType = normalizeCourseType(rawType);
      const faculty = routine.teacherName || routine.faculty || courseMap.get(code)?.faculty || '';
      const color = routine.color || courseMap.get(code)?.color || '#4F46E5';

      if (courseMap.has(code)) {
        // Update metadata from routine while retaining attendance & CT history
        const existing = courseMap.get(code);
        courseMap.set(code, {
          ...existing,
          courseTitle: title,
          credit,
          courseType,
          faculty: faculty || existing.faculty,
          color: color || existing.color
        });
      } else {
        // New course discovered in routine schedule
        courseMap.set(code, {
          id: `course-${Date.now()}-${code.replace(/[^A-Za-z0-9]/g, '')}`,
          courseId: code,
          courseTitle: title,
          credit,
          courseType,
          faculty,
          color,
          semester: '5th Semester',
          totalClasses: 0,
          attendedClasses: 0,
          missedClasses: 0,
          history: [],
          assessments: []
        });
      }
    });

    const merged = Array.from(courseMap.values()).sort((a, b) => (a.courseId || '').localeCompare(b.courseId || ''));
    attendanceService.saveCourses(merged);
    return merged;
  },

  addCourse: (courseData) => {
    const courses = attendanceService.getCourses();
    const code = String(courseData.courseId || courseData.code || 'CSE-101').trim().toUpperCase();
    const courseType = normalizeCourseType(courseData.courseType);
    const credit = Number(courseData.credit || 3.0);

    const newCourse = {
      id: `course-${Date.now()}`,
      courseId: code,
      courseTitle: courseData.courseTitle || courseData.name || 'Untitled Course',
      credit,
      courseType,
      faculty: courseData.faculty || courseData.teacherName || '',
      semester: courseData.semester || '5th Semester',
      color: courseData.color || '#4F46E5',
      totalClasses: Number(courseData.totalClasses || 0),
      attendedClasses: Number(courseData.attendedClasses || 0),
      missedClasses: Number(courseData.missedClasses || 0),
      history: courseData.history || [],
      assessments: courseData.assessments || []
    };

    courses.push(newCourse);
    attendanceService.saveCourses(courses);

    void courseApi.create(newCourse).catch(() => {});
    return newCourse;
  },

  updateCourse: (id, updatedData) => {
    const courses = attendanceService.getCourses();
    const index = courses.findIndex(c => c.id === id || c.courseId === id);
    if (index !== -1) {
      const existing = courses[index];
      const merged = {
        ...existing,
        ...updatedData,
        courseType: normalizeCourseType(updatedData.courseType || existing.courseType),
        credit: Number(updatedData.credit ?? existing.credit ?? 3.0)
      };
      courses[index] = merged;
      attendanceService.saveCourses(courses);

      void courseApi.update(merged.id, merged).catch(() => {});
      return courses[index];
    }
    return null;
  },

  deleteCourse: (id) => {
    const courses = attendanceService.getCourses();
    const filtered = courses.filter(c => c.id !== id && c.courseId !== id);
    attendanceService.saveCourses(filtered);

    void courseApi.delete(id).catch(() => {});
    return filtered;
  },

  getAttendanceHistory: (courseId = null, filters = {}) => {
    const courses = attendanceService.getCourses();
    let records = [];

    courses.forEach(c => {
      if (!courseId || courseId === 'all' || c.id === courseId || c.courseId === courseId) {
        (c.history || []).forEach(h => {
          const status = String(h.status || '').toUpperCase();
          records.push({
            ...h,
            status: status === 'MISSED' ? 'ABSENT' : status === 'ATTENDED' ? 'PRESENT' : status,
            courseId: c.id,
            courseCode: c.courseId,
            courseTitle: c.courseTitle,
            color: c.color,
            courseType: c.courseType
          });
        });
      }
    });

    if (filters.status && filters.status !== 'all') {
      const target = filters.status.toUpperCase();
      records = records.filter(r => r.status === target);
    }
    if (filters.startDate) {
      records = records.filter(r => (r.date || '').split('T')[0] >= filters.startDate);
    }
    if (filters.endDate) {
      records = records.filter(r => (r.date || '').split('T')[0] <= filters.endDate);
    }

    records.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    return records;
  }
};
