import React, { useState, useEffect, useRef } from 'react';
import {
  Pencil,
  Save,
  X,
  GraduationCap,
  Building2,
  BookOpen,
  Hash,
  Calendar,
  Target,
  DollarSign,
  Loader2,
  CheckCircle2,
  UserCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../services/apiClient';
import { storageService } from '../../services/storageService';

const FIELD_CONFIG = [
  {
    key: 'name',
    label: 'Full Name',
    icon: UserCircle2,
    placeholder: 'Enter your full name',
    type: 'text',
    required: true,
  },
  {
    key: 'university',
    label: 'University / Institute',
    icon: Building2,
    placeholder: 'e.g. Chittagong University of Engineering & Technology',
    type: 'text',
    required: true,
  },
  {
    key: 'department',
    label: 'Department',
    icon: BookOpen,
    placeholder: 'e.g. Computer Science & Engineering',
    type: 'text',
    required: true,
  },
  {
    key: 'semester',
    label: 'Current Semester',
    icon: GraduationCap,
    placeholder: 'e.g. 5th Semester',
    type: 'text',
    required: true,
  },
  {
    key: 'studentId',
    label: 'Student ID / Roll No',
    icon: Hash,
    placeholder: 'e.g. 2004015',
    type: 'text',
    required: false,
  },
  {
    key: 'currency',
    label: 'Currency',
    icon: DollarSign,
    placeholder: 'e.g. BDT, USD, INR',
    type: 'text',
    required: false,
  },
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const EditProfileCard = () => {
  const { user, setUser } = useAuth();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [form, setForm] = useState({
    name: '',
    university: '',
    department: '',
    semester: '',
    studentId: '',
    currency: 'BDT',
    weeklyClassDays: [],
    academicGoals: '',
  });

  const nameInputRef = useRef(null);

  // Sync form state when user changes or editing starts
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        university: user.university || '',
        department: user.department || '',
        semester: user.semester || '',
        studentId: user.studentId || '',
        currency: user.currency || 'BDT',
        weeklyClassDays: user.weeklyClassDays || [],
        academicGoals: user.academicGoals || '',
      });
    }
  }, [user, isEditing]);

  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditing]);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleDay = day => {
    setForm(prev => ({
      ...prev,
      weeklyClassDays: prev.weeklyClassDays.includes(day)
        ? prev.weeklyClassDays.filter(d => d !== day)
        : [...prev.weeklyClassDays, day],
    }));
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSaveSuccess(false);
    // Reset form to current user values
    if (user) {
      setForm({
        name: user.name || '',
        university: user.university || '',
        department: user.department || '',
        semester: user.semester || '',
        studentId: user.studentId || '',
        currency: user.currency || 'BDT',
        weeklyClassDays: user.weeklyClassDays || [],
        academicGoals: user.academicGoals || '',
      });
    }
  };

  const handleSave = async () => {
    // Basic validation
    if (!form.name.trim()) {
      showToast('Name is required.', 'warning');
      return;
    }
    if (!form.university.trim()) {
      showToast('University is required.', 'warning');
      return;
    }
    if (!form.department.trim()) {
      showToast('Department is required.', 'warning');
      return;
    }
    if (!form.semester.trim()) {
      showToast('Semester is required.', 'warning');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Persist to backend via PATCH /auth/me/
      const backendProfile = await apiClient.patch('/auth/me/', {
        name: form.name.trim(),
        university: form.university.trim(),
        department: form.department.trim(),
        semester: form.semester.trim(),
        studentId: form.studentId.trim(),
        currency: form.currency.trim() || 'BDT',
        weeklyClassDays: form.weeklyClassDays,
        academicGoals: form.academicGoals.trim(),
      });

      // Merge updated profile into local user state
      const updatedUser = {
        ...user,
        ...backendProfile,
        id: user.id,
        email: user.email,
        isLoggedIn: true,
      };

      setUser(updatedUser);
      storageService.set(storageService.KEYS.USER, updatedUser);

      setSaveSuccess(true);
      showToast('Profile updated successfully!', 'success');

      // Close editing after a brief success animation
      setTimeout(() => {
        setIsEditing(false);
        setSaveSuccess(false);
      }, 1200);
    } catch (error) {
      console.error('Failed to update profile:', error);
      showToast(error?.message || 'Failed to update profile. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Determine if form has changed from user data
  const hasChanges =
    form.name !== (user?.name || '') ||
    form.university !== (user?.university || '') ||
    form.department !== (user?.department || '') ||
    form.semester !== (user?.semester || '') ||
    form.studentId !== (user?.studentId || '') ||
    form.currency !== (user?.currency || 'BDT') ||
    JSON.stringify(form.weeklyClassDays) !== JSON.stringify(user?.weeklyClassDays || []) ||
    form.academicGoals !== (user?.academicGoals || '');

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-brand-500" />
            <span>Academic Profile</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Your university, department, semester, and personal details
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            id="edit-profile-btn"
            className="flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all self-start sm:self-auto"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* View Mode — Display Current Profile */}
      {!isEditing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELD_CONFIG.map(field => {
            const Icon = field.icon;
            const value = user?.[field.key] || '—';
            return (
              <div
                key={field.key}
                className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-brand-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {field.label}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate mt-0.5">
                    {value}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Weekly Class Days — View */}
          <div className="sm:col-span-2 flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-brand-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Weekly Class Days
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(user?.weeklyClassDays || []).length > 0 ? (
                  user.weeklyClassDays.map(day => (
                    <span
                      key={day}
                      className="px-2.5 py-1 bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-bold rounded-lg"
                    >
                      {day}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No class days set</span>
                )}
              </div>
            </div>
          </div>

          {/* Academic Goals — View */}
          <div className="sm:col-span-2 flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4 text-brand-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Academic Goals
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">
                {user?.academicGoals || '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mode — Editable Form */}
      {isEditing && (
        <div className="space-y-5 animate-fadeIn">
          {/* Primary Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FIELD_CONFIG.map((field, index) => {
              const Icon = field.icon;
              return (
                <div key={field.key}>
                  <label
                    htmlFor={`profile-${field.key}`}
                    className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    <Icon className="w-3.5 h-3.5 text-brand-500" />
                    <span>{field.label}</span>
                    {field.required && <span className="text-rose-400 text-[10px]">*</span>}
                  </label>
                  <input
                    ref={index === 0 ? nameInputRef : undefined}
                    id={`profile-${field.key}`}
                    type={field.type}
                    value={form[field.key]}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>
              );
            })}
          </div>

          {/* Weekly Class Days */}
          <div>
            <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              <Calendar className="w-3.5 h-3.5 text-brand-500" />
              <span>Weekly Class Days</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map(day => {
                const isSelected = form.weeklyClassDays.includes(day);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Academic Goals */}
          <div>
            <label
              htmlFor="profile-academic-goals"
              className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              <Target className="w-3.5 h-3.5 text-brand-500" />
              <span>Academic Goals & Vision</span>
            </label>
            <textarea
              id="profile-academic-goals"
              value={form.academicGoals}
              onChange={e => handleChange('academicGoals', e.target.value)}
              rows={3}
              placeholder="Target CGPA, skills, research goals..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all text-slate-900 dark:text-white placeholder-slate-400 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            {hasChanges && !saveSuccess && (
              <span className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Unsaved changes</span>
              </span>
            )}
            {saveSuccess && (
              <span className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Changes saved to server</span>
              </span>
            )}
            {!hasChanges && !saveSuccess && <span />}

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                id="save-profile-btn"
                className="flex items-center space-x-2 px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-md shadow-brand-600/20 transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
