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

// Simple memory storage for Cloudinary
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Simple upload middleware
const uploadToCloudinary = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const base64Data = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${base64Data}`;

    const result = await uploadImage(
      { buffer: dataUri },
      {
        folder: req.file.mimetype.startsWith("image/")
          ? "meowchat/images"
          : "meowchat/files",
        resource_type: req.file.mimetype.startsWith("image/") ? "image" : "raw",
      }
    );

    req.cloudinaryResult = result;
    next();
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    next(error);
  }
};

// TEMPORARILY DISABLED - DEBUGGING
/*
// @route   POST /api/upload/image
// @desc    Upload image to Cloudinary
// @access  Private
router.post("/image", auth, upload.single("image"), uploadToCloudinary, async (req, res) => {
  try {
    if (!req.file || !req.cloudinaryResult) {
      return res.status(400).json({
        message: "No image file provided or upload failed",
      });
    }

    const { cloudinaryResult } = req;

    // Generate different sizes for responsive loading
    const responsiveUrls = getResponsiveUrls(cloudinaryResult.public_id);
    const thumbnailUrl = getThumbnailUrl(cloudinaryResult.public_id);

    console.log("📸 Image upload successful:", {
      user: req.user.id,
      filename: req.file.originalname,
      public_id: cloudinaryResult.public_id,
      url: cloudinaryResult.url,
    });

    res.status(200).json({
      message: "Image uploaded successfully",
      file: {
        public_id: cloudinaryResult.public_id,
        url: cloudinaryResult.secure_url,
        thumbnail: thumbnailUrl,
        responsive: responsiveUrls,
        originalName: req.file.originalname,
        size: cloudinaryResult.bytes,
        format: cloudinaryResult.format,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        uploadedAt: cloudinaryResult.created_at,
        type: "image",
      },
    });
  } catch (error) {
    console.error("❌ Image upload error:", error);
    res.status(500).json({
      message: "Image upload failed",
      error:
        process.env.NODE_ENV === "development" ? error.message : "Upload error",
    });
  }
});

// @route   POST /api/upload/file
// @desc    Upload file to Cloudinary
// @access  Private
router.post("/file", auth, upload.single("file"), uploadToCloudinary, async (req, res) => {
  try {
    if (!req.file || !req.cloudinaryResult) {
      return res.status(400).json({
        message: "No file provided or upload failed",
      });
    }

    const { cloudinaryResult } = req;

    console.log("📎 File upload successful:", {
      user: req.user.id,
      filename: req.file.originalname,
      public_id: cloudinaryResult.public_id,
      url: cloudinaryResult.url,
    });

    res.status(200).json({
      message: "File uploaded successfully",
      file: {
        public_id: cloudinaryResult.public_id,
        url: cloudinaryResult.secure_url,
        originalName: req.file.originalname,
        size: cloudinaryResult.bytes,
        format: cloudinaryResult.format,
        uploadedAt: cloudinaryResult.created_at,
        type: "file",
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
*/

// @route   DELETE /api/upload/:publicId
// @desc    Delete file from Cloudinary
// @access  Private
router.delete("/:publicId", auth, async (req, res) => {
  try {
    const { publicId } = req.params;

    // Decode the public_id (it might be URL encoded)
    const decodedPublicId = decodeURIComponent(publicId);

    console.log("🗑️ Attempting to delete file:", decodedPublicId);

    const result = await deleteImage(decodedPublicId);

    if (result.result === "ok") {
      res.status(200).json({
        message: "File deleted successfully",
        public_id: decodedPublicId,
      });
    } else {
      res.status(404).json({
        message: "File not found or already deleted",
      });
    }
  } catch (error) {
    console.error("❌ File deletion error:", error);
    res.status(500).json({
      message: "File deletion failed",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Deletion error",
    });
  }
});

// @route   GET /api/upload/health
// @desc    Test Cloudinary connection
// @access  Public (for development)
router.get("/health", async (req, res) => {
  try {
    const { cloudinary } = require("../config/cloudinary");

    // Test Cloudinary connection
    const result = await cloudinary.api.ping();

    res.status(200).json({
      message: "Cloudinary connection successful",
      status: result.status,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (error) {
    console.error("❌ Cloudinary health check failed:", error);
    res.status(500).json({
      message: "Cloudinary connection failed",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Connection error",
    });
  }
});

module.exports = router;
