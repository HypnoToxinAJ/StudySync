import { z } from 'zod';
import { normalizeHttpUrl } from './assessmentUtils.js';

export const relatedLinkSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1, 'Enter a descriptive label.'),
  url: z.string().trim().min(1, 'Enter a URL.').refine(
    value => !normalizeHttpUrl(value).error,
    'Enter a valid HTTP or HTTPS URL.'
  ),
  type: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});

const requiredText = (message) => z.string().trim().min(1, message);

export const assessmentFormSchema = z.object({
  type: z.enum(['CT', 'assignment', 'examination']),
  courseId: requiredText('Select a course ID.'),
  courseTitle: requiredText('Enter the course title.'),
  title: requiredText('Enter an assessment title.'),
  date: z.string().optional().default(''),
  startTime: z.string().optional().default(''),
  endTime: z.string().nullable().optional().default(''),
  deadlineDate: z.string().optional().default(''),
  deadlineTime: z.string().optional().default(''),
  syllabus: z.string().optional().default(''),
  details: z.string().optional().default(''),
  marks: z.coerce.number().min(0, 'Marks cannot be negative.').optional(),
  submissionMethod: z.string().optional().default(''),
  priority: z.enum(['low', 'medium', 'high']),
  reminderTime: requiredText('Select a reminder time.'),
  notes: z.string().optional().default(''),
  attachments: z.array(z.any()).default([]),
  links: z.array(relatedLinkSchema).default([])
}).superRefine((data, ctx) => {
  if (data.type === 'assignment') {
    if (!data.deadlineDate) ctx.addIssue({ code: 'custom', path: ['deadlineDate'], message: 'Submission deadline date is required.' });
    if (!data.deadlineTime) ctx.addIssue({ code: 'custom', path: ['deadlineTime'], message: 'Submission deadline time is required.' });
    if (data.deadlineDate && data.deadlineTime && Number.isNaN(new Date(`${data.deadlineDate}T${data.deadlineTime}:00`).getTime())) {
      ctx.addIssue({ code: 'custom', path: ['deadlineTime'], message: 'Enter a valid submission deadline.' });
    }
    if (!data.details.trim()) ctx.addIssue({ code: 'custom', path: ['details'], message: 'Assignment details are required.' });
    return;
  }

  if (!data.date) ctx.addIssue({ code: 'custom', path: ['date'], message: 'Date is required.' });
  if (!data.startTime) ctx.addIssue({ code: 'custom', path: ['startTime'], message: 'Start time is required.' });
  if (!data.endTime) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'End time is required.' });
  if (data.startTime && data.endTime && data.endTime <= data.startTime) {
    ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'End time must be later than start time.' });
  }
  if (!data.syllabus.trim()) ctx.addIssue({ code: 'custom', path: ['syllabus'], message: 'Syllabus or coverage is required.' });
  if (data.type === 'CT' && data.marks === undefined) {
    ctx.addIssue({ code: 'custom', path: ['marks'], message: 'Marks are required for a class test.' });
  }
});
