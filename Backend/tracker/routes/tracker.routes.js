import { Router } from 'express';
import { trackerController } from '../controllers/tracker.controller.js';

/**
 * ============================================================================
 * TRACKER ROUTER (EXPRESS.JS)
 * ============================================================================
 */

const router = Router();

// Course Endpoints
router.get('/courses', trackerController.getCourses);
router.post('/courses', trackerController.createCourse);
router.put('/courses/:id', trackerController.updateCourse);
router.delete('/courses/:id', trackerController.deleteCourse);

// Attendance Actions
router.post('/courses/:id/mark-missed', trackerController.markMissedClass);
router.post('/courses/:id/undo-missed', trackerController.undoMissedClass);
router.get('/courses/:id/missed-history', trackerController.getMissedHistory);

// Assessment Endpoints
router.post('/courses/:id/assessments', trackerController.createAssessment);
router.put('/assessments/:id', trackerController.updateAssessment);
router.delete('/assessments/:id', trackerController.deleteAssessment);

export default router;
