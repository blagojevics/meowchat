// Cloudinary configuration for MeowChat
const { v2: cloudinary } = require("cloudinary");

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Use HTTPS URLs
});

// Upload image to Cloudinary
const uploadImage = async (file, options = {}) => {
  try {
    const defaultOptions = {
      folder: "meowchat/images", // Organize uploads in folders
      resource_type: "image",
      quality: "auto:good", // Automatic quality optimization
      fetch_format: "auto", // Automatic format optimization (WebP, AVIF when supported)
      transformation: [
        { width: 1200, height: 1200, crop: "limit" }, // Limit max size
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ],
      ...options,
    };

    const result = await cloudinary.uploader.upload(
      file.path || file.buffer,
      defaultOptions
    );

    console.log("📸 Image uploaded to Cloudinary:", {
      public_id: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    });

    return {
      public_id: result.public_id,
      url: result.secure_url,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      created_at: result.created_at,
    };
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

// Delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log("🗑️ Image deleted from Cloudinary:", publicId, result);
    return result;
  } catch (error) {
    console.error("❌ Cloudinary delete error:", error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

// Generate thumbnail URL
const getThumbnailUrl = (publicId, width = 150, height = 150) => {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: "fill",
    quality: "auto:good",
    fetch_format: "auto",
  });
};

// Generate different sizes for responsive images
const getResponsiveUrls = (publicId) => {
  const sizes = [
    { name: "thumbnail", width: 150, height: 150 },
    { name: "small", width: 300, height: 300 },
    { name: "medium", width: 600, height: 600 },
    { name: "large", width: 1200, height: 1200 },
  ];

  return sizes.reduce((urls, size) => {
    urls[size.name] = cloudinary.url(publicId, {
      width: size.width,
      height: size.height,
      crop: "limit",
      quality: "auto:good",
      fetch_format: "auto",
    });
    return urls;
  }, {});
};

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
  getThumbnailUrl,
  getResponsiveUrls,
};
