const express = require("express");
const Message = require("../models/Message");
const Chat = require("../models/Chat");
const { auth } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const {
  uploadImage,
  getThumbnailUrl,
  getResponsiveUrls,
} = require("../config/cloudinary");
const {
  messageValidation,
  handleValidationErrors,
} = require("../middleware/validation");

const router = express.Router();

// Configure multer for uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// @route   GET /api/messages/:chatId
// @desc    Get messages for a specific chat
// @access  Private
router.get("/:chatId", auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const chatId = req.params.chatId;

    // Check if chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get messages with pagination (oldest first for proper chat order)
    const messages = await Message.find({
      chat: chatId,
      isDeleted: false,
    })
      .populate("sender", "username profilePicture")
      .populate("replyTo", "content sender")
      .sort({ createdAt: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Mark messages as read by current user
    const unreadMessages = messages.filter(
      (msg) =>
        !msg.isReadBy(req.user._id) &&
        msg.sender._id.toString() !== req.user._id.toString()
    );

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        {
          _id: { $in: unreadMessages.map((msg) => msg._id) },
          "readBy.user": { $ne: req.user._id },
        },
        {
          $push: {
            readBy: {
              user: req.user._id,
              readAt: new Date(),
            },
          },
        }
      );
    }

    res.json({
      messages,
      currentPage: parseInt(page),
      totalPages: Math.ceil(
        (await Message.countDocuments({ chat: chatId, isDeleted: false })) /
          limit
      ),
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/messages/:chatId
// @desc    Send a new message
// @access  Private
router.post(
  "/:chatId",
  auth,
  messageValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { content, type = "text", replyTo, file, image } = req.body;
      const chatId = req.params.chatId;

      // Check if chat exists and user is participant
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      if (!chat.isParticipant(req.user._id)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate message content based on type
      if (type === "text" && !content) {
        return res
          .status(400)
          .json({ message: "Text messages must have content" });
      }

      // Generate unique message ID and hash for security
      const crypto = require("crypto");
      const messageId = crypto.randomUUID();
      const messageHash = crypto
        .createHash("sha256")
        .update(`${messageId}${content}${req.user._id}${Date.now()}`)
        .digest("hex");

      // Create new message
      const message = new Message({
        content: content || "",
        sender: req.user._id,
        chat: chatId,
        type,
        messageId,
        messageHash,
        replyTo: replyTo || undefined,
        file: file || undefined,
        image: image || undefined,
      });

      await message.save();

      // Update chat's last message and activity
      chat.lastMessage = message._id;
      chat.lastActivity = new Date();
      await chat.save();

      // Populate message details
      await message.populate("sender", "username profilePicture");
      if (replyTo) {
        await message.populate("replyTo", "content sender");
      }

      // Emit socket event to all chat participants
      req.io.to(`chat_${chatId}`).emit("new_message", message);

      console.log(`💬 Message sent in chat ${chatId} by ${req.user.username}`);

      res.status(201).json({
        message: "Message sent successfully",
        data: message,
      });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   PUT /api/messages/:messageId
// @desc    Edit a message
// @access  Private
router.put("/:messageId", auth, async (req, res) => {
  try {
    const { content } = req.body;
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Can only edit your own messages" });
    }

    // Check if message is not too old (e.g., 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res
        .status(400)
        .json({ message: "Cannot edit messages older than 15 minutes" });
    }

    // Store original content and update
    if (!message.edited.isEdited) {
      message.edited.originalContent = message.content;
    }

    message.content = content;
    message.edited.isEdited = true;
    message.edited.editedAt = new Date();

    await message.save();
    await message.populate("sender", "username profilePicture");

    res.json({
      message: "Message updated successfully",
      data: message,
    });
  } catch (error) {
    console.error("Edit message error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/messages/:messageId
// @desc    Delete a message
// @access  Private
router.delete("/:messageId", auth, async (req, res) => {
  try {
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Can only delete your own messages" });
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = "This message was deleted";

    await message.save();

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/messages/:messageId/reactions
// @desc    Add/update reaction to a message
// @access  Private
router.post("/:messageId/reactions", auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const messageId = req.params.messageId;

    if (!emoji) {
      return res.status(400).json({ message: "Emoji is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user has access to this chat
    const chat = await Chat.findById(message.chat);
    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    await message.addReaction(req.user._id, emoji);
    await message.populate("sender", "username profilePicture");

    res.json({
      message: "Reaction added successfully",
      data: message,
    });
  } catch (error) {
    console.error("Add reaction error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/messages/:messageId/reactions
// @desc    Remove reaction from a message
// @access  Private
router.delete("/:messageId/reactions", auth, async (req, res) => {
  try {
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user has access to this chat
    const chat = await Chat.findById(message.chat);
    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    await message.removeReaction(req.user._id);
    await message.populate("sender", "username profilePicture");

    res.json({
      message: "Reaction removed successfully",
      data: message,
    });
  } catch (error) {
    console.error("Remove reaction error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/messages/chat/:chatId/clear
// @desc    Clear all messages in a chat
// @access  Private
router.delete("/chat/:chatId/clear", auth, async (req, res) => {
  try {
    const chatId = req.params.chatId;

    // Check if chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Soft delete all messages in the chat
    await Message.updateMany(
      { chat: chatId },
      {
        isDeleted: true,
        deletedAt: new Date(),
        content: "This message was deleted",
      }
    );

    res.json({ message: "Chat cleared successfully" });
  } catch (error) {
    console.error("Clear chat error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/messages/:chatId/upload
// @desc    Upload file/image with message (Cloudinary for images, local for files)
// @access  Private
router.post(
  "/:chatId/upload",
  auth,
  upload.single("file"),
  async (req, res) => {
    try {
      const chatId = req.params.chatId;
      const file = req.file;
      const { content, type } = req.body;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Check if chat exists and user is participant
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      if (!chat.isParticipant(req.user._id)) {
        return res.status(403).json({ message: "Access denied" });
      }

      let fileData = {};

      // Handle images - upload to Cloudinary
      if (file.mimetype.startsWith("image/")) {
        try {
          // Read the uploaded file and convert to base64
          const fs = require("fs");
          const fileBuffer = fs.readFileSync(file.path);
          const base64Data = fileBuffer.toString("base64");
          const dataUri = `data:${file.mimetype};base64,${base64Data}`;

          const cloudinaryResult = await uploadImage(
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

          // Delete the local temp file
          fs.unlinkSync(file.path);

          console.log(
            "📸 Image uploaded to Cloudinary:",
            cloudinaryResult.secure_url
          );

          fileData = {
            public_id: cloudinaryResult.public_id,
            url: cloudinaryResult.secure_url,
            thumbnail: getThumbnailUrl
              ? getThumbnailUrl(cloudinaryResult.public_id)
              : cloudinaryResult.secure_url,
            responsive: getResponsiveUrls
              ? getResponsiveUrls(cloudinaryResult.public_id)
              : {},
            originalName: file.originalname,
            size: cloudinaryResult.bytes,
            format: cloudinaryResult.format,
            width: cloudinaryResult.width,
            height: cloudinaryResult.height,
            storage: "cloudinary",
            type: "image",
          };
        } catch (error) {
          console.error("❌ Cloudinary upload failed:", error);
          return res.status(500).json({ message: "Image upload failed" });
        }
      } else {
        // Handle other files - keep local storage
        console.log("📎 File stored locally:", file.filename);

        fileData = {
          filename: file.filename,
          url: `/uploads/${file.filename}`,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          storage: "local",
          type: "file",
        };
      }

      // Generate unique message ID and hash
      const crypto = require("crypto");
      const messageId = crypto.randomUUID();
      const messageHash = crypto
        .createHash("sha256")
        .update(`${messageId}${content}${req.user._id}${Date.now()}`)
        .digest("hex");

      console.log("📤 Creating message with file:", {
        type: fileData.type,
        storage: fileData.storage,
        url: fileData.url,
        user: req.user.username,
      });

      // Create message data
      const messageData = {
        content: content || "",
        sender: req.user._id,
        chat: chatId,
        type: fileData.type,
        messageId,
        messageHash,
      };

      // Add file-specific data
      if (fileData.type === "image") {
        messageData.image = {
          url: fileData.url,
          filename: fileData.originalName,
          width: fileData.width,
          height: fileData.height,
          public_id: fileData.public_id,
          thumbnail: fileData.thumbnail,
          responsive: fileData.responsive,
          storage: fileData.storage,
        };
      } else {
        messageData.file = {
          url: fileData.url,
          filename: fileData.originalName,
          originalName: fileData.originalName,
          size: fileData.size,
          mimetype: fileData.mimetype,
          storage: fileData.storage,
        };
      }

      // Create the message
      const message = new Message(messageData);
      await message.save();

      // Update chat's last message
      chat.lastMessage = message._id;
      chat.lastActivity = new Date();
      await chat.save();

      // Populate message details
      await message.populate("sender", "username profilePicture");

      console.log("✅ Message with Cloudinary file created successfully");

      // Emit socket event
      req.io.to(`chat_${chatId}`).emit("new_message", message);

      res.status(201).json({
        message: "File uploaded successfully to Cloudinary",
        data: message,
      });
    } catch (error) {
      console.error("❌ Cloudinary file upload error:", error);
      res.status(500).json({
        message: "Server error",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Upload failed",
      });
    }
  }
);

module.exports = router;
