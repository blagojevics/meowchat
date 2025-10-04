import React, { useState } from "react";
import { Box, Paper, useMediaQuery, useTheme, Slide } from "@mui/material";
import ChatList from "./ChatList";
import ChatWindow from "./ChatWindow";
import UserList from "./UserList";

const ChatApp = () => {
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showChatList, setShowChatList] = useState(true); // For mobile navigation

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md")); // Mobile breakpoint
  const isEmbedded = window.self !== window.top; // Detect if running in iframe

  const handleChatSelect = (chatId) => {
    setSelectedChatId(chatId);
    setSelectedUserId(null);
    if (isMobile) {
      setShowChatList(false); // Hide chat list on mobile when chat is selected
    }
  };

  const handleBackToChats = () => {
    if (isMobile) {
      setShowChatList(true);
      setSelectedChatId(null);
    }
  };

  const handleToggleUserInfo = () => {
    setShowUserInfo(!showUserInfo);
    if (!showUserInfo) {
      setSelectedUserId(null);
    }
  };

  const handleUserClick = (userId) => {
    setSelectedUserId(userId);
    setShowUserInfo(true);
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <Box
        sx={{
          height: "100vh",
          width: "100vw",
          position: "relative",
          overflow: "hidden",
          bgcolor: "background.default",
        }}
      >
        {/* Chat List - Mobile */}
        <Slide direction="right" in={showChatList} mountOnEnter unmountOnExit>
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: "background.paper",
              zIndex: 1,
            }}
          >
            <ChatList
              selectedChatId={selectedChatId}
              onChatSelect={handleChatSelect}
              isMobile={true}
            />
          </Box>
        </Slide>

        {/* Chat Window - Mobile */}
        <Slide
          direction="left"
          in={!showChatList && selectedChatId && !showUserInfo}
          mountOnEnter
          unmountOnExit
        >
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: "background.paper",
              zIndex: 2,
            }}
          >
            <ChatWindow
              chatId={selectedChatId}
              onToggleUserInfo={handleToggleUserInfo}
              showUserInfo={showUserInfo}
              onUserClick={handleUserClick}
              onBack={handleBackToChats}
              isMobile={true}
            />
          </Box>
        </Slide>

        {/* User Info - Mobile */}
        <Slide
          direction="left"
          in={!showChatList && selectedChatId && showUserInfo}
          mountOnEnter
          unmountOnExit
        >
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: "background.paper",
              zIndex: 3,
            }}
          >
            <UserList
              chatId={selectedChatId}
              selectedUserId={selectedUserId}
              onClose={() => {
                setShowUserInfo(false);
                setSelectedUserId(null);
              }}
              onUserSelect={(userId) => setSelectedUserId(userId)}
              isMobile={true}
            />
          </Box>
        </Slide>
      </Box>
    );
  }

  // Desktop Layout (existing)
  return (
    <Box
      sx={{
        height: isEmbedded ? "100vh" : "100vh",
        width: isEmbedded ? "100vw" : "100vw",
        display: "flex",
        justifyContent: isEmbedded ? "flex-start" : "center",
        alignItems: isEmbedded ? "stretch" : "center",
        bgcolor: "background.default",
        overflow: "hidden",
      }}
    >
      {isEmbedded ? (
        // Embedded layout - fill entire space
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            overflow: "hidden",
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
              isMobile={false}
            />
          </Box>

          {/* Center - Main Chat Window */}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <ChatWindow
              chatId={selectedChatId}
              onToggleUserInfo={handleToggleUserInfo}
              showUserInfo={showUserInfo}
              onUserClick={handleUserClick}
              isMobile={false}
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
                onUserSelect={(userId) => setSelectedUserId(userId)}
              />
            </Box>
          )}
        </Box>
      ) : (
        // Original desktop layout - centered with fixed size
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
              isMobile={false}
            />
          </Box>

          {/* Center - Main Chat Window */}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <ChatWindow
              chatId={selectedChatId}
              onToggleUserInfo={handleToggleUserInfo}
              showUserInfo={showUserInfo}
              onUserClick={handleUserClick}
              isMobile={false}
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
                onUserSelect={(userId) => setSelectedUserId(userId)}
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ChatApp;
