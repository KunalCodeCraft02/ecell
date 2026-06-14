const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour in ms

exports.isAuthenticated = (req, res, next) => {
  if (!req.session?.isAdmin) {
    req.flash('error', 'Please log in to access the admin panel.');
    return res.redirect('/admin/login');
  }

  // Session timeout check
  const now = Date.now();
  if (req.session.loginTime && (now - req.session.loginTime) > SESSION_TIMEOUT) {
    req.session.destroy(() => {});
    req.flash('error', 'Your session has expired. Please log in again.');
    return res.redirect('/admin/login');
  }

  // Refresh session activity timestamp
  req.session.loginTime = now;
  next();
};