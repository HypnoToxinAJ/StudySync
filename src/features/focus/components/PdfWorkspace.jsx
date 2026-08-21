import React from 'react';
import { useLocalPdf } from '../hooks/useLocalPdf';
import { PdfUploadZone } from './PdfUploadZone';
import { PdfViewerContainer } from './PdfViewerContainer';
import { PdfViewerErrorBoundary } from './PdfViewerErrorBoundary';

export const PdfWorkspace = ({ onBackToTools }) => {
  const {
    file,
    objectUrl,
    fileInfo,
    error,
    isLoading,
    openPdfFile,
    closePdf
  } = useLocalPdf();

  return (
    <PdfViewerErrorBoundary onReset={closePdf} onBackToTools={onBackToTools}>
      {objectUrl ? (
        <PdfViewerContainer
          file={file}
          objectUrl={objectUrl}
          fileInfo={fileInfo}
          onClosePdf={closePdf}
          onReplacePdf={openPdfFile}
          onBackToTools={onBackToTools}
        />
      ) : (
        <PdfUploadZone
          onFileSelected={openPdfFile}
          isLoading={isLoading}
          error={error}
          onBackToTools={onBackToTools}
        />
      )}
    </PdfViewerErrorBoundary>
  );
};

export default PdfWorkspace;
