/**
 * CUET Result Portal HTML & Response Parser
 * Adapts and extends parsing algorithms from TheSR007/CUET_Result_Viewer (Apache-2.0).
 * Reference: https://github.com/TheSR007/CUET_Result_Viewer
 */

import {
  CUET_GRADE_POINTS,
  getGradePoint,
  isPassingGrade,
  categorizeCourseType,
  calculateSemesterMetrics,
  calculateOverallMetrics
} from '../utils/cgpaCalculations';

/**
 * Parses raw HTML string or DOM from CUET result portal into a normalized model.
 * @param {string|Document|Element} rawInput - HTML string or DOM node from CUET result portal
 * @param {Object} fallbackStudent - Fallback student data (e.g. from login form)
 * @returns {Object} Normalized Academic Result model
 */
export const parseCuetResultHtml = (rawInput, fallbackStudent = {}) => {
  let doc;

  if (typeof rawInput === 'string') {
    // If empty or invalid string
    if (!rawInput.trim()) {
      throw new Error('Empty result received from portal.');
    }
    const parser = new DOMParser();
    doc = parser.parseFromString(rawInput, 'text/html');
  } else if (rawInput && typeof rawInput.querySelectorAll === 'function') {
    doc = rawInput;
  } else {
    throw new Error('Unsupported input format provided to parser.');
  }

  // 1. Extract Student Information
  const student = extractStudentInfo(doc, fallbackStudent);

  // 2. Extract Course Rows
  const rawRows = extractCourseRows(doc);
  if (rawRows.length === 0) {
    // Check if there is an explicit "No result" message
    const bodyText = doc.body ? doc.body.textContent : '';
    if (bodyText.includes('No result') || bodyText.includes('not published') || bodyText.includes('Not Found')) {
      throw new Error('No published results found for this Student ID.');
    }
    throw new Error('StudySync could not recognize the portal response format. No course records found.');
  }

  // 3. Process Courses & Terms with Repeated-Course Resolution
  const parsedTerms = processTermsAndCourses(rawRows);

  // 4. Calculate Overall CGPA and Quality Points
  const overallMetrics = calculateOverallMetrics(parsedTerms);

  const normalized = {
    student,
    semesters: parsedTerms,
    overall: {
      cgpa: overallMetrics.calculatedCgpa,
      calculatedCgpa: overallMetrics.calculatedCgpa,
      completedCredits: overallMetrics.totalCompletedCredits,
      attemptedCredits: overallMetrics.totalAttemptedCredits,
      qualityPoints: overallMetrics.totalQualityPoints,
      highestGpa: overallMetrics.highestGpa,
      totalSemesters: overallMetrics.totalSemesters,
      failedCoursesCount: overallMetrics.failedCoursesCount,
      clearedCoursesCount: overallMetrics.clearedCoursesCount
    },
    failedCourses: overallMetrics.failedCourses,
    fetchedAt: new Date().toISOString(),
    source: 'CUET Result Portal',
    schemaVersion: '1.0.0',
    isSavedCopy: false
  };

  return normalized;
};

/**
 * Extracts student metadata from portal DOM headers or metadata tables
 */
function extractStudentInfo(doc, fallback = {}) {
  let studentId = fallback.studentId || '';
  let name = fallback.name || '';
  let department = fallback.department || '';
  let batch = fallback.batch || '';

  // Scan text and tables for identity labels
  const textContent = doc.body ? doc.body.innerText || doc.body.textContent || '' : '';

  // Extract Student ID
  if (!studentId) {
    const idMatch = textContent.match(/Student\s*(?:ID|Roll|No\.?)[\s:]*([0-9A-Za-z_-]+)/i);
    if (idMatch) studentId = idMatch[1].trim();
  }

  // Extract Name
  const nameMatch = textContent.match(/Student\s*Name[\s:]*([A-Za-z.\s'-]+?)(?=\n|\r|Department|Roll|ID|Batch|$)/i) ||
                    textContent.match(/Name\s*of\s*Student[\s:]*([A-Za-z.\s'-]+?)(?=\n|\r|Department|Roll|ID|Batch|$)/i);
  if (nameMatch && nameMatch[1].trim().length > 1) {
    name = nameMatch[1].trim();
  }

  // Extract Department
  const deptMatch = textContent.match(/Department\s*(?:of)?[\s:]*([A-Za-z\s&,()-]+?)(?=\n|\r|Batch|Roll|ID|Name|$)/i);
  if (deptMatch && deptMatch[1].trim().length > 1) {
    department = deptMatch[1].trim();
  }

  // Extract Batch or infer from Student ID (e.g. 1904001 -> '19')
  const batchMatch = textContent.match(/Batch[\s:]*([0-9]+['’]?[A-Za-z]*)/i);
  if (batchMatch) {
    batch = batchMatch[1].trim();
  } else if (studentId && /^\d{2}/.test(studentId)) {
    batch = `'${studentId.substring(0, 2)}`;
  }

  // Determine Department by ID prefix if missing (CUET CSE is 04, EEE 02, ME 03, CE 01, etc.)
  if (!department && studentId && studentId.length >= 4) {
    const deptCode = studentId.substring(2, 4);
    const deptMap = {
      '01': 'Civil Engineering',
      '02': 'Electrical & Electronic Engineering',
      '03': 'Mechanical Engineering',
      '04': 'Computer Science & Engineering',
      '05': 'Urban & Regional Planning',
      '06': 'Architecture',
      '07': 'Petroleum & Mining Engineering',
      '08': 'Mechatronics & Industrial Engineering',
      '09': 'Electronics & Telecommunication Engineering',
      '10': 'Materials Science & Engineering'
    };
    if (deptMap[deptCode]) {
      department = deptMap[deptCode];
    }
  }

  return {
    studentId: studentId || 'CUET Student',
    name: name || 'CUET Student',
    department: department || 'Engineering & Technology',
    batch: batch || 'N/A'
  };
}

/**
 * Extracts raw table rows from the document.
 * Checks for .productall_row first, then standard tables with course grade headers.
 */
function extractCourseRows(doc) {
  // 1. Check for .productall_row class as used in CUET course portal
  const productRows = doc.querySelectorAll('.productall_row');
  if (productRows.length > 0) {
    return Array.from(productRows);
  }

  // 2. Fallback: Search all tables and identify course rows
  const allRows = doc.querySelectorAll('table tr');
  const matchingRows = [];

  allRows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 4) {
      // Test if any cell contains a valid grade (A+, A, B, C, D, F) and a valid credit number
      let hasCredit = false;
      let hasGrade = false;
      let hasCourseCode = false;

      cells.forEach((cell, idx) => {
        const text = cell.textContent.trim();
        const num = parseFloat(text);
        if (!isNaN(num) && (num === 0.75 || num === 1.5 || num === 2.0 || num === 3.0 || num === 4.0 || num === 6.0)) {
          hasCredit = true;
        }
        if (CUET_GRADE_POINTS[text.toUpperCase()] !== undefined) {
          hasGrade = true;
        }
        if (/[A-Za-z]{2,5}[-\s]?[0-9]{3}/.test(text)) {
          hasCourseCode = true;
        }
      });

      if ((hasGrade && hasCredit) || (hasCourseCode && hasGrade)) {
        matchingRows.push(row);
      }
    }
  });

  if (matchingRows.length > 0) {
    return matchingRows;
  }

  // 3. Broader fallback: search text blocks that look like course result rows.
  const allElements = Array.from(doc.querySelectorAll('body *'));
  const candidateBlocks = allElements.filter(element => {
    const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length < 20) return false;
    const hasGrade = /\b(A\+|A-|A|B\+|B-|B|C\+|C|D|F)\b/i.test(text);
    const hasCredit = /\b(?:0\.75|1\.5|2(?:\.0)?|3(?:\.0)?|4(?:\.0)?|6(?:\.0)?)\b/.test(text);
    const hasCourseCode = /\b[A-Za-z]{2,5}[-\s]?[0-9]{3}\b/.test(text);
    const hasTerm = /Level\s*\d+\s*[-–]\s*Term\s*(?:[IVX]+|\d+)/i.test(text) || /L\s*[-–]?\s*\d+\s*T\s*[-–]?\s*(?:[IVX]+|\d+)/i.test(text);
    return hasGrade && hasCredit && hasCourseCode && hasTerm;
  });

  return candidateBlocks;
}

/**
 * Processes table rows into structured semesters and courses with repeated-course resolution
 */
function processTermsAndCourses(rows) {
  // First Pass: Extract all items and track course occurrences to identify repeats
  const rawEntries = [];
  const courseCountMap = new Map();

  rows.forEach((row, index) => {
    const cells = typeof row.getElementsByTagName === 'function' ? row.getElementsByTagName('td') : [];
    const hasCellStructure = cells && cells.length >= 4;

    let courseCode = '';
    let courseTitle = '';
    let credits = 3.0;
    let levelTerm = '';
    let letterGrade = '';
    let gradePoint = 0.00;

    if (hasCellStructure && cells.length >= 6) {
      // Standard CUET layout:
      // cells[0]: Subject Code
      // cells[1]: Credits
      // cells[2]: Level - Term
      // cells[3]: Course Title / Examination
      // cells[4]: Letter Grade
      // cells[5]: Remarks / Grade Point
      courseCode = cells[0].textContent.trim();
      credits = parseFloat(cells[1].textContent.trim());
      levelTerm = cells[2].textContent.trim();
      courseTitle = cells[3].textContent.trim();
      letterGrade = cells[4].textContent.trim().toUpperCase();
      const gpVal = parseFloat(cells[5].textContent.trim());
      gradePoint = !isNaN(gpVal) ? gpVal : getGradePoint(letterGrade);
    } else if (hasCellStructure && cells.length === 5) {
      // 5-column layout: Code, Title, Credits, LevelTerm, Grade
      courseCode = cells[0].textContent.trim();
      courseTitle = cells[1].textContent.trim();
      credits = parseFloat(cells[2].textContent.trim());
      levelTerm = cells[3].textContent.trim();
      letterGrade = cells[4].textContent.trim().toUpperCase();
      gradePoint = getGradePoint(letterGrade);
    } else if (hasCellStructure) {
      // 4-column layout: Code, Credits, LevelTerm, Grade
      courseCode = cells[0].textContent.trim();
      credits = parseFloat(cells[1].textContent.trim());
      levelTerm = cells[2].textContent.trim();
      letterGrade = cells[3].textContent.trim().toUpperCase();
      gradePoint = getGradePoint(letterGrade);
    } else {
      const text = (row.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;

      const codeMatch = text.match(/\b([A-Za-z]{2,5}[-\s]?[0-9]{3})\b/);
      const gradeMatch = text.match(/\b(A\+|A-|A|B\+|B-|B|C\+|C|D|F)\b/i);
      const creditMatch = text.match(/\b(0\.75|1\.5|2(?:\.0)?|3(?:\.0)?|4(?:\.0)?|6(?:\.0)?)\b/);
      const termMatch = text.match(/(Level\s*\d+\s*[-–]\s*Term\s*(?:[IVX]+|\d+)|L\s*[-–]?\s*\d+\s*T\s*[-–]?\s*(?:[IVX]+|\d+))/i);

      courseCode = codeMatch ? codeMatch[1].trim() : '';
      courseTitle = courseCode;
      credits = creditMatch ? parseFloat(creditMatch[1]) : 3.0;
      levelTerm = termMatch ? termMatch[1].replace(/\s+/g, ' ').trim() : '';
      letterGrade = gradeMatch ? gradeMatch[1].trim().toUpperCase() : '';
      gradePoint = getGradePoint(letterGrade);
    }

    if (!courseCode || isNaN(credits) || !letterGrade) return;

    // Normalize grade
    if (CUET_GRADE_POINTS[letterGrade] === undefined) {
      // Fallback grade point
      gradePoint = 0.00;
    } else {
      gradePoint = CUET_GRADE_POINTS[letterGrade];
    }

    // Default levelTerm if missing
    if (!levelTerm) {
      levelTerm = 'Level 1 - Term I';
    }

    const count = (courseCountMap.get(courseCode) || 0) + 1;
    courseCountMap.set(courseCode, count);

    rawEntries.push({
      id: `c-fetch-${index}-${courseCode}`,
      courseCode,
      courseTitle: courseTitle || courseCode,
      credit: credits,
      levelTerm,
      letterGrade,
      gradePoint,
      qualityPoints: Number((credits * gradePoint).toFixed(2)),
      status: letterGrade === 'F' ? 'Failed' : 'Passed',
      courseType: categorizeCourseType(courseCode, courseTitle, credits),
      rawIndex: index
    });
  });

  // Track latest attempt for each course code to mark repeated previous attempts
  const latestGradeMap = new Map();
  rawEntries.forEach(entry => {
    if (!latestGradeMap.has(entry.courseCode) || entry.letterGrade !== 'F') {
      latestGradeMap.set(entry.courseCode, entry.letterGrade);
    }
  });

  // Group into Semesters / Terms
  const termMap = new Map();

  rawEntries.forEach(entry => {
    const isMultiAttempt = (courseCountMap.get(entry.courseCode) || 0) > 1;
    const isLatest = latestGradeMap.get(entry.courseCode) === entry.letterGrade;
    const isRepeated = isMultiAttempt && !isLatest;

    const courseItem = {
      courseCode: entry.courseCode,
      courseTitle: entry.courseTitle || 'Not provided',
      credit: entry.credit,
      letterGrade: entry.letterGrade,
      gradePoint: entry.gradePoint,
      qualityPoints: entry.qualityPoints,
      status: entry.letterGrade === 'F' ? 'Failed' : (isRepeated ? 'Repeated' : 'Passed'),
      isRepeated,
      courseType: entry.courseType,
      source: 'cuet'
    };

    // Determine Term Key
    const normalizedTermName = formatTermName(entry.levelTerm);
    const termKey = getTermSortKey(entry.levelTerm);

    if (!termMap.has(termKey)) {
      termMap.set(termKey, {
        id: `sem-${termKey}`,
        name: normalizedTermName,
        termRaw: entry.levelTerm,
        sortKey: termKey,
        courses: []
      });
    }

    termMap.get(termKey).courses.push(courseItem);
  });

  // Sort terms chronologically (Level 1 Term 1 -> Level 4 Term 2)
  const sortedTerms = Array.from(termMap.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  // Compute semester metrics
  return sortedTerms.map(sem => {
    const metrics = calculateSemesterMetrics(sem.courses);
    return {
      id: sem.id,
      name: sem.name,
      term: sem.termRaw,
      gpa: metrics.calculatedGpa,
      calculatedGpa: metrics.calculatedGpa,
      attemptedCredits: metrics.attemptedCredits,
      completedCredits: metrics.completedCredits,
      courses: sem.courses
    };
  });
}

/**
 * Converts strings like "Level 3 - Term I" or "L-3 T-1" into clean user-friendly names
 */
function formatTermName(levelTerm) {
  const match = levelTerm.match(/Level\s*(\d+)\s*[-–]?\s*Term\s*([IVX]+|\d+)/i) ||
                levelTerm.match(/L\s*[-–]?\s*(\d+)\s*T\s*[-–]?\s*([IVX]+|\d+)/i) ||
                levelTerm.match(/(\d+)(?:st|nd|rd|th)?\s*Year\s*(\d+)(?:st|nd|rd|th)?\s*Term/i);

  if (match) {
    const level = match[1];
    let term = match[2];
    if (term === '1') term = 'I';
    if (term === '2') term = 'II';
    return `Level ${level} - Term ${term}`;
  }

  return levelTerm || 'Semester';
}

/**
 * Returns sortable key e.g. "L1T1", "L1T2", "L2T1", etc.
 */
function getTermSortKey(levelTerm) {
  const match = levelTerm.match(/Level\s*(\d+)\s*[-–]?\s*Term\s*([IVX]+|\d+)/i) ||
                levelTerm.match(/L\s*[-–]?\s*(\d+)\s*T\s*[-–]?\s*([IVX]+|\d+)/i) ||
                levelTerm.match(/(\d+)(?:st|nd|rd|th)?\s*Year\s*(\d+)(?:st|nd|rd|th)?\s*Term/i);

  if (match) {
    const level = match[1];
    let term = match[2];
    const romanToNum = { 'I': '1', 'II': '2', 'III': '3', 'IV': '4' };
    const termNum = romanToNum[term.toUpperCase()] || term;
    return `L${level}T${termNum}`;
  }

  return levelTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
}
