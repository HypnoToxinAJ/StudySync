import React, { useState } from 'react';
import {
  FileCheck2,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Paperclip,
  Link as LinkIcon,
  Trash2,
  Edit2,
  ExternalLink,
  UploadCloud,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Tabs } from '../components/common/Tabs';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { driveServicePlaceholder } from '../services/driveServicePlaceholder';

export const AssessmentsPage = () => {
  const { assessments, addAssessment, updateAssessment, deleteAssessment, courses } = useData();

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'CT', 'assignment', 'examination'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);

  const [form, setForm] = useState({
    title: '',
    courseId: courses[0]?.courseId || 'CSE-311',
    type: 'CT',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    syllabus: '',
    marks: 20,
    room: 'Room 304',
    priority: 'high',
    reminderTime: '24h',
    notes: '',
    attachments: [],
    links: []
  });

  const [linkInput, setLinkInput] = useState({ label: '', url: '' });
  const [uploadingMock, setUploadingMock] = useState(false);

  const filteredAssessments = assessments.filter(ast => {
    if (activeTab === 'all') return true;
    return ast.type === activeTab;
  });

  const handleOpenAdd = () => {
    setEditingAssessment(null);
    setForm({
      title: '',
      courseId: courses[0]?.courseId || 'CSE-311',
      type: 'CT',
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '11:00',
      syllabus: '',
      marks: 20,
      room: 'Room 304',
      priority: 'high',
      reminderTime: '24h',
      notes: '',
      attachments: [],
      links: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ast) => {
    setEditingAssessment(ast);
    setForm(ast);
    setIsModalOpen(true);
  };

  const handleMockFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingMock(true);
    const metadata = await driveServicePlaceholder.uploadFile(file);
    setForm(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), metadata]
    }));
    setUploadingMock(false);
  };

  const handleAddLink = () => {
    if (!linkInput.url) return;
    const newLink = {
      id: `lnk-${Date.now()}`,
      label: linkInput.label || linkInput.url,
      url: linkInput.url
    };
    setForm(prev => ({ ...prev, links: [...(prev.links || []), newLink] }));
    setLinkInput({ label: '', url: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title) return;
    if (editingAssessment) {
      updateAssessment(editingAssessment.id, form);
    } else {
      addAssessment(form);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <FileCheck2 className="w-6 h-6 text-brand-500" />
            <span>Class Tests, Assignments & Exams</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Schedule assessment deadlines with syllabus details, Drive material attachments, and calendar sync
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Tabs
            tabs={[
              { id: 'all', label: 'All Events', count: assessments.length },
              { id: 'CT', label: 'Class Tests', count: assessments.filter(a => a.type === 'CT').length },
              { id: 'assignment', label: 'Assignments', count: assessments.filter(a => a.type === 'assignment').length },
              { id: 'examination', label: 'Exams', count: assessments.filter(a => a.type === 'examination').length },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule New</span>
          </button>
        </div>
      </div>

      {/* ASSESSMENTS GRID CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAssessments.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            No assessment entries found under this category.
          </div>
        ) : (
          filteredAssessments.map((ast) => (
            <div
              key={ast.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <Badge variant={ast.type === 'CT' ? 'amber' : ast.type === 'assignment' ? 'cyan' : 'rose'}>
                    {ast.type.toUpperCase()}
                  </Badge>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{ast.courseId}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 leading-snug">
                  {ast.title}
                </h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-brand-500" />
                    <span>Date: <strong>{ast.date}</strong> ({ast.startTime || '10:00'} - {ast.endTime || '11:00'})</span>
                  </div>
                  {ast.room && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-brand-500" />
                      <span>Exam Room: <strong>{ast.room}</strong></span>
                    </div>
                  )}
                  {ast.syllabus && (
                    <p className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-700 dark:text-slate-300">
                      <strong>Syllabus:</strong> {ast.syllabus}
                    </p>
                  )}
                </div>

                {/* Attachments & Links preview */}
                {(ast.attachments?.length > 0 || ast.links?.length > 0) && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    {ast.attachments?.map((att) => (
                      <div key={att.id || att.name} className="flex items-center justify-between p-2 bg-slate-100/60 dark:bg-slate-800/40 rounded-xl text-[11px]">
                        <span className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 font-semibold truncate">
                          <Paperclip className="w-3 h-3 text-brand-500" />
                          <span className="truncate">{att.name} ({att.size})</span>
                        </span>
                        <span className="text-[9px] text-brand-500 font-bold">Drive Meta</span>
                      </div>
                    ))}
                    {ast.links?.map((lnk) => (
                      <a
                        key={lnk.id || lnk.url}
                        href={lnk.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1.5 text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline"
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>{lnk.label || lnk.url}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Total Marks: {ast.marks || 20}</span>
                <div className="flex items-center space-x-2">
                  <button onClick={() => handleOpenEdit(ast)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteAssessment(ast.id)} className="p-1.5 text-slate-400 hover:text-rose-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ASSESSMENT EDITOR MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAssessment ? "Edit Assessment" : "Schedule New Assessment"} maxWidth="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. CT 3: SQL Normalization"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Course Code</label>
              <select
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                {courses.map(c => <option key={c.id} value={c.courseId}>{c.courseId} ({c.courseTitle})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              >
                <option value="CT">Class Test (CT)</option>
                <option value="assignment">Assignment</option>
                <option value="examination">Examination</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Total Marks</label>
              <input
                type="number"
                value={form.marks}
                onChange={(e) => setForm({ ...form, marks: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Syllabus / Topics Covered</label>
            <textarea
              value={form.syllabus}
              onChange={(e) => setForm({ ...form, syllabus: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              placeholder="Detailed syllabus notes..."
            />
          </div>

          {/* MATERIAL ATTACHMENTS MOCK DRIVE UPLOAD */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Study Material Attachments (Drive Integration Placeholder)
            </label>
            <div className="p-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center">
              <input
                type="file"
                id="mock-file-upload"
                onChange={handleMockFileUpload}
                className="hidden"
              />
              <label htmlFor="mock-file-upload" className="cursor-pointer flex flex-col items-center space-y-1">
                <UploadCloud className="w-6 h-6 text-brand-500" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {uploadingMock ? "Simulating Cloud Upload..." : "Click to Upload PDF / Doc / Image"}
                </span>
                <span className="text-[10px] text-slate-400">Google Drive cloud sync ready</span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
            <button type="submit" className="px-5 py-2 text-xs font-bold bg-brand-600 text-white rounded-xl shadow-md">Save Assessment</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
