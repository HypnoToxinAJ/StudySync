/**
 * Utility functions for local PDF file validation, size limits, object URL management, and document fingerprinting.
 */

export const MAX_PDF_FILE_SIZE_MB = 50;
export const MAX_PDF_FILE_SIZE_BYTES = MAX_PDF_FILE_SIZE_MB * 1024 * 1024;

export const pdfFileUtils = {
  validatePdfFile: (file) => {
    if (!file) {
      return { isValid: false, message: 'No file selected.' };
    }

    const isPdfType = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdfType) {
      return {
        isValid: false,
        message: 'Invalid file format. Please select a valid PDF document (.pdf).'
      };
    }

    if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        message: `File size exceeds maximum limit of ${MAX_PDF_FILE_SIZE_MB}MB (${(file.size / (1024 * 1024)).toFixed(1)}MB).`
      };
    }

    return { isValid: true, message: '' };
  },

  formatFileSize: (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  },

  // Generate unique document fingerprint for annotation storage
  getFingerprint: (file) => {
    if (!file) return 'unknown-doc';
    const cleanName = (file.name || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${cleanName}_${file.size}_${file.lastModified || 0}`;
  },

  createObjectUrl: (file) => {
    if (!file) return null;
    return URL.createObjectURL(file);
  },

  revokeObjectUrl: (objectUrl) => {
    if (objectUrl && typeof objectUrl === 'string' && objectUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (e) {
        console.warn('Error revoking Object URL:', e);
      }
    }
  }
};
