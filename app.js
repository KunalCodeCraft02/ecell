require('dotenv').config();

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csurf = require('csurf');
const flash = require('connect-flash');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');

const app = express();

// ── MONGODB ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅  MongoDB connected'))
    .catch(err => { console.error('❌  MongoDB error:', err); process.exit(1); });

// ── VIEW ENGINE ───────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── STATIC FILES ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── SECURITY ──────────────────────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false, // disabled so CDN scripts (Three.js, Locomotive) work
}));

// ── BODY PARSERS ──────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
        mongooseConnection: mongoose.connection,
        ttl: 14 * 24 * 60 * 60, // 14 days
        autoRemove: 'native'
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Secure in production
        sameSite: 'lax'
    }
}));

// ── FLASH MESSAGES ────────────────────────────────────────────────────────────
app.use(flash());

// ── CSRF ──────────────────────────────────────────────────────────────────────
const csrfProtection = csurf();

// ── GLOBAL TEMPLATE LOCALS ────────────────────────────────────────────────────
app.use((req, res, next) => {
    res.locals.successMsg = req.flash('success');
    res.locals.errorMsg = req.flash('error');
    res.locals.isAdmin = req.session?.isAdmin || false;
    next();
});

// ── RATE LIMITERS ─────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 10,
    message: 'Too many login attempts. Please try again after 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
});

// ── PUBLIC ROUTES ─────────────────────────────────────────────────────────────

// Homepage — serves index.ejs
app.get('/', async (req, res, next) => {
    try {
        const Event = require('./models/Event');

        // Fetch published events by status for the public sections
        const [upcomingEvents, liveEvents, completedEvents] = await Promise.all([
            Event.find({ eventPublished: true, status: 'upcoming' }).sort({ eventDate: 1 }).limit(6),
            Event.find({ eventPublished: true, status: 'live' }).sort({ eventDate: -1 }).limit(6),
            Event.find({ eventPublished: true, status: 'completed' }).sort({ eventDate: -1 }).limit(6),
        ]);

        res.render('index', {
            upcomingEvents,
            liveEvents,
            completedEvents,
            pageTitle: 'E-Cell GCOE Kolhapur | Where Creativity Meets Commerce',
        });
    } catch (err) {
        next(err);
    }
});

// Team page
app.get('/team', (req, res) => {
    res.render('team', {
        pageTitle: 'Meet the Team | E-Cell GCOE Kolhapur',
    });
});

// ── AUTH ROUTES (login / logout) ──────────────────────────────────────────────
app.use('/admin', loginLimiter, authRoutes);

// ── ADMIN ROUTES (protected) ─────────────────────────────────────────────────
app.use('/admin', csrfProtection, adminRoutes);

// ── EVENT PUBLIC ROUTES ───────────────────────────────────────────────────────
app.use('/events', eventRoutes);

// ── REGISTRATION ROUTES ───────────────────────────────────────────────────────
app.use('/register', csrfProtection, registrationRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).render('pages/404', { pageTitle: '404 — Page Not Found' });
});

// ── ERROR HANDLER ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    // CSRF token errors
   if (err.code === 'EBADCSRFTOKEN') {
    req.flash('error', 'Form expired or invalid. Please try again.');
    return res.redirect('/admin/events');
}
    console.error('Server error:', err);
    res.status(err.status || 500).render('pages/error', {
        pageTitle: 'Server Error',
        message: err.message || 'Something went wrong.',
    });
});

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀  E-Cell server running on http://localhost:${PORT}`));