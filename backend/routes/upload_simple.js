const express = require("express");
const auth = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/upload/health
// @desc    Test endpoint
// @access  Public
router.get("/health", async (req, res) => {
  try {
    res.status(200).json({
      message: "Upload service is working",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Health check failed:", error);
    res.status(500).json({
      message: "Health check failed",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Service error",
    });
  }
});

module.exports = router;
