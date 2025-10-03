const express = require("express");
const User = require("../models/User");
const hybridAuthService = require("../services/hybridAuth");
const {
  loginValidation,
  handleValidationErrors,
} = require("../middleware/validation");

const router = express.Router();

// @route   GET /api/auth/test
// @desc    Test Firebase connectivity and backend status
// @access  Public
router.get("/test", async (req, res) => {
  try {
    const User = require("../models/User");
    const userCount = await User.countDocuments();
    const users = await User.find().select("username email isOnline").limit(10);

    const status = {
      backend: "connected",
      timestamp: new Date().toISOString(),
      cors: {
        origin: req.headers.origin || "unknown",
        allowed: true,
      },
      firebase: {
        initialized: true,
        project: "meowgram-cdd7c",
      },
      mongodb: {
        connected: true,
        userCount,
        sampleUsers: users,
      },
    };

    res.json({
      message: "MeowChat backend is ready!",
      status,
    });
  } catch (error) {
    res.status(500).json({
      message: "Backend connectivity issue",
      error: error.message,
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user (Firebase only - MeowGram users + Google Auth)
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const result = await hybridAuthService.login(req.body);

    res.json({
      message: "Login successful",
      ...result,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(400).json({
      message: error.message || "Login failed",
    });
  }
});

// @route   POST /api/auth/firebase-login
// @desc    Login with Firebase token (from MeowGram) - UPDATED FOR MEOWGRAM INTEGRATION
// @access  Public
router.post("/firebase-login", async (req, res) => {
  try {
    const { firebaseToken, userData } = req.body;

    if (!firebaseToken) {
      console.log("❌ Firebase login failed: No token provided");
      return res.status(400).json({
        message: "Firebase token is required",
        error: "MISSING_TOKEN",
      });
    }

    console.log(
      "🔄 Processing MeowGram Firebase login with token length:",
      firebaseToken.length
    );
    console.log(
      "📋 User data from MeowGram:",
      userData ? "✓ Provided" : "✗ Missing"
    );

    // Use hybridAuth service but enhance with MeowGram data
    const result = await hybridAuthService.login({ firebaseToken });

    // If userData is provided from MeowGram, update user info
    if (userData && result.user) {
      const updatedUser = await User.findByIdAndUpdate(
        result.user.id,
        {
          displayName: userData.displayName || result.user.displayName,
          photoURL: userData.photoURL || result.user.profilePicture,
          lastLogin: new Date(),
        },
        { new: true }
      );
      result.user = {
        ...result.user,
        displayName: updatedUser.displayName,
        profilePicture: updatedUser.profilePicture || updatedUser.photoURL,
      };
    }

    console.log(
      "✅ MeowGram Firebase login successful for user:",
      result.user.email
    );

    res.json({
      message: "Firebase login successful",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error("❌ MeowGram Firebase login error:", error.message);
    console.error("Stack:", error.stack);

    let errorMessage = "Firebase login failed";
    let errorCode = "FIREBASE_ERROR";

    if (error.message.includes("Token has been revoked")) {
      errorMessage = "Login session expired. Please try again.";
      errorCode = "TOKEN_REVOKED";
    } else if (error.message.includes("Token used too early")) {
      errorMessage = "Invalid token timing. Please try again.";
      errorCode = "TOKEN_TIMING";
    } else if (error.message.includes("Invalid token")) {
      errorMessage = "Invalid authentication token. Please try again.";
      errorCode = "INVALID_TOKEN";
    } else if (error.message.includes("network")) {
      errorMessage = "Network error. Check your connection and try again.";
      errorCode = "NETWORK_ERROR";
    }

    res.status(400).json({
      message: errorMessage,
      error: errorCode,
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// @route   POST /api/auth/meowgram-login
// @desc    Login with MeowGram email/password (for users without Google)
// @access  Public
router.post(
  "/meowgram-login",
  loginValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      console.log("🔄 Processing MeowGram email/password login for:", email);

      const result = await hybridAuthService.loginMeowgramUser({
        email,
        password,
      });

      console.log("✅ MeowGram login successful for user:", result.user.email);

      res.json({
        message: "MeowGram login successful",
        ...result,
      });
    } catch (error) {
      console.error("❌ MeowGram login error:", error.message);

      res.status(401).json({
        message: "Invalid MeowGram credentials or user not found in MeowGram",
        error: "INVALID_CREDENTIALS",
      });
    }
  }
);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post("/logout", async (req, res) => {
  try {
    // Note: In a stateless JWT system, logout is typically handled client-side
    // by removing the token. However, we can update the user's online status.

    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (token) {
      const jwt = require("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      await User.findByIdAndUpdate(decoded.id, {
        isOnline: false,
        lastSeen: new Date(),
      });
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Server error during logout" });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get("/me", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await hybridAuthService.getUserById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users for chat creation
// @access  Private
router.get("/users", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const users = await hybridAuthService.getAllUsers(decoded.id);

    res.json({ users });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   GET /api/auth/search-users
// @desc    Search for users (local + Meowgram)
// @access  Private
router.get("/search-users", async (req, res) => {
  try {
    const { q: searchTerm, limit = 10 } = req.query;

    if (!searchTerm) {
      return res.status(400).json({ message: "Search term is required" });
    }

    const users = await hybridAuthService.searchUsers(
      searchTerm,
      parseInt(limit)
    );

    res.json({ users });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
