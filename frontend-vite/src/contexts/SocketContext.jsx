import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Map());
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      // Initialize socket connection
      const newSocket = io(
        import.meta.env.VITE_BACKEND_URL || "http://localhost:5000",
        {
          auth: {
            token: token,
          },
        }
      );

      // Connection event handlers
      newSocket.on("connect", () => {
        console.log("🔌 Connected to server");
        setSocket(newSocket);
      });

      newSocket.on("disconnect", () => {
        console.log("🔌 Disconnected from server");
        setSocket(null);
      });

      newSocket.on("connect_error", (error) => {
        console.error("❌ Connection error:", error);
      });

      // User status event handlers
      newSocket.on("online_users", (users) => {
        setOnlineUsers(new Set(users.map((u) => u.userId)));
      });

      newSocket.on("user_online", (data) => {
        setOnlineUsers((prev) => new Set([...prev, data.userId]));
      });

      newSocket.on("user_offline", (data) => {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      });

      // Typing indicators
      newSocket.on("user_typing", (data) => {
        setTypingUsers((prev) => {
          const newMap = new Map(prev);
          if (!newMap.has(data.chatId)) {
            newMap.set(data.chatId, new Set());
          }
          newMap.get(data.chatId).add(data.userId);
          return newMap;
        });
      });

      newSocket.on("user_stop_typing", (data) => {
        setTypingUsers((prev) => {
          const newMap = new Map(prev);
          if (newMap.has(data.chatId)) {
            newMap.get(data.chatId).delete(data.userId);
            if (newMap.get(data.chatId).size === 0) {
              newMap.delete(data.chatId);
            }
          }
          return newMap;
        });
      });

      // Error handling
      newSocket.on("error", (error) => {
        console.error("🚨 Socket error:", error);
      });

      return () => {
        newSocket.close();
      };
    }
  }, [user, token]);

  // Socket helper functions
  const joinChat = (chatId) => {
    if (socket) {
      socket.emit("join_chat", chatId);
    }
  };

  const leaveChat = (chatId) => {
    if (socket) {
      socket.emit("leave_chat", chatId);
    }
  };

  const sendMessage = (messageData) => {
    if (socket) {
      socket.emit("send_message", messageData);
    }
  };

  const startTyping = (chatId) => {
    if (socket) {
      socket.emit("typing_start", chatId);
    }
  };

  const stopTyping = (chatId) => {
    if (socket) {
      socket.emit("typing_stop", chatId);
    }
  };

  const addReaction = (messageId, emoji) => {
    if (socket) {
      socket.emit("add_reaction", { messageId, emoji });
    }
  };

  const editMessage = (messageId, content) => {
    if (socket) {
      socket.emit("edit_message", { messageId, content });
    }
  };

  const deleteMessage = (messageId) => {
    if (socket) {
      socket.emit("delete_message", messageId);
    }
  };

  // Event listeners for components
  const addEventListener = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
      return () => socket.off(event, callback);
    }
    return () => {};
  };

  const removeEventListener = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const value = {
    socket,
    onlineUsers,
    typingUsers,
    // Socket methods
    joinChat,
    leaveChat,
    sendMessage,
    startTyping,
    stopTyping,
    addReaction,
    editMessage,
    deleteMessage,
    // Event management
    addEventListener,
    removeEventListener,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
