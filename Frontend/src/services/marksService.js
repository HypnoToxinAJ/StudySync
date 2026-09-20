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

  getCourseAssessmentsOverview: (course) => {
    if (!marksService.isApplicable(course)) {
      return {
        isApplicable: false,
        message: 'Sessional course — CT marks not applicable',
        items: []
      };
    }

    const credit = Number(course?.credit || 3.0);
    const defaultN = Math.max(1, Math.round(credit));
    const bestCount = course.bestNConfig || defaultN;
    const rawAssessments = course.assessments || [];

    const parsed = rawAssessments.map((item, idx) => {
      const isMissed = Boolean(item.isMissed);
      const obtained = isMissed ? 0 : Number(item.obtainedMarks !== undefined ? item.obtainedMarks : 0);
      const total = Number(item.totalMarks || 20);
      const percentage = total > 0 ? (obtained / total) * 100 : 0;
      const title = item.title || item.name || `CT ${item.ctNumber || idx + 1}`;
      const type = String(item.type || 'CT').toUpperCase();
      const date = item.date ? String(item.date).split('T')[0] : '2026-06-10';

      return {
        id: item.id || `ast-${idx}`,
        title,
        type,
        obtainedMarks: obtained,
        totalMarks: total,
        percentage,
        isMissed,
        date,
        isBestSelected: false
      };
    });

    const sorted = [...parsed].sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      return b.obtainedMarks - a.obtainedMarks;
    });

    const topN = sorted.slice(0, Math.min(bestCount, sorted.length));
    const topNIds = new Set(topN.map(a => a.id));

    let bestObtainedSum = 0;
    let bestTotalSum = 0;
    topN.forEach(a => {
      bestObtainedSum += a.obtainedMarks;
      bestTotalSum += a.totalMarks;
    });

    bestObtainedSum = Number(bestObtainedSum.toFixed(1));
    const bestPercentage = bestTotalSum > 0
      ? Number(((bestObtainedSum / bestTotalSum) * 100).toFixed(1))
      : 0;

    let rating = 'Average';
    if (bestPercentage >= 90) rating = 'Excellent';
    else if (bestPercentage >= 80) rating = 'Good';
    else if (bestPercentage >= 70) rating = 'Average';
    else rating = 'Needs Improvement';

    const items = parsed.map(item => ({
      ...item,
      isBestSelected: topNIds.has(item.id)
    }));

    return {
      isApplicable: true,
      message: `Best ${bestCount} selected`,
      bestCount,
      totalAssessmentsCount: parsed.length,
      bestObtainedSum,
      bestTotalSum,
      bestPercentage,
      bestScoreFormatted: `${bestObtainedSum} / ${bestTotalSum} Marks`,
      rating,
      items
    };
  },

  // Add a CT / Assessment mark to a course
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

    if (!course.assessments) course.assessments = [];

    // Derive or auto-detect CT number
    let ctNumber = markData.ctNumber !== undefined && markData.ctNumber !== null && markData.ctNumber !== ''
      ? Number(markData.ctNumber)
      : null;

    if (!ctNumber || isNaN(ctNumber) || ctNumber < 1) {
      const titleStr = String(markData.title || markData.name || '');
      const match = titleStr.match(/CT\s*[-–#]?\s*(\d+)/i) || titleStr.match(/(\d+)/);
      if (match && match[1]) {
        ctNumber = Number(match[1]);
      } else {
        ctNumber = course.assessments.length + 1;
      }
    }

    const obtainedMarks = markData.isMissed ? 0 : Number(markData.obtainedMarks || 0);
    const totalMarks = Number(markData.totalMarks || 20);

    if (isNaN(obtainedMarks) || obtainedMarks < 0) {
      return { success: false, error: 'Obtained marks cannot be negative.' };
    }
    if (obtainedMarks > totalMarks) {
      return { success: false, error: `Obtained marks (${obtainedMarks}) cannot exceed total marks (${totalMarks}).` };
    }

    const type = String(markData.type || (markData.title?.toLowerCase().includes('assignment') ? 'ASSIGNMENT' : 'CT')).toUpperCase();
    const title = markData.title || markData.name || (type === 'CT' ? `CT ${ctNumber}` : `${type} ${ctNumber}`);

    const newAst = {
      id: `ast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ctNumber,
      name: title,
      title,
      type,
      totalMarks,
      obtainedMarks,
      date: markData.date || new Date().toISOString().split('T')[0],
      isMissed: Boolean(markData.isMissed),
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

    let ctNumber = updatedData.ctNumber !== undefined && updatedData.ctNumber !== null && updatedData.ctNumber !== ''
      ? Number(updatedData.ctNumber)
      : existing.ctNumber;

    if (!ctNumber || isNaN(ctNumber) || ctNumber < 1) {
      ctNumber = astIndex + 1;
    }

    const totalMarks = Number(updatedData.totalMarks ?? existing.totalMarks ?? 20);
    const obtainedMarks = updatedData.isMissed ? 0 : Number(updatedData.obtainedMarks ?? existing.obtainedMarks ?? 0);

    if (obtainedMarks < 0 || obtainedMarks > totalMarks) {
      return { success: false, error: `Obtained marks (${obtainedMarks}) cannot exceed total marks (${totalMarks}).` };
    }

    const type = String(updatedData.type || existing.type || 'CT').toUpperCase();
    const title = updatedData.title || updatedData.name || existing.title || existing.name || `CT ${ctNumber}`;

    const updated = {
      ...existing,
      ctNumber,
      name: title,
      title,
      type,
      totalMarks,
      obtainedMarks,
      isMissed: Boolean(updatedData.isMissed !== undefined ? updatedData.isMissed : existing.isMissed),
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
