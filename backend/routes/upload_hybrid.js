const express = require("express");
const auth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const { uploadImage } = require("../config/cloudinary");

const router = express.Router();

// Configure multer for local storage (non-images)
const localStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Configure multer for memory storage (images for Cloudinary)
const memoryStorage = multer.memoryStorage();

const localUpload = multer({
  storage: localStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const cloudinaryUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed for Cloudinary upload"), false);
    }
  },
});

// @route   POST /api/upload/image
// @desc    Upload image to Cloudinary
// @access  Private
router.post(
  "/image",
  auth,
  cloudinaryUpload.single("image"),
  async (req, res) => {
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
          storage: "cloudinary",
        },
      });
    } catch (error) {
      console.error("❌ Cloudinary upload error:", error);
      res.status(500).json({
        message: "Cloudinary upload failed",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Upload error",
      });
    }
  }
);

// @route   POST /api/upload/file
// @desc    Upload file locally (non-images)
// @access  Private
router.post("/file", auth, localUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    console.log("📎 File uploaded locally:", req.file.filename);

    res.status(200).json({
      message: "File uploaded successfully",
      file: {
        filename: req.file.filename,
        url: `/uploads/${req.file.filename}`,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        type: "file",
        storage: "local",
      },
    });
  } catch (error) {
    console.error("❌ File upload error:", error);
    res.status(500).json({
      message: "File upload failed",
      error:
        process.env.NODE_ENV === "development" ? error.message : "Upload error",
    });
  }
});

// @route   GET /api/upload/health
// @desc    Test upload service
// @access  Public
router.get("/health", async (req, res) => {
  try {
    res.status(200).json({
      message: "✅ Upload service working",
      imageStorage: "Cloudinary",
      fileStorage: "Local",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      message: "❌ Upload service error",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Service error",
    });
  }
});

module.exports = router;
