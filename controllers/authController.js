const bcrypt = require('bcrypt');

exports.getLogin = (req, res) => {
  if (req.session?.isAdmin) return res.redirect('/admin/dashboard');
  res.render('admin/login', {
    pageTitle: 'Admin Login | E-Cell GCOE',
    csrfToken: req.csrfToken(),
  });
};

exports.postLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    const validUsername = username === process.env.ADMIN_USERNAME;
    // Use bcrypt compare if ADMIN_PASSWORD is hashed, otherwise plain compare
    let validPassword = false;
    if (process.env.ADMIN_PASSWORD_HASHED === 'true') {
      validPassword = await bcrypt.compare(password, process.env.ADMIN_PASSWORD);
    } else {
      validPassword = password === process.env.ADMIN_PASSWORD;
    }

    if (!validUsername || !validPassword) {
      req.flash('error', 'Invalid username or password.');
      return res.redirect('/admin/login');
    }

    // Regenerate session on login to prevent session fixation
    req.session.regenerate((err) => {
      if (err) throw err;
      req.session.isAdmin   = true;
      req.session.adminUser = username;
      req.session.loginTime = Date.now();
      req.session.save((err) => {
        if (err) throw err;
        res.redirect('/admin/dashboard');
      });
    });
  } catch (err) {
    req.flash('error', 'Login failed. Please try again.');
    res.redirect('/admin/login');
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error('Logout error:', err);
    res.clearCookie('connect.sid');
    res.redirect('/admin/login');
  });
};