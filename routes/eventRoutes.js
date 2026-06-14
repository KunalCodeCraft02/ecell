const express = require('express');
const router  = express.Router();
const eventController = require('../controllers/eventController');

// Public event listing pages
router.get('/upcoming',  eventController.getUpcomingEvents);
router.get('/upcoming-events', eventController.getUpcomingEvents);
router.get('/live',      eventController.getLiveEvents);
router.get('/completed', eventController.getCompletedEvents);

// Single event detail page
router.get('/:id', eventController.getEventDetail);

module.exports = router;