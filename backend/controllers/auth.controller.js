const userService = require('../services/user.service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user exists
    const existing = await userService.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await userService.create({ name, email, password_hash });
    
    // Create token
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await userService.findByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
        user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at }, 
        token 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }
    // Verify the token with Google
    // Verify the token with Google
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Find or create user
    let user = await userService.findByEmail(email);
    if (!user) {
      // Create new user with Google info
      user = await userService.create({
        name: name || email.split('@')[0],
        email,
        password_hash: null, // Google users don't have passwords
      });
    }

    // Create JWT token for our app
    const appToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
      token: appToken
    });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(400).json({ error: 'Google login failed', details: err.message });
  }
};

const calendarService = require('../services/calendar.service');
const User = require('../models/user.model');

exports.googleCallback = async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) return res.status(400).send('No code provided');

        // Exchange code tokens - REMOVED to let frontend handle it via /connect
        // const tokens = await calendarService.getToken(code);
        
        // In a real app with "Sign in with Google", we'd find/create user via ID token.
        // Here, we are linking calendar to an EXISTING user session.
        // LIMITATION: We don't have the user ID here easily unless we passed strict state.
        
        // WORKAROUND for "Connect Calendar":
        // We assume the user is just authorizing the app and we show success.
        // The tokens need to be saved. Ideally we need the user ID.
        // Let's rely on a "state" param passed from frontend.
        
        // Wait, for this specific error "redirect_uri_mismatch", we just need to satisfy Google's Check.
        // If we want to actually SAVE the token, we need the user.
        
        // Let's redirect back to frontend with the code, and let frontend finish the job via the OLD /connect endpoint?
        // NO. The frontend initiated the flow with window.location.
        // If we redirect back to frontend, the Frontend URI must match Google Console? NO.
        // The Redirect URI is what Google sends the code TO.
        // If Google sends code to Backend (5000), Backend can redirect current user to Frontend (5173).
        
        const frontendUrl = `http://localhost:5173/calendar/callback?code=${code}`;
        res.redirect(frontendUrl);
        
    } catch (err) {
        console.error('Google Callback Error:', err);
        res.status(500).send('Authentication Failed');
    }
};
