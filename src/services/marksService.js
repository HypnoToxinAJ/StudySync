import { storageService } from './storageService';
import { attendanceService } from './attendanceService';

export const marksService = {
  // Determine required best assessment count (3 for 3-cr theory, 2 for 2-cr theory, 0 for lab/sessional)
  getTheoryBestAssessmentCount: (course) => {
    const courseType = String(course?.courseType || 'theory').toLowerCase();
    const credit = Number(course?.credit || 3.0);

    if (courseType !== 'theory') {
      return 0; // Lab / Sessional course -> CT marks not applicable
    }
    if (credit === 2.0) {
      return 2;
    }
    return 3; // Default 3-credit theory -> best 3
  },

  // Pick top N assessment entries based on obtained marks without mutating original array
  getBestAssessmentEntries: (course, assessments = null) => {
    const courseAssessments = assessments || course?.assessments || [];
    const bestCount = marksService.getTheoryBestAssessmentCount(course);

    if (bestCount === 0 || courseAssessments.length === 0) {
      return [];
    }

    // Clone array and sort descending by obtained mark safely
    const sorted = [...courseAssessments].sort((a, b) => {
      const markA = a.isMissed ? 0 : Number(a.obtainedMarks || 0);
      const markB = b.isMissed ? 0 : Number(b.obtainedMarks || 0);
      if (markB !== markA) {
        return markB - markA;
      }
      // Tie-breaker by date or id for consistency
      return new Date(b.date || 0) - new Date(a.date || 0);
    });

    return sorted.slice(0, Math.min(bestCount, sorted.length));
  },

  // Calculate sum of obtained marks for best selected assessments
  calculateBestAssessmentTotal: (course, assessments = null) => {
    const bestEntries = marksService.getBestAssessmentEntries(course, assessments);
    return bestEntries.reduce((sum, ast) => {
      const mark = ast.isMissed ? 0 : Number(ast.obtainedMarks || 0);
      return sum + mark;
    }, 0);
  },

  // Calculate total max marks for best selected assessments
  calculateBestAssessmentMaximum: (course, assessments = null) => {
    const bestEntries = marksService.getBestAssessmentEntries(course, assessments);
    return bestEntries.reduce((sum, ast) => sum + Number(ast.totalMarks || 20), 0);
  },

  // Calculate percentage of best assessment score
  calculateAssessmentPercentage: (course, assessments = null) => {
    const obtainedTotal = marksService.calculateBestAssessmentTotal(course, assessments);
    const maxTotal = marksService.calculateBestAssessmentMaximum(course, assessments);
    if (maxTotal === 0) return 0;
    return Number(((obtainedTotal / maxTotal) * 100).toFixed(1));
  },

  // Main summary generator for a course card
  getCourseMarksSummary: (course) => {
    const courseType = String(course?.courseType || 'theory').toLowerCase();
    const isApplicable = courseType === 'theory';

    if (!isApplicable) {
      return {
        isApplicable: false,
        message: 'Sessional course — CT marks not applicable',
        bestCount: 0,
        currentCount: 0,
        bestAssessments: [],
        obtainedTotal: 0,
        maxTotal: 0,
        remainingMarks: 0,
        percentage: 0,
        performanceStatus: 'N/A'
      };
    }

    const assessments = course.assessments || [];
    const bestCount = marksService.getTheoryBestAssessmentCount(course);
    const bestEntries = marksService.getBestAssessmentEntries(course, assessments);
    const bestEntryIds = new Set(bestEntries.map(e => e.id));

    const obtainedTotal = marksService.calculateBestAssessmentTotal(course, assessments);
    const maxTotal = marksService.calculateBestAssessmentMaximum(course, assessments);
    const percentage = marksService.calculateAssessmentPercentage(course, assessments);
    const remainingMarks = Math.max(0, maxTotal - obtainedTotal);

    let performanceStatus = 'N/A';
    if (assessments.length > 0) {
      if (percentage >= 85) performanceStatus = 'Excellent';
      else if (percentage >= 70) performanceStatus = 'Good';
      else if (percentage >= 50) performanceStatus = 'Average';
      else performanceStatus = 'Needs Improvement';
    }

    return {
      isApplicable: true,
      bestCount,
      currentCount: assessments.length,
      bestAssessments: bestEntries,
      bestEntryIds,
      obtainedTotal,
      maxTotal,
      remainingMarks,
      percentage,
      performanceStatus,
      message: `Best ${bestCount} selected`
    };
  },

  // Actions for course assessments
  addAssessmentToCourse: (courseId, assessmentData) => {
    const courses = attendanceService.getCourses();
    const index = courses.findIndex(c => c.id === courseId);
    if (index !== -1) {
      const course = courses[index];
      const newAst = {
        id: `ast-${Date.now()}`,
        name: assessmentData.name || 'Class Test',
        type: assessmentData.type || 'CT',
        totalMarks: Number(assessmentData.totalMarks || 20),
        obtainedMarks: assessmentData.isMissed ? 0 : Number(assessmentData.obtainedMarks || 0),
        expectedMarks: Number(assessmentData.expectedMarks || assessmentData.totalMarks || 20),
        date: assessmentData.date || new Date().toISOString().split('T')[0],
        isMissed: Boolean(assessmentData.isMissed),
        notes: assessmentData.notes || ''
      };

      if (!course.assessments) course.assessments = [];
      course.assessments.push(newAst);
      courses[index] = course;
      attendanceService.saveCourses(courses);
      return newAst;
    }
    return null;
  },

  updateAssessmentInCourse: (courseId, assessmentId, updatedData) => {
    const courses = attendanceService.getCourses();
    const cIndex = courses.findIndex(c => c.id === courseId);
    if (cIndex !== -1 && courses[cIndex].assessments) {
      const astIndex = courses[cIndex].assessments.findIndex(a => a.id === assessmentId);
      if (astIndex !== -1) {
        const current = courses[cIndex].assessments[astIndex];
        const updated = {
          ...current,
          ...updatedData,
          totalMarks: Number(updatedData.totalMarks ?? current.totalMarks ?? 20),
          obtainedMarks: updatedData.isMissed
            ? 0
            : Number(updatedData.obtainedMarks ?? current.obtainedMarks ?? 0),
          isMissed: Boolean(updatedData.isMissed ?? current.isMissed)
        };
        courses[cIndex].assessments[astIndex] = updated;
        attendanceService.saveCourses(courses);
        return updated;
      }
    }
    return null;
  },

  deleteAssessmentFromCourse: (courseId, assessmentId) => {
    const courses = attendanceService.getCourses();
    const cIndex = courses.findIndex(c => c.id === courseId);
    if (cIndex !== -1 && courses[cIndex].assessments) {
      courses[cIndex].assessments = courses[cIndex].assessments.filter(a => a.id !== assessmentId);
      attendanceService.saveCourses(courses);
      return true;
    }
    return false;
  },

  toggleAssessmentMissed: (courseId, assessmentId) => {
    const courses = attendanceService.getCourses();
    const cIndex = courses.findIndex(c => c.id === courseId);
    if (cIndex !== -1 && courses[cIndex].assessments) {
      const astIndex = courses[cIndex].assessments.findIndex(a => a.id === assessmentId);
      if (astIndex !== -1) {
        const current = courses[cIndex].assessments[astIndex];
        const newMissedState = !current.isMissed;
        courses[cIndex].assessments[astIndex] = {
          ...current,
          isMissed: newMissedState,
          obtainedMarks: newMissedState ? 0 : current.obtainedMarks
        };
        attendanceService.saveCourses(courses);
        return courses[cIndex].assessments[astIndex];
      }
    }
    return null;
  }
};
