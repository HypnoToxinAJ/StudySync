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
 * Normalizes letter grades according to the official CUET 10-point scale.
 * @param {string} value 
 * @returns {string|null}
 */
export const normalizeGrade = (value) => {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.trim().toUpperCase();
  // Valid CUET grades: A+, A, A-, B+, B, B-, C+, C, D, F
  if (CUET_GRADE_POINTS[cleaned] !== undefined) {
    return cleaned;
  }
  // Handle variations e.g. "A +" -> "A+", "A -" -> "A-"
  const compacted = cleaned.replace(/\s+/g, '');
  if (CUET_GRADE_POINTS[compacted] !== undefined) {
    return compacted;
  }
  return null;
};

/**
 * Parses term representations into normalized numeric level and term numbers.
 * e.g. "Level 1 - Term I", "L1T1", "1st Year 2nd Term"
 * @param {string} levelTermStr 
 * @returns {{ level: number, term: number, term_label: string }}
 */
export const parseTerm = (levelTermStr) => {
  if (!levelTermStr || typeof levelTermStr !== 'string') {
    return { level: 1, term: 1, term_label: 'Level 1 - Term I' };
  }

  const romanMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, '1': 1, '2': 2, '3': 3, '4': 4 };
  const numToRoman = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };

  const match = levelTermStr.match(/Level\s*(\d+)\s*[-–]?\s*Term\s*([IVX]+|\d+)/i) ||
                levelTermStr.match(/L\s*[-–]?\s*(\d+)\s*T\s*[-–]?\s*([IVX]+|\d+)/i) ||
                levelTermStr.match(/(\d+)(?:st|nd|rd|th)?\s*Year\s*(\d+)(?:st|nd|rd|th)?\s*Term/i);

  if (match) {
    const level = parseInt(match[1], 10) || 1;
    const rawTerm = match[2].toUpperCase();
    const term = romanMap[rawTerm] || parseInt(rawTerm, 10) || 1;
    const roman = numToRoman[term] || 'I';
    return {
      level,
      term,
      term_label: `Level ${level} - Term ${roman}`
    };
  }

  return {
    level: 1,
    term: 1,
    term_label: levelTermStr.trim() || 'Level 1 - Term I'
  };
};

/**
 * Detects course type: theory, lab, sessional, project, unknown.
 * @param {HTMLTableRowElement|Object} row
 * @param {string} code 
 * @param {string} title 
 * @param {number} credit 
 * @param {string} [isLabIndicator] 
 * @returns {'theory'|'lab'|'sessional'|'project'|'unknown'}
 */
export const detectCourseType = (row, code = '', title = '', credit = 3.0, isLabIndicator = '') => {
  if (isLabIndicator) {
    const ind = isLabIndicator.trim().toLowerCase();
    if (ind === 'yes' || ind === 'true' || ind === 'y' || ind === 'lab' || ind === 'sessional') {
      return 'lab';
    }
    if (ind === 'no' || ind === 'false' || ind === 'n' || ind === 'theory') {
      return 'theory';
    }
  }

  const combined = `${code} ${title}`.toLowerCase();
  if (/project|thesis|dissertation|capstone/i.test(combined)) return 'project';
  if (/sessional/i.test(combined)) return 'sessional';
  if (/lab|laboratory|practical|workshop/i.test(combined)) return 'lab';

  // CUET course numbering convention: Even last digits are labs (e.g. CSE 142, EEE 242)
  const numMatch = code.match(/(\d+)$/);
  if (numMatch) {
    const lastDigit = parseInt(numMatch[1].slice(-1), 10);
    if (lastDigit % 2 === 0) {
      return 'lab';
    }
  }

  // Fractional credits in CUET are typically labs (0.75, 1.50)
  if (credit === 0.75 || credit === 1.5) {
    return 'lab';
  }

  if (credit >= 2.0 && (!numMatch || parseInt(numMatch[1].slice(-1), 10) % 2 !== 0)) {
    return 'theory';
  }

  return 'unknown';
};

/**
 * Evaluates whether a document or page represents an official CUET result page.
 * @param {Document|Element|string} docOrHtml 
 * @param {string} [currentUrl] 
 * @returns {{ isResultPage: boolean, confidence: number, signals: string[] }}
 */
export const isCUETResultPage = (docOrHtml, currentUrl = '') => {
  const doc = getDocument(docOrHtml);
  const signals = [];
  let score = 0;

  // 1. URL Check
  const url = String(currentUrl || (typeof window !== 'undefined' ? window.location?.href : '') || '');
  if (/result_published\.php/i.test(url)) {
    score += 0.40;
    signals.push('URL contains result_published.php (+0.40)');
  } else if (/course\.cuet\.ac\.bd/i.test(url)) {
    score += 0.20;
    signals.push('URL on course.cuet.ac.bd (+0.20)');
  }

  if (!doc) {
    return { isResultPage: score >= 0.50, confidence: Math.min(score, 1.0), signals };
  }

  // 2. Class check (.productall_row)
  const productRows = doc.querySelectorAll('.productall_row');
  if (productRows.length > 0) {
    score += 0.45;
    signals.push(`Found ${productRows.length} .productall_row rows (+0.45)`);
  }

  // 3. Expected header terms check
  const bodyText = doc.body ? doc.body.textContent || '' : '';
  const hasCourseHeader = /course\s*code|subject\s*code/i.test(bodyText);
  const hasCreditHeader = /credit/i.test(bodyText);
  const hasGradeHeader = /letter\s*grade|grade\s*point|grade/i.test(bodyText);
  const hasTermHeader = /level.*term|level\s*[-–]\s*term/i.test(bodyText);

  let headerCount = 0;
  if (hasCourseHeader) headerCount++;
  if (hasCreditHeader) headerCount++;
  if (hasGradeHeader) headerCount++;
  if (hasTermHeader) headerCount++;

  if (headerCount >= 3) {
    score += 0.35;
    signals.push(`Detected ${headerCount}/4 expected academic table headers (+0.35)`);
  }

  // 4. Typical CUET grade codes presence
  const hasCuetGrades = /\b(A\+|A-|B\+|B-|C\+|C|D|F)\b/.test(bodyText);
  if (hasCuetGrades) {
    score += 0.15;
    signals.push('CUET letter grades detected in document (+0.15)');
  }

  const confidence = Math.min(Number(score.toFixed(2)), 1.0);
  return {
    isResultPage: confidence >= 0.50,
    confidence,
    signals
  };
};

/**
 * Diagnostic analysis of the document.
 * Returns diagnostic details if detection or parsing fails or succeeds.
 * @param {Document|Element|string} docOrHtml 
 * @param {string} [currentUrl] 
 * @returns {Object}
 */
export const diagnoseResultPage = (docOrHtml, currentUrl = '') => {
  const doc = getDocument(docOrHtml);
  const detection = isCUETResultPage(doc, currentUrl);
  const allTables = doc ? Array.from(doc.querySelectorAll('table')) : [];
  const productRows = doc ? Array.from(doc.querySelectorAll('.productall_row')) : [];

  let candidateTablesCount = 0;
  let candidateRowsFound = 0;
  let matchedStrategy = 'None';
  const tableDetails = [];

  if (doc) {
    allTables.forEach((table, index) => {
      const rows = Array.from(table.querySelectorAll('tr'));
      const text = table.textContent || '';
      const hasCode = /[A-Za-z]{2,5}[-\s]?[0-9]{3}/.test(text);
      const hasGrade = /\b(A\+|A-|A|B\+|B-|B|C\+|C|D|F)\b/.test(text);
      const isCandidate = (hasCode && hasGrade) || table.querySelector('.productall_row');
      if (isCandidate) {
        candidateTablesCount++;
        candidateRowsFound += rows.length;
      }
      tableDetails.push({
        tableIndex: index,
        rowCount: rows.length,
        isCandidate: Boolean(isCandidate),
        hasProductRow: Boolean(table.querySelector('.productall_row'))
      });
    });
  }

  if (productRows.length > 0) {
    matchedStrategy = 'Strategy 1: .productall_row';
  } else if (candidateTablesCount > 0) {
    matchedStrategy = 'Strategy 2 / 3: Result Table & Headers';
  }

  const issues = [];
  if (!detection.isResultPage) {
    issues.push('Page URL and structure does not strongly match CUET result publication page.');
  }
  if (candidateTablesCount === 0 && productRows.length === 0) {
    issues.push('No tables containing course codes and letter grades were discovered.');
  }

  return {
    currentUrl: currentUrl || (typeof window !== 'undefined' ? window.location?.href : ''),
    isResultPage: detection.isResultPage,
    confidence: detection.confidence,
    signals: detection.signals,
    candidateTablesCount,
    candidateRowsFound: productRows.length || candidateRowsFound,
    knownSelectorFound: productRows.length > 0,
    matchedStrategy,
    tableCount: allTables.length,
    tableDetails,
    issues
  };
};

/**
 * Searches and extracts the result table and rows using layered strategies:
 * Strategy 1: .productall_row class
 * Strategy 2: Table rows with standard 6 or 5 cell layout
 * Strategy 3: Dynamic table column header detection
 * Strategy 4: Semantic text row scan
 * @param {Document} doc 
 * @returns {{ rows: Element[], strategy: string, confidence: number }}
 */
export const findResultTable = (doc) => {
  if (!doc) return { rows: [], strategy: 'None', confidence: 0 };

  // STRATEGY 1: Known .productall_row
  const productRows = Array.from(doc.querySelectorAll('.productall_row'));
  if (productRows.length > 0) {
    return {
      rows: productRows,
      strategy: 'Strategy 1: .productall_row',
      confidence: 0.99
    };
  }

  // STRATEGY 2: Inspect all table rows for standard CUET cell patterns
  const allRows = Array.from(doc.querySelectorAll('table tr'));
  const strategy2Rows = [];

  allRows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 4) {
      let hasCourseCode = false;
      let hasCredit = false;
      let hasGrade = false;

      cells.forEach(cell => {
        const text = cell.textContent.trim();
        const num = parseFloat(text);
        if (/[A-Za-z]{2,5}[-\s]?[0-9]{3}/.test(text)) hasCourseCode = true;
        if (!isNaN(num) && (num === 0.75 || num === 1.5 || num === 2.0 || num === 3.0 || num === 4.0 || num === 6.0)) hasCredit = true;
        if (normalizeGrade(text)) hasGrade = true;
      });

      if ((hasCourseCode && hasGrade) || (hasGrade && hasCredit)) {
        strategy2Rows.push(row);
      }
    }
  });

  if (strategy2Rows.length > 0) {
    return {
      rows: strategy2Rows,
      strategy: 'Strategy 2: Validated Academic Table Rows',
      confidence: 0.90
    };
  }

  // STRATEGY 3: Table Header Analysis
  const tables = Array.from(doc.querySelectorAll('table'));
  for (const table of tables) {
    const headers = Array.from(table.querySelectorAll('th, tr:first-child td')).map(h => h.textContent.toLowerCase());
    const hasCodeHeader = headers.some(h => /code|subject/i.test(h));
    const hasGradeHeader = headers.some(h => /grade|letter/i.test(h));
    if (hasCodeHeader && hasGradeHeader) {
      const rows = Array.from(table.querySelectorAll('tr')).slice(1);
      if (rows.length > 0) {
        return {
          rows,
          strategy: 'Strategy 3: Dynamic Header Matched Table',
          confidence: 0.85
        };
      }
    }
  }

  // STRATEGY 4: Semantic text block scan fallback
  const candidateBlocks = Array.from(doc.querySelectorAll('body *')).filter(el => {
    // Avoid large container parents
    if (el.children.length > 6) return false;
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length < 15 || text.length > 250) return false;

    const hasCode = /\b[A-Za-z]{2,5}[-\s]?[0-9]{3}\b/.test(text);
    const hasGrade = /\b(A\+|A-|A|B\+|B-|B|C\+|C|D|F)\b/.test(text);
    const hasCredit = /\b(?:0\.75|1\.5|2(?:\.0)?|3(?:\.0)?|4(?:\.0)?|6(?:\.0)?)\b/.test(text);
    return hasCode && hasGrade && hasCredit;
  });

  if (candidateBlocks.length > 0) {
    return {
      rows: candidateBlocks,
      strategy: 'Strategy 4: Semantic Text Course Match',
      confidence: 0.70
    };
  }

  return {
    rows: [],
    strategy: 'None',
    confidence: 0
  };
};

/**
 * Extracts a normalized array of courses from raw HTML or DOM node.
 * Each course conforms to:
 * {
 *   course_code: string,
 *   course_title: string,
 *   credit: number,
 *   term: string,
 *   level: number,
 *   term_number: number,
 *   grade: string,
 *   grade_point: number,
 *   course_type: string,
 *   is_lab: boolean,
 *   attempt: number
 * }
 * @param {string|Document|Element} rawInput 
 * @returns {Array<Object>}
 */
export const extractNormalizedCourses = (rawInput) => {
  const doc = getDocument(rawInput);
  if (!doc) return [];

  const { rows } = findResultTable(doc);
  if (!rows || rows.length === 0) return [];

  const courseCountMap = new Map();
  const normalizedList = [];

  rows.forEach((row, index) => {
    const cells = typeof row.getElementsByTagName === 'function' ? row.getElementsByTagName('td') : [];
    const hasCells = cells && cells.length >= 4;

    let courseCode = '';
    let courseTitle = '';
    let credit = 3.0;
    let levelTerm = '';
    let grade = '';
    let isLabIndicator = '';

    if (hasCells && cells.length >= 6) {
      // Reference standard CUET portal row:
      // cells[0]: Course Code
      // cells[1]: Credit
      // cells[2]: Level / Term
      // cells[3]: Lab indicator (e.g. Yes/No) or Course Title
      // cells[4]: Grade
      // cells[5]: Remarks / Grade Point
      courseCode = cells[0].textContent.trim();
      credit = parseFloat(cells[1].textContent.trim());
      levelTerm = cells[2].textContent.trim();
      isLabIndicator = cells[3].textContent.trim();
      grade = normalizeGrade(cells[4].textContent.trim());
      // If cells[3] isn't Yes/No, it may be the title
      if (!/^(yes|no|y|n)$/i.test(isLabIndicator)) {
        courseTitle = isLabIndicator;
      }
    } else if (hasCells && cells.length === 5) {
      courseCode = cells[0].textContent.trim();
      credit = parseFloat(cells[1].textContent.trim());
      levelTerm = cells[2].textContent.trim();
      isLabIndicator = cells[3].textContent.trim();
      grade = normalizeGrade(cells[4].textContent.trim());
    } else if (hasCells && cells.length === 4) {
      courseCode = cells[0].textContent.trim();
      credit = parseFloat(cells[1].textContent.trim());
      levelTerm = cells[2].textContent.trim();
      grade = normalizeGrade(cells[3].textContent.trim());
    } else {
      const text = (row.textContent || '').replace(/\s+/g, ' ').trim();
      const codeMatch = text.match(/\b([A-Za-z]{2,5}[-\s]?[0-9]{3})\b/);
      const gradeMatch = text.match(/\b(A\+|A-|A|B\+|B-|B|C\+|C|D|F)\b/i);
      const creditMatch = text.match(/\b(0\.75|1\.5|2(?:\.0)?|3(?:\.0)?|4(?:\.0)?|6(?:\.0)?)\b/);
      const termMatch = text.match(/(Level\s*\d+\s*[-–]\s*Term\s*(?:[IVX]+|\d+)|L\s*[-–]?\s*\d+\s*T\s*[-–]?\s*(?:[IVX]+|\d+))/i);

      courseCode = codeMatch ? codeMatch[1].trim() : '';
      grade = gradeMatch ? normalizeGrade(gradeMatch[1]) : '';
      credit = creditMatch ? parseFloat(creditMatch[1]) : 3.0;
      levelTerm = termMatch ? termMatch[1].trim() : 'Level 1 - Term I';
    }

    if (!courseCode || isNaN(credit) || !grade) return;

    // Track attempts
    const attempt = (courseCountMap.get(courseCode) || 0) + 1;
    courseCountMap.set(courseCode, attempt);

    const termMeta = parseTerm(levelTerm);
    const courseType = detectCourseType(row, courseCode, courseTitle, credit, isLabIndicator);
    const gradePoint = getGradePoint(grade);

    normalizedList.push({
      course_code: courseCode,
      course_title: courseTitle || courseCode,
      credit,
      term: termMeta.term_label,
      level: termMeta.level,
      term_number: termMeta.term,
      grade,
      grade_point: gradePoint,
      course_type: courseType,
      is_lab: courseType === 'lab' || courseType === 'sessional',
      attempt
    });
  });

  return normalizedList;
};

/**
 * Parses raw HTML string or DOM from CUET result portal into full normalized StudySync model.
 * Preserves the exact structure expected by the existing UI components.
 * @param {string|Document|Element} rawInput - HTML string or DOM node
 * @param {Object} [fallbackStudent] - Fallback student data
 * @param {Object} [options] - Options (e.g. currentUrl)
 * @returns {Object} Normalized Academic Result model
 */
export const parseCuetResultHtml = (rawInput, fallbackStudent = {}, options = {}) => {
  const doc = getDocument(rawInput);
  if (!doc) {
    throw new Error('Unsupported or empty input provided to result parser.');
  }

  // 1. Extract Student Information
  const student = extractStudentInfo(doc, fallbackStudent);

  // 2. Extract Normalized Courses
  const normalizedCourses = extractNormalizedCourses(doc);

  if (normalizedCourses.length === 0) {
    const bodyText = doc.body ? doc.body.textContent || '' : '';
    if (/wrong password|invalid password|incorrect password|password is incorrect/i.test(bodyText)) {
      throw new Error('CUET portal authentication failed: Invalid password.');
    }
    if (/invalid captcha|wrong captcha|captcha is required|captcha code does not match/i.test(bodyText)) {
      throw new Error('Invalid CAPTCHA code. Please enter the characters shown in the image and try again.');
    }
    if (/student.*not found|user not found|invalid student/i.test(bodyText)) {
      throw new Error('Student ID not recognized by the CUET portal.');
    }
    if (bodyText.includes('No result') || bodyText.includes('not published') || bodyText.includes('Not Found')) {
      throw new Error('No published results found for this Student ID.');
    }

    const diag = diagnoseResultPage(doc, options.currentUrl);
    throw new Error(
      `StudySync could not recognize the portal response format. No course records found. (Diagnostics: ${diag.issues.join(' ') || 'Unknown layout'})`
    );
  }

  // 3. Process Courses & Terms with Repeated-Course Resolution
  const parsedTerms = processTermsAndCourses(normalizedCourses);

  // 4. Calculate Overall CGPA and Quality Points
  const overallMetrics = calculateOverallMetrics(parsedTerms);

  return {
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
};

/**
 * Helper to ensure a valid Document or Element
 */
function getDocument(rawInput) {
  if (!rawInput) return null;
  if (typeof rawInput === 'string') {
    if (!rawInput.trim()) return null;
    try {
      const parser = new DOMParser();
      return parser.parseFromString(rawInput, 'text/html');
    } catch {
      return null;
    }
  }
  if (rawInput && typeof rawInput.querySelectorAll === 'function') {
    return rawInput;
  }
  return null;
}

/**
 * Extracts student metadata from portal DOM headers or metadata tables
 */
function extractStudentInfo(doc, fallback = {}) {
  let studentId = fallback.studentId || '';
  let name = fallback.name || '';
  let department = fallback.department || '';
  let batch = fallback.batch || '';

  const textContent = doc.body ? doc.body.innerText || doc.body.textContent || '' : '';

  if (!studentId) {
    const idMatch = textContent.match(/Student\s*(?:ID|Roll|No\.?)[\s:]*([0-9A-Za-z_-]+)/i);
    if (idMatch) studentId = idMatch[1].trim();
  }

  const nameMatch = textContent.match(/Student\s*Name[\s:]*([A-Za-z.\s'-]+?)(?=\n|\r|Department|Roll|ID|Batch|$)/i) ||
                    textContent.match(/Name\s*of\s*Student[\s:]*([A-Za-z.\s'-]+?)(?=\n|\r|Department|Roll|ID|Batch|$)/i);
  if (nameMatch && nameMatch[1].trim().length > 1) {
    name = nameMatch[1].trim();
  }

  const deptMatch = textContent.match(/Department\s*(?:of)?[\s:]*([A-Za-z\s&,()-]+?)(?=\n|\r|Batch|Roll|ID|Name|$)/i);
  if (deptMatch && deptMatch[1].trim().length > 1) {
    department = deptMatch[1].trim();
  }

  const batchMatch = textContent.match(/Batch[\s:]*([0-9]+['’]?[A-Za-z]*)/i);
  if (batchMatch) {
    batch = batchMatch[1].trim();
  } else if (studentId && /^\d{2}/.test(studentId)) {
    batch = `'${studentId.substring(0, 2)}`;
  }

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
 * Processes normalized course entries into structured semesters with repeated course resolution
 * and deduplicated failed course resolution.
 */
function processTermsAndCourses(normalizedCourses) {
  // 1. Identify total occurrences and latest grade for each course code
  const courseCountMap = new Map();
  const latestGradeMap = new Map();

  normalizedCourses.forEach(c => {
    const count = (courseCountMap.get(c.course_code) || 0) + 1;
    courseCountMap.set(c.course_code, count);

    // If repeat passes (non-F), that becomes latest/effective. If multiple Fs, latest is F.
    if (!latestGradeMap.has(c.course_code) || c.grade !== 'F') {
      latestGradeMap.set(c.course_code, c.grade);
    }
  });

  // 2. Group into Semesters / Terms
  const termMap = new Map();

  normalizedCourses.forEach((c, index) => {
    const isMultiAttempt = (courseCountMap.get(c.course_code) || 0) > 1;
    const isLatest = latestGradeMap.get(c.course_code) === c.grade;
    const isRepeated = isMultiAttempt && !isLatest;

    const courseItem = {
      courseCode: c.course_code,
      courseTitle: c.course_title || c.course_code,
      credit: c.credit,
      letterGrade: c.grade,
      gradePoint: c.grade_point,
      qualityPoints: Number((c.credit * c.grade_point).toFixed(2)),
      status: c.grade === 'F' ? 'Failed' : (isRepeated ? 'Repeated' : 'Passed'),
      isRepeated,
      courseType: c.course_type === 'lab' || c.course_type === 'sessional' ? 'Lab' : 'Theory',
      source: 'cuet'
    };

    const termKey = `L${c.level}T${c.term_number}`;

    if (!termMap.has(termKey)) {
      termMap.set(termKey, {
        id: `sem-${termKey}`,
        name: c.term,
        termRaw: c.term,
        sortKey: termKey,
        level: c.level,
        termNum: c.term_number,
        courses: []
      });
    }

    termMap.get(termKey).courses.push(courseItem);
  });

  // 3. Sort terms chronologically: L1T1 -> L1T2 -> L2T1 -> ...
  const sortedTerms = Array.from(termMap.values()).sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.termNum - b.termNum;
  });

  // 4. Compute semester metrics
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
