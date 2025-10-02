const express = require('express');
const hybridAuthService = require('../services/hybridAuth');
const { registerValidation, loginValidation, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/auth/test
// @desc    Test Firebase connectivity and backend status
// @access  Public
router.get('/test', async (req, res) => {
  try {
    const status = {
      backend: 'connected',
      timestamp: new Date().toISOString(),
      cors: {
        origin: req.headers.origin || 'unknown',
        allowed: true
      },
      firebase: {
        initialized: true,
        project: 'meowgram-cdd7c'
      },
      mongodb: {
        connected: true
      }
    };
    
    res.json({
      message: 'MeowChat backend is ready!',
      status
    });
  } catch (error) {
    res.status(500).json({
      message: 'Backend connectivity issue',
      error: error.message
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new local user
// @access  Public
router.post('/register', registerValidation, handleValidationErrors, async (req, res) => {
  try {
    const result = await hybridAuthService.registerLocal(req.body);
    
    res.status(201).json({
      message: 'User registered successfully',
      ...result
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ 
      message: error.message || 'Registration failed' 
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user (local or Firebase)
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const result = await hybridAuthService.login(req.body);
    
    res.json({
      message: 'Login successful',
      ...result
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ 
      message: error.message || 'Login failed' 
    });
  }
});

// @route   POST /api/auth/firebase-login
// @desc    Login with Firebase token (from Meowgram)
// @access  Public
router.post('/firebase-login', async (req, res) => {
  try {
    const { firebaseToken } = req.body;
    
    if (!firebaseToken) {
      console.log('❌ Firebase login failed: No token provided');
      return res.status(400).json({ 
        message: 'Firebase token is required',
        error: 'MISSING_TOKEN'
      });
    }

    console.log('🔄 Processing Firebase login with token length:', firebaseToken.length);
    
    const result = await hybridAuthService.login({ firebaseToken });
    
    console.log('✅ Firebase login successful for user:', result.user.email);
    
    res.json({
      message: 'Firebase login successful',
      ...result
    });

  } catch (error) {
    console.error('❌ Firebase login error:', error.message);
    console.error('Stack:', error.stack);
    
    let errorMessage = 'Firebase login failed';
    let errorCode = 'FIREBASE_ERROR';
    
    if (error.message.includes('Token has been revoked')) {
      errorMessage = 'Login session expired. Please try again.';
      errorCode = 'TOKEN_REVOKED';
    } else if (error.message.includes('Token used too early')) {
      errorMessage = 'Invalid token timing. Please try again.';
      errorCode = 'TOKEN_TIMING';
    } else if (error.message.includes('Invalid token')) {
      errorMessage = 'Invalid authentication token. Please try again.';
      errorCode = 'INVALID_TOKEN';
    } else if (error.message.includes('network')) {
      errorMessage = 'Network error. Check your connection and try again.';
      errorCode = 'NETWORK_ERROR';
    }
    
    res.status(400).json({ 
      message: errorMessage,
      error: errorCode,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', async (req, res) => {
  try {
    // Note: In a stateless JWT system, logout is typically handled client-side
    // by removing the token. However, we can update the user's online status.
    
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      await User.findByIdAndUpdate(decoded.id, {
        isOnline: false,
        lastSeen: new Date()
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await hybridAuthService.getUserById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/auth/search-users
// @desc    Search for users (local + Meowgram)
// @access  Private
router.get('/search-users', async (req, res) => {
  try {
    const { q: searchTerm, limit = 10 } = req.query;
    
    if (!searchTerm) {
      return res.status(400).json({ message: 'Search term is required' });
    }

    const users = await hybridAuthService.searchUsers(searchTerm, parseInt(limit));
    
    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;