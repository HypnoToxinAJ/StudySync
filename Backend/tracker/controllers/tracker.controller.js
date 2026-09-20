import { Course, Assessment } from '../models/tracker.mongoose.js';
import {
  enrichCourseData,
  calculateMaxSafeMisses
} from '../services/trackerCalculation.service.js';

/**
 * ============================================================================
 * TRACKER CONTROLLER (EXPRESS.JS REST API)
 * ============================================================================
 */

export const trackerController = {
  /**
   * GET /api/tracker/courses
   * Fetches all enrolled courses with populated assessments and analytics
   */
  getCourses: async (req, res) => {
    try {
      const userId = req.user?.id || req.query.userId;
      const query = userId ? { userId } : {};

      const courses = await Course.find(query).lean();
      const courseIds = courses.map(c => c._id);

      // Fetch all assessments for these courses
      const assessments = await Assessment.find({ courseId: { $in: courseIds } })
        .sort({ date: -1 })
        .lean();

      // Group assessments by course
      const assessmentsByCourse = {};
      assessments.forEach(ast => {
        const cId = String(ast.courseId);
        if (!assessmentsByCourse[cId]) assessmentsByCourse[cId] = [];
        assessmentsByCourse[cId].push(ast);
      });

      // Enrich courses with calculated metrics
      const enrichedCourses = courses.map(course => {
        const courseAssessments = assessmentsByCourse[String(course._id)] || [];
        return enrichCourseData(course, courseAssessments);
      });

      return res.status(200).json({
        success: true,
        count: enrichedCourses.length,
        data: enrichedCourses
      });
    } catch (error) {
      console.error('[Tracker Controller] getCourses error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve courses',
        error: error.message
      });
    }
  },

  /**
   * POST /api/tracker/courses
   * Create a new course entry
   */
  createCourse: async (req, res) => {
    try {
      const {
        courseCode,
        courseTitle,
        credit,
        type = 'THEORY',
        faculty,
        semester,
        color,
        scheduledClasses
      } = req.body;

      if (!courseCode || !courseTitle) {
        return res.status(400).json({
          success: false,
          message: 'courseCode and courseTitle are required fields.'
        });
      }

      const userId = req.user?.id || req.body.userId || '000000000000000000000001';
      const maxSafeMisses = calculateMaxSafeMisses(credit, type);

      const newCourse = new Course({
        userId,
        courseCode: courseCode.trim().toUpperCase(),
        courseTitle: courseTitle.trim(),
        credit: Number(credit) || 3.0,
        type: String(type).toUpperCase(),
        faculty: faculty || 'Unassigned',
        semester: semester || '5th Semester',
        color: color || '#4F46E5',
        scheduledClasses: scheduledClasses !== undefined ? Number(scheduledClasses) : 39,
        maxSafeMisses,
        missedClassHistory: []
      });

      const saved = await newCourse.save();
      const enriched = enrichCourseData(saved.toObject(), []);

      return res.status(201).json({
        success: true,
        message: 'Course created successfully',
        data: enriched
      });
    } catch (error) {
      console.error('[Tracker Controller] createCourse error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to create course',
        error: error.message
      });
    }
  },

  /**
   * PUT /api/tracker/courses/:id
   * Update course details
   */
  updateCourse: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = { ...req.body };

      if (updates.credit !== undefined || updates.type !== undefined) {
        const existing = await Course.findById(id);
        if (!existing) {
          return res.status(404).json({ success: false, message: 'Course not found' });
        }
        const credit = updates.credit !== undefined ? updates.credit : existing.credit;
        const type = updates.type !== undefined ? updates.type : existing.type;
        updates.maxSafeMisses = calculateMaxSafeMisses(credit, type);
      }

      const updated = await Course.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true
      }).lean();

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      const assessments = await Assessment.find({ courseId: id }).lean();
      const enriched = enrichCourseData(updated, assessments);

      return res.status(200).json({
        success: true,
        message: 'Course updated successfully',
        data: enriched
      });
    } catch (error) {
      console.error('[Tracker Controller] updateCourse error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to update course',
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/tracker/courses/:id
   * Delete a course and its assessments
   */
  deleteCourse: async (req, res) => {
    try {
      const { id } = req.params;
      const course = await Course.findByIdAndDelete(id);

      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      // Cascade delete related assessments
      await Assessment.deleteMany({ courseId: id });

      return res.status(200).json({
        success: true,
        message: 'Course and related assessments deleted successfully'
      });
    } catch (error) {
      console.error('[Tracker Controller] deleteCourse error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete course',
        error: error.message
      });
    }
  },

  /**
   * POST /api/tracker/courses/:id/mark-missed
   * Appends current timestamp/date to missedClassHistory
   */
  markMissedClass: async (req, res) => {
    try {
      const { id } = req.params;
      const { date = new Date(), reason = 'Unexcused Absence' } = req.body;

      const course = await Course.findById(id);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      // Append missed record
      course.missedClassHistory.push({
        date: new Date(date),
        reason: String(reason).trim(),
        classType: course.type
      });

      await course.save();

      const assessments = await Assessment.find({ courseId: id }).lean();
      const enriched = enrichCourseData(course.toObject(), assessments);

      return res.status(200).json({
        success: true,
        message: 'Missed class recorded successfully',
        data: enriched
      });
    } catch (error) {
      console.error('[Tracker Controller] markMissedClass error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to mark class as missed',
        error: error.message
      });
    }
  },

  /**
   * POST /api/tracker/courses/:id/undo-missed
   * Removes the most recent entry from missedClassHistory
   */
  undoMissedClass: async (req, res) => {
    try {
      const { id } = req.params;

      const course = await Course.findById(id);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      if (!course.missedClassHistory || course.missedClassHistory.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No missed class history to undo'
        });
      }

      // Pop the latest missed record
      const removed = course.missedClassHistory.pop();
      await course.save();

      const assessments = await Assessment.find({ courseId: id }).lean();
      const enriched = enrichCourseData(course.toObject(), assessments);

      return res.status(200).json({
        success: true,
        message: 'Last missed class record undone successfully',
        undoneRecord: removed,
        data: enriched
      });
    } catch (error) {
      console.error('[Tracker Controller] undoMissedClass error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to undo missed class',
        error: error.message
      });
    }
  },

  /**
   * GET /api/tracker/courses/:id/missed-history
   * Retrieve full missed class history log for a specific course
   */
  getMissedHistory: async (req, res) => {
    try {
      const { id } = req.params;
      const course = await Course.findById(id, 'courseCode courseTitle missedClassHistory maxSafeMisses');

      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      return res.status(200).json({
        success: true,
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        totalMissed: course.missedClassHistory.length,
        maxSafeMisses: course.maxSafeMisses,
        history: course.missedClassHistory
      });
    } catch (error) {
      console.error('[Tracker Controller] getMissedHistory error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch missed history',
        error: error.message
      });
    }
  },

  /**
   * POST /api/tracker/courses/:id/assessments
   * Create a new CT / Assignment / Quiz entry
   */
  createAssessment: async (req, res) => {
    try {
      const { id: courseId } = req.params;
      const {
        title,
        type = 'CT',
        obtainedMarks = 0,
        totalMarks = 20,
        isMissed = false,
        date = new Date(),
        bestNConfig = null
      } = req.body;

      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }

      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Assessment title is required'
        });
      }

      const parsedObtained = isMissed ? 0 : Number(obtainedMarks);
      const parsedTotal = Number(totalMarks);

      if (parsedObtained > parsedTotal) {
        return res.status(400).json({
          success: false,
          message: `Obtained marks (${parsedObtained}) cannot exceed total marks (${parsedTotal})`
        });
      }

      const newAssessment = new Assessment({
        courseId,
        userId: course.userId,
        title: title.trim(),
        type: String(type).toUpperCase(),
        obtainedMarks: parsedObtained,
        totalMarks: parsedTotal,
        isMissed: Boolean(isMissed),
        date: new Date(date),
        bestNConfig
      });

      const savedAssessment = await newAssessment.save();

      // Return updated course overview
      const allAssessments = await Assessment.find({ courseId }).lean();
      const enriched = enrichCourseData(course.toObject(), allAssessments);

      return res.status(201).json({
        success: true,
        message: 'Assessment created successfully',
        assessment: savedAssessment,
        courseAnalytics: enriched
      });
    } catch (error) {
      console.error('[Tracker Controller] createAssessment error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to create assessment',
        error: error.message
      });
    }
  },

  /**
   * PUT /api/tracker/assessments/:id
   * Update an assessment entry
   */
  updateAssessment: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = { ...req.body };

      if (updates.isMissed) {
        updates.obtainedMarks = 0;
      }

      const updated = await Assessment.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true
      });

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Assessment not found' });
      }

      const course = await Course.findById(updated.courseId).lean();
      const allAssessments = await Assessment.find({ courseId: updated.courseId }).lean();
      const enriched = course ? enrichCourseData(course, allAssessments) : null;

      return res.status(200).json({
        success: true,
        message: 'Assessment updated successfully',
        assessment: updated,
        courseAnalytics: enriched
      });
    } catch (error) {
      console.error('[Tracker Controller] updateAssessment error:', error);
      return res.status(400).json({
        success: false,
        message: 'Failed to update assessment',
        error: error.message
      });
    }
  },

  /**
   * DELETE /api/tracker/assessments/:id
   * Remove an assessment entry
   */
  deleteAssessment: async (req, res) => {
    try {
      const { id } = req.params;
      const assessment = await Assessment.findByIdAndDelete(id);

      if (!assessment) {
        return res.status(404).json({ success: false, message: 'Assessment not found' });
      }

      const course = await Course.findById(assessment.courseId).lean();
      const allAssessments = await Assessment.find({ courseId: assessment.courseId }).lean();
      const enriched = course ? enrichCourseData(course, allAssessments) : null;

      return res.status(200).json({
        success: true,
        message: 'Assessment deleted successfully',
        courseAnalytics: enriched
      });
    } catch (error) {
      console.error('[Tracker Controller] deleteAssessment error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete assessment',
        error: error.message
      });
    }
  }
};
