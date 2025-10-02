const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: function () {
        return this.type === "group";
      },
      trim: true,
      maxlength: 50,
    },
    type: {
      type: String,
      enum: ["private", "group"],
      required: true,
      default: "private",
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        // Each participant gets the chat key encrypted with their public key
        encryptedChatKey: {
          type: String,
          required: false, // Make this optional for now to allow chat creation
        },
      },
    ],
    // Chat encryption metadata
    encryptionInfo: {
      algorithm: {
        type: String,
        default: "aes-256-gcm",
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      keyRotatedAt: {
        type: Date,
        default: Date.now,
      },
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    chatImage: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      maxlength: 200,
      default: "",
    },
    // For Meowgram integration
    meowgramPostId: {
      type: String,
      sparse: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
chatSchema.index({ "participants.user": 1 });
chatSchema.index({ lastActivity: -1 });

// Virtual for participant count
chatSchema.virtual("participantCount").get(function () {
  return this.participants.length;
});

// Method to check if user is participant
chatSchema.methods.isParticipant = function (userId) {
  return this.participants.some((p) => p.user.toString() === userId.toString());
};

// Method to get user role in chat
chatSchema.methods.getUserRole = function (userId) {
  const participant = this.participants.find(
    (p) => p.user.toString() === userId.toString()
  );
  return participant ? participant.role : null;
};

module.exports = mongoose.model("Chat", chatSchema);
