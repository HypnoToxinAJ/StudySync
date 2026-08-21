import { z } from 'zod';

/**
 * Credentials validation schema for CUET portal login
 */
export const cuetCredentialsSchema = z.object({
  studentId: z
    .string()
    .trim()
    .min(5, 'Student ID must be at least 5 digits (e.g. 1904001)')
    .regex(/^[0-9A-Za-z_-]+$/, 'Student ID can only contain letters, numbers, and dashes'),
  password: z
    .string()
    .min(1, 'Password is required'),
  rememberStudentId: z.boolean().default(false),
  saveLocally: z.boolean().default(true)
});

/**
 * Course item schema
 */
export const courseItemSchema = z.object({
  courseCode: z.string().min(1, 'Course code is required'),
  courseTitle: z.string().default('Not provided'),
  credit: z.number().nonnegative(),
  letterGrade: z.string().min(1, 'Letter grade is required'),
  gradePoint: z.number().min(0).max(4.0),
  qualityPoints: z.number().nonnegative(),
  status: z.enum(['Passed', 'Failed', 'Incomplete', 'Repeated']),
  isRepeated: z.boolean().default(false),
  courseType: z.enum(['Theory', 'Lab']).default('Theory'),
  source: z.literal('cuet').default('cuet')
});

/**
 * Semester item schema
 */
export const semesterItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  term: z.string().optional(),
  level: z.string().optional(),
  year: z.string().optional(),
  gpa: z.number().min(0).max(4.0).nullable().optional(),
  calculatedGpa: z.number().min(0).max(4.0),
  attemptedCredits: z.number().nonnegative(),
  completedCredits: z.number().nonnegative(),
  courses: z.array(courseItemSchema)
});

/**
 * Normalized academic result payload schema
 */
export const normalizedResultSchema = z.object({
  student: z.object({
    studentId: z.string(),
    name: z.string().default('CUET Student'),
    department: z.string().default('Engineering'),
    batch: z.string().default('N/A')
  }),
  semesters: z.array(semesterItemSchema),
  overall: z.object({
    cgpa: z.number().min(0).max(4.0).nullable().optional(),
    calculatedCgpa: z.number().min(0).max(4.0),
    completedCredits: z.number().nonnegative(),
    attemptedCredits: z.number().nonnegative(),
    qualityPoints: z.number().nonnegative(),
    highestGpa: z.number().min(0).max(4.0),
    totalSemesters: z.number().int().nonnegative(),
    failedCoursesCount: z.number().int().nonnegative(),
    clearedCoursesCount: z.number().int().nonnegative()
  }),
  failedCourses: z.array(z.any()).default([]),
  fetchedAt: z.string(),
  source: z.string().default('CUET Result Portal'),
  schemaVersion: z.literal('1.0.0').default('1.0.0'),
  isSavedCopy: z.boolean().default(false)
});

/**
 * Validates normalized result object
 */
export const validateNormalizedResult = (data) => {
  return normalizedResultSchema.safeParse(data);
};
