/**
 * ============================================================================
 * TRACKER BUSINESS LOGIC & CALCULATION SERVICE
 * ============================================================================
 */

/**
 * Calculate maximum safe missed classes allowed before marks deduction.
 * Formula:
 * - Theory 3-credit: 3 max safe misses
 * - Theory 2-credit: 2 max safe misses
 * - Lab 1.5-credit: 1 max safe miss
 * - Lab 0.75-credit: 0 max safe misses
 */
export const calculateMaxSafeMisses = (credit, type) => {
  const numCredit = Number(credit) || 3.0;
  const isTheory = String(type || 'THEORY').toUpperCase() === 'THEORY';

  if (isTheory) {
    if (numCredit >= 3) return 3;
    if (numCredit >= 2) return 2;
    return Math.max(1, Math.round(numCredit));
  } else {
    // Sessional / Lab
    if (numCredit >= 1.5) return 1;
    return 0;
  }
};

/**
 * Determine academic performance rating label based on percentage.
 */
export const getPerformanceRating = (percentage) => {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return { rating: 'No Data', variant: 'slate' };
  }
  if (percentage >= 90) return { rating: 'Excellent', variant: 'emerald' };
  if (percentage >= 80) return { rating: 'Good', variant: 'cyan' };
  if (percentage >= 70) return { rating: 'Average', variant: 'amber' };
  return { rating: 'Needs Improvement', variant: 'rose' };
};

/**
 * Top-N Assessment Calculation Algorithm.
 * Evaluates assessments, handles missed status, sorts descending by percentage,
 * selects the top N, and aggregates scores.
 */
export const computeTopNAssessments = (course, assessments = []) => {
  const isTheory = String(course.type || course.courseType || 'THEORY').toUpperCase() === 'THEORY';

  if (!isTheory) {
    return {
      isApplicable: false,
      message: 'Sessional course — CT marks not applicable',
      bestCount: 0,
      totalExpectedCTs: 0,
      assessmentsCount: assessments.length,
      bestObtainedSum: 0,
      bestTotalSum: 0,
      bestPercentage: null,
      rating: null,
      ratingVariant: 'slate',
      items: []
    };
  }

  const credit = Number(course.credit) || 3.0;
  const defaultN = Math.max(1, Math.round(credit));
  const bestCount = course.bestNConfig || defaultN; // e.g. Best 3 of 4
  const totalExpectedCTs = defaultN + 1; // e.g. 4

  // Normalize assessments with percentages
  const parsedItems = assessments.map(item => {
    const obtained = item.isMissed ? 0 : Number(item.obtainedMarks || 0);
    const total = Number(item.totalMarks || 20);
    const percentage = total > 0 ? (obtained / total) * 100 : 0;

    return {
      ...item,
      obtainedMarks: obtained,
      totalMarks: total,
      percentage: Number(percentage.toFixed(1)),
      isBestSelected: false
    };
  });

  // Sort descending by percentage, then by obtainedMarks
  const sorted = [...parsedItems].sort((a, b) => {
    if (b.percentage !== a.percentage) {
      return b.percentage - a.percentage;
    }
    return b.obtainedMarks - a.obtainedMarks;
  });

  // Pick top N valid assessments
  const topN = sorted.slice(0, Math.min(bestCount, sorted.length));
  const topNIds = new Set(topN.map(i => String(i._id || i.id)));

  let bestObtainedSum = 0;
  let bestTotalSum = 0;

  topN.forEach(item => {
    bestObtainedSum += item.obtainedMarks;
    bestTotalSum += item.totalMarks;
  });

  const bestPercentage = bestTotalSum > 0
    ? Number(((bestObtainedSum / bestTotalSum) * 100).toFixed(1))
    : 0;

  const { rating, variant: ratingVariant } = getPerformanceRating(bestPercentage);

  // Mark items with isBestSelected flag
  const formattedItems = parsedItems.map(item => ({
    ...item,
    isBestSelected: topNIds.has(String(item._id || item.id))
  }));

  return {
    isApplicable: true,
    message: `Best ${bestCount} selected`,
    bestCount,
    totalExpectedCTs,
    assessmentsCount: parsedItems.length,
    bestObtainedSum: Number(bestObtainedSum.toFixed(1)),
    bestTotalSum,
    bestPercentage,
    scoreFormatted: `${bestObtainedSum} / ${bestTotalSum} Marks`,
    rating,
    ratingVariant,
    items: formattedItems
  };
};

/**
 * Dynamic Absence Status & Safe Miss Analytics.
 */
export const computeAbsenceAnalytics = (course) => {
  const credit = Number(course.credit) || 3.0;
  const type = String(course.type || course.courseType || 'THEORY').toUpperCase();
  const scheduledClasses = Number(course.scheduledClasses || 39);

  const history = Array.isArray(course.missedClassHistory)
    ? course.missedClassHistory
    : Array.isArray(course.history)
    ? course.history.filter(h => String(h.status).toLowerCase() === 'missed' || String(h.status).toUpperCase() === 'ABSENT')
    : [];

  const missedCount = Number(course.missedClasses !== undefined ? course.missedClasses : history.length);
  const maxSafe = course.maxSafeMisses !== undefined && course.maxSafeMisses !== null
    ? Number(course.maxSafeMisses)
    : calculateMaxSafeMisses(credit, type);

  const remainingSafe = Math.max(0, maxSafe - missedCount);
  const hasDeductionRisk = missedCount > maxSafe;
  const isLimitReached = missedCount === maxSafe;
  const exceededBy = Math.max(0, missedCount - maxSafe);

  const capacityRatio = `${missedCount}/${maxSafe}`;
  const capacityPercentage = maxSafe > 0
    ? Math.min(100, Math.round((missedCount / maxSafe) * 100))
    : 100;

  let status = 'SAFE';
  let statusLabel = 'SAFE';
  let alertMessage = null;

  if (hasDeductionRisk) {
    status = 'MARKS_DEDUCTION_RISK';
    statusLabel = 'MARKS DEDUCTION RISK';
    alertMessage = `Exceeded safe limit of ${maxSafe} misses! Marks deduction applicable.`;
  } else if (isLimitReached) {
    status = 'LIMIT_REACHED';
    statusLabel = 'LIMIT REACHED';
    alertMessage = `You have reached your safe limit of ${maxSafe} misses. Next absence risks marks deduction.`;
  }

  return {
    scheduledClasses,
    missedClasses: missedCount,
    maxSafeMisses: maxSafe,
    remainingSafe,
    hasDeductionRisk,
    isLimitReached,
    exceededBy,
    status,
    statusLabel,
    capacityRatio,
    capacityPercentage,
    alertMessage,
    missedHistory: history
  };
};

/**
 * Master Course Analytics Aggregator.
 */
export const enrichCourseData = (course, assessments = []) => {
  const absence = computeAbsenceAnalytics(course);
  const ctPerformance = computeTopNAssessments(course, assessments);

  return {
    ...course,
    absence,
    ctPerformance
  };
};
