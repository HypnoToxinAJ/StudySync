import React, { useState } from 'react';
import {
  GraduationCap,
  Upload,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Terminal,
  ChevronDown,
  ChevronUp,
  FileCode,
  Info
} from 'lucide-react';

export const CuetResultConnectCard = ({
  onImportHtml,
  isLoading,
  error,
  diagnostics
}) => {
  const [htmlInput, setHtmlInput] = useState('');
  const [showDiag, setShowDiag] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setHtmlInput(content);
      }
    };
    reader.readAsText(file);
  };

  const handleHtmlSubmit = (e) => {
    e.preventDefault();
    if (!htmlInput.trim() || isLoading) return;
    onImportHtml(htmlInput);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-slate-50/80 to-indigo-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/40 border border-slate-200/90 dark:border-slate-800 shadow-xl p-6 sm:p-8">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-brand-600/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-2xl border border-brand-500/20 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                  Official Academic Integration
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>100% Zero Password</span>
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                Import from CUET Result Portal
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                Log into your official CUET student portal in your browser, view the result page source (<code className="text-brand-600 font-mono">Ctrl+U</code>), and paste or upload it here.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <a
              href="https://course.cuet.ac.bd"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-300 transition-colors bg-white dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <span>CUET Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Quick 3-Step Guide */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
          <div className="flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-400 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <strong className="text-slate-800 dark:text-slate-200">Open CUET Result</strong>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Log into <code className="font-mono text-brand-600">course.cuet.ac.bd</code> and go to published results.</p>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-400 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <strong className="text-slate-800 dark:text-slate-200">View Page Source</strong>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-mono">Ctrl+U</kbd> or right-click &gt; View Page Source, then copy all (<kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-mono">Ctrl+A, Ctrl+C</kbd>).</p>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <span className="w-5 h-5 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-400 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
            <div>
              <strong className="text-slate-800 dark:text-slate-200">Paste & Calculate</strong>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Paste below or upload the saved HTML file. StudySync calculates everything instantly.</p>
            </div>
          </div>
        </div>

        {/* Error Alert Display */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 flex items-start space-x-3 text-xs animate-fadeIn">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <p className="font-bold">Result Import Notice</p>
              <p className="opacity-90">{error}</p>
              {diagnostics && (
                <button
                  type="button"
                  onClick={() => setShowDiag(!showDiag)}
                  className="mt-1 inline-flex items-center space-x-1 text-[11px] font-bold text-rose-600 hover:underline"
                >
                  <span>{showDiag ? 'Hide Diagnostics' : 'View Detection Diagnostics'}</span>
                  {showDiag ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Diagnostics Report Panel */}
        {diagnostics && showDiag && (
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs space-y-2 border border-slate-700 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-sky-400 flex items-center gap-1.5">
                <Terminal className="w-4 h-4" /> CUET Portal Detection Diagnostics
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${diagnostics.isResultPage ? 'bg-emerald-900/60 text-emerald-300' : 'bg-amber-900/60 text-amber-300'}`}>
                {diagnostics.isResultPage ? 'Result Page Detected' : 'Result Page Not Recognized'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div>• Confidence Score: <strong>{(diagnostics.confidence * 100).toFixed(0)}%</strong></div>
              <div>• Matched Strategy: <strong>{diagnostics.matchedStrategy}</strong></div>
              <div>• Tables Found: <strong>{diagnostics.tableCount}</strong></div>
              <div>• Candidate Result Rows: <strong>{diagnostics.candidateRowsFound}</strong></div>
              <div>• Known Selector (.productall_row): <strong>{diagnostics.knownSelectorFound ? 'Yes' : 'No'}</strong></div>
            </div>
            {diagnostics.issues?.length > 0 && (
              <div className="pt-2 border-t border-slate-800 text-amber-400">
                <p className="font-bold">Issues Detected:</p>
                {diagnostics.issues.map((iss, i) => (
                  <p key={i}>• {iss}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PASTE / UPLOAD RESULT HTML FORM */}
        <form onSubmit={handleHtmlSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>Paste CUET Result Page HTML</span>
              </label>
              <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload .html file {fileName ? `(${fileName})` : ''}</span>
                <input
                  type="file"
                  accept=".html,.htm,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              value={htmlInput}
              onChange={(e) => setHtmlInput(e.target.value)}
              placeholder="Paste the copied page source (Ctrl+U) from course.cuet.ac.bd/result_published.php here..."
              rows={8}
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-slate-400"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Supports full page source from <code>result_published.php</code> or copied result <code>&lt;table&gt;</code> HTML.</span>
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              StudySync automatically resolves repeated course attempts and calculates official semester GPAs &amp; cumulative CGPA.
            </span>
            <button
              type="submit"
              disabled={isLoading || !htmlInput.trim()}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center space-x-2 shadow-md hover:shadow-brand-500/25 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Parsing &amp; Calculating...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Parse &amp; Import Results</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
