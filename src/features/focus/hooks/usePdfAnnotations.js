import { useState, useEffect, useCallback } from 'react';
import { pdfAnnotationStorage } from '../services/pdfAnnotationStorage';

export const ANNOTATION_COLORS = {
  yellow: { bg: '#FEF08A', border: '#FACC15', text: '#854D0E', label: 'Yellow' },
  green: { bg: '#BBF7D0', border: '#4ADE80', text: '#166534', label: 'Green' },
  cyan: { bg: '#A5F3FC', border: '#38BDF8', text: '#155E75', label: 'Cyan' },
  pink: { bg: '#FBCFE8', border: '#F472B6', text: '#9D174D', label: 'Pink' }
};

export const usePdfAnnotations = (docFingerprint) => {
  const [annotations, setAnnotations] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activeTool, setActiveTool] = useState('none'); // 'none' | 'highlight' | 'underline' | 'strikethrough' | 'comment' | 'draw'
  const [activeColor, setActiveColor] = useState('yellow');

  // Load annotations and notes from IndexedDB on fingerprint change
  useEffect(() => {
    if (!docFingerprint) {
      setAnnotations([]);
      setNotes([]);
      return;
    }

    let isMounted = true;
    async function loadData() {
      const storedAnn = await pdfAnnotationStorage.getAnnotations(docFingerprint);
      const storedNotes = await pdfAnnotationStorage.getNotes(docFingerprint);
      if (isMounted) {
        setAnnotations(storedAnn || []);
        setNotes(storedNotes || []);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [docFingerprint]);

  const addAnnotation = useCallback((data) => {
    if (!docFingerprint) return;

    const newAnn = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      page: data.page || 1,
      type: data.type || 'highlight', // 'highlight' | 'underline' | 'strikethrough' | 'comment' | 'draw'
      color: data.color || activeColor,
      text: data.text || '',
      comment: data.comment || '',
      rect: data.rect || null,
      path: data.path || null,
      createdAt: new Date().toISOString()
    };

    setAnnotations((prev) => {
      const updated = [newAnn, ...prev];
      pdfAnnotationStorage.saveAnnotations(docFingerprint, updated);
      return updated;
    });
  }, [docFingerprint, activeColor]);

  const deleteAnnotation = useCallback((id) => {
    if (!docFingerprint) return;
    setAnnotations((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      pdfAnnotationStorage.saveAnnotations(docFingerprint, updated);
      return updated;
    });
  }, [docFingerprint]);

  const addNote = useCallback((data) => {
    if (!docFingerprint) return;

    const newNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      page: data.page || 1,
      title: data.title || `Note for Page ${data.page || 1}`,
      content: data.content || '',
      selectedText: data.selectedText || '',
      color: data.color || activeColor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setNotes((prev) => {
      const updated = [newNote, ...prev];
      pdfAnnotationStorage.saveNotes(docFingerprint, updated);
      return updated;
    });
  }, [docFingerprint, activeColor]);

  const updateNote = useCallback((id, updates) => {
    if (!docFingerprint) return;
    setNotes((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
      pdfAnnotationStorage.saveNotes(docFingerprint, updated);
      return updated;
    });
  }, [docFingerprint]);

  const deleteNote = useCallback((id) => {
    if (!docFingerprint) return;
    setNotes((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      pdfAnnotationStorage.saveNotes(docFingerprint, updated);
      return updated;
    });
  }, [docFingerprint]);

  const exportNotesAsMarkdown = useCallback((fileName = 'StudyNotes') => {
    if (notes.length === 0 && annotations.length === 0) return;

    let md = `# Study Notes & Annotations: ${fileName}\n\n`;
    md += `Exported on: ${new Date().toLocaleString()}\n\n`;

    if (notes.length > 0) {
      md += `## Study Notes\n\n`;
      notes.forEach((n) => {
        md += `### Page ${n.page}: ${n.title}\n`;
        if (n.selectedText) md += `> "${n.selectedText}"\n\n`;
        md += `${n.content}\n\n`;
        md += `---\n\n`;
      });
    }

    if (annotations.length > 0) {
      md += `## Highlights & Comments\n\n`;
      annotations.forEach((a) => {
        md += `- **Page ${a.page}** [${a.type.toUpperCase()}]: ${a.text || 'Annotation'}`;
        if (a.comment) md += ` — *Comment:* ${a.comment}`;
        md += `\n`;
      });
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_StudyNotes.md`;
    link.click();
    URL.revokeObjectURL(url);
  }, [notes, annotations]);

  return {
    annotations,
    notes,
    activeTool,
    setActiveTool,
    activeColor,
    setActiveColor,
    addAnnotation,
    deleteAnnotation,
    addNote,
    updateNote,
    deleteNote,
    exportNotesAsMarkdown
  };
};
