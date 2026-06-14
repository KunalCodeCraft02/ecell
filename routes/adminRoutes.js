const express      = require('express');
const router       = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');
const eventController = require('../controllers/eventController');
const { uploadEventImage } = require('../middleware/uploadMiddleware');
const { validateEvent } = require('../middleware/validationMiddleware');

// All admin routes require authentication
router.use(isAuthenticated);

// Pass csrfToken to every admin view
router.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// ── DASHBOARD ────────────────────────────────────────────────────────────────
router.get('/dashboard', adminController.getDashboard);

// ── EVENTS ───────────────────────────────────────────────────────────────────
router.get('/events',                  eventController.getAdminEvents);
router.get('/events/create',           eventController.getCreateEvent);
router.post('/events/create',          uploadEventImage, validateEvent, eventController.postCreateEvent);
router.get('/events/edit/:id',         eventController.getEditEvent);
router.post('/events/edit/:id',        uploadEventImage, validateEvent, eventController.postEditEvent);
router.post('/events/delete/:id',      eventController.deleteEvent);
router.post('/events/publish/:id',     eventController.publishEvent);
router.post('/events/unpublish/:id',   eventController.unpublishEvent);
router.post('/events/publish-form/:id',   eventController.publishForm);
router.post('/events/unpublish-form/:id', eventController.unpublishForm);
// router.get('/upcoming-events', eventController.getUpcomingEvents);

// ── REGISTRATIONS ─────────────────────────────────────────────────────────────
router.get('/events/:id/registrations', adminController.getRegistrations);
router.get('/events/:id/registrations/export', adminController.exportRegistrationsCSV);

module.exports = router;
