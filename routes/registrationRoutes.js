const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');

// Registration routes
router.get('/:id', registrationController.getRegistrationForm);
router.post('/:id/create-order', registrationController.postCreateOrder);
router.post('/:id/verify-payment', registrationController.postVerifyPayment);

// Success page
router.get('/success/:registrationId', registrationController.getSuccessPage);

// Admin registrations routes
router.get('/event/:id/registrations', registrationController.getEventRegistrations);
router.get('/event/:id/registrations/export-csv', registrationController.exportRegistrationsCSV);

module.exports = router;