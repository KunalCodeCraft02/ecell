const Event = require('../models/Event');
const FormConfiguration = require('../models/FormConfiguration');
const path = require('path');
const fs = require('fs');

// ── ADMIN: LIST ALL ───────────────────────────────────────────────────────────
exports.getAdminEvents = async (req, res, next) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
    res.render('admin/events/index', {
      pageTitle: 'Manage Events | E-Cell Admin',
      events,
      successMsg: req.flash('success'),
      errorMsg: req.flash('error'),
      csrfToken: req.csrfToken(),
    });
  } catch (err) { next(err); }
};

// ── ADMIN: CREATE FORM ────────────────────────────────────────────────────────
exports.getCreateEvent = (req, res) => {
  const errorMsg = req.flash('error');
  res.render('admin/events/create', {
    pageTitle: 'Create Event | E-Cell Admin',
    event: null,
    csrfToken: req.csrfToken(),
    errors: errorMsg.length > 0 ? errorMsg : [],
  });
};

// ── ADMIN: CREATE POST ────────────────────────────────────────────────────────
exports.postCreateEvent = async (req, res, next) => {
  try {
    const { title, description, date, time, venue, fee, maxParticipants, status } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const event = await Event.create({
      title, description, eventDate: date, time, venue,
      fee:             parseFloat(fee)           || 0,
      maxParticipants: parseInt(maxParticipants) || 0,
      status:          status || 'upcoming',
      image:           imagePath,
      eventPublished:  false, // Draft by default - admin must publish
      formPublished:   false,
    });

    req.flash('success', 'Event created successfully. Remember to publish the event for students to see it.');
    res.redirect('/admin/events');
  } catch (err) {
    console.error('Error creating event:', err);
    if (err.name === 'ValidationError') {
      req.flash('error', Object.values(err.errors).map(e => e.message).join(', '));
      return res.redirect('/admin/events/create');
    }
    next(err);
  }
};

// ── ADMIN: EDIT FORM ──────────────────────────────────────────────────────────
exports.getEditEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) { req.flash('error', 'Event not found.'); return res.redirect('/admin/events'); }

    const formConfig = await FormConfiguration.findOne({ eventId: req.params.id });

    res.render('admin/events/edit', {
      pageTitle: `Edit — ${event.title} | E-Cell Admin`,
      event,
      formConfig: formConfig || null,
      csrfToken: req.csrfToken(),
      errors: [],
    });
  } catch (err) { next(err); }
};

// ── ADMIN: EDIT POST ──────────────────────────────────────────────────────────
exports.postEditEvent = async (req, res, next) => {
  try {
    const { title, description, date, time, venue, fee, maxParticipants, status } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) { req.flash('error', 'Event not found.'); return res.redirect('/admin/events'); }

    // Handle form configuration fields if submitted
    const formFields = req.body.formFields;
    if (formFields) {
      const fields = Array.isArray(formFields) ? formFields : [formFields];
      await FormConfiguration.findOneAndUpdate(
        { eventId: req.params.id },
        { eventId: req.params.id, fields },
        { upsert: true, new: true }
      );
    }

    if (req.file) event.image = `/uploads/${req.file.filename}`;
    event.title = title;
    event.description = description;
    event.eventDate = date;
    event.time = time;
    event.venue = venue;
    event.fee = parseFloat(fee) || 0;
    event.maxParticipants = parseInt(maxParticipants) || 0;
    event.status = status || event.status;

    await event.save();
    req.flash('success', 'Event updated successfully.');
    res.redirect('/admin/events');
  } catch (err) { next(err); }
};

// ── ADMIN: DELETE ─────────────────────────────────────────────────────────────
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) { req.flash('error', 'Event not found.'); return res.redirect('/admin/events'); }

    // Delete image file if it exists
    if (event.image) {
      const imgPath = path.join(__dirname, '../public', event.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await Event.findByIdAndDelete(req.params.id);
    await FormConfiguration.findOneAndDelete({ eventId: req.params.id });

    req.flash('success', 'Event deleted.');
    res.redirect('/admin/events');
  } catch (err) { next(err); }
};

// ── ADMIN: PUBLISH / UNPUBLISH EVENT ─────────────────────────────────────────
exports.publishEvent = async (req, res, next) => {
  try {
    await Event.findByIdAndUpdate(req.params.id, { eventPublished: true });
    req.flash('success', 'Event published — students can now see it.');
    res.redirect('/admin/events');
  } catch (err) { next(err); }
};

exports.unpublishEvent = async (req, res, next) => {
  try {
    await Event.findByIdAndUpdate(req.params.id, { eventPublished: false, formPublished: false });
    req.flash('success', 'Event unpublished.');
    res.redirect('/admin/events');
  } catch (err) { next(err); }
};

// ── ADMIN: PUBLISH / UNPUBLISH FORM ──────────────────────────────────────────
exports.publishForm = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) { req.flash('error', 'Event not found.'); return res.redirect('/admin/events'); }
    if (!event.eventPublished) {
      req.flash('error', 'Publish the event first before publishing its form.');
      return res.redirect('/admin/events');
    }
    await Event.findByIdAndUpdate(req.params.id, { formPublished: true });
    req.flash('success', 'Registration form is now live — Apply Now button enabled.');
    res.redirect('/admin/events');
  } catch (err) { next(err); }
};

exports.unpublishForm = async (req, res, next) => {
  try {
    await Event.findByIdAndUpdate(req.params.id, { formPublished: false });
    req.flash('success', 'Registration form hidden — showing "Registration Opening Soon".');
    res.redirect('/admin/events');
  } catch (err) { next(err); }
};

// ── PUBLIC: UPCOMING ────────────────────────────────────────────────────────────
exports.getUpcomingEvents = async (req, res, next) => {
  try {
    const events = await Event.find({
      eventPublished: true,
      status: 'upcoming'
    }).sort({ eventDate: 1 });

    res.render('events/upcoming', {
      pageTitle: 'Upcoming Events | E-Cell GCOE',
      events
    });
  } catch (err) { next(err); }
};

// ── PUBLIC: EVENT DETAIL ──────────────────────────────────────────────────────
exports.getEventDetail = async (req, res, next) => {
  try {
    const event = await Event.findOne({ _id: req.params.id, eventPublished: true });
    if (!event) return res.status(404).render('pages/404', { pageTitle: '404 — Event Not Found' });

    const formConfig = event.formPublished
      ? await FormConfiguration.findOne({ eventId: event._id })
      : null;

    res.render('events/detail', {
      pageTitle: `${event.title} | E-Cell GCOE`,
      event,
      formConfig,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      csrfToken: req.csrfToken ? req.csrfToken() : null,
    });
  } catch (err) { next(err); }
};

// ── PUBLIC: LIVE ──────────────────────────────────────────────────────────────
exports.getLiveEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ eventPublished: true, status: 'live' }).sort({ eventDate: -1 });
    res.render('events/live', { pageTitle: 'Live Events | E-Cell GCOE', events });
  } catch (err) { next(err); }
};

// ── PUBLIC: COMPLETED ─────────────────────────────────────────────────────────
exports.getCompletedEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ eventPublished: true, status: 'completed' }).sort({ eventDate: -1 });
    res.render('events/completed', { pageTitle: 'Completed Events | E-Cell GCOE', events });
  } catch (err) { next(err); }
};