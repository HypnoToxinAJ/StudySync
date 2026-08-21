/**
 * Academic CGPA and Grade Point Calculation Utilities
 * Official CUET grading system rules adapted with Apache-2.0 notice.
 * Reference: https://github.com/TheSR007/CUET_Result_Viewer
 */

export const CUET_GRADE_POINTS = {
  'A+': 4.00,
  'A': 3.75,
  'A-': 3.50,
  'B+': 3.25,
  'B': 3.00,
  'B-': 2.75,
  'C+': 2.50,
  'C': 2.25,
  'D': 2.00,
  'F': 0.00
};

export const CUET_GRADE_RANKS = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'];

/**
 * Returns grade point for a letter grade
 */
export const getGradePoint = (letterGrade) => {
  if (!letterGrade) return 0.00;
  const formatted = String(letterGrade).trim().toUpperCase();
  return CUET_GRADE_POINTS[formatted] !== undefined ? CUET_GRADE_POINTS[formatted] : 0.00;
};

/**
 * Checks if a grade is considered a passing grade at CUET
 */
export const isPassingGrade = (letterGrade) => {
  const gp = getGradePoint(letterGrade);
  return gp > 0.00;
};

/**
 * Identifies whether a course is Theory or Lab/Sessional
 */
export const categorizeCourseType = (courseCode = '', courseTitle = '', credit = 3.0) => {
  const code = String(courseCode || '').toLowerCase();
  const title = String(courseTitle || '').toLowerCase();
  const cr = Number(credit || 0);

  if (code.includes('lab') || title.includes('lab') || code.includes('sessional') || title.includes('sessional') || cr === 1.5 || cr === 0.75) {
    return 'Lab';
  }
  return 'Theory';
};

/**
 * Calculates semester-level GPA, quality points, and credits
 */
export const calculateSemesterMetrics = (courses = []) => {
  let totalQualityPoints = 0;
  let completedCredits = 0;
  let attemptedCredits = 0;

  courses.forEach(course => {
    const cr = Number(course.credit || 0);
    const gp = course.gradePoint !== undefined ? Number(course.gradePoint) : getGradePoint(course.letterGrade);
    const passing = isPassingGrade(course.letterGrade);

    attemptedCredits += cr;
    if (passing) {
      completedCredits += cr;
      totalQualityPoints += (cr * gp);
    }
  });

  const calculatedGpa = completedCredits > 0
    ? Number((totalQualityPoints / completedCredits).toFixed(2))
    : 0.00;

  return {
    calculatedGpa,
    totalQualityPoints: Number(totalQualityPoints.toFixed(2)),
    completedCredits: Number(completedCredits.toFixed(2)),
    attemptedCredits: Number(attemptedCredits.toFixed(2))
  };
};

/**
 * Calculates overall CGPA across all parsed semesters,
 * handling repeated courses (taking latest passing attempt) and excluding F grades from earned credits.
 */
export const calculateOverallMetrics = (semesters = []) => {
  let totalQualityPoints = 0;
  let totalCompletedCredits = 0;
  let totalAttemptedCredits = 0;
  let highestGpa = 0.00;
  let failedCourses = [];
  const uniqueSubjectMap = new Map();

  semesters.forEach(sem => {
    const semCourses = sem.courses || [];
    semCourses.forEach(c => {
      const code = c.courseCode || c.courseId;
      const cr = Number(c.credit || 0);
      const gp = c.gradePoint !== undefined ? Number(c.gradePoint) : getGradePoint(c.letterGrade);
      const passing = isPassingGrade(c.letterGrade);

      totalAttemptedCredits += cr;

      // Track all unique course attempts
      if (!uniqueSubjectMap.has(code)) {
        uniqueSubjectMap.set(code, {
          latestGrade: c.letterGrade,
          latestGradePoint: gp,
          credit: cr,
          title: c.courseTitle || c.title || code,
          attempts: [c],
          isCleared: passing
        });
      } else {
        const existing = uniqueSubjectMap.get(code);
        existing.attempts.push(c);
        // Latest attempt overwrites effective status
        existing.latestGrade = c.letterGrade;
        existing.latestGradePoint = gp;
        existing.isCleared = passing;
      }
    });

    const semGpa = Number(sem.gpa || sem.calculatedGpa || 0);
    if (semGpa > highestGpa) {
      highestGpa = semGpa;
    }
  });

  // Calculate CGPA strictly using latest effective grades of unique passed subjects
  uniqueSubjectMap.forEach((entry, code) => {
    if (entry.isCleared) {
      const points = entry.credit * entry.latestGradePoint;
      totalQualityPoints += points;
      totalCompletedCredits += entry.credit;
    } else {
      failedCourses.push({
        courseCode: code,
        courseTitle: entry.title,
        credit: entry.credit,
        lastGrade: entry.latestGrade,
        attemptsCount: entry.attempts.length
      });
    }
  });

  const calculatedCgpa = totalCompletedCredits > 0
    ? Number((totalQualityPoints / totalCompletedCredits).toFixed(2))
    : 0.00;

  return {
    calculatedCgpa,
    totalQualityPoints: Number(totalQualityPoints.toFixed(2)),
    totalCompletedCredits: Number(totalCompletedCredits.toFixed(2)),
    totalAttemptedCredits: Number(totalAttemptedCredits.toFixed(2)),
    highestGpa: Number(highestGpa.toFixed(2)),
    totalSemesters: semesters.length,
    failedCoursesCount: failedCourses.length,
    clearedCoursesCount: uniqueSubjectMap.size - failedCourses.length,
    failedCourses
  };
};

/**
 * Compares official portal value with independently calculated verification value
 */
export const verifyPortalDifference = (officialValue, calculatedValue, tolerance = 0.01) => {
  if (officialValue === undefined || officialValue === null || isNaN(officialValue)) {
    return { hasDiscrepancy: false, difference: 0 };
  }
  const official = Number(officialValue);
  const calculated = Number(calculatedValue);
  const diff = Math.abs(official - calculated);
  return {
    hasDiscrepancy: diff > tolerance,
    difference: Number(diff.toFixed(2)),
    message: diff > tolerance
      ? `Portal value (${official.toFixed(2)}) differs from calculated verification (${calculated.toFixed(2)}).`
      : null
  };
};

/**
 * Target CGPA projection calculator
 */
export const calculateTargetGpaProjection = (currentCgpa, currentCredits, desiredCgpa, nextCredits) => {
  const currentCGPA = Number(currentCgpa || 0);
  const completedCredits = Number(currentCredits || 0);
  const target = Number(desiredCgpa || 3.80);
  const nextSemCredits = Number(nextCredits || 18);

  if (nextSemCredits <= 0) {
    return {
      requiredGPA: 0,
      isFeasible: false,
      maxReachableCGPA: currentCGPA,
      message: 'Next semester credits must be greater than 0.'
    };
  }

  const totalCreditsAfterNext = completedCredits + nextSemCredits;
  const requiredTotalPoints = target * totalCreditsAfterNext;
  const currentPoints = currentCGPA * completedCredits;
  const requiredNextPoints = requiredTotalPoints - currentPoints;
  const requiredGPA = requiredNextPoints / nextSemCredits;

  const maxReachableCGPA = Number(((currentPoints + (4.00 * nextSemCredits)) / totalCreditsAfterNext).toFixed(2));

  let isFeasible = true;
  let message = `You need a GPA of ${requiredGPA.toFixed(2)} in your upcoming ${nextSemCredits} credits.`;

  if (requiredGPA > 4.00) {
    isFeasible = false;
    message = `Impossible target! Even with a perfect 4.00 GPA next semester, your maximum reachable CGPA will be ${maxReachableCGPA}. Consider adjusting your target.`;
  } else if (requiredGPA <= 0) {
    isFeasible = true;
    message = `Your target CGPA of ${target.toFixed(2)} is already secured! Any passing grade maintains your goal.`;
  }

  return {
    currentCGPA,
    completedCredits,
    nextCredits: nextSemCredits,
    desiredCGPA: target,
    requiredGPA: Number(requiredGPA.toFixed(2)),
    maxReachableCGPA,
    isFeasible,
    message
  };
};
