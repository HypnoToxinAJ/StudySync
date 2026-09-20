import mongoose from 'mongoose';

/**
 * ============================================================================
 * MONGOOSE SCHEMAS: ATTENDANCE & CT MARKS TRACKER
 * ============================================================================
 */

// Safe misses calculation formula based on course credit and type:
// 3-cr theory: 3, 2-cr theory: 2, 1.5-cr lab: 1, 0.75-cr lab: 0
export const calculateSafeMissLimit = (credit, type) => {
  const numCredit = Number(credit) || 0;
  const normalizedType = String(type || 'THEORY').toUpperCase();

  if (normalizedType === 'THEORY') {
    if (numCredit >= 3) return 3;
    if (numCredit >= 2) return 2;
    return Math.max(1, Math.round(numCredit));
  } else {
    // LAB / SESSIONAL
    if (numCredit >= 1.5) return 1;
    return 0;
  }
};

/**
 * 1. Missed Class History Subdocument Schema
 */
const MissedRecordSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      default: Date.now,
      required: true
    },
    reason: {
      type: String,
      trim: true,
      default: 'Unexcused Absence'
    },
    classType: {
      type: String,
      enum: ['THEORY', 'LAB'],
      default: 'THEORY'
    }
  },
  { _id: true, timestamps: true }
);

/**
 * 2. Assessment Schema (CTs, Assignments, Quizzes)
 */
export const AssessmentSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course ID reference is required'],
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Assessment title is required'],
      trim: true,
      maxlength: 120
    },
    type: {
      type: String,
      enum: ['CT', 'ASSIGNMENT', 'QUIZ'],
      default: 'CT',
      required: true
    },
    obtainedMarks: {
      type: Number,
      required: true,
      min: [0, 'Obtained marks cannot be negative'],
      default: 0
    },
    totalMarks: {
      type: Number,
      required: [true, 'Total marks are required'],
      min: [1, 'Total marks must be at least 1'],
      default: 20
    },
    isMissed: {
      type: Boolean,
      default: false
    },
    date: {
      type: Date,
      default: Date.now,
      required: true
    },
    bestNConfig: {
      type: Number,
      default: null, // If null, derived automatically from course credits
      min: 1
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual: Percentage scored for this individual assessment
AssessmentSchema.virtual('percentage').get(function () {
  if (this.isMissed || this.totalMarks <= 0) return 0;
  return Number(((this.obtainedMarks / this.totalMarks) * 100).toFixed(1));
});

// Composite index for fast assessment lookups per course
AssessmentSchema.index({ courseId: 1, date: -1 });
AssessmentSchema.index({ userId: 1, courseId: 1 });

/**
 * 3. Course Schema
 */
export const CourseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    courseCode: {
      type: String,
      required: [true, 'Course code is required (e.g. CSE-311)'],
      trim: true,
      uppercase: true,
      maxlength: 20
    },
    courseTitle: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: 150
    },
    credit: {
      type: Number,
      required: [true, 'Credit count is required'],
      min: [0.5, 'Credit must be at least 0.5'],
      default: 3.0
    },
    type: {
      type: String,
      enum: ['THEORY', 'LAB'],
      default: 'THEORY',
      required: true
    },
    faculty: {
      type: String,
      trim: true,
      default: 'Unassigned'
    },
    semester: {
      type: String,
      trim: true,
      default: '5th Semester'
    },
    color: {
      type: String,
      default: '#4F46E5', // Indigo default
      match: [/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color code']
    },
    scheduledClasses: {
      type: Number,
      default: 39,
      min: [0, 'Scheduled classes cannot be negative']
    },
    maxSafeMisses: {
      type: Number,
      default: function () {
        return calculateSafeMissLimit(this.credit, this.type);
      }
    },
    missedClassHistory: [MissedRecordSchema]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Automatically update maxSafeMisses before save if credit or type changes
CourseSchema.pre('save', function (next) {
  if (this.isModified('credit') || this.isModified('type')) {
    this.maxSafeMisses = calculateSafeMissLimit(this.credit, this.type);
  }
  next();
});

// Virtual: Missed classes count
CourseSchema.virtual('missedClassesCount').get(function () {
  return Array.isArray(this.missedClassHistory) ? this.missedClassHistory.length : 0;
});

// Virtual: Remaining safe misses
CourseSchema.virtual('remainingSafeMisses').get(function () {
  const missed = Array.isArray(this.missedClassHistory) ? this.missedClassHistory.length : 0;
  return Math.max(0, this.maxSafeMisses - missed);
});

// Virtual: Marks deduction risk triggered
CourseSchema.virtual('hasDeductionRisk').get(function () {
  const missed = Array.isArray(this.missedClassHistory) ? this.missedClassHistory.length : 0;
  return missed > this.maxSafeMisses;
});

// Virtual: Populate assessments for this course
CourseSchema.virtual('assessments', {
  ref: 'Assessment',
  localField: '_id',
  foreignField: 'courseId'
});

// Compound unique index so user doesn't create duplicate course codes
CourseSchema.index({ userId: 1, courseCode: 1 }, { unique: true });

export const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);
export const Assessment = mongoose.models.Assessment || mongoose.model('Assessment', AssessmentSchema);
