const Registration = require('../models/Registration');
const Event = require('../models/Event');
const FormConfiguration = require('../models/FormConfiguration');
const razorpay = require('razorpay');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

// Initialize Razorpay instance
const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// GET /register/:eventId
exports.getRegistrationForm = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event || !event.eventPublished) {
      req.flash('error', 'Event not found or not published');
      return res.redirect('/events');
    }

    // Get form configuration for this event
    const formConfig = await FormConfiguration.findOne({ eventId: event._id });

    res.render('events/register', {
      title: `Register for ${event.title}`,
      event,
      formConfig: formConfig || { fields: [] },
      showApplyButton: event.eventPublished && event.formPublished,
      registrationOpeningSoon: event.eventPublished && !event.formPublished,
      successMsg: req.flash('success'),
      errorMsg: req.flash('error')
    });
  } catch (error) {
    console.error('Error loading registration form:', error);
    req.flash('error', 'Error loading registration form');
    res.redirect('/events');
  }
};

// POST /register/:eventId/create-order
exports.postCreateOrder = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event || !event.eventPublished || !event.formPublished) {
      return res.status(400).json({ success: false, message: 'Registrations are not open for this event' });
    }

    const amount = event.fee * 100; // Amount in paise (Razorpay uses smallest currency unit)

    const options = {
      amount: amount,
      currency: 'INR',
      receipt: `receipt_${event._id}_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpayInstance.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ success: false, message: 'Error creating payment order' });
  }
};

// POST /register/:eventId/verify-payment
exports.postVerifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // Fetch payment details from Razorpay to verify amount
    const payment = await razorpayInstance.payments.fetch(razorpay_payment_id);

    if (payment.status !== 'captured') {
      return res.status(400).json({ success: false, message: 'Payment not captured' });
    }

    // Get event details
    const event = await Event.findById(req.params.id);
    if (!event || !event.eventPublished || !event.formPublished) {
      return res.status(400).json({ success: false, message: 'Registrations are not open for this event' });
    }

    // Check if amount matches
    if (payment.amount !== event.fee * 100) {
      return res.status(400).json({ success: false, message: 'Amount mismatch' });
    }

    // Save registration
    const registrationData = {
      ...req.body,
      eventId: event._id,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: payment.amount / 100, // Convert back to rupees
      paymentStatus: 'paid'
    };

    // Remove Razorpay specific fields from registration data
    delete registrationData.razorpay_order_id;
    delete registrationData.razorpay_payment_id;
    delete registrationData.razorpay_signature;

    const registration = new Registration(registrationData);
    await registration.save();

    res.json({
      success: true,
      message: 'Registration successful',
      redirectUrl: `/events/success/${registration._id}`
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Error verifying payment' });
  }
};

// GET /events/success/:registrationId
exports.getSuccessPage = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.registrationId)
      .populate('eventId');

    if (!registration) {
      req.flash('error', 'Registration not found');
      return res.redirect('/events');
    }

    res.render('events/success', {
      title: 'Registration Successful',
      registration
    });
  } catch (error) {
    console.error('Error loading success page:', error);
    req.flash('error', 'Error loading success page');
    res.redirect('/events');
  }
};

// GET /admin/event/:id/registrations
exports.getEventRegistrations = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      req.flash('error', 'Event not found');
      return res.redirect('/admin/events');
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Search
    const searchQuery = req.query.search || '';
    const searchFilter = searchQuery
      ? {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { email: { $regex: searchQuery, $options: 'i' } },
            { phone: { $regex: searchQuery, $options: 'i' } },
            { college: { $regex: searchQuery, $options: 'i' } }
          ]
        }
      : {};

    // Sort
    const sortBy = req.query.sort || '-registrationTime';

    const registrations = await Registration.find({
      eventId: event._id,
      ...searchFilter
    })
    .sort(sortBy)
    .skip(skip)
    .limit(limit);

    const totalRegistrations = await Registration.countDocuments({
      eventId: event._id,
      ...searchFilter
    });

    const totalPages = Math.ceil(totalRegistrations / limit);

    res.render('admin/event/registrations', {
      title: `Registrations for ${event.title}`,
      event,
      registrations,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      searchQuery,
      limitOptions: [5, 10, 20, 50],
      currentLimit: limit,
      successMsg: req.flash('success'),
      errorMsg: req.flash('error')
    });
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    req.flash('error', 'Error fetching registrations');
    res.redirect('/admin/events');
  }
};

// GET /admin/event/:id/registrations/export-csv
exports.exportRegistrationsCSV = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      req.flash('error', 'Event not found');
      return res.redirect('/admin/events');
    }

    const registrations = await Registration.find({ eventId: event._id })
      .sort({ registrationTime: -1 });

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${event.title}_registrations.csv`);

    // CSV header
    const header = ['Name', 'Email', 'Phone', 'College', 'Branch', 'Year', 'Payment Status', 'Amount', 'Registration Time'];
    res.write(header.join(',') + '\n');

    // CSV data
    registrations.forEach(reg => {
      const row = [
        `"${reg.name.replace(/"/g, '""')}"`,
        `"${reg.email.replace(/"/g, '""')}"`,
        `"${reg.phone.replace(/"/g, '""')}"`,
        `"${reg.college.replace(/"/g, '""')}"`,
        `"${reg.branch.replace(/"/g, '""')}"`,
        `"${reg.year.replace(/"/g, '""')}"`,
        `"${reg.paymentStatus.replace(/"/g, '""')}"`,
        `${reg.amount}`,
        `"${new Date(reg.registrationTime).toISOString()}"`
      ];
      res.write(row.join(',') + '\n');
    });

    res.end();
  } catch (error) {
    console.error('Error exporting CSV:', error);
    req.flash('error', 'Error exporting CSV');
    res.redirect('back');
  }
};