const { body, validationResult } = require('express-validator');

// ── VALIDATE EVENT INPUT ───────────────────────────────────────────────────────
exports.validateEvent = [
  body('title')
    .trim()
    .notEmpty().withMessage('Event title is required')
    .isLength({ max: 100 }).withMessage('Title must be less than 100 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Event description is required'),

  body('date')
    .notEmpty().withMessage('Event date is required')
    .isISO8601().withMessage('Invalid date format'),

  body('time')
    .optional({ checkFalsy: true })
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format'),

  body('venue')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ max: 200 }).withMessage('Venue must be less than 200 characters'),

  body('fee')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 }).withMessage('Fee must be a positive number'),

  body('maxParticipants')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 }).withMessage('Max participants must be a positive number'),

  body('status')
    .optional({ checkFalsy: true })
    .isIn(['draft', 'upcoming', 'live', 'completed']).withMessage('Invalid status value'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Store errors in session to persist across redirect
      req.flash('error', errors.array().map(e => e.msg).join(', '));
      return res.redirect('back');
    }
    next();
  }
];

// ── VALIDATE REGISTRATION INPUT ───────────────────────────────────────────────
exports.validateRegistration = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name must be less than 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone is required')
    .isMobilePhone('en-IN').withMessage('Invalid phone number'),

  body('college')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ max: 100 }).withMessage('College name too long'),

  body('branch')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ max: 50 }).withMessage('Branch name too long'),

  body('year')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ max: 20 }).withMessage('Year value too long'),

  body('prn')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ max: 20 }).withMessage('PRN too long'),

  body('department')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ max: 50 }).withMessage('Department name too long'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array().map(e => e.msg).join(', '));
      return res.redirect('back');
    }
    next();
  }
];

// ── CHECK FOR MONGODB OBJECT ID VALIDITY ────────────────────────────────────────
exports.isValidMongoId = (req, res, next) => {
  const mongoose = require('mongoose');
  const id = req.params.id;

  // Prevent NoSQL injection - only allow valid ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id) || id.match(/^[0-9a-fA-F]{24}$/) === null) {
    req.flash('error', 'Invalid ID format');
    return res.redirect('/admin/events');
  }
  next();
};
