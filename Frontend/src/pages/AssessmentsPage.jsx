import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Calendar, CheckCircle2, Clock, Edit2, ExternalLink, FileCheck2, Link as LinkIcon, Loader2, Paperclip, Plus, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { storageService } from '../services/storageService';
import { Tabs } from '../components/common/Tabs';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { RelatedLinksManager } from '../components/assessments/RelatedLinksManager';
import { assessmentApi } from '../services/assessmentApi';
import { assessmentFormSchema } from '../utils/assessmentSchemas';
import { combineLocalDateTime, formatDuration, formatTime, getAssignmentStatus, normalizeHttpUrl } from '../utils/assessmentUtils';

const today = () => new Date().toISOString().split('T')[0];
const inputClass = 'w-full min-h-11 px-3 py-2 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/30';
const labelClass = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1';

const normalizeStoredLinks = (links = []) => links.map((link, index) => ({
  id: link.id || `legacy-link-${index}`,
  label: String(link.label || link.url || '').trim(),
  url: String(link.url || '').trim(),
  type: link.type || 'Other',
  createdAt: link.createdAt || new Date(0).toISOString(),
  updatedAt: link.updatedAt || link.createdAt || new Date(0).toISOString()
}));

const makeDefaults = (courses, assessment = null) => {
  const firstCourse = courses[0];
  const type = assessment?.type || 'CT';
  return {
    type,
    courseId: assessment?.courseId || firstCourse?.courseId || '',
    courseTitle: assessment?.courseTitle || firstCourse?.courseTitle || '',
    title: assessment?.title || '',
    date: assessment?.date || today(),
    startTime: assessment?.startTime || (assessment ? '' : '10:00'),
    endTime: assessment?.endTime ?? (assessment ? '' : '11:00'),
    deadlineDate: assessment?.deadlineDate || (type === 'assignment' ? assessment?.date : '') || today(),
    deadlineTime: assessment?.deadlineTime || (type === 'assignment' ? assessment?.startTime : '') || '23:59',
    syllabus: assessment?.syllabus || '',
    details: assessment?.details || (type === 'assignment' ? assessment?.syllabus : '') || '',
    marks: assessment?.marks ?? 20,
    submissionMethod: assessment?.submissionMethod || '',
    priority: assessment?.priority || 'medium',
    reminderTime: assessment?.reminderTime || '24h',
    notes: assessment?.notes || '',
    attachments: assessment?.attachments || [],
    links: normalizeStoredLinks(assessment?.links)
  };
};

const FieldError = ({ id, error }) => error ? (
  <p id={id} role="alert" className="mt-1 flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error.message}
  </p>
) : null;

export const AssessmentsPage = () => {
  const { assessments, addAssessment, updateAssessment, deleteAssessment, courses, refreshData } = useData();
  const { providerToken, connectGoogleServices, hasGoogleServices } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [syncingAttachmentId, setSyncingAttachmentId] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(assessmentFormSchema),
    defaultValues: makeDefaults(courses)
  });

  const type = watch('type');
  const links = watch('links') || [];
  const attachments = watch('attachments') || [];
  const deadlineDate = watch('deadlineDate');
  const deadlineTime = watch('deadlineTime');
  const filteredAssessments = useMemo(() => assessments.filter(item => activeTab === 'all' || item.type === activeTab), [activeTab, assessments]);

  const openAdd = () => {
    setEditingAssessment(null);
    setPendingFiles([]);
    reset(makeDefaults(courses));
    setIsModalOpen(true);
  };

  const openEdit = (assessment) => {
    setEditingAssessment(assessment);
    setPendingFiles([]);
    reset(makeDefaults(courses, assessment));
    setIsModalOpen(true);
  };

  const changeCourse = event => {
    const courseId = event.target.value;
    const course = courses.find(item => item.courseId === courseId);
    setValue('courseId', courseId, { shouldValidate: true });
    if (course) setValue('courseTitle', course.courseTitle, { shouldValidate: true });
  };

  const handleFileSelect = event => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const maxSize = 25 * 1024 * 1024; // 25 MB
    if (file.size > maxSize) {
      alert(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum size is 25 MB.`);
      event.target.value = '';
      return;
    }

    const allowedTypes = [
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'text/plain'
    ];
    if (!allowedTypes.includes(file.type)) {
      alert('Unsupported file type. Please upload PDF, Word documents, or images.');
      event.target.value = '';
      return;
    }

    // Add to pending files (will be uploaded after assessment is created/updated)
    const metadata = {
      id: `pending-${Date.now()}`,
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      type: file.type,
      _file: file, // Keep the File object for upload
      status: 'pending'
    };
    setPendingFiles(prev => [...prev, metadata]);
    setValue('attachments', [...attachments, metadata], { shouldDirty: true });
    event.target.value = '';
  };

  const syncAssessmentToCalendar = async (assessment) => {
    if (!hasGoogleServices) {
      await connectGoogleServices();
      return;
    }
    setSyncingId(assessment.id);
    try {
      await updateAssessment(assessment.id, {});
      showToast('Synced to Google Calendar!');
    } catch {
      showToast('Could not sync to Google Calendar.', 'warning');
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAttachmentToDrive = async (assessmentId, attachmentId) => {
    if (!hasGoogleServices) {
      showToast('Please connect Google first to upload attachments to Google Drive.', 'info');
      await connectGoogleServices();
      return;
    }
    setSyncingAttachmentId(attachmentId);
    try {
      const updatedAtt = await assessmentApi.syncAttachmentToDrive(attachmentId, providerToken);
      if (updatedAtt?.googleDriveFileUrl) {
        const list = storageService.get(storageService.KEYS.ASSESSMENTS, []);
        const aIdx = list.findIndex(a => a.id === assessmentId);
        if (aIdx !== -1 && list[aIdx].attachments) {
          list[aIdx].attachments = list[aIdx].attachments.map(att =>
            att.id === attachmentId ? { ...att, ...updatedAtt } : att
          );
          storageService.set(storageService.KEYS.ASSESSMENTS, list);
          if (refreshData) refreshData();
        }
        showToast(`Uploaded "${updatedAtt.name}" to Google Drive!`);
      } else {
        showToast(updatedAtt?.detail || 'Could not upload to Google Drive.', 'warning');
      }
    } catch (err) {
      console.error('Failed to sync attachment to Drive:', err);
      const msg = err.response?.data?.detail || err.message || 'Google Drive upload failed.';
      showToast(msg, 'error');
    } finally {
      setSyncingAttachmentId(null);
    }
  };

  const submitAssessment = async (values) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const common = {
        type: values.type,
        courseId: values.courseId.trim(),
        courseTitle: values.courseTitle.trim(),
        title: values.title.trim(),
        marks: values.marks,
        priority: values.priority,
        reminderTime: values.reminderTime,
        notes: values.notes.trim(),
        // Send only non-pending attachments in the payload (pending ones are uploaded separately)
        attachments: (values.attachments || []).filter(a => !a._file),
        links: values.links
      };
      const payload = values.type === 'assignment' ? {
        ...common,
        details: values.details.trim(),
        submissionMethod: values.submissionMethod.trim(),
        deadlineDate: values.deadlineDate,
        deadlineTime: values.deadlineTime,
        deadlineAt: combineLocalDateTime(values.deadlineDate, values.deadlineTime)
      } : {
        ...common,
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        startAt: combineLocalDateTime(values.date, values.startTime),
        endAt: combineLocalDateTime(values.date, values.endTime),
        syllabus: values.syllabus.trim()
      };

      let assessmentId;

      if (editingAssessment) {
        const updated = await updateAssessment(editingAssessment.id, payload);
        assessmentId = updated?.id || editingAssessment.id;
      } else {
        const created = await addAssessment(payload);
        assessmentId = created?.id;
      }

      // Upload pending files if we have a valid server assessment ID (not a local fallback ID)
      const hasServerId = assessmentId && !String(assessmentId).startsWith('ev-');
      if (hasServerId && pendingFiles.length > 0) {
        setUploadingFile(true);
        let uploadFailures = 0;
        const uploadedAttachments = [];
        for (const pending of pendingFiles) {
          if (!pending._file) continue;
          try {
            const att = await assessmentApi.uploadAttachment(assessmentId, pending._file, providerToken);
            uploadedAttachments.push(att);
            if (att.driveStatus === 'uploaded') {
              showToast(`Uploaded "${att.name}" to Google Drive!`);
            } else if (att.driveStatus === 'not_connected') {
              showToast(`"${att.name}" saved in StudySync. (Google Drive not connected)`, 'info');
            } else if (att.driveStatus?.startsWith('failed')) {
              showToast(`"${att.name}" saved in StudySync, but Drive upload failed: ${att.driveError || ''}`, 'warning');
            }
          } catch (err) {
            console.error('File upload failed:', err);
            uploadFailures++;
            showToast(`Failed to upload ${pending.name || 'file'}`, 'error');
          }
        }
        setUploadingFile(false);
        if (uploadedAttachments.length > 0) {
          const list = storageService.get(storageService.KEYS.ASSESSMENTS, []);
          const idx = list.findIndex(a => a.id === assessmentId);
          if (idx !== -1) {
            list[idx].attachments = [...(list[idx].attachments || []), ...uploadedAttachments];
            storageService.set(storageService.KEYS.ASSESSMENTS, list);
            if (refreshData) refreshData();
          }
        }
        if (uploadFailures > 0) {
          console.warn(`${uploadFailures} file(s) failed to upload.`);
        }
      }

      setIsModalOpen(false);
      setPendingFiles([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deadlineIsPast = type === 'assignment' && deadlineDate && deadlineTime && new Date(`${deadlineDate}T${deadlineTime}:00`).getTime() < Date.now();

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2"><FileCheck2 className="w-6 h-6 text-brand-500" /><span>Class Tests, Assignments & Exams</span></h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Timed tests and exams, submission deadlines, materials, and calendar sync</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
          <div className="max-w-full overflow-x-auto pb-1">
            <Tabs tabs={[
              { id: 'all', label: 'All Events', count: assessments.length },
              { id: 'CT', label: 'Class Tests', count: assessments.filter(item => item.type === 'CT').length },
              { id: 'assignment', label: 'Assignments', count: assessments.filter(item => item.type === 'assignment').length },
              { id: 'examination', label: 'Exams', count: assessments.filter(item => item.type === 'examination').length }
            ]} activeTab={activeTab} onChange={setActiveTab} />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!hasGoogleServices ? (
              <button
                type="button"
                onClick={() => connectGoogleServices()}
                className="min-h-11 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-xl text-xs font-bold transition-colors"
                title="Connect Google Calendar & Drive for automatic assessment syncing"
              >
                <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Connect Google</span>
              </button>
            ) : (
              <div
                className="min-h-11 flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold"
                title="Google Calendar & Drive are connected"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Google Sync Active</span>
              </div>
            )}
            <button type="button" onClick={openAdd} className="min-h-11 flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shrink-0"><Plus className="w-4 h-4" /><span>Schedule New</span></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAssessments.length === 0 ? <div className="lg:col-span-2 py-12 text-center text-xs text-slate-400">No assessment entries found under this category.</div> : filteredAssessments.map(assessment => {
          const isAssignment = assessment.type === 'assignment';
          const duration = formatDuration(assessment.startTime, assessment.endTime);
          const materialCount = (assessment.attachments?.length || 0) + (assessment.links?.length || 0);
          const hasCalendarEvent = Boolean(assessment.googleCalendarEventId || assessment.googleCalendarEventUrl);
          const isSyncing = syncingId === assessment.id;

          return (
            <article key={assessment.id} className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant={assessment.type === 'CT' ? 'amber' : isAssignment ? 'cyan' : 'rose'}>{assessment.type === 'CT' ? 'CLASS TEST' : assessment.type.toUpperCase()}</Badge>
                  <div className="flex items-center gap-2">
                    {hasCalendarEvent ? (
                      <a
                        href={assessment.googleCalendarEventUrl || 'https://calendar.google.com'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold hover:underline"
                        title="View in Google Calendar"
                      >
                        <CheckCircle2 className="w-3 h-3" />Calendar
                      </a>
                    ) : hasGoogleServices ? (
                      <button
                        type="button"
                        onClick={() => syncAssessmentToCalendar(assessment)}
                        disabled={isSyncing}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold transition-colors disabled:opacity-50"
                        title="Sync this assessment to Google Calendar"
                      >
                        {isSyncing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                        <span>Sync</span>
                      </button>
                    ) : null}
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate">{assessment.courseId}{assessment.courseTitle ? ` · ${assessment.courseTitle}` : ''}</span>
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 leading-snug">{assessment.title}</h3>
                <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  {isAssignment ? <>
                    <div className="flex items-start gap-2"><Calendar className="w-3.5 h-3.5 text-brand-500 mt-0.5 shrink-0" /><span><strong>Submission deadline:</strong> {assessment.deadlineDate || 'Date not set'}{assessment.deadlineTime ? ` at ${formatTime(assessment.deadlineTime)}` : ' · Time not set'}</span></div>
                    <p className={getAssignmentStatus(assessment).startsWith('Overdue') ? 'font-bold text-rose-600 dark:text-rose-400' : 'font-bold text-cyan-600 dark:text-cyan-400'}>{getAssignmentStatus(assessment)}</p>
                    {(assessment.details || assessment.syllabus) && <p className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl line-clamp-3"><strong>Details:</strong> {assessment.details || assessment.syllabus}</p>}
                  </> : <>
                    <div className="flex items-start gap-2"><Calendar className="w-3.5 h-3.5 text-brand-500 mt-0.5 shrink-0" /><span><strong>{assessment.date}</strong></span></div>
                    <div className="flex items-start gap-2"><Clock className="w-3.5 h-3.5 text-brand-500 mt-0.5 shrink-0" />{assessment.endTime ? <span>{formatTime(assessment.startTime) || 'Start time not set'}–{formatTime(assessment.endTime)}{duration ? ` · ${duration}` : ''}</span> : <span className="font-bold text-amber-600 dark:text-amber-400">{formatTime(assessment.startTime) || 'Start time not set'} · End time not set</span>}</div>
                    {assessment.syllabus && <p className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl line-clamp-3"><strong>Syllabus:</strong> {assessment.syllabus}</p>}
                  </>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1"><span><strong>Marks:</strong> {assessment.marks ?? 'Not applicable'}</span><span><strong>Priority:</strong> {assessment.priority || 'medium'}</span><span><strong>Related links:</strong> {assessment.links?.length || 0}</span>{isAssignment && <span><strong>Materials & links:</strong> {materialCount}</span>}</div>
                </div>
                {(assessment.attachments?.length > 0 || assessment.links?.length > 0) && <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 min-w-0">
                  {assessment.attachments?.map(attachment => {
                    const isSynced = Boolean(attachment.googleDriveFileUrl || attachment.driveUrl);
                    const driveUrl = attachment.googleDriveFileUrl || attachment.driveUrl;
                    const isAttachmentSyncing = syncingAttachmentId === attachment.id;

                    return (
                      <div key={attachment.id || attachment.name} className="flex items-center gap-1.5 p-2 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl text-[11px] text-slate-700 dark:text-slate-300 font-semibold min-w-0">
                        <Paperclip className="w-3 h-3 text-brand-500 shrink-0" />
                        <span className="truncate">{attachment.name} {attachment.size ? `(${attachment.size})` : ''}</span>
                        {isSynced ? (
                          <a
                            href={driveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold hover:underline shrink-0"
                            title="Open in Google Drive"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>Drive</span>
                          </a>
                        ) : (
                          <div className="ml-auto flex items-center gap-1 shrink-0">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-medium">
                              Not on Drive
                            </span>
                            {hasGoogleServices && (
                              <button
                                type="button"
                                onClick={() => handleSyncAttachmentToDrive(assessment.id, attachment.id)}
                                disabled={isAttachmentSyncing}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 text-[10px] font-bold transition-colors disabled:opacity-50"
                                title="Upload this file to Google Drive"
                              >
                                {isAttachmentSyncing ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <UploadCloud className="w-2.5 h-2.5" />
                                )}
                                <span>Upload to Drive</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {assessment.links?.map(link => {
                    const safeUrl = normalizeHttpUrl(link.url);
                    return safeUrl.error ? null : <a key={link.id || link.url} href={safeUrl.value} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline min-w-0"><LinkIcon className="w-3 h-3 shrink-0" /><span className="truncate">{link.label || link.url}</span></a>;
                  })}
                </div>}
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                {!isAssignment && !assessment.endTime ? <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Edit to set an end time</span> : <span />}
                <div className="flex items-center gap-2 ml-auto"><button type="button" onClick={() => openEdit(assessment)} aria-label={`Edit ${assessment.title}`} className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-500 hover:text-brand-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><Edit2 className="w-4 h-4" /></button><button type="button" onClick={() => deleteAssessment(assessment.id)} aria-label={`Delete ${assessment.title}`} className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-500 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"><Trash2 className="w-4 h-4" /></button></div>
              </div>
            </article>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingAssessment ? 'Edit Assessment' : 'Schedule New Assessment'} maxWidth="max-w-3xl">
        <form onSubmit={handleSubmit(submitAssessment)} noValidate className="space-y-5 min-w-0">
          {!hasGoogleServices ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Calendar className="w-4 h-4 text-brand-500 shrink-0" />
                <span>Want to sync assessments to your Google Calendar & Drive?</span>
              </div>
              <button
                type="button"
                onClick={() => connectGoogleServices()}
                className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold rounded-lg border border-brand-200 dark:border-brand-800 text-[11px] shrink-0 transition-colors text-center"
              >
                Connect Google
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/60 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Google Calendar & Drive sync is active for this assessment.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label htmlFor="assessment-type" className={labelClass}>Assessment type</label><select id="assessment-type" {...register('type')} className={inputClass}><option value="CT">Class Test (CT)</option><option value="assignment">Assignment</option><option value="examination">Examination</option></select></div>
            <div><label htmlFor="assessment-title" className={labelClass}>{type === 'CT' ? 'CT title or number' : type === 'examination' ? 'Examination title or type' : 'Assignment title'}</label><input id="assessment-title" {...register('title')} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'assessment-title-error' : undefined} className={inputClass} placeholder="Enter a title" /><FieldError id="assessment-title-error" error={errors.title} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label htmlFor="assessment-course-id" className={labelClass}>Course ID</label><select id="assessment-course-id" {...register('courseId')} onChange={changeCourse} aria-invalid={Boolean(errors.courseId)} aria-describedby={errors.courseId ? 'assessment-course-id-error' : undefined} className={inputClass}><option value="">Select a course</option>{courses.map(course => <option key={course.id} value={course.courseId}>{course.courseId}</option>)}</select><FieldError id="assessment-course-id-error" error={errors.courseId} /></div>
            <div><label htmlFor="assessment-course-title" className={labelClass}>Course title</label><input id="assessment-course-title" {...register('courseTitle')} aria-invalid={Boolean(errors.courseTitle)} aria-describedby={errors.courseTitle ? 'assessment-course-title-error' : undefined} className={inputClass} /><FieldError id="assessment-course-title-error" error={errors.courseTitle} /></div>
          </div>

          {type === 'assignment' ? <div className="space-y-4">
            <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-3"><legend className="sr-only">Submission deadline</legend>
              <div><label htmlFor="assignment-deadline-date" className={labelClass}>Submission deadline date</label><input id="assignment-deadline-date" type="date" {...register('deadlineDate')} aria-invalid={Boolean(errors.deadlineDate)} aria-describedby={errors.deadlineDate ? 'assignment-deadline-date-error' : undefined} className={inputClass} /><FieldError id="assignment-deadline-date-error" error={errors.deadlineDate} /></div>
              <div><label htmlFor="assignment-deadline-time" className={labelClass}>Submission deadline time</label><input id="assignment-deadline-time" type="time" {...register('deadlineTime')} aria-invalid={Boolean(errors.deadlineTime)} aria-describedby={errors.deadlineTime ? 'assignment-deadline-time-error' : deadlineIsPast ? 'assignment-deadline-past-warning' : undefined} className={inputClass} /><FieldError id="assignment-deadline-time-error" error={errors.deadlineTime} />{deadlineIsPast && <p id="assignment-deadline-past-warning" className="mt-1 text-xs text-amber-600 dark:text-amber-400">This deadline is in the past. You can still save it for a historical assignment.</p>}</div>
            </fieldset>
            <div><label htmlFor="assignment-details" className={labelClass}>Assignment details</label><textarea id="assignment-details" rows={3} {...register('details')} aria-invalid={Boolean(errors.details)} aria-describedby={errors.details ? 'assignment-details-error' : undefined} className={inputClass} /><FieldError id="assignment-details-error" error={errors.details} /></div>
            <div><label htmlFor="assignment-submission-method" className={labelClass}>Submission method</label><input id="assignment-submission-method" {...register('submissionMethod')} className={inputClass} placeholder="e.g. Google Classroom" /></div>
          </div> : <div className="space-y-4">
            <fieldset className="grid grid-cols-1 sm:grid-cols-3 gap-3"><legend className="sr-only">Assessment date and time</legend>
              <div><label htmlFor="assessment-date" className={labelClass}>Date</label><input id="assessment-date" type="date" {...register('date')} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'assessment-date-error' : undefined} className={inputClass} /><FieldError id="assessment-date-error" error={errors.date} /></div>
              <div><label htmlFor="assessment-start-time" className={labelClass}>Start time</label><input id="assessment-start-time" type="time" {...register('startTime')} aria-invalid={Boolean(errors.startTime)} aria-describedby={errors.startTime ? 'assessment-start-time-error' : undefined} className={inputClass} /><FieldError id="assessment-start-time-error" error={errors.startTime} /></div>
              <div><label htmlFor="assessment-end-time" className={labelClass}>End time</label><input id="assessment-end-time" type="time" {...register('endTime')} aria-invalid={Boolean(errors.endTime)} aria-describedby={errors.endTime ? 'assessment-end-time-error' : undefined} className={inputClass} /><FieldError id="assessment-end-time-error" error={errors.endTime} />{editingAssessment && !editingAssessment.endTime && !errors.endTime && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">End time not set on this legacy record.</p>}</div>
            </fieldset>
            <div><label htmlFor="assessment-syllabus" className={labelClass}>{type === 'examination' ? 'Syllabus or coverage' : 'Syllabus'}</label><textarea id="assessment-syllabus" rows={3} {...register('syllabus')} aria-invalid={Boolean(errors.syllabus)} aria-describedby={errors.syllabus ? 'assessment-syllabus-error' : undefined} className={inputClass} /><FieldError id="assessment-syllabus-error" error={errors.syllabus} /></div>
          </div>}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label htmlFor="assessment-marks" className={labelClass}>Marks{type !== 'CT' ? ' (if applicable)' : ''}</label><input id="assessment-marks" type="number" min="0" {...register('marks', { setValueAs: value => value === '' ? undefined : Number(value) })} aria-invalid={Boolean(errors.marks)} aria-describedby={errors.marks ? 'assessment-marks-error' : undefined} className={inputClass} /><FieldError id="assessment-marks-error" error={errors.marks} /></div>
            <div><label htmlFor="assessment-priority" className={labelClass}>Priority</label><select id="assessment-priority" {...register('priority')} className={inputClass}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
            <div><label htmlFor="assessment-reminder" className={labelClass}>Reminder time</label><select id="assessment-reminder" {...register('reminderTime')} className={inputClass}><option value="1h">1 hour before</option><option value="6h">6 hours before</option><option value="12h">12 hours before</option><option value="24h">24 hours before</option><option value="48h">48 hours before</option><option value="1w">1 week before</option></select></div>
          </div>
          <div><label htmlFor="assessment-notes" className={labelClass}>Notes</label><textarea id="assessment-notes" rows={3} {...register('notes')} className={inputClass} placeholder="Revision notes, instructions, or reminders" /></div>

          {/* Material attachments */}
          <div>
            <span className={labelClass}>Material attachments</span>
            <div className="p-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center">
              <input type="file" id="assessment-file-upload" onChange={handleFileSelect} className="sr-only" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif,.txt" />
              <label htmlFor="assessment-file-upload" className="min-h-11 cursor-pointer flex flex-col items-center justify-center gap-1">
                <UploadCloud className="w-6 h-6 text-brand-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {uploadingFile ? 'Uploading…' : 'Upload PDF, document, or image (max 25 MB)'}
                </span>
                {hasGoogleServices ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400">✓ Files will be automatically saved to your Google Drive</span>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>Google Drive not connected. Files will save in StudySync.</span>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); connectGoogleServices(); }}
                      className="text-brand-600 dark:text-brand-400 font-bold underline hover:text-brand-700"
                    >
                      Connect Google
                    </button>
                  </div>
                )}
              </label>
            </div>
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachments.map((att, i) => (
                  <div key={att.id || i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <Paperclip className="w-3 h-3 text-brand-500 shrink-0" />
                    <span className="truncate">{att.name}</span>
                    <span className="text-slate-400">{att.size || ''}</span>
                    {att._file && <span className="text-[10px] text-amber-500 font-semibold">Pending upload</span>}
                    {(att.googleDriveFileUrl || att.driveUrl) && <span className="text-[10px] text-emerald-500 font-semibold">On Drive</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <RelatedLinksManager links={links} onChange={nextLinks => setValue('links', nextLinks, { shouldDirty: true, shouldValidate: true })} />

          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" onClick={() => !isSubmitting && setIsModalOpen(false)} disabled={isSubmitting} className="min-h-11 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="min-h-11 px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Saving…' : editingAssessment ? 'Update Assessment' : 'Schedule Assessment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
