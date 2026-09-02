import { normalizeRoutineOcrResponse } from '../utils/routineOcrNormalizer.js';
import { apiClient } from '../../../services/apiClient.js';

export const ROUTINE_OCR_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp';
const SUPPORTED_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
const SUPPORTED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp']);
export const ROUTINE_OCR_MAX_FILE_MB = Number(import.meta.env?.VITE_ROUTINE_OCR_MAX_FILE_MB || 15);

export const safeRoutineFilename = (name) => String(name || 'routine-file')
  .split(/[\\/]/).pop()
  .replace(/[\u0000-\u001F\u007F]/g, '')
  .replace(/[^a-zA-Z0-9._ -]/g, '_')
  .slice(0, 120) || 'routine-file';

export const validateRoutineFile = (file) => {
  if (!file) return { valid: false, message: 'Choose a PDF or image routine.' };
  if (!file.size) return { valid: false, message: 'This file is empty or could not be read.' };
  const extension = String(file.name || '').split('.').pop().toLowerCase();
  if (!SUPPORTED_MIME_TYPES.has(file.type) || !SUPPORTED_EXTENSIONS.has(extension)) {
    return { valid: false, message: 'Use a PDF, PNG, JPG, JPEG, or WEBP file.' };
  }
  if (file.size > ROUTINE_OCR_MAX_FILE_MB * 1024 * 1024) {
    return { valid: false, message: `The file must be ${ROUTINE_OCR_MAX_FILE_MB} MB or smaller.` };
  }
  return { valid: true, safeName: safeRoutineFilename(file.name) };
};

const hasExpectedFileSignature = async file => {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === 'application/pdf') return String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
  if (file.type === 'image/png') return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (file.type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return false;
};

const delay = (milliseconds, signal) => new Promise((resolve, reject) => {
  const timer = setTimeout(resolve, milliseconds);
  signal?.addEventListener('abort', () => {
    clearTimeout(timer);
    reject(new DOMException('Aborted', 'AbortError'));
  }, { once: true });
});

const makeMockResponse = file => ({
  importId: `routine-import-${Date.now()}`,
  sourceFile: { name: safeRoutineFilename(file.name), type: file.type, pageCount: file.type === 'application/pdf' ? 2 : 1 },
  detectedGroups: ['A1', 'A2', 'B1', 'B2'],
  courses: [
    { tempId: 'mock-course-1', courseId: 'CSE 321', title: 'Database Systems', credit: 3, teacherName: 'Dr. Example Teacher', courseType: 'theory', confidence: 0.94, sourcePage: 1, sourceText: 'CSE 321 Database Systems 3.0' },
    { tempId: 'mock-course-2', courseId: 'CSE 322', title: 'Database Systems Sessional', credit: 1.5, teacherName: 'Lab Instructor', courseType: 'sessional', confidence: 0.88, sourcePage: 1, sourceText: 'CSE 322 Database Systems Sessional 1.5' },
    { tempId: 'mock-course-3', courseId: 'HUM 301', title: 'Professional Ethics', credit: 2, teacherName: 'Prof. Example', courseType: 'theory', confidence: 0.72, sourcePage: 2, sourceText: 'HUM 301 Professional Ethics' }
  ],
  routineEntries: [
    { tempId: 'mock-row-1', day: 'Sunday', startTime: '09:00', endTime: '09:50', courseId: 'CSE 321', group: 'B2', section: 'B', room: 'B-302', building: 'Academic Building', classType: 'theory', confidence: 0.94, sourcePage: 1, sourceText: 'Sunday 9.00-9.50 CSE 321 B2 B-302' },
    { tempId: 'mock-row-2', day: 'Monday', startTime: '10:00', endTime: '12:30', courseId: 'CSE 322', group: 'B2', section: 'B', room: 'Software Lab 2', building: 'CSE Building', classType: 'sessional', confidence: 0.86, sourcePage: 1, sourceText: 'Monday 10.00-12.30 CSE 322 B2' },
    { tempId: 'mock-row-3', day: 'Tuesday', startTime: '11:00', endTime: '11:50', courseId: 'HUM 301', group: '', section: 'B', room: 'Room 201', classType: 'theory', confidence: 0.72, sourcePage: 2, sourceText: 'Tuesday 11.00 HUM 301 Section B' },
    { tempId: 'mock-row-4', day: 'Wednesday', startTime: '13:00', endTime: '13:50', courseId: 'HUM 301', group: 'ALL', section: '', room: 'Auditorium', classType: 'theory', confidence: 0.91, sourcePage: 2, sourceText: 'Common class Wednesday HUM 301' },
    { tempId: 'mock-row-5', day: 'Thursday', startTime: '09:00', endTime: '09:50', courseId: 'CSE 321', group: '', section: '', room: 'B-303', classType: 'theory', confidence: 0.61, sourcePage: 2, sourceText: 'Thursday CSE 321 unclear group' },
    { tempId: 'mock-ignored-ct', day: 'Thursday', startTime: '14:00', endTime: '15:00', courseId: 'CSE 321', group: 'B2', classType: 'theory', confidence: 0.9, sourcePage: 2, sourceText: 'Class Test schedule CT 1' }
  ],
  warnings: ['One row has an unclear group and needs review.'],
  rawTextReference: null
});

const mapServiceError = error => {
  if (error?.name === 'AbortError') return error;
  if (error?.name === 'ZodError' || error instanceof SyntaxError) return new Error('The OCR service returned an invalid response. Please retry.');
  const code = error?.message;
  const messages = {
    INVALID_RESPONSE: 'The OCR service returned an invalid response. Please retry.',
    EMPTY_RESULT: 'We couldn’t find a class routine in this file.',
    TIMEOUT: 'Routine extraction took too long. Try a smaller file or retry later.'
  };
  if (/^(The OCR|We couldn’t|Routine extraction)/.test(code || '')) return error;
  return new Error(messages[code] || 'The OCR service is unavailable. You can retry or enter the routine manually.');
};

export const routineOcrService = {
  isMockMode: () => import.meta.env?.VITE_ROUTINE_OCR_MOCK !== 'false',

  extractRoutine: async (file, { signal, onProgress, includedPages = [] } = {}) => {
    const validation = validateRoutineFile(file);
    if (!validation.valid) throw new Error(validation.message);
    try {
      if (!(await hasExpectedFileSignature(file))) throw new Error('We couldn’t read this file. It may be empty, corrupted, or mislabeled.');
      if (routineOcrService.isMockMode()) {
        onProgress?.({ phase: 'uploading', percent: 15, message: 'Preparing the document…' });
        await delay(250, signal);
        onProgress?.({ phase: 'ocr', percent: 45, page: 1, pageCount: file.type === 'application/pdf' ? 2 : 1, message: 'Reading page 1…' });
        await delay(350, signal);
        if (file.type === 'application/pdf') {
          onProgress?.({ phase: 'ocr', percent: 70, page: 2, pageCount: 2, message: 'Reading page 2…' });
          await delay(350, signal);
        }
        onProgress?.({ phase: 'normalizing', percent: 90, message: 'Structuring courses and class periods…' });
        await delay(200, signal);
        return normalizeRoutineOcrResponse(makeMockResponse(file), file);
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort('TIMEOUT'), Number(import.meta.env?.VITE_ROUTINE_OCR_TIMEOUT_MS || 120000));
      const abortFromCaller = () => controller.abort();
      signal?.addEventListener('abort', abortFromCaller, { once: true });
      const body = new FormData();
      body.append('file', file, validation.safeName);
      if (includedPages.length) body.append('includedPages', JSON.stringify(includedPages));
      onProgress?.({ phase: 'uploading', percent: 10, message: 'Uploading securely…' });
      try {
        onProgress?.({ phase: 'normalizing', percent: 90, message: 'Validating extracted data…' });
        const payload = await apiClient.upload('/routine-ocr/extract/', body, { signal: controller.signal });
        return normalizeRoutineOcrResponse(payload, file);
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abortFromCaller);
      }
    } catch (error) {
      if (error?.name === 'AbortError' && signal?.aborted) throw error;
      if (error?.name === 'AbortError') throw new Error('Routine extraction took too long. Try a smaller file or retry later.');
      throw mapServiceError(error);
    }
  }
};
