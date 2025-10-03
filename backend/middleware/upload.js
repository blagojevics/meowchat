const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const { uploadImage } = require("../config/cloudinary");

// Configure storage for Cloudinary (use memory storage)
const storage = multer.memoryStorage();

// File filter for images and common file types
const fileFilter = (req, file, cb) => {
  // Allow images
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  }
  // Allow common document types
  else if (
    [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ].includes(file.mimetype)
  ) {
    cb(null, true);
  }
  // Reject other file types
  else {
    cb(
      new Error("Only images and documents (PDF, DOC, DOCX, TXT) are allowed"),
      false
    );
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Middleware to upload file to Cloudinary after multer processes it
const uploadToCloudinary = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    console.log("📤 Uploading file to Cloudinary:", {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    // Determine upload options based on file type
    const isImage = req.file.mimetype.startsWith("image/");
    const uploadOptions = {
      folder: isImage ? "meowchat/images" : "meowchat/files",
      resource_type: isImage ? "image" : "raw",
      public_id: `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`,
      ...(isImage && {
        transformation: [
          { width: 1200, height: 1200, crop: "limit" },
          { quality: "auto:good" },
          { fetch_format: "auto" },
        ],
      }),
    };

    // Create a buffer URL for Cloudinary
    const base64Data = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${base64Data}`;

    const result = await uploadImage({ buffer: dataUri }, uploadOptions);

    // Add Cloudinary result to request
    req.cloudinaryResult = result;
    req.file.cloudinary = result;

    console.log("✅ File uploaded successfully to Cloudinary");
    next();
  } catch (error) {
    console.error("❌ Cloudinary upload failed:", error);
    next(error);
  }
};

module.exports = {
  upload,
  uploadToCloudinary,
  singleImage: (fieldName) => [upload.single(fieldName), uploadToCloudinary],
  singleFile: (fieldName) => [upload.single(fieldName), uploadToCloudinary],
  array: (fieldName, maxCount) => [
    upload.array(fieldName, maxCount),
    uploadToCloudinary,
  ],
};
