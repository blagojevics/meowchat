import React, { useState } from "react";
import { Box, Paper } from "@mui/material";
import ChatList from "./ChatList";
import ChatWindow from "./ChatWindow";
import UserList from "./UserList";

const ChatApp = () => {
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const handleChatSelect = (chatId) => {
    setSelectedChatId(chatId);
    setSelectedUserId(null); // Reset selected user when changing chats
  };

  const handleToggleUserInfo = () => {
    setShowUserInfo(!showUserInfo);
    if (!showUserInfo) {
      setSelectedUserId(null); // Reset when closing
    }
  };

  const handleUserClick = (userId) => {
    setSelectedUserId(userId);
    setShowUserInfo(true);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      {/* Main Container - Max 1000px width */}
      <Box
        sx={{
          width: "100%",
          maxWidth: "1000px",
          height: "90vh",
          maxHeight: "800px",
          margin: "0 auto",
          display: "flex",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          boxShadow: 3,
        }}
      >
        {/* Left Sidebar - Chat List */}
        <Box
          sx={{
            width: "280px",
            flexShrink: 0,
            borderRight: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <ChatList
            selectedChatId={selectedChatId}
            onChatSelect={handleChatSelect}
          />
        </Box>

        {/* Center - Main Chat Window */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <ChatWindow
            chatId={selectedChatId}
            onToggleUserInfo={handleToggleUserInfo}
            showUserInfo={showUserInfo}
            onUserClick={handleUserClick}
          />
        </Box>

        {/* Right Sidebar - User Info (Conditional) */}
        {showUserInfo && selectedChatId && (
          <Box
            sx={{
              width: "300px",
              flexShrink: 0,
              borderLeft: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <UserList
              chatId={selectedChatId}
              selectedUserId={selectedUserId}
              onClose={() => {
                setShowUserInfo(false);
                setSelectedUserId(null);
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ChatApp;
