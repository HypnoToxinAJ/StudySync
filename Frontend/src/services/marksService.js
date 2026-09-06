import { attendanceService, COURSE_TYPES, normalizeCourseType } from './attendanceService.js';
import { courseApi } from './courseApi.js';

export const marksService = {
  // Determine whether CT marks apply to this course
  isApplicable: (course) => {
    return attendanceService.isTheory(course);
  },

  // Calculate CT structure automatically from credits: Total CTs = credits + 1, Best CTs = credits
  getCourseCTStructure: (course) => {
    if (!marksService.isApplicable(course)) {
      return {
        isApplicable: false,
        totalCTs: 0,
        bestCount: 0,
        message: 'CT marks are not applicable for Sessional/Lab courses.'
      };
    }

    const credit = Number(course?.credit || 3.0);
    const roundedCredit = Math.max(1, Math.round(credit));
    const totalCTs = roundedCredit + 1; // e.g. 3 + 1 = 4 CTs; 2 + 1 = 3 CTs
    const bestCount = roundedCredit;    // e.g. best 3; best 2

    return {
      isApplicable: true,
      totalCTs,
      bestCount,
      message: `Best ${bestCount} of ${totalCTs}`
    };
  },

  // Helper backward compatibility
  getTheoryBestAssessmentCount: (course) => {
    return marksService.getCourseCTStructure(course).bestCount;
  },

  // Get full CT matrix row for table view (Section 14 & 16)
  getCourseCTMatrixRow: (course) => {
    const structure = marksService.getCourseCTStructure(course);
    if (!structure.isApplicable) {
      return {
        courseId: course.id,
        courseCode: course.courseId,
        courseTitle: course.courseTitle,
        credit: course.credit,
        courseType: course.courseType,
        isApplicable: false,
        message: 'CT marks are not applicable for Sessional/Lab courses.',
        totalCTs: 0,
        bestCount: 0,
        slots: [],
        completedCount: 0,
        bestEntries: [],
        bestValuesFormatted: '—',
        resultPercentage: null,
        formattedResult: 'Not Applicable'
      };
    }

    const { totalCTs, bestCount } = structure;
    const rawAssessments = course.assessments || [];

    // Map each CT number slot (1 .. totalCTs)
    const slots = [];
    const completedList = [];

    for (let ctNum = 1; ctNum <= totalCTs; ctNum++) {
      // Find matching CT mark by ctNumber or name
      const entry = rawAssessments.find(a => {
        const num = Number(a.ctNumber || a.ct_number || (a.name && (a.name.match(/CT\s*[-–]?\s*(\d+)/i) || [])[1]));
        return num === ctNum;
      });

      if (entry && !entry.isMissed && entry.obtainedMarks !== undefined && entry.obtainedMarks !== null) {
        const obtained = Number(entry.obtainedMarks);
        const total = Number(entry.totalMarks || 20);
        slots.push({
          ctNumber: ctNum,
          label: `CT ${ctNum}`,
          entry,
          isCompleted: true,
          obtainedMarks: obtained,
          totalMarks: total,
          percentage: total > 0 ? (obtained / total) * 100 : 0
        });
        completedList.push({
          ...entry,
          ctNumber: ctNum,
          obtainedMarks: obtained,
          totalMarks: total
        });
      } else {
        slots.push({
          ctNumber: ctNum,
          label: `CT ${ctNum}`,
          entry: entry || null,
          isCompleted: false,
          obtainedMarks: null,
          totalMarks: Number(entry?.totalMarks || 20)
        });
      }
    }

    // Incomplete CT handling: sort completed CTs descending by score
    const sortedCompleted = [...completedList].sort((a, b) => {
      // Sort primarily by percentage then by obtained
      const pctA = (a.obtainedMarks / (a.totalMarks || 20));
      const pctB = (b.obtainedMarks / (b.totalMarks || 20));
      return pctB - pctA;
    });

    const bestEntries = sortedCompleted.slice(0, Math.min(bestCount, sortedCompleted.length));
    const bestIds = new Set(bestEntries.map(e => e.id));

    let bestObtainedSum = 0;
    let bestMaxSum = 0;
    bestEntries.forEach(e => {
      bestObtainedSum += e.obtainedMarks;
      bestMaxSum += e.totalMarks;
    });

    const resultPercentage = bestMaxSum > 0
      ? Number(((bestObtainedSum / bestMaxSum) * 100).toFixed(1))
      : null;

    const bestValuesFormatted = bestEntries.length > 0
      ? bestEntries.map(e => e.obtainedMarks).join(', ')
      : '—';

    const formattedResult = resultPercentage !== null
      ? `${resultPercentage}%`
      : 'Not Taken';

    return {
      courseId: course.id,
      courseCode: course.courseId,
      courseTitle: course.courseTitle,
      credit: course.credit,
      courseType: course.courseType,
      color: course.color,
      isApplicable: true,
      totalCTs,
      bestCount,
      slots,
      completedCount: completedList.length,
      completionText: `Completed: ${completedList.length} / ${totalCTs}`,
      isFullyCompleted: completedList.length >= bestCount,
      bestEntries,
      bestIds,
      bestObtainedSum,
      bestMaxSum,
      bestValuesFormatted,
      resultPercentage,
      formattedResult
    };
  },

  // Main summary generator for a course card (Section 20)
  getCourseMarksSummary: (course) => {
    const matrix = marksService.getCourseCTMatrixRow(course);
    if (!matrix.isApplicable) {
      return {
        isApplicable: false,
        message: 'CT marks are not applicable for Sessional/Lab courses.',
        bestCount: 0,
        totalCTs: 0,
        currentCount: 0,
        bestAssessments: [],
        bestEntryIds: new Set(),
        obtainedTotal: 0,
        maxTotal: 0,
        percentage: 0,
        performanceStatus: 'Not Applicable'
      };
    }

    let performanceStatus = 'Not Started';
    if (matrix.completedCount > 0) {
      const pct = matrix.resultPercentage || 0;
      if (pct >= 85) performanceStatus = 'Excellent';
      else if (pct >= 70) performanceStatus = 'Good';
      else if (pct >= 50) performanceStatus = 'Average';
      else performanceStatus = 'Needs Improvement';
    }

    return {
      isApplicable: true,
      bestCount: matrix.bestCount,
      totalCTs: matrix.totalCTs,
      currentCount: matrix.completedCount,
      completionText: matrix.completionText,
      bestAssessments: matrix.bestEntries,
      bestEntryIds: matrix.bestIds,
      obtainedTotal: matrix.bestObtainedSum,
      maxTotal: matrix.bestMaxSum,
      percentage: matrix.resultPercentage || 0,
      performanceStatus,
      message: `Best ${matrix.bestCount} of ${matrix.totalCTs}`,
      formattedResult: matrix.formattedResult
    };
  },

  // Add a CT mark to a course with strict validations (Section 17 & 25)
  addCTMarkToCourse: (courseId, markData) => {
    const courses = attendanceService.getCourses();
    const index = courses.findIndex(c => c.id === courseId || c.courseId === courseId);
    if (index === -1) {
      return { success: false, error: 'Course not found.' };
    }

    const course = { ...courses[index] };
    if (!marksService.isApplicable(course)) {
      return { success: false, error: 'CT marks cannot be added to Sessional or Lab courses.' };
    }

    const structure = marksService.getCourseCTStructure(course);
    const ctNumber = Number(markData.ctNumber);

    if (!Number.isInteger(ctNumber) || ctNumber < 1 || ctNumber > structure.totalCTs) {
      return {
        success: false,
        error: `CT Number must be between 1 and ${structure.totalCTs} for this ${course.credit}-credit course.`
      };
    }

    const obtainedMarks = Number(markData.obtainedMarks);
    const totalMarks = Number(markData.totalMarks || 20);

    if (isNaN(obtainedMarks) || obtainedMarks < 0) {
      return { success: false, error: 'Obtained marks cannot be negative.' };
    }
    if (obtainedMarks > totalMarks) {
      return { success: false, error: `Obtained marks (${obtainedMarks}) cannot exceed total marks (${totalMarks}).` };
    }

    if (!course.assessments) course.assessments = [];

    // Duplicate check: do not allow duplicate marks for the same CT number in the same course
    const duplicate = course.assessments.find(a => {
      const num = Number(a.ctNumber || a.ct_number || (a.name && (a.name.match(/CT\s*[-–]?\s*(\d+)/i) || [])[1]));
      return num === ctNumber;
    });

    if (duplicate) {
      return {
        success: false,
        error: `CT-${ctNumber} already exists for this course. Please edit or delete the existing mark instead.`
      };
    }

    const newAst = {
      id: `ct-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ctNumber,
      name: `CT-${ctNumber}`,
      type: 'CT',
      totalMarks,
      obtainedMarks,
      date: markData.date || new Date().toISOString().split('T')[0],
      isMissed: false,
      notes: markData.notes || '',
      createdAt: new Date().toISOString()
    };

    course.assessments.push(newAst);
    courses[index] = course;
    attendanceService.saveCourses(courses);

    void courseApi.update(course.id, {
      courseId: course.courseId,
      courseTitle: course.courseTitle,
      courseType: course.courseType,
      credit: course.credit,
      assessments: course.assessments
    }).catch(() => {});
    return { success: true, course, entry: newAst };
  },

  updateCTMarkInCourse: (courseId, markId, updatedData) => {
    const courses = attendanceService.getCourses();
    const cIndex = courses.findIndex(c => c.id === courseId || c.courseId === courseId);
    if (cIndex === -1) return { success: false, error: 'Course not found.' };

    const course = { ...courses[cIndex] };
    if (!course.assessments) return { success: false, error: 'No assessments found.' };

    const astIndex = course.assessments.findIndex(a => a.id === markId);
    if (astIndex === -1) return { success: false, error: 'CT mark record not found.' };

    const existing = course.assessments[astIndex];
    const structure = marksService.getCourseCTStructure(course);

    const ctNumber = Number(updatedData.ctNumber ?? existing.ctNumber);
    if (!Number.isInteger(ctNumber) || ctNumber < 1 || ctNumber > structure.totalCTs) {
      return { success: false, error: `CT Number must be between 1 and ${structure.totalCTs}.` };
    }

    const totalMarks = Number(updatedData.totalMarks ?? existing.totalMarks ?? 20);
    const obtainedMarks = Number(updatedData.obtainedMarks ?? existing.obtainedMarks ?? 0);

    if (obtainedMarks < 0 || obtainedMarks > totalMarks) {
      return { success: false, error: 'Obtained marks must be between 0 and total marks.' };
    }

    // Check duplicate if CT number changed
    if (ctNumber !== existing.ctNumber) {
      const duplicate = course.assessments.find(a => a.id !== markId && Number(a.ctNumber) === ctNumber);
      if (duplicate) {
        return { success: false, error: `CT-${ctNumber} already exists for this course.` };
      }
    }

    const updated = {
      ...existing,
      ctNumber,
      name: `CT-${ctNumber}`,
      totalMarks,
      obtainedMarks,
      date: updatedData.date || existing.date,
      notes: updatedData.notes !== undefined ? updatedData.notes : existing.notes,
      updatedAt: new Date().toISOString()
    };

    course.assessments[astIndex] = updated;
    courses[cIndex] = course;
    attendanceService.saveCourses(courses);

    void courseApi.update(course.id, {
      courseId: course.courseId,
      courseTitle: course.courseTitle,
      courseType: course.courseType,
      credit: course.credit,
      assessments: course.assessments
    }).catch(() => {});
    return { success: true, course, entry: updated };
  },

  deleteCTMarkFromCourse: (courseId, markId) => {
    const courses = attendanceService.getCourses();
    const cIndex = courses.findIndex(c => c.id === courseId || c.courseId === courseId);
    if (cIndex === -1) return false;

    const course = { ...courses[cIndex] };
    if (!course.assessments) return false;

    course.assessments = course.assessments.filter(a => a.id !== markId);
    courses[cIndex] = course;
    attendanceService.saveCourses(courses);

    void courseApi.update(course.id, {
      courseId: course.courseId,
      courseTitle: course.courseTitle,
      courseType: course.courseType,
      credit: course.credit,
      assessments: course.assessments
    }).catch(() => {});
    return true;
  },

  // Backward compatibility alias
  addAssessmentToCourse: (courseId, data) => {
    return marksService.addCTMarkToCourse(courseId, data);
  },
  updateAssessmentInCourse: (courseId, id, data) => {
    return marksService.updateCTMarkInCourse(courseId, id, data);
  },
  deleteAssessmentFromCourse: (courseId, id) => {
    return marksService.deleteCTMarkFromCourse(courseId, id);
  }
};
