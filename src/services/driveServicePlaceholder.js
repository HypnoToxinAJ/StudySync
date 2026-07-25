/**
 * Integration-ready interface for Google Drive Uploads & Cloud Storage.
 * Currently simulates client-side local metadata and preview handles.
 */

export const driveServicePlaceholder = {
  uploadFile: async (fileObject) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const metadata = {
          id: `drive-file-${Date.now()}`,
          name: fileObject.name,
          size: `${(fileObject.size / (1024 * 1024)).toFixed(2)} MB`,
          type: fileObject.type,
          driveUrl: `https://drive.google.com/mock-file-preview/${encodeURIComponent(fileObject.name)}`,
          status: 'simulated_upload_complete',
          note: 'Google Drive cloud syncing will be enabled in backend release.'
        };
        resolve(metadata);
      }, 700);
    });
  },

  getFilePreview: (fileMetadata) => {
    if (fileMetadata.type?.includes('image')) {
      return 'image_icon';
    } else if (fileMetadata.type?.includes('pdf')) {
      return 'pdf_icon';
    }
    return 'doc_icon';
  }
};
