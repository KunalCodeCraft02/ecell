const Event        = require('../models/Event');
const Registration = require('../models/Registration');

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const [
      totalEvents,
      upcomingCount,
      liveCount,
      completedCount,
      totalRegistrations,
    ] = await Promise.all([
      Event.countDocuments({ eventPublished: true }),
      Event.countDocuments({ eventPublished: true, status: 'upcoming' }),
      Event.countDocuments({ eventPublished: true, status: 'live' }),
      Event.countDocuments({ eventPublished: true, status: 'completed' }),
      Registration.countDocuments({ paymentStatus: 'paid' }),
    ]);

    // Total revenue
    const revenueAgg = await Registration.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // Recent 5 registrations
    const recentRegistrations = await Registration.find({ paymentStatus: 'paid' })
      .populate('eventId', 'title')
      .sort({ registrationTime: -1 })
      .limit(5);

    res.render('admin/dashboard', {
      pageTitle: 'Dashboard | E-Cell Admin',
      totalEvents,
      upcomingCount,
      liveCount,
      completedCount,
      totalRegistrations,
      totalRevenue,
      recentRegistrations,
    });
  } catch (err) {
    next(err);
  }
};

// ── REGISTRATIONS ─────────────────────────────────────────────────────────────
exports.getRegistrations = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      req.flash('error', 'Event not found.');
      return res.redirect('/admin/events');
    }

    const page  = parseInt(req.query.page)   || 1;
    const limit = parseInt(req.query.limit)  || 20;
    const search = req.query.search || '';

    const query = { eventId: req.params.id };
    if (search) {
      query.$or = [
        { name:    { $regex: search, $options: 'i' } },
        { email:   { $regex: search, $options: 'i' } },
        { college: { $regex: search, $options: 'i' } },
      ];
    }

    const [registrations, total] = await Promise.all([
      Registration.find(query)
        .sort({ registrationTime: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Registration.countDocuments(query),
    ]);

    res.render('admin/registrations', {
      pageTitle:     `Registrations — ${event.title}`,
      event,
      registrations,
      total,
      page,
      limit,
      totalPages:   Math.ceil(total / limit),
      search,
      csrfToken:    req.csrfToken(),
    });
  } catch (err) {
    next(err);
  }
};

// ── EXPORT CSV ────────────────────────────────────────────────────────────────
exports.exportRegistrationsCSV = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).send('Event not found');

    const registrations = await Registration.find({ eventId: req.params.id })
      .sort({ registrationTime: -1 });

    const headers = [
      'Name', 'Email', 'Phone', 'College', 'Branch',
      'Year', 'PRN', 'Department', 'Payment Status', 'Amount',
      'Payment ID', 'Order ID', 'Registered At',
    ];

    const rows = registrations.map(r => [
      r.name, r.email, r.phone, r.college, r.branch,
      r.year, r.prn || '', r.department || '',
      r.paymentStatus, r.amount,
      r.paymentId || '', r.orderId || '',
      r.registrationTime ? new Date(r.registrationTime).toISOString() : '',
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const filename = `${event.title.replace(/\s+/g, '_')}_registrations.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};