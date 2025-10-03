const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // Encrypted content (stores the encrypted message)
    encryptedContent: {
      type: mongoose.Schema.Types.Mixed,
      required: function () {
        return !this.file && !this.image;
      },
    },
    // Legacy field for backward compatibility (not used in E2E)
    content: {
      type: String,
    },
    // Message integrity hash
    messageHash: {
      type: String,
      required: false,
    },
    // Unique message ID for replay attack prevention
    messageId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "file", "emoji"],
      default: "text",
    },
    // Encrypted file data
    encryptedFile: {
      type: mongoose.Schema.Types.Mixed,
    },
    file: {
      url: String,
      filename: String,
      size: Number,
      mimetype: String,
      // Cloudinary specific fields
      cloudinary: {
        public_id: String,
        secure_url: String,
        format: String,
      },
    },
    // Encrypted image data
    encryptedImage: {
      type: mongoose.Schema.Types.Mixed,
    },
    image: {
      url: String,
      filename: String,
      width: Number,
      height: Number,
      // Cloudinary specific fields
      cloudinary: {
        public_id: String,
        secure_url: String,
        thumbnail: String,
        responsive: {
          thumbnail: String,
          small: String,
          medium: String,
          large: String,
        },
        format: String,
      },
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        emoji: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    edited: {
      isEdited: {
        type: Boolean,
        default: false,
      },
      editedAt: Date,
      originalContent: String,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

// Method to check if message is read by user
messageSchema.methods.isReadBy = function (userId) {
  return this.readBy.some((read) => read.user.toString() === userId.toString());
};

// Method to add reaction
messageSchema.methods.addReaction = function (userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(
    (r) => r.user.toString() !== userId.toString()
  );

  // Add new reaction
  this.reactions.push({
    user: userId,
    emoji: emoji,
  });

  return this.save();
};

// Method to remove reaction
messageSchema.methods.removeReaction = function (userId) {
  this.reactions = this.reactions.filter(
    (r) => r.user.toString() !== userId.toString()
  );
  return this.save();
};

module.exports = mongoose.model("Message", messageSchema);
