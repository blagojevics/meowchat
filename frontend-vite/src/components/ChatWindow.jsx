import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  IconButton,
  Divider,
} from "@mui/material";
import { Info, MoreVert, Group } from "@mui/icons-material";
import MessageInput from "./MessageInput";
import Message from "./Message";
import { useChat } from "../hooks/useChat";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";

const ChatWindow = ({ chatId, onShowUserList }) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const { user } = useAuth();
  const { joinChat, leaveChat, typingUsers } = useSocket();
  const { chat, messages, loading, sendMessage } = useChat(chatId);

  // Join/leave chat on mount/unmount
  useEffect(() => {
    if (chatId) {
      joinChat(chatId);
      return () => leaveChat(chatId);
    }
  }, [chatId, joinChat, leaveChat]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const getChatDisplayName = () => {
    if (!chat) return "";

    if (chat.type === "group") {
      return chat.name || "Group Chat";
    }

    const otherParticipant = chat.participants.find(
      (p) => p.user._id !== user._id
    );

    return otherParticipant?.user.username || "Unknown User";
  };

  const getChatAvatar = () => {
    if (!chat) return "";

    if (chat.type === "group") {
      return chat.chatImage || "";
    }

    const otherParticipant = chat.participants.find(
      (p) => p.user._id !== user._id
    );

    return otherParticipant?.user.profilePicture || "";
  };

  const getTypingIndicator = () => {
    if (!chatId || !typingUsers.has(chatId)) return null;

    const typingUserIds = Array.from(typingUsers.get(chatId));
    const typingNames = typingUserIds
      .filter((userId) => userId !== user._id)
      .map((userId) => {
        const participant = chat?.participants.find(
          (p) => p.user._id === userId
        );
        return participant?.user.username || "Someone";
      });

    if (typingNames.length === 0) return null;

    const text =
      typingNames.length === 1
        ? `${typingNames[0]} is typing...`
        : `${typingNames.join(", ")} are typing...`;

    return (
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary" fontStyle="italic">
          {text}
        </Typography>
      </Box>
    );
  };

  if (!chatId) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <Typography variant="h5" color="text.secondary" gutterBottom>
          🐱 Welcome to MeowChat!
        </Typography>
        <Typography color="text.secondary">
          Select a chat to start messaging
        </Typography>
      </Box>
    );
  }

  if (loading && !chat) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography>Loading chat...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100%",
        maxHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden", // Prevent the entire component from expanding
      }}
    >
      {/* Chat Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          borderRadius: 0,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Avatar src={getChatAvatar()} sx={{ mr: 2 }}>
            {chat?.type === "group" ? (
              <Group />
            ) : (
              getChatDisplayName()[0]?.toUpperCase()
            )}
          </Avatar>

          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              {getChatDisplayName()}
            </Typography>
            {chat?.type === "group" && (
              <Typography variant="body2" color="text.secondary">
                {chat.participants.length} members
              </Typography>
            )}
          </Box>

          <IconButton onClick={onShowUserList}>
            <Info />
          </IconButton>

          <IconButton>
            <MoreVert />
          </IconButton>
        </Box>
      </Paper>

      {/* Messages Container - Simplified */}
      <Box
        ref={messagesContainerRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "16px",
          backgroundColor: "#f5f5f5",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          minHeight: 0, // Important for flex child to respect overflow
          maxHeight: "100%", // Prevent expansion beyond container
        }}
      >
        {messages.length === 0 && !loading ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography color="text.secondary">
              No messages yet. Say hello! 👋
            </Typography>
          </Box>
        ) : (
          messages.map((message, index) => {
            const prevMessage = messages[index - 1];
            const showAvatar =
              !prevMessage ||
              prevMessage.sender._id !== message.sender._id ||
              new Date(message.createdAt).getTime() -
                new Date(prevMessage.createdAt).getTime() >
                300000;

            return (
              <Message
                key={message._id}
                message={message}
                showAvatar={showAvatar}
                isOwn={message.sender._id === user._id}
              />
            );
          })
        )}

        {/* Typing Indicator */}
        {getTypingIndicator()}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </Box>

      {/* Message Input */}
      <Box sx={{ flexShrink: 0 }}>
        <Divider />
        <MessageInput chatId={chatId} onSendMessage={sendMessage} />
      </Box>
    </Box>
  );
};

export default ChatWindow;
