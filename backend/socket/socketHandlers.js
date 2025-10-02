const { socketAuth } = require("../middleware/auth");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

const socketHandlers = (io) => {
  // Socket authentication middleware
  io.use(socketAuth);

  io.on("connection", async (socket) => {
    console.log(`🔌 User connected: ${socket.user.username} (${socket.id})`);

    // Update user online status
    await User.findByIdAndUpdate(socket.user._id, {
      isOnline: true,
      lastSeen: new Date(),
    });

    // Join user to their personal room
    socket.join(`user_${socket.user._id}`);

    // Join user to all their chat rooms
    try {
      const userChats = await Chat.find({
        "participants.user": socket.user._id,
      });

      userChats.forEach((chat) => {
        socket.join(`chat_${chat._id}`);
      });

      console.log(
        `👥 User ${socket.user.username} joined ${userChats.length} chat rooms`
      );
    } catch (error) {
      console.error("Error joining chat rooms:", error);
    }

    // Send current online users to the newly connected user
    try {
      const onlineUsers = await User.find({ isOnline: true }).select(
        "_id username"
      );
      socket.emit(
        "online_users",
        onlineUsers.map((u) => ({ userId: u._id, username: u.username }))
      );
    } catch (error) {
      console.error("Error fetching online users:", error);
    }

    // Broadcast user online status to all other users
    socket.broadcast.emit("user_online", {
      userId: socket.user._id,
      username: socket.user.username,
      isOnline: true,
    });

    // Handle joining a specific chat room
    socket.on("join_chat", async (chatId) => {
      try {
        const chat = await Chat.findById(chatId);

        if (chat && chat.isParticipant(socket.user._id)) {
          socket.join(`chat_${chatId}`);
          console.log(`👤 ${socket.user.username} joined chat: ${chatId}`);

          // Notify other participants
          socket.to(`chat_${chatId}`).emit("user_joined_chat", {
            userId: socket.user._id,
            username: socket.user.username,
            chatId,
          });
        }
      } catch (error) {
        console.error("Error joining chat:", error);
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    // Handle leaving a chat room
    socket.on("leave_chat", (chatId) => {
      socket.leave(`chat_${chatId}`);
      socket.to(`chat_${chatId}`).emit("user_left_chat", {
        userId: socket.user._id,
        username: socket.user.username,
        chatId,
      });
      console.log(`👤 ${socket.user.username} left chat: ${chatId}`);
    });

    // Handle sending messages
    socket.on("send_message", async (data) => {
      try {
        const { chatId, content, type = "text", replyTo, file, image } = data;

        // Verify user is participant of the chat
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.isParticipant(socket.user._id)) {
          socket.emit("error", { message: "Access denied to this chat" });
          return;
        }

        // Create and save message
        const message = new Message({
          content: content || "",
          sender: socket.user._id,
          chat: chatId,
          type,
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

        // Emit to all participants in the chat
        io.to(`chat_${chatId}`).emit("new_message", message);

        // Send push notification to offline users (placeholder)
        // You can implement push notifications here

        console.log(
          `💬 Message sent in chat ${chatId} by ${socket.user.username}`
        );
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle typing indicators
    socket.on("typing_start", (chatId) => {
      socket.to(`chat_${chatId}`).emit("user_typing", {
        userId: socket.user._id,
        username: socket.user.username,
        chatId,
      });
    });

    socket.on("typing_stop", (chatId) => {
      socket.to(`chat_${chatId}`).emit("user_stop_typing", {
        userId: socket.user._id,
        username: socket.user.username,
        chatId,
      });
    });

    // Handle message reactions
    socket.on("add_reaction", async (data) => {
      try {
        const { messageId, emoji } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit("error", { message: "Message not found" });
          return;
        }

        // Check if user has access to this chat
        const chat = await Chat.findById(message.chat);
        if (!chat.isParticipant(socket.user._id)) {
          socket.emit("error", { message: "Access denied" });
          return;
        }

        await message.addReaction(socket.user._id, emoji);
        await message.populate("sender", "username profilePicture");

        // Emit to all participants in the chat
        io.to(`chat_${message.chat}`).emit("message_reaction_added", {
          messageId,
          userId: socket.user._id,
          emoji,
          message,
        });
      } catch (error) {
        console.error("Error adding reaction:", error);
        socket.emit("error", { message: "Failed to add reaction" });
      }
    });

    // Handle message editing
    socket.on("edit_message", async (data) => {
      try {
        const { messageId, content } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit("error", { message: "Message not found" });
          return;
        }

        // Check if user is the sender
        if (message.sender.toString() !== socket.user._id.toString()) {
          socket.emit("error", { message: "Can only edit your own messages" });
          return;
        }

        // Check if message is not too old
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        if (message.createdAt < fifteenMinutesAgo) {
          socket.emit("error", {
            message: "Cannot edit messages older than 15 minutes",
          });
          return;
        }

        // Update message
        if (!message.edited.isEdited) {
          message.edited.originalContent = message.content;
        }

        message.content = content;
        message.edited.isEdited = true;
        message.edited.editedAt = new Date();

        await message.save();
        await message.populate("sender", "username profilePicture");

        // Emit to all participants in the chat
        io.to(`chat_${message.chat}`).emit("message_edited", message);
      } catch (error) {
        console.error("Error editing message:", error);
        socket.emit("error", { message: "Failed to edit message" });
      }
    });

    // Handle message deletion
    socket.on("delete_message", async (messageId) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit("error", { message: "Message not found" });
          return;
        }

        // Check if user is the sender
        if (message.sender.toString() !== socket.user._id.toString()) {
          socket.emit("error", {
            message: "Can only delete your own messages",
          });
          return;
        }

        // Soft delete
        message.isDeleted = true;
        message.deletedAt = new Date();
        message.content = "This message was deleted";

        await message.save();

        // Emit to all participants in the chat
        io.to(`chat_${message.chat}`).emit("message_deleted", {
          messageId,
          chatId: message.chat,
        });
      } catch (error) {
        console.error("Error deleting message:", error);
        socket.emit("error", { message: "Failed to delete message" });
      }
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(
        `🔌 User disconnected: ${socket.user.username} (${socket.id})`
      );

      // Update user offline status
      await User.findByIdAndUpdate(socket.user._id, {
        isOnline: false,
        lastSeen: new Date(),
      });

      // Broadcast user offline status
      socket.broadcast.emit("user_offline", {
        userId: socket.user._id,
        username: socket.user.username,
        isOnline: false,
        lastSeen: new Date(),
      });
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`Socket error for user ${socket.user.username}:`, error);
    });
  });

  // Handle connection errors
  io.on("connect_error", (error) => {
    console.error("Socket.io connection error:", error);
  });
};

module.exports = socketHandlers;
