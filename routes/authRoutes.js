const express = require('express');
const router  = express.Router();
const csurf   = require('csurf');
const authController = require('../controllers/authController');

const csrfProtection = csurf();

// GET /admin/login
router.get('/login', csrfProtection, authController.getLogin);

// POST /admin/login
router.post('/login', csrfProtection, authController.postLogin);

// GET /admin/logout
router.get('/logout', authController.logout);

module.exports = router;