const express = require("express");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const { auth } = require("../middleware/auth");
const {
  chatValidation,
  handleValidationErrors,
} = require("../middleware/validation");

const router = express.Router();

// @route   GET /api/chats
// @desc    Get user's chats
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      "participants.user": req.user._id,
      isArchived: false,
    })
      .populate(
        "participants.user",
        "username profilePicture isOnline lastSeen"
      )
      .populate("lastMessage")
      .sort({ lastActivity: -1 });

    res.json({ chats });
  } catch (error) {
    console.error("Get chats error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/chats
// @desc    Create a new chat
// @access  Private
router.post(
  "/",
  auth,
  chatValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, type, participants, description } = req.body;

      // For private chats, ensure only 2 participants
      if (type === "private" && participants.length !== 1) {
        return res.status(400).json({
          message: "Private chats must have exactly one other participant",
        });
      }

      // Check if private chat already exists
      if (type === "private") {
        const existingChat = await Chat.findOne({
          type: "private",
          $and: [
            { "participants.user": req.user._id },
            { "participants.user": participants[0] },
          ],
        });

        if (existingChat) {
          return res.status(400).json({
            message: "Private chat already exists with this user",
          });
        }
      }

      // Prepare participants array
      const chatParticipants = [
        {
          user: req.user._id,
          role: type === "group" ? "admin" : "member",
        },
        ...participants.map((participantId) => ({
          user: participantId,
          role: "member",
        })),
      ];

      // Create new chat
      const chat = new Chat({
        name: type === "group" ? name : undefined,
        type,
        participants: chatParticipants,
        description: description || "",
      });

      await chat.save();

      // Populate the chat with user details
      await chat.populate(
        "participants.user",
        "username profilePicture isOnline lastSeen"
      );

      res.status(201).json({
        message: "Chat created successfully",
        chat,
      });
    } catch (error) {
      console.error("Create chat error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// @route   GET /api/chats/:chatId
// @desc    Get specific chat details
// @access  Private
router.get("/:chatId", auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate(
        "participants.user",
        "username profilePicture isOnline lastSeen"
      )
      .populate("lastMessage");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if user is a participant
    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ chat });
  } catch (error) {
    console.error("Get chat error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   PUT /api/chats/:chatId
// @desc    Update chat details
// @access  Private
router.put("/:chatId", auth, async (req, res) => {
  try {
    const { name, description, chatImage } = req.body;

    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if user is admin for group chats
    if (chat.type === "group" && chat.getUserRole(req.user._id) !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can update group details" });
    }

    // Update chat details
    if (name && chat.type === "group") chat.name = name;
    if (description) chat.description = description;
    if (chatImage) chat.chatImage = chatImage;

    await chat.save();
    await chat.populate(
      "participants.user",
      "username profilePicture isOnline lastSeen"
    );

    res.json({
      message: "Chat updated successfully",
      chat,
    });
  } catch (error) {
    console.error("Update chat error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   POST /api/chats/:chatId/participants
// @desc    Add participants to group chat
// @access  Private
router.post("/:chatId/participants", auth, async (req, res) => {
  try {
    const { participants } = req.body;

    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat.type !== "group") {
      return res
        .status(400)
        .json({ message: "Can only add participants to group chats" });
    }

    // Check if user is admin
    if (chat.getUserRole(req.user._id) !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admins can add participants" });
    }

    // Add new participants
    participants.forEach((participantId) => {
      if (!chat.isParticipant(participantId)) {
        chat.participants.push({
          user: participantId,
          role: "member",
        });
      }
    });

    await chat.save();
    await chat.populate(
      "participants.user",
      "username profilePicture isOnline lastSeen"
    );

    res.json({
      message: "Participants added successfully",
      chat,
    });
  } catch (error) {
    console.error("Add participants error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @route   DELETE /api/chats/:chatId/participants/:userId
// @desc    Remove participant from group chat
// @access  Private
router.delete("/:chatId/participants/:userId", auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (chat.type !== "group") {
      return res
        .status(400)
        .json({ message: "Can only remove participants from group chats" });
    }

    // Check if user is admin or removing themselves
    const isAdmin = chat.getUserRole(req.user._id) === "admin";
    const removingSelf = req.params.userId === req.user._id.toString();

    if (!isAdmin && !removingSelf) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Remove participant
    chat.participants = chat.participants.filter(
      (p) => p.user.toString() !== req.params.userId
    );

    await chat.save();
    await chat.populate(
      "participants.user",
      "username profilePicture isOnline lastSeen"
    );

    res.json({
      message: "Participant removed successfully",
      chat,
    });
  } catch (error) {
    console.error("Remove participant error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
