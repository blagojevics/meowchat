import { useState, useEffect, useCallback } from "react";
import { chatAPI, messageAPI } from "../services/api";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../contexts/AuthContext";

// Hook for managing multiple chats
export const useChats = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket } = useSocket();
  const { user } = useAuth();

  // Fetch all chats
  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getChats();
      setChats(response.data.chats || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch chats:", err);
      setError(err.response?.data?.message || "Failed to load chats");
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new chat
  const createChat = useCallback(async (chatData) => {
    try {
      const response = await chatAPI.createChat(chatData);
      const newChat = response.data.chat;
      setChats((prev) => [newChat, ...prev]);
      return { success: true, chat: newChat };
    } catch (err) {
      console.error("Failed to create chat:", err);
      const message = err.response?.data?.message || "Failed to create chat";
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  // Listen for new chats via socket
  useEffect(() => {
    if (socket) {
      const handleNewChat = (chat) => {
        setChats((prev) => {
          const exists = prev.find((c) => c._id === chat._id);
          if (!exists) {
            return [chat, ...prev];
          }
          return prev;
        });
      };

      const handleChatUpdate = (updatedChat) => {
        setChats((prev) =>
          prev.map((chat) =>
            chat._id === updatedChat._id ? updatedChat : chat
          )
        );
      };

      socket.on("new_chat", handleNewChat);
      socket.on("chat_updated", handleChatUpdate);

      return () => {
        socket.off("new_chat", handleNewChat);
        socket.off("chat_updated", handleChatUpdate);
      };
    }
  }, [socket]);

  // Load chats on mount
  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user, fetchChats]);

  return {
    chats,
    loading,
    error,
    createChat,
    refreshChats: fetchChats,
  };
};

// Hook for managing a single chat
export const useChat = (chatId) => {
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const { socket, joinChat, leaveChat } = useSocket();

  // Fetch chat details
  const fetchChat = useCallback(async () => {
    if (!chatId) return;

    try {
      const response = await chatAPI.getChat(chatId);
      setChat(response.data.chat);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch chat:", err);
      setError(err.response?.data?.message || "Failed to load chat");
    }
  }, [chatId]);

  // Fetch messages for the chat
  const fetchMessages = useCallback(
    async (pageNum = 1, append = false) => {
      if (!chatId) return;

      try {
        if (!append) setLoading(true);

        const response = await messageAPI.getMessages(chatId, pageNum);
        const newMessages = response.data.messages || [];

        if (append) {
          setMessages((prev) => [...newMessages, ...prev]);
        } else {
          setMessages(newMessages);
        }

        setHasMore(newMessages.length === 50); // Assuming 50 is the page limit
        setError(null);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
        setError(err.response?.data?.message || "Failed to load messages");
      } finally {
        setLoading(false);
      }
    },
    [chatId]
  );

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMessages(nextPage, true);
    }
  }, [hasMore, loading, page, fetchMessages]);

  // Send message
  const sendMessage = useCallback(
    async (messageData) => {
      if (!chatId || !messageData.content?.trim()) return;

      const fullMessageData = {
        ...messageData,
        content: messageData.content.trim(),
        type: messageData.type || "text",
      };

      try {
        const response = await messageAPI.sendMessage(chatId, fullMessageData);
        // Message will be added via socket event
        return { success: true, message: response.data.data };
      } catch (err) {
        console.error("Failed to send message:", err);
        const message = err.response?.data?.message || "Failed to send message";
        return { success: false, error: message };
      }
    },
    [chatId]
  );

  // Add reaction to message
  const addReaction = useCallback(async (messageId, emoji) => {
    try {
      await messageAPI.addReaction(messageId, emoji);
      return { success: true };
    } catch (err) {
      console.error("Failed to add reaction:", err);
      return {
        success: false,
        error: err.response?.data?.message || "Failed to add reaction",
      };
    }
  }, []);

  // Edit message
  const editMessage = useCallback(async (messageId, content) => {
    try {
      await messageAPI.editMessage(messageId, content);
      return { success: true };
    } catch (err) {
      console.error("Failed to edit message:", err);
      return {
        success: false,
        error: err.response?.data?.message || "Failed to edit message",
      };
    }
  }, []);

  // Delete message
  const deleteMessage = useCallback(async (messageId) => {
    try {
      await messageAPI.deleteMessage(messageId);
      return { success: true };
    } catch (err) {
      console.error("Failed to delete message:", err);
      return {
        success: false,
        error: err.response?.data?.message || "Failed to delete message",
      };
    }
  }, []);

  // Socket event handlers
  useEffect(() => {
    if (socket && chatId) {
      // Join chat room
      joinChat(chatId);

      // Listen for new messages
      const handleNewMessage = (message) => {
        if (message.chat === chatId || message.chatId === chatId) {
          setMessages((prev) => [...prev, message]);
        }
      };

      // Listen for message updates
      const handleMessageUpdate = (updatedMessage) => {
        if (
          updatedMessage.chat === chatId ||
          updatedMessage.chatId === chatId
        ) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === updatedMessage._id ? updatedMessage : msg
            )
          );
        }
      };

      // Listen for message deletions
      const handleMessageDelete = (messageId) => {
        setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      };

      socket.on("new_message", handleNewMessage);
      socket.on("message_updated", handleMessageUpdate);
      socket.on("message_deleted", handleMessageDelete);

      return () => {
        leaveChat(chatId);
        socket.off("new_message", handleNewMessage);
        socket.off("message_updated", handleMessageUpdate);
        socket.off("message_deleted", handleMessageDelete);
      };
    }
  }, [socket, chatId, joinChat, leaveChat]);

  // Load chat and messages on mount or chatId change
  useEffect(() => {
    if (chatId) {
      setMessages([]);
      setPage(1);
      setHasMore(true);
      fetchChat();
      fetchMessages(1, false);
    }
  }, [chatId, fetchChat, fetchMessages]);

  return {
    chat,
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    addReaction,
    editMessage,
    deleteMessage,
    loadMoreMessages,
    refreshChat: fetchChat,
    refreshMessages: () => fetchMessages(1, false),
  };
};
