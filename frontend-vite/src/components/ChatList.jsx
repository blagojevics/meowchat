import React, { useState, useEffect } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Badge,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Fab,
  Menu,
  MenuItem,
  Divider,
  AppBar,
  Toolbar,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Search,
  Add,
  MoreVert,
  Group,
  Person,
  Logout,
} from "@mui/icons-material";
import { format, isToday, isYesterday } from "date-fns";
import { useChats } from "../hooks/useChat";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import CreateChatDialog from "./CreateChatDialog";
import ThemeToggle from "./ThemeToggle";
import meowchattLogo from "../assets/meowchatt.png";

const ChatList = ({ selectedChatId, onChatSelect, isMobile = false }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);

  const theme = useTheme();
  const isMobileDevice = useMediaQuery(theme.breakpoints.down("md"));
  const shouldUseMobileLayout = isMobile || isMobileDevice;

  const { chats, loading, createChat, refreshChats } = useChats();
  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();

  const handleChatCreated = (newChat) => {
    setShowCreateDialog(false);
    refreshChats(); // Refresh the chat list
    onChatSelect(newChat._id); // Select the new chat
  };

  // Filter chats based on search term
  const filteredChats = chats.filter((chat) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();

    // For group chats, search by chat name
    if (chat.type === "group") {
      return chat.name?.toLowerCase().includes(searchLower);
    }

    // For private chats, search by other participant's username
    const otherParticipant = chat.participants.find(
      (p) => p.user._id !== user._id
    );

    return otherParticipant?.user.username.toLowerCase().includes(searchLower);
  });

  const formatMessageTime = (date) => {
    const messageDate = new Date(date);

    if (isToday(messageDate)) {
      return format(messageDate, "HH:mm");
    }

    if (isYesterday(messageDate)) {
      return "Yesterday";
    }

    return format(messageDate, "MMM dd");
  };

  const getChatDisplayName = (chat) => {
    if (chat.type === "group") {
      return chat.name || "Group Chat";
    }

    const otherParticipant = chat.participants.find(
      (p) => p.user._id !== user._id
    );

    return otherParticipant?.user.username || "Unknown User";
  };

  const getChatAvatar = (chat) => {
    if (chat.type === "group") {
      return chat.chatImage || "";
    }

    const otherParticipant = chat.participants.find(
      (p) => p.user._id !== user._id
    );

    return otherParticipant?.user.profilePicture || "";
  };

  const isUserOnline = (chat) => {
    if (chat.type === "group") return false;

    const otherParticipant = chat.participants.find(
      (p) => p.user._id !== user._id
    );

    return otherParticipant && onlineUsers.has(otherParticipant.user._id);
  };

  const handleCreateChat = () => {
    setShowCreateDialog(true);
  };

  const handleMenuOpen = (event) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  if (loading && chats.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <Typography>Loading chats...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
      }}
    >
      {/* Mobile Header */}
      {shouldUseMobileLayout ? (
        <Box sx={{ bgcolor: "background.paper" }}>
          {/* Top Header with Logo */}
          <AppBar
            position="static"
            elevation={0}
            sx={{
              bgcolor: "background.paper",
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Toolbar
              sx={{
                px: 2,
                minHeight: "56px !important",
                justifyContent: "center",
              }}
            >
              <Box
                component="img"
                src={meowchattLogo}
                alt="MeowChat"
                sx={{
                  height: 36,
                  width: "auto",
                  filter:
                    theme.palette.mode === "dark"
                      ? "brightness(0) invert(1)"
                      : "none",
                }}
              />
            </Toolbar>
          </AppBar>

          {/* User Info Section */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: 1,
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Avatar
              src={user?.profilePicture}
              sx={{
                mr: 2,
                width: 40,
                height: 40,
                bgcolor: "primary.main",
              }}
            >
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 500,
                  fontSize: "1rem",
                  color: "text.primary",
                  lineHeight: 1.2,
                }}
              >
                {user?.username}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  fontSize: "0.85rem",
                  lineHeight: 1.2,
                }}
              >
                {user?.bio || "Available"}
              </Typography>
            </Box>
            <ThemeToggle size="small" />
            <IconButton color="inherit" size="small" onClick={handleCreateChat}>
              <Add />
            </IconButton>
            <IconButton color="inherit" size="small" onClick={handleMenuOpen}>
              <MoreVert />
            </IconButton>
          </Box>
        </Box>
      ) : (
        /* Desktop Header */
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Avatar
              src={user?.profilePicture}
              sx={{ mr: 2, bgcolor: "primary.main" }}
            >
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                {user?.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.bio || "Available"}
              </Typography>
            </Box>
            <ThemeToggle size="small" />
            <IconButton onClick={handleMenuOpen}>
              <MoreVert />
            </IconButton>
          </Box>

          {/* Desktop Search and Add */}
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <IconButton
              onClick={handleCreateChat}
              sx={{
                bgcolor: "primary.main",
                color: "white",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              <Add />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Mobile Search Bar */}
      {shouldUseMobileLayout && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: "background.paper",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Search or start new chat"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "background.default",
                borderRadius: 2,
                "& fieldset": {
                  borderColor: "divider",
                },
                "&:hover fieldset": {
                  borderColor: "text.secondary",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "primary.main",
                },
              },
              "& .MuiInputBase-input": {
                fontSize: "0.95rem",
              },
            }}
          />
        </Box>
      )}

      {/* Chat List */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: "auto",
          bgcolor: "background.paper",
        }}
      >
        {filteredChats.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography color="text.secondary">
              {searchTerm ? "No chats found" : "No chats yet"}
            </Typography>
            {!searchTerm && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateChat}
                sx={{
                  mt: 2,
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                Start Chat
              </Button>
            )}
          </Box>
        ) : (
          <List disablePadding>
            {filteredChats.map((chat) => (
              <ListItem
                key={chat._id}
                button
                selected={selectedChatId === chat._id}
                onClick={() => onChatSelect(chat._id)}
                sx={{
                  px: shouldUseMobileLayout ? 2 : 2,
                  py: shouldUseMobileLayout ? 1.5 : 1,
                  borderBottom: 1,
                  borderColor: "divider",
                  "&.Mui-selected": {
                    bgcolor: "action.selected",
                  },
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <ListItemAvatar>
                  <Badge
                    variant="dot"
                    color="success"
                    invisible={!isUserOnline(chat)}
                    anchorOrigin={{
                      vertical: "bottom",
                      horizontal: "right",
                    }}
                  >
                    <Avatar
                      src={getChatAvatar(chat)}
                      sx={{
                        width: shouldUseMobileLayout ? 50 : 40,
                        height: shouldUseMobileLayout ? 50 : 40,
                        bgcolor: "primary.main",
                      }}
                    >
                      {chat.type === "group" ? (
                        <Group />
                      ) : (
                        getChatDisplayName(chat)[0]?.toUpperCase()
                      )}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>

                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        fontWeight="medium"
                        sx={{
                          fontSize: shouldUseMobileLayout ? "1rem" : "0.95rem",
                          color: "text.primary",
                        }}
                      >
                        {getChatDisplayName(chat)}
                      </Typography>
                      {chat.lastActivity && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontSize: shouldUseMobileLayout
                              ? "0.75rem"
                              : "0.7rem",
                            ml: 1,
                          }}
                        >
                          {formatMessageTime(chat.lastActivity)}
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.5,
                        fontSize: shouldUseMobileLayout ? "0.85rem" : "0.8rem",
                        lineHeight: 1.2,
                      }}
                      noWrap
                    >
                      {chat.lastMessage?.content || "No messages yet"}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Create Chat Dialog */}
      <CreateChatDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onChatCreated={handleChatCreated}
      />
    </Box>
  );
};

export default ChatList;
