import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ImagePlus, LoaderCircle, UploadCloud } from 'lucide-react';
import { Modal } from '../../../components/common/Modal.jsx';
import { routineApi } from '../../../services/routineApi.js';


const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const validateImage = file => {
  if (!file) return 'Select a routine image.';
  if (!ACCEPTED_TYPES.has(file.type)) return 'Use a PNG, JPG/JPEG, or WEBP image.';
  if (!file.size) return 'The selected image is empty.';
  if (file.size > MAX_IMAGE_BYTES) return 'The image must be 10 MB or smaller.';
  return '';
};

export const ImageImportModal = ({ isOpen, onClose, onImported, onManualEntry }) => {
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectFile = nextFile => {
    const validationError = validateImage(nextFile);
    setError(validationError);
    if (validationError) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  };

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl('');
    setError('');
    setIsProcessing(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const close = () => {
    if (isProcessing) return;
    reset();
    onClose();
  };

  const importRoutine = async () => {
    const validationError = validateImage(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsProcessing(true);
    abortRef.current = new AbortController();
    try {
      const result = await routineApi.importImage(file, {
        signal: abortRef.current.signal,
        replaceExistingImports: true
      });
      onImported?.(result.routines || [], result);
      reset();
      onClose();
    } catch (nextError) {
      if (nextError?.name !== 'CanceledError' && nextError?.name !== 'AbortError') {
        setError(nextError.message || 'The routine image could not be analyzed.');
      }
    } finally {
      abortRef.current = null;
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title="Import Routine from Image" maxWidth="max-w-2xl">
      <div className="space-y-5">
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 flex gap-3">
          <ImagePlus className="w-5 h-5 text-cyan-500 shrink-0" />
          <div>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">Gemini Vision routine analysis</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Upload a clear screenshot of your weekly class schedule. Existing manually added classes are preserved.
            </p>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          disabled={isProcessing}
          onClick={() => inputRef.current?.click()}
          className="w-full min-h-64 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/30 hover:border-cyan-500 disabled:opacity-60 transition-colors overflow-hidden"
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Selected class routine" className="w-full max-h-80 object-contain" />
          ) : (
            <span className="flex flex-col items-center justify-center p-8">
              <UploadCloud className="w-10 h-10 text-cyan-500" />
              <span className="mt-3 text-sm font-extrabold text-slate-900 dark:text-white">Choose a routine image</span>
              <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">PNG, JPG/JPEG, or WEBP · maximum 10 MB</span>
            </span>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={isProcessing}
          onChange={event => selectFile(event.target.files?.[0])}
          className="sr-only"
        />

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => {
              close();
              onManualEntry?.();
            }}
            className="min-h-11 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            Enter manually
          </button>
          <button
            type="button"
            disabled={!file || isProcessing}
            onClick={importRoutine}
            className="min-h-11 min-w-44 inline-flex items-center justify-center gap-2 px-5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-cyan-600/20"
          >
            {isProcessing && <LoaderCircle className="w-4 h-4 animate-spin" />}
            <span>{isProcessing ? 'Analyzing Image...' : 'Analyze & Import'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ImageImportModal;
