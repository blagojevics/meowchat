import React, { useState } from "react";
import { Box, Grid, Paper } from "@mui/material";
import ChatList from "./ChatList";
import ChatWindow from "./ChatWindow";
import UserList from "./UserList";

const ChatApp = () => {
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [showUserList, setShowUserList] = useState(false);

  const handleShowAllUsers = () => {
    setShowUserList(true);
    setSelectedChatId(null); // Clear chat selection when showing all users
  };

  const handleChatSelect = (chatId) => {
    setSelectedChatId(chatId);
    setShowUserList(false); // Hide user list when selecting a chat
  };

  return (
    <Box
      sx={{ height: "100vh", display: "flex", bgcolor: "background.default" }}
    >
      <Grid container sx={{ height: "100%" }}>
        {/* Chat List Sidebar */}
        <Grid item xs={12} sm={4} md={3}>
          <Paper
            elevation={0}
            sx={{
              height: "100%",
              borderRadius: 0,
              borderRight: 1,
              borderColor: "divider",
            }}
          >
            <ChatList
              selectedChatId={selectedChatId}
              onChatSelect={handleChatSelect}
              onShowUserList={handleShowAllUsers}
            />
          </Paper>
        </Grid>

        {/* Main Chat Window */}
        <Grid item xs={12} sm={8} md={showUserList ? 6 : 9}>
          <ChatWindow
            chatId={selectedChatId}
            onShowUserList={() => setShowUserList(true)}
          />
        </Grid>

        {/* User List Sidebar (conditional) */}
        {showUserList && (
          <Grid item xs={12} md={3}>
            <Paper
              elevation={0}
              sx={{
                height: "100%",
                borderRadius: 0,
                borderLeft: 1,
                borderColor: "divider",
              }}
            >
              <UserList
                chatId={selectedChatId}
                onClose={() => setShowUserList(false)}
              />
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default ChatApp;
