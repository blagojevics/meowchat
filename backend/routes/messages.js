const express = require("express");
const Message = require("../models/Message");
const Chat = require("../models/Chat");
const { auth } = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  messageValidation,
  handleValidationErrors,
} = require("../middleware/validation");

const router = express.Router();

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
// @desc    Upload file/image with message
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

      // Generate unique message ID and hash
      const crypto = require("crypto");
      const messageId = crypto.randomUUID();
      const messageHash = crypto
        .createHash("sha256")
        .update(`${messageId}${content}${req.user._id}${Date.now()}`)
        .digest("hex");

      // Determine if it's an image or file
      const isImage = file.mimetype.startsWith("image/");
      const fileUrl = `/uploads/${file.filename}`;

      // Create message with file/image data
      const messageData = {
        content: content || "",
        sender: req.user._id,
        chat: chatId,
        type: isImage ? "image" : "file",
        messageId,
        messageHash,
      };

      if (isImage) {
        messageData.image = {
          url: fileUrl,
          filename: file.originalname,
          size: file.size,
        };
      } else {
        messageData.file = {
          url: fileUrl,
          filename: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
        };
      }

      const message = new Message(messageData);
      await message.save();

      // Update chat's last message
      chat.lastMessage = message._id;
      chat.lastActivity = new Date();
      await chat.save();

      // Populate message details
      await message.populate("sender", "username profilePicture");

      // Emit socket event
      req.io.to(`chat_${chatId}`).emit("new_message", message);

      res.status(201).json({
        message: "File uploaded successfully",
        data: message,
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
