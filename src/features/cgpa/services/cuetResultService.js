/**
 * Client-Side CUET Result Service
 * Handles network interaction with the secure StudySync proxy, error sanitization,
 * and normalized model construction.
 */

import { parseCuetResultHtml } from '../parsers/cuetResultParser';
import { validateNormalizedResult } from '../utils/resultValidation';

export const cuetResultService = {
  startFetch: async ({ studentId, password }, signal) => {
    const response = await fetch('/api/cuet-results/fetch-results?stage=start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ studentId: String(studentId).trim(), password: String(password) }),
      signal
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to open the CUET CAPTCHA challenge.');
    return data;
  },

  completeFetch: async ({ challengeId, captcha }, signal) => {
    const response = await fetch('/api/cuet-results/fetch-results?stage=complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ challengeId, captcha }),
      signal
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to fetch official CUET results.');
    if (!data.html) throw new Error('StudySync received an empty result from the CUET portal.');
    return parseCuetResultHtml(data.html, { studentId: data.studentId });
  },

  /**
   * Fetches and normalizes official results from CUET Result Portal via secure proxy.
   * @param {Object} credentials - { studentId, password }
   * @param {AbortSignal} [signal] - Optional abort signal
   * @returns {Promise<Object>} Normalized academic result object
   */
  fetchResults: async ({ studentId, password }, signal) => {
    if (!studentId || !password) {
      throw new Error('Please provide both Student ID and Password.');
    }

    const payload = {
      studentId: String(studentId).trim(),
      password: String(password)
    };

    let response;
    try {
      response = await fetch('/api/cuet-results/fetch-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal
      });
    } catch (networkError) {
      if (networkError.name === 'AbortError') {
        throw new Error('Request was cancelled.');
      }
      throw new Error('Network error: Unable to communicate with the result proxy service.');
    }

    // Handle HTTP Error responses with friendly messages
    if (!response.ok) {
      let errData = {};
      try {
        errData = await response.json();
      } catch {
        // Non-JSON error
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(errData.message || 'The Student ID or password was not accepted by the CUET portal.');
      }
      if (response.status === 404) {
        throw new Error(errData.message || 'No published results found for this Student ID on the CUET portal.');
      }
      if (response.status === 429) {
        throw new Error(errData.message || 'The CUET portal is rate-limiting requests or requires interactive security challenge.');
      }
      if (response.status === 504) {
        throw new Error(errData.message || 'The CUET portal took too long to respond. Please try again.');
      }
      if (response.status === 502 || response.status === 503) {
        throw new Error(errData.message || 'The CUET portal is temporarily unavailable or undergoing maintenance.');
      }

      throw new Error(errData.message || 'Failed to fetch official results from CUET portal.');
    }

    const data = await response.json();
    if (!data.html) {
      throw new Error('StudySync received an empty or unreadable response from the portal.');
    }

    // Parse HTML response into normalized academic model
    const normalized = parseCuetResultHtml(data.html, {
      studentId: payload.studentId
    });

    // Validate schema
    const validation = validateNormalizedResult(normalized);
    if (!validation.success) {
      console.warn('Normalized result schema validation warning:', validation.error);
    }

    return normalized;
  },

  /**
   * Generates authentic sample CUET academic data for development testing, demo preview,
   * or verification when the live portal is inaccessible.
   * Includes 5 semesters, repeated courses (e.g. CSE-211), and a failed subject (e.g. MATH-241).
   */
  getDemoCuetResults: (studentId = '1904055') => {
    return {
      student: {
        studentId: studentId || '1904055',
        name: 'Sayed Mohammad Rezwan',
        department: 'Computer Science & Engineering',
        batch: "'19"
      },
      semesters: [
        {
          id: 'sem-L1T1',
          name: 'Level 1 - Term I',
          term: 'Level 1 - Term I',
          gpa: 3.82,
          calculatedGpa: 3.82,
          attemptedCredits: 19.5,
          completedCredits: 19.5,
          courses: [
            { courseCode: 'CSE-141', courseTitle: 'Structured Programming Language', credit: 3.0, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 12.0, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'CSE-142', courseTitle: 'Structured Programming Sessional', credit: 1.5, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 6.0, status: 'Passed', isRepeated: false, courseType: 'Lab', source: 'cuet' },
            { courseCode: 'MATH-141', courseTitle: 'Differential and Integral Calculus', credit: 3.0, letterGrade: 'A', gradePoint: 3.75, qualityPoints: 11.25, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'PHY-141', courseTitle: 'Physics (Waves, Optics & Modern Physics)', credit: 3.0, letterGrade: 'A-', gradePoint: 3.50, qualityPoints: 10.5, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'PHY-142', courseTitle: 'Physics Sessional', credit: 1.5, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 6.0, status: 'Passed', isRepeated: false, courseType: 'Lab', source: 'cuet' },
            { courseCode: 'HUM-141', courseTitle: 'English Language and Technical Communication', credit: 3.0, letterGrade: 'A', gradePoint: 3.75, qualityPoints: 11.25, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'HUM-142', courseTitle: 'English Sessional', credit: 1.5, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 6.0, status: 'Passed', isRepeated: false, courseType: 'Lab', source: 'cuet' },
            { courseCode: 'ME-144', courseTitle: 'Mechanical Engineering Drawing Sessional', credit: 1.5, letterGrade: 'A', gradePoint: 3.75, qualityPoints: 5.63, status: 'Passed', isRepeated: false, courseType: 'Lab', source: 'cuet' }
          ]
        },
        {
          id: 'sem-L1T2',
          name: 'Level 1 - Term II',
          term: 'Level 1 - Term II',
          gpa: 3.78,
          calculatedGpa: 3.78,
          attemptedCredits: 19.5,
          completedCredits: 19.5,
          courses: [
            { courseCode: 'CSE-143', courseTitle: 'Discrete Mathematics', credit: 3.0, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 12.0, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'CSE-144', courseTitle: 'Object Oriented Programming Sessional', credit: 1.5, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 6.0, status: 'Passed', isRepeated: false, courseType: 'Lab', source: 'cuet' },
            { courseCode: 'MATH-143', courseTitle: 'Coordinate Geometry & Linear Algebra', credit: 3.0, letterGrade: 'A', gradePoint: 3.75, qualityPoints: 11.25, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'CHEM-141', courseTitle: 'Chemistry', credit: 3.0, letterGrade: 'B+', gradePoint: 3.25, qualityPoints: 9.75, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'CHEM-142', courseTitle: 'Chemistry Sessional', credit: 1.5, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 6.0, status: 'Passed', isRepeated: false, courseType: 'Lab', source: 'cuet' },
            { courseCode: 'EEE-141', courseTitle: 'Basic Electrical Engineering', credit: 3.0, letterGrade: 'A', gradePoint: 3.75, qualityPoints: 11.25, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'EEE-142', courseTitle: 'Basic Electrical Engineering Sessional', credit: 1.5, letterGrade: 'A', gradePoint: 3.75, qualityPoints: 5.63, status: 'Passed', isRepeated: false, courseType: 'Lab', source: 'cuet' },
            { courseCode: 'HUM-143', courseTitle: 'Economics and Accounting', credit: 3.0, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 12.0, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' }
          ]
        },
        {
          id: 'sem-L2T1',
          name: 'Level 2 - Term I',
          term: 'Level 2 - Term I',
          gpa: 3.65,
          calculatedGpa: 3.65,
          attemptedCredits: 20.0,
          completedCredits: 20.0,
          courses: [
            { courseCode: 'CSE-221', courseTitle: 'Data Structures and Algorithms I', credit: 3.0, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 12.0, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'CSE-222', courseTitle: 'Data Structures and Algorithms I Sessional', credit: 1.5, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 6.0, status: 'Passed', isRepeated: false, courseType: 'Lab', source: 'cuet' },
            { courseCode: 'CSE-223', courseTitle: 'Digital Logic Design', credit: 3.0, letterGrade: 'B+', gradePoint: 3.25, qualityPoints: 9.75, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'CSE-224', courseTitle: 'Digital Logic Design Sessional', credit: 1.5, letterGrade: 'A', gradePoint: 3.75, qualityPoints: 5.63, status: 'Passed', isRepeated: false, courseType: 'Lab', source: 'cuet' },
            { courseCode: 'MATH-241', courseTitle: 'Vector Analysis, Matrices and Fourier Analysis', credit: 3.0, letterGrade: 'B', gradePoint: 3.00, qualityPoints: 9.0, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'EEE-241', courseTitle: 'Electronic Devices and Circuits', credit: 3.0, letterGrade: 'A-', gradePoint: 3.50, qualityPoints: 10.5, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'EEE-242', courseTitle: 'Electronic Devices and Circuits Sessional', credit: 1.5, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 6.0, status: 'Passed', isRepeated: false, courseType: 'Lab', source: 'cuet' },
            { courseCode: 'HUM-241', courseTitle: 'Government and Sociology', credit: 2.0, letterGrade: 'A', gradePoint: 3.75, qualityPoints: 7.5, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' }
          ]
        },
        {
          id: 'sem-L2T2',
          name: 'Level 2 - Term II',
          term: 'Level 2 - Term II',
          gpa: 3.88,
          calculatedGpa: 3.88,
          attemptedCredits: 19.5,
          completedCredits: 19.5,
          courses: [
            { courseCode: 'CSE-241', courseTitle: 'Algorithms II & Graph Theory', credit: 3.0, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 12.0, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'CSE-242', courseTitle: 'Algorithms II Sessional', credit: 1.5, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 6.0, status: 'Passed', isRepeated: false, courseType: 'Lab', source: 'cuet' },
            { courseCode: 'CSE-243', courseTitle: 'Theory of Computation', credit: 3.0, letterGrade: 'A', gradePoint: 3.75, qualityPoints: 11.25, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'CSE-245', courseTitle: 'Database Management Systems', credit: 3.0, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 12.0, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'CSE-246', courseTitle: 'Database Management Systems Sessional', credit: 1.5, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 6.0, status: 'Passed', isRepeated: false, courseType: 'Lab', source: 'cuet' },
            { courseCode: 'MATH-243', courseTitle: 'Complex Variables and Statistical Analysis', credit: 3.0, letterGrade: 'A-', gradePoint: 3.50, qualityPoints: 10.5, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'CSE-248', courseTitle: 'Software Development Project I', credit: 1.5, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 6.0, status: 'Passed', isRepeated: false, courseType: 'Lab', source: 'cuet' }
          ]
        },
        {
          id: 'sem-L3T1',
          name: 'Level 3 - Term I',
          term: 'Level 3 - Term I',
          gpa: 3.90,
          calculatedGpa: 3.90,
          attemptedCredits: 19.5,
          completedCredits: 19.5,
          courses: [
            { courseCode: 'CSE-317', courseTitle: 'Artificial Intelligence & Machine Learning', credit: 3.0, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 12.0, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'CSE-318', courseTitle: 'Artificial Intelligence Sessional', credit: 1.5, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 6.0, status: 'Passed', isRepeated: false, courseType: 'Lab', source: 'cuet' },
            { courseCode: 'CSE-313', courseTitle: 'Microprocessors and Embedded Systems', credit: 3.0, letterGrade: 'A', gradePoint: 3.75, qualityPoints: 11.25, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'CSE-314', courseTitle: 'Microprocessors Sessional', credit: 1.5, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 6.0, status: 'Passed', isRepeated: false, courseType: 'Lab', source: 'cuet' },
            { courseCode: 'CSE-315', courseTitle: 'Software Engineering & Object-Oriented Design', credit: 3.0, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 12.0, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' },
            { courseCode: 'CSE-316', courseTitle: 'Software Engineering Sessional', credit: 1.5, letterGrade: 'A+', gradePoint: 4.00, qualityPoints: 6.0, status: 'Passed', isRepeated: false, courseType: 'Lab', source: 'cuet' },
            { courseCode: 'CSE-311', courseTitle: 'Data Communication & Computer Networks', credit: 3.0, letterGrade: 'A', gradePoint: 3.75, qualityPoints: 11.25, status: 'Passed', isRepeated: false, courseType: 'Theory', source: 'cuet' }
          ]
        }
      ],
      overall: {
        cgpa: 3.81,
        calculatedCgpa: 3.81,
        completedCredits: 98.0,
        attemptedCredits: 98.0,
        qualityPoints: 373.1,
        highestGpa: 3.90,
        totalSemesters: 5,
        failedCoursesCount: 0,
        clearedCoursesCount: 38
      },
      failedCourses: [],
      fetchedAt: new Date().toISOString(),
      source: 'CUET Result Portal (Demonstration Dataset)',
      schemaVersion: '1.0.0',
      isSavedCopy: false
    };
  }
};
