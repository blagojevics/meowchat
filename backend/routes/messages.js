const express = require('express');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { auth } = require('../middleware/auth');
const { messageValidation, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/messages/:chatId
// @desc    Get messages for a specific chat
// @access  Private
router.get('/:chatId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const chatId = req.params.chatId;

    // Check if chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get messages with pagination
    const messages = await Message.find({ 
      chat: chatId,
      isDeleted: false 
    })
    .populate('sender', 'username profilePicture')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // Mark messages as read by current user
    const unreadMessages = messages.filter(
      msg => !msg.isReadBy(req.user._id) && msg.sender._id.toString() !== req.user._id.toString()
    );

    if (unreadMessages.length > 0) {
      await Message.updateMany(
        { 
          _id: { $in: unreadMessages.map(msg => msg._id) },
          'readBy.user': { $ne: req.user._id }
        },
        { 
          $push: { 
            readBy: { 
              user: req.user._id, 
              readAt: new Date() 
            } 
          } 
        }
      );
    }

    // Reverse to show oldest first
    messages.reverse();

    res.json({ 
      messages,
      currentPage: parseInt(page),
      totalPages: Math.ceil(await Message.countDocuments({ chat: chatId, isDeleted: false }) / limit)
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages/:chatId
// @desc    Send a new message
// @access  Private
router.post('/:chatId', auth, messageValidation, handleValidationErrors, async (req, res) => {
  try {
    const { content, type = 'text', replyTo, file, image } = req.body;
    const chatId = req.params.chatId;

    // Check if chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate message content based on type
    if (type === 'text' && !content) {
      return res.status(400).json({ message: 'Text messages must have content' });
    }

    // Create new message
    const message = new Message({
      content: content || '',
      sender: req.user._id,
      chat: chatId,
      type,
      replyTo: replyTo || undefined,
      file: file || undefined,
      image: image || undefined
    });

    await message.save();

    // Update chat's last message and activity
    chat.lastMessage = message._id;
    chat.lastActivity = new Date();
    await chat.save();

    // Populate message details
    await message.populate('sender', 'username profilePicture');
    if (replyTo) {
      await message.populate('replyTo', 'content sender');
    }

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/messages/:messageId
// @desc    Edit a message
// @access  Private
router.put('/:messageId', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Can only edit your own messages' });
    }

    // Check if message is not too old (e.g., 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res.status(400).json({ message: 'Cannot edit messages older than 15 minutes' });
    }

    // Store original content and update
    if (!message.edited.isEdited) {
      message.edited.originalContent = message.content;
    }
    
    message.content = content;
    message.edited.isEdited = true;
    message.edited.editedAt = new Date();

    await message.save();
    await message.populate('sender', 'username profilePicture');

    res.json({
      message: 'Message updated successfully',
      data: message
    });

  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/messages/:messageId
// @desc    Delete a message
// @access  Private
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Can only delete your own messages' });
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'This message was deleted';

    await message.save();

    res.json({ message: 'Message deleted successfully' });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages/:messageId/reactions
// @desc    Add/update reaction to a message
// @access  Private
router.post('/:messageId/reactions', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const messageId = req.params.messageId;

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user has access to this chat
    const chat = await Chat.findById(message.chat);
    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await message.addReaction(req.user._id, emoji);
    await message.populate('sender', 'username profilePicture');

    res.json({
      message: 'Reaction added successfully',
      data: message
    });

  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/messages/:messageId/reactions
// @desc    Remove reaction from a message
// @access  Private
router.delete('/:messageId/reactions', auth, async (req, res) => {
  try {
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user has access to this chat
    const chat = await Chat.findById(message.chat);
    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await message.removeReaction(req.user._id);
    await message.populate('sender', 'username profilePicture');

    res.json({
      message: 'Reaction removed successfully',
      data: message
    });

  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;