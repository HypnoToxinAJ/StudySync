import { storageService } from './storageService';
import { attendanceService } from './attendanceService';

export const marksService = {
  // Compute assessment metrics for a course
  getCourseMarksSummary: (course) => {
    const assessments = course.assessments || [];
    const nCredit = Math.ceil(course.credit || 3);
    const recommendedAssessmentCount = nCredit + 1;

    let obtainedTotal = 0;
    let expectedTotal = 0;
    let maxTotal = 0;
    let bestScore = null;
    let lowestScore = null;

    assessments.forEach(ast => {
      const obtained = ast.isMissed ? 0 : Number(ast.obtainedMarks || 0);
      const total = Number(ast.totalMarks || 20);
      const expected = Number(ast.expectedMarks || total);

      obtainedTotal += obtained;
      expectedTotal += expected;
      maxTotal += total;

      if (!ast.isMissed) {
        if (bestScore === null || obtained > bestScore) bestScore = obtained;
        if (lowestScore === null || obtained < lowestScore) lowestScore = obtained;
      }
    });

    const percentage = maxTotal > 0 ? ((obtainedTotal / maxTotal) * 100).toFixed(1) : "0.0";
    
    // Projected score contribution out of 20
    const projectedContribution = maxTotal > 0 ? ((obtainedTotal / maxTotal) * 20).toFixed(1) : "20.0";

    return {
      recommendedCount: recommendedAssessmentCount,
      currentCount: assessments.length,
      obtainedTotal,
      expectedTotal,
      maxTotal,
      remainingMarks: Math.max(0, maxTotal - obtainedTotal),
      percentage: Number(percentage),
      projectedContribution: Number(projectedContribution),
      bestScore: bestScore !== null ? bestScore : 0,
      lowestScore: lowestScore !== null ? lowestScore : 0
    };
  },

  addAssessmentToCourse: (courseId, assessmentData) => {
    const courses = attendanceService.getCourses();
    const index = courses.findIndex(c => c.id === courseId);
    if (index !== -1) {
      const newAst = {
        id: `ast-${Date.now()}`,
        isMissed: false,
        obtainedMarks: 0,
        ...assessmentData
      };
      if (newAst.isMissed) newAst.obtainedMarks = 0;
      if (!courses[index].assessments) courses[index].assessments = [];
      courses[index].assessments.push(newAst);
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
        const updated = { ...courses[cIndex].assessments[astIndex], ...updatedData };
        if (updated.isMissed) updated.obtainedMarks = 0;
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
    }
  }
};
