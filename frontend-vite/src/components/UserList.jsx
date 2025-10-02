import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  IconButton,
  Divider,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Button,
} from "@mui/material";
import {
  Close,
  Group,
  AdminPanelSettings,
  Person,
  Search,
  Chat,
} from "@mui/icons-material";
import { useChat } from "../hooks/useChat";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import api from "../services/api";

const UserList = ({ chatId, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(!chatId);

  const { chat } = useChat(chatId);
  const { user } = useAuth();
  const { onlineUsers } = useSocket();

  // Load all users when showing all users mode
  useEffect(() => {
    if (showAllUsers) {
      loadAllUsers();
    }
  }, [showAllUsers]);

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/auth/users");
      setAllUsers(response.data.users);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const startChatWithUser = async (userId) => {
    try {
      const response = await api.post("/chats", {
        type: "private",
        participants: [userId],
      });

      // Chat created successfully - could emit an event or callback here
      console.log("Chat created:", response.data.chat);
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (showAllUsers) {
    const filteredUsers = allUsers.filter(
      (u) =>
        !searchTerm ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              All Users
            </Typography>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>

          {/* Search */}
          <TextField
            fullWidth
            size="small"
            placeholder="Search users..."
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
        </Box>

        {/* Users List */}
        <Box sx={{ flexGrow: 1, overflow: "auto" }}>
          <List disablePadding>
            {filteredUsers.map((chatUser) => {
              const isOnline = onlineUsers.has(chatUser._id);

              return (
                <ListItem key={chatUser._id}>
                  <ListItemAvatar>
                    <Badge
                      variant="dot"
                      color="success"
                      invisible={!isOnline}
                      anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "right",
                      }}
                    >
                      <Avatar src={chatUser.profilePicture}>
                        {chatUser.username[0]?.toUpperCase()}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={chatUser.username}
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {isOnline ? "Online" : "Offline"}
                        </Typography>
                        {chatUser.bio && (
                          <Typography
                            variant="caption"
                            display="block"
                            color="text.secondary"
                          >
                            {chatUser.bio}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Chat />}
                    onClick={() => startChatWithUser(chatUser._id)}
                  >
                    Chat
                  </Button>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Box>
    );
  }

  // Original chat participants view
  if (!chat) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const getUserRole = (participant) => {
    return participant.role;
  };

  const getChatInfo = () => {
    if (chat.type === "group") {
      return {
        title: chat.name || "Group Chat",
        subtitle: `${chat.participants.length} members`,
        avatar: chat.chatImage,
        icon: <Group />,
      };
    } else {
      const otherParticipant = chat.participants.find(
        (p) => p.user._id !== user._id
      );

      return {
        title: otherParticipant?.user.username || "Unknown User",
        subtitle: isUserOnline(otherParticipant?.user._id)
          ? "Online"
          : "Offline",
        avatar: otherParticipant?.user.profilePicture,
        icon: <Person />,
      };
    }
  };

  const chatInfo = getChatInfo();

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Chat Info
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>

        {/* Chat Avatar and Info */}
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Avatar
            src={chatInfo.avatar}
            sx={{
              width: 80,
              height: 80,
              mx: "auto",
              mb: 1,
              bgcolor: "primary.main",
            }}
          >
            {chatInfo.avatar ? null : chatInfo.icon}
          </Avatar>
          <Typography variant="h6" fontWeight="bold">
            {chatInfo.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {chatInfo.subtitle}
          </Typography>
        </Box>

        {/* Chat Description (for groups) */}
        {chat.type === "group" && chat.description && (
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
            >
              {chat.description}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Participants List (for group chats) */}
      {chat.type === "group" && (
        <Box sx={{ flexGrow: 1, overflow: "auto" }}>
          <Box sx={{ p: 2, pb: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Members ({chat.participants.length})
            </Typography>
          </Box>

          <List disablePadding>
            {chat.participants.map((participant) => {
              const isOnline = isUserOnline(participant.user._id);
              const isCurrentUser = participant.user._id === user._id;
              const role = getUserRole(participant);

              return (
                <ListItem key={participant.user._id} sx={{ px: 2 }}>
                  <ListItemAvatar>
                    <Badge
                      variant="dot"
                      color="success"
                      invisible={!isOnline}
                      anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "right",
                      }}
                    >
                      <Avatar src={participant.user.profilePicture}>
                        {participant.user.username[0]?.toUpperCase()}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="subtitle2">
                          {participant.user.username}
                          {isCurrentUser && " (You)"}
                        </Typography>
                        {role === "admin" && (
                          <Chip
                            label="Admin"
                            size="small"
                            color="primary"
                            variant="outlined"
                            icon={<AdminPanelSettings />}
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {isOnline ? "Online" : "Offline"}
                        </Typography>
                        {participant.user.bio && (
                          <Typography
                            variant="caption"
                            display="block"
                            color="text.secondary"
                          >
                            {participant.user.bio}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Box>
      )}

      {/* Private Chat User Info */}
      {chat.type === "private" && (
        <Box sx={{ flexGrow: 1, p: 2 }}>
          {(() => {
            const otherParticipant = chat.participants.find(
              (p) => p.user._id !== user._id
            );

            if (!otherParticipant) return null;

            const isOnline = isUserOnline(otherParticipant.user._id);

            return (
              <Box>
                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                  Status
                </Typography>
                <Chip
                  label={isOnline ? "Online" : "Offline"}
                  color={isOnline ? "success" : "default"}
                  variant="outlined"
                  size="small"
                  sx={{ mb: 2 }}
                />

                {otherParticipant.user.bio && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>
                      About
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      paragraph
                    >
                      {otherParticipant.user.bio}
                    </Typography>
                  </>
                )}

                <Typography variant="subtitle2" gutterBottom>
                  Member since
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(otherParticipant.joinedAt).toLocaleDateString()}
                </Typography>
              </Box>
            );
          })()}
        </Box>
      )}
    </Box>
  );
};

export default UserList;
