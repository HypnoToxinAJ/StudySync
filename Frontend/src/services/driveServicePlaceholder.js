/**
 * Google Drive Uploads & Cloud Storage Service.
 * Connects file attachments to the Django backend Google Drive integration.
 */

import { assessmentApi } from './assessmentApi';

export const driveServicePlaceholder = {
  /**
   * Upload a file for an assessment via the backend Google Drive integration.
   * If assessmentId is provided, uploads directly to Google Drive via the backend.
   * Otherwise returns structured file metadata for staging.
   */
  uploadFile: async (fileObject, assessmentId = null, googleToken = null) => {
    if (assessmentId) {
      return await assessmentApi.uploadAttachment(assessmentId, fileObject, googleToken);
    }
    return {
      id: `pending-${Date.now()}`,
      name: fileObject.name,
      size: `${(fileObject.size / (1024 * 1024)).toFixed(2)} MB`,
      type: fileObject.type,
      driveUrl: '',
      status: 'pending_save',
      _file: fileObject,
    };
  },

  getFilePreview: (fileMetadata) => {
    if (fileMetadata?.type?.includes('image')) {
      return 'image_icon';
    } else if (fileMetadata?.type?.includes('pdf')) {
      return 'pdf_icon';
    }
    return 'doc_icon';
  }
};

export default driveServicePlaceholder;
