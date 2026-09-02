import { storageService } from '../../../services/storageService.js';
import { normalizeCourseId } from '../utils/routineValidationUtils.js';

const makeId = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const IMPORT_KEY = 'studysync_routine_imports';

const writeJson = (key, value) => storageService.set(key, value);

export const routineImportService = {
  getImports: () => storageService.get(IMPORT_KEY, []),
  getLastImport: () => routineImportService.getImports().filter(item => !item.undoneAt).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null,

  importApproved: ({ importId, sourceFile, selectedGroup, section, courses, routineEntries }) => {
    const before = {
      routines: storageService.get(storageService.KEYS.ROUTINES, []),
      courses: storageService.get(storageService.KEYS.COURSES, []),
      imports: routineImportService.getImports()
    };
    const nextRoutines = [...before.routines];
    const nextCourses = [...before.courses];
    const createdRoutineIds = [];
    const createdCourseIds = [];
    const replacedRoutines = [];
    const replacedCourses = [];
    const now = new Date().toISOString();

    try {
      courses.filter(course => course.include !== false).forEach(course => {
        const existingIndex = nextCourses.findIndex(existing => normalizeCourseId(existing.courseId) === normalizeCourseId(course.courseId));
        const isTheory = course.courseType === 'theory';
        const approvedData = {
          courseId: course.courseId.trim(),
          courseTitle: course.title.trim(),
          credit: Number(course.credit),
          courseType: course.courseType,
          faculty: course.teacherName.trim(),
          semester: course.semester || '',
          group: selectedGroup,
          section,
          source: 'ocr-import',
          importId,
          updatedAt: now,
          assessmentApplicable: isTheory,
          bestAssessmentCount: isTheory ? (Number(course.credit) === 2 ? 2 : 3) : 0
        };
        if (existingIndex === -1) {
          const id = makeId('course');
          nextCourses.push({ id, ...approvedData, color: '#4F46E5', missedClasses: 0, totalClasses: 0, attendedClasses: 0, history: [], assessments: [] , createdAt: now });
          createdCourseIds.push(id);
        } else if (course.courseResolution === 'replace') {
          replacedCourses.push({ ...nextCourses[existingIndex] });
          nextCourses[existingIndex] = { ...nextCourses[existingIndex], ...approvedData };
        }
      });

      routineEntries.filter(entry => entry.include !== false && !['skip', 'keep-existing'].includes(entry.conflictResolution)).forEach(entry => {
        if (entry.conflictResolution === 'use-imported') {
          [...new Set(entry.conflictIds || [])].forEach(conflictId => {
            const index = nextRoutines.findIndex(item => item.id === conflictId);
            if (index !== -1) replacedRoutines.push(...nextRoutines.splice(index, 1));
          });
        }
        const course = nextCourses.find(item => normalizeCourseId(item.courseId) === normalizeCourseId(entry.courseId));
        const id = makeId('rt');
        nextRoutines.push({
          id,
          courseId: entry.courseId.trim(),
          courseTitle: entry.courseTitle?.trim() || course?.courseTitle || '',
          teacherName: entry.teacherName?.trim() || course?.faculty || '',
          faculty: entry.teacherName?.trim() || course?.faculty || '',
          credit: Number(entry.credit || course?.credit || 0),
          courseType: entry.classType,
          classType: entry.classType,
          dayOfWeek: entry.dayOfWeek,
          startTime: entry.startTime,
          endTime: entry.endTime,
          room: entry.room?.trim() || '',
          building: entry.building?.trim() || '',
          group: entry.group || '',
          section: entry.isCommon ? '' : (entry.section || section),
          isCommon: Boolean(entry.isCommon),
          repeatWeekly: true,
          effectiveStartDate: entry.effectiveStartDate || '',
          effectiveEndDate: entry.effectiveEndDate || '',
          color: course?.color || '#4F46E5',
          source: 'ocr-import',
          importId,
          manuallyEdited: false,
          createdAt: now,
          updatedAt: now
        });
        createdRoutineIds.push(id);
      });

      const metadata = {
        importId,
        sourceFile: { name: sourceFile.name, type: sourceFile.type, pageCount: sourceFile.pageCount },
        selectedGroup,
        section,
        createdRoutineIds,
        createdCourseIds,
        replacedRoutines,
        replacedCourses,
        createdAt: now,
        undoneAt: null
      };
      writeJson(storageService.KEYS.ROUTINES, nextRoutines);
      writeJson(storageService.KEYS.COURSES, nextCourses);
      writeJson(IMPORT_KEY, [...before.imports, metadata]);
      return { importId, routinesCreated: createdRoutineIds.length, coursesCreated: createdCourseIds.length, routinesReplaced: replacedRoutines.length, coursesUpdated: replacedCourses.length };
    } catch (error) {
      writeJson(storageService.KEYS.ROUTINES, before.routines);
      writeJson(storageService.KEYS.COURSES, before.courses);
      writeJson(IMPORT_KEY, before.imports);
      throw new Error('The import could not be completed. No StudySync data was changed.', { cause: error });
    }
  },

  undoLastImport: () => {
    const imports = routineImportService.getImports();
    const target = [...imports].reverse().find(item => !item.undoneAt);
    if (!target) return null;
    const beforeRoutines = storageService.get(storageService.KEYS.ROUTINES, []);
    const beforeCourses = storageService.get(storageService.KEYS.COURSES, []);
    try {
      const routines = beforeRoutines.filter(item => !target.createdRoutineIds.includes(item.id));
      target.replacedRoutines.forEach(previous => {
        const index = routines.findIndex(item => item.id === previous.id);
        if (index === -1) routines.push(previous); else routines[index] = previous;
      });
      const courses = beforeCourses.filter(item => !target.createdCourseIds.includes(item.id));
      target.replacedCourses.forEach(previous => {
        const index = courses.findIndex(item => item.id === previous.id);
        if (index === -1) courses.push(previous); else courses[index] = previous;
      });
      const nextImports = imports.map(item => item.importId === target.importId ? { ...item, undoneAt: new Date().toISOString() } : item);
      writeJson(storageService.KEYS.ROUTINES, routines);
      writeJson(storageService.KEYS.COURSES, courses);
      writeJson(IMPORT_KEY, nextImports);
      return target;
    } catch (error) {
      writeJson(storageService.KEYS.ROUTINES, beforeRoutines);
      writeJson(storageService.KEYS.COURSES, beforeCourses);
      throw new Error('The import could not be undone. Existing data was preserved.', { cause: error });
    }
  }
};
