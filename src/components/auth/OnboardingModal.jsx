import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, BookOpen, DollarSign, Target, CheckCircle2 } from 'lucide-react';

export const OnboardingModal = ({ isOpen, onClose }) => {
  const { user, completeOnboarding } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || '',
    university: user?.university || 'Chittagong University of Engineering & Technology',
    department: user?.department || 'Computer Science & Engineering',
    semester: user?.semester || '5th Semester',
    studentId: user?.studentId || '2004015',
    currency: user?.currency || 'BDT',
    weeklyClassDays: user?.weeklyClassDays || ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    academicGoals: user?.academicGoals || 'Maintain GPA > 3.80 & build portfolio projects.',
  });

  const toggleDay = (day) => {
    if (form.weeklyClassDays.includes(day)) {
      setForm({ ...form, weeklyClassDays: form.weeklyClassDays.filter(d => d !== day) });
    } else {
      setForm({ ...form, weeklyClassDays: [...form.weeklyClassDays, day] });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    completeOnboarding(form);
    if (onClose) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { }} title="Welcome to StudySync! Let's Personalize Your Academic Workspace" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="p-4 bg-brand-500/10 rounded-2xl border border-brand-500/20 text-xs text-brand-700 dark:text-brand-300 flex items-center space-x-3">
          <GraduationCap className="w-6 h-6 text-brand-500 shrink-0" />
          <p>
            Configure your university academic profile and preferences. You can update these anytime in Settings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Student Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Student ID / Roll No</label>
            <input
              type="text"
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">University / Institute</label>
            <input
              type="text"
              value={form.university}
              onChange={(e) => setForm({ ...form, university: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Department</label>
            <input
              type="text"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Current Semester</label>
            <input
              type="text"
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
              required
            />
          </div>
        </div>

        {/* Weekly Class Days */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Weekly Class Days</label>
          <div className="flex flex-wrap gap-2">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
              const isSelected = form.weeklyClassDays.includes(day);
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isSelected
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
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
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Academic Goals & Vision</label>
          <textarea
            value={form.academicGoals}
            onChange={(e) => setForm({ ...form, academicGoals: e.target.value })}
            rows={2}
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
            placeholder="Target CGPA, skills, research goals..."
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center space-x-2"
          >
            <span>Complete Setup & Launch Workspace</span>
            <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>
      </form>
    </Modal>
  );
};
