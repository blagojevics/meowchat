const express = require("express");
const auth = require("../middleware/auth");
const multer = require("multer");
const {
  uploadImage,
  deleteImage,
  getThumbnailUrl,
  getResponsiveUrls,
} = require("../config/cloudinary");

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      ["application/pdf", "application/msword", "text/plain"].includes(
        file.mimetype
      )
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only images and documents are allowed"), false);
    }
  },
});

// @route   POST /api/upload/image
// @desc    Upload image to Cloudinary
// @access  Private
router.post("/image", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // Upload to Cloudinary
    const base64Data = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${base64Data}`;

    const result = await uploadImage(
      { buffer: dataUri },
      {
        folder: "meowchat/images",
        resource_type: "image",
        transformation: [
          { width: 1200, height: 1200, crop: "limit" },
          { quality: "auto:good" },
          { fetch_format: "auto" },
        ],
      }
    );

    console.log("📸 Image uploaded to Cloudinary:", result.secure_url);

    res.status(200).json({
      message: "Image uploaded successfully to Cloudinary",
      file: {
        public_id: result.public_id,
        url: result.secure_url,
        originalName: req.file.originalname,
        size: result.bytes,
        format: result.format,
        type: "image",
      },
    });
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error);
    res.status(500).json({
      message: "Cloudinary upload failed",
      error:
        process.env.NODE_ENV === "development" ? error.message : "Upload error",
    });
  }
});

// @route   GET /api/upload/health
// @desc    Test Cloudinary connection
// @access  Public
router.get("/health", async (req, res) => {
  try {
    const { cloudinary } = require("../config/cloudinary");
    const result = await cloudinary.api.ping();

    res.status(200).json({
      message: "✅ Cloudinary connected successfully",
      status: result.status,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Cloudinary connection failed:", error);
    res.status(500).json({
      message: "❌ Cloudinary connection failed",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Connection error",
    });
  }
});

module.exports = router;
