import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.js?url';
import { usePdfDocument } from '../hooks/usePdfDocument';
import { usePdfAnnotations } from '../hooks/usePdfAnnotations';
import { PdfUploadZone } from './PdfUploadZone';
import { PdfViewerToolbar } from './PdfViewerToolbar';
import { PdfAnnotationToolbar } from './PdfAnnotationToolbar';
import { PdfSidebar } from './PdfSidebar';
import { PdfStudyNotesPanel } from './PdfStudyNotesPanel';
import { Lock, Loader2, AlertCircle } from 'lucide-react';

// Configure local version-matched PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const PdfStudyWorkspace = () => {
  const {
    file,
    objectUrl,
    docFingerprint,
    fileError,
    isLoading,
    setIsLoading,
    passwordNeeded,
    setPasswordNeeded,
    password,
    setPassword,
    currentPage,
    setCurrentPage,
    numPages,
    setNumPages,
    zoomScale,
    setZoomScale,
    fitMode,
    setFitMode,
    rotation,
    setRotation,
    viewMode,
    setViewMode,
    interactionTool,
    setInteractionTool,
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    isSidebarOpen,
    setIsSidebarOpen,
    sidebarTab,
    setSidebarTab,
    loadPdfFile,
    closePdfDocument,
    goToPage,
    zoomIn,
    zoomOut,
    rotateClockwise,
    rotateCounterClockwise
  } = usePdfDocument();

  const {
    annotations,
    notes,
    activeTool,
    setActiveTool,
    activeColor,
    setActiveColor,
    addAnnotation,
    deleteAnnotation,
    addNote,
    deleteNote,
    exportNotesAsMarkdown
  } = usePdfAnnotations(docFingerprint);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const pdfDocRef = useRef(null);

  const [outline, setOutline] = useState([]);
  const [selectedText, setSelectedText] = useState('');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [renderError, setRenderError] = useState('');

  // Handle active tool action (e.g. comment modal)
  useEffect(() => {
    if (activeTool === 'comment') {
      setIsNoteModalOpen(true);
      setActiveTool('none');
    }
  }, [activeTool, setActiveTool]);

  // Load PDF Document via PDF.js
  useEffect(() => {
    if (!objectUrl) return;

    let isCancelled = false;
    setIsLoading(true);
    setRenderError('');

    const loadingTask = pdfjsLib.getDocument({
      url: objectUrl,
      password: password || undefined
    });

    loadingTask.onPassword = (updatePassword, reason) => {
      setPasswordNeeded(true);
      if (reason === pdfjsLib.PasswordResponses.NEED_PASSWORD) {
        setIsLoading(false);
      }
    };

    loadingTask.promise
      .then(async (pdfDoc) => {
        if (isCancelled) return;
        pdfDocRef.current = pdfDoc;
        setNumPages(pdfDoc.numPages);
        setIsLoading(false);
        setPasswordNeeded(false);

        // Try extracting outline / bookmarks
        try {
          const rawOutline = await pdfDoc.getOutline();
          if (rawOutline && Array.isArray(rawOutline)) {
            const parsedOutline = rawOutline.map((item) => ({
              title: item.title,
              page: 1 // Default or parsed dest
            }));
            setOutline(parsedOutline);
          } else {
            setOutline([]);
          }
        } catch (e) {
          setOutline([]);
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        setIsLoading(false);
        if (err.name === 'PasswordException') {
          setPasswordNeeded(true);
        } else {
          setRenderError(err.message || 'Error rendering PDF document.');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [objectUrl, password, setNumPages, setIsLoading, setPasswordNeeded]);

  // Render current PDF page on canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    try {
      const page = await pdfDocRef.current.getPage(currentPage);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      let scale = zoomScale;
      if (fitMode === 'width' && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 48;
        const unscaledViewport = page.getViewport({ scale: 1, rotation });
        scale = containerWidth / unscaledViewport.width;
      } else if (fitMode === 'page' && containerRef.current) {
        const containerHeight = containerRef.current.clientHeight - 48;
        const unscaledViewport = page.getViewport({ scale: 1, rotation });
        scale = containerHeight / unscaledViewport.height;
      }

      const viewport = page.getViewport({ scale, rotation });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport
      };

      await page.render(renderContext).promise;

      // Execute text search highlight if searchQuery exists
      if (searchQuery.trim()) {
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map((i) => i.str).join(' ');
        const matches = [...textItems.matchAll(new RegExp(searchQuery, 'gi'))];
        setSearchResults({
          current: matches.length > 0 ? 1 : 0,
          total: matches.length,
          matches
        });
      }
    } catch (e) {
      console.warn('Page render warning:', e);
    }
  }, [currentPage, zoomScale, rotation, fitMode, searchQuery, setSearchResults]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Handle Text Selection on Canvas container
  const handleMouseUp = () => {
    const selection = window.getSelection();
    const text = selection?.toString()?.trim();
    if (text) {
      setSelectedText(text);

      if (activeTool === 'highlight' || activeTool === 'underline' || activeTool === 'strikethrough') {
        addAnnotation({
          page: currentPage,
          type: activeTool,
          text,
          color: activeColor
        });
      }
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password) {
      setPasswordNeeded(false);
      setIsLoading(true);
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (objectUrl && file) {
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = file.name || 'document.pdf';
      link.click();
    }
  };

  // If no file loaded, show Upload Zone
  if (!file || !objectUrl) {
    return <PdfUploadZone onFileSelect={loadPdfFile} fileError={fileError} />;
  }

  return (
    <div
      ref={containerRef}
      className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col h-[750px] relative"
    >
      {/* Primary Viewer Toolbar */}
      <PdfViewerToolbar
        fileName={file.name}
        currentPage={currentPage}
        numPages={numPages}
        goToPage={goToPage}
        zoomScale={zoomScale}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        setZoomScale={setZoomScale}
        fitMode={fitMode}
        setFitMode={setFitMode}
        rotateClockwise={rotateClockwise}
        rotateCounterClockwise={rotateCounterClockwise}
        viewMode={viewMode}
        setViewMode={setViewMode}
        interactionTool={interactionTool}
        setInteractionTool={setInteractionTool}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        onSearchPrev={() => setSearchResults((prev) => ({ ...prev, current: Math.max(1, prev.current - 1) }))}
        onSearchNext={() => setSearchResults((prev) => ({ ...prev, current: Math.min(prev.total, prev.current + 1) }))}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onPrint={handlePrint}
        onDownload={handleDownload}
        onFullscreen={handleFullscreen}
        onCloseDoc={closePdfDocument}
      />

      {/* Study Annotation Toolbar */}
      <PdfAnnotationToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        activeColor={activeColor}
        setActiveColor={setActiveColor}
        onExportNotes={() => exportNotesAsMarkdown(file.name.replace('.pdf', ''))}
      />

      {/* Main Workspace Body (Sidebar + Canvas) */}
      <div className="flex-1 flex overflow-hidden relative">
        <PdfSidebar
          isOpen={isSidebarOpen}
          tab={sidebarTab}
          setTab={setSidebarTab}
          numPages={numPages}
          currentPage={currentPage}
          goToPage={goToPage}
          outline={outline}
          annotations={annotations}
          notes={notes}
          onDeleteAnnotation={deleteAnnotation}
          onDeleteNote={deleteNote}
        />

        {/* Canvas Display Viewport */}
        <div
          onMouseUp={handleMouseUp}
          className={`flex-1 overflow-auto p-6 bg-slate-950 flex flex-col items-center relative ${
            interactionTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-text'
          }`}
        >
          {isLoading && (
            <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center space-y-3 text-white">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
              <p className="text-xs font-bold">Rendering PDF document...</p>
            </div>
          )}

          {passwordNeeded && (
            <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-white text-center">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full space-y-4">
                <Lock className="w-8 h-8 text-amber-500 mx-auto" />
                <div>
                  <h4 className="text-sm font-bold">Password Protected PDF</h4>
                  <p className="text-xs text-slate-400 mt-1">Enter password to view this document.</p>
                </div>
                <form onSubmit={handlePasswordSubmit} className="space-y-3">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter PDF password..."
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl outline-none text-white"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md"
                  >
                    Unlock PDF
                  </button>
                </form>
              </div>
            </div>
          )}

          {renderError && (
            <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs font-bold text-rose-400 flex items-center space-x-2 my-auto">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{renderError}</span>
            </div>
          )}

          <div className="relative shadow-2xl rounded border border-slate-800 bg-white">
            <canvas ref={canvasRef} className="block" />
          </div>
        </div>
      </div>

      {/* Page Note Modal */}
      <PdfStudyNotesPanel
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        currentPage={currentPage}
        selectedText={selectedText}
        onAddNote={addNote}
      />
    </div>
  );
};
export default PdfStudyWorkspace;
