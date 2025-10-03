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

const UserList = ({ chatId, selectedUserId, onClose }) => {
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
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: "0.75rem" }}
                        >
                          {(() => {
                            if (isOnline) return "Online";

                            if (chatUser.lastSeen) {
                              const lastSeen = new Date(chatUser.lastSeen);
                              const now = new Date();
                              const diffInMinutes = Math.floor(
                                (now - lastSeen) / (1000 * 60)
                              );

                              if (diffInMinutes < 1)
                                return "Last seen just now";
                              if (diffInMinutes < 60)
                                return `Last seen ${diffInMinutes}m ago`;
                              if (diffInMinutes < 1440)
                                return `Last seen ${Math.floor(
                                  diffInMinutes / 60
                                )}h ago`;
                              if (diffInMinutes < 10080)
                                return `Last seen ${Math.floor(
                                  diffInMinutes / 1440
                                )}d ago`;
                              return "Last seen long ago";
                            }

                            return "Offline";
                          })()}
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

  // Show current user's profile info
  const getChatInfo = () => {
    if (!chat) {
      return {
        title: "Loading...",
        subtitle: "",
        avatar: "",
        icon: <Person />,
      };
    }

    // If a specific user is selected (in group chat), show that user
    if (selectedUserId && chat.type === "group") {
      const selectedParticipant = chat.participants.find((p) => {
        const participantId = typeof p.user === "object" ? p.user._id : p.user;
        return participantId.toString() === selectedUserId.toString();
      });

      if (selectedParticipant) {
        const userObj =
          typeof selectedParticipant.user === "object"
            ? selectedParticipant.user
            : null;

        const isOnline = userObj ? onlineUsers.has(userObj._id) : false;

        let subtitle = "Offline";
        if (isOnline) {
          subtitle = "Online";
        } else if (userObj?.lastSeen) {
          const lastSeen = new Date(userObj.lastSeen);
          const now = new Date();
          const diffInMinutes = Math.floor((now - lastSeen) / (1000 * 60));

          if (diffInMinutes < 1) subtitle = "Last seen just now";
          else if (diffInMinutes < 60)
            subtitle = `Last seen ${diffInMinutes}m ago`;
          else if (diffInMinutes < 1440)
            subtitle = `Last seen ${Math.floor(diffInMinutes / 60)}h ago`;
          else if (diffInMinutes < 10080)
            subtitle = `Last seen ${Math.floor(diffInMinutes / 1440)}d ago`;
          else subtitle = "Last seen long ago";
        }

        return {
          title: userObj?.username || "User",
          subtitle,
          avatar: userObj?.profilePicture,
          icon: <Person />,
          isGroupMember: true,
        };
      }
    }

    if (chat.type === "group") {
      return {
        title: chat.name || "Group Chat",
        subtitle: `${chat.participants.length} members`,
        avatar: chat.chatImage,
        icon: <Group />,
      };
    }

    // Show the OTHER participant's information
    const otherParticipant = chat.participants.find((p) => {
      const participantId = typeof p.user === "object" ? p.user._id : p.user;
      return participantId.toString() !== user._id.toString();
    });

    if (!otherParticipant) {
      return {
        title: "Unknown User",
        subtitle: "Offline",
        avatar: "",
        icon: <Person />,
      };
    }

    const userObj =
      typeof otherParticipant.user === "object" ? otherParticipant.user : null;

    const isOnline = userObj ? onlineUsers.has(userObj._id) : false;

    let subtitle = "Offline";
    if (isOnline) {
      subtitle = "Online";
    } else if (userObj?.lastSeen) {
      const lastSeen = new Date(userObj.lastSeen);
      const now = new Date();
      const diffInMinutes = Math.floor((now - lastSeen) / (1000 * 60));

      if (diffInMinutes < 1) subtitle = "Last seen just now";
      else if (diffInMinutes < 60) subtitle = `Last seen ${diffInMinutes}m ago`;
      else if (diffInMinutes < 1440)
        subtitle = `Last seen ${Math.floor(diffInMinutes / 60)}h ago`;
      else if (diffInMinutes < 10080)
        subtitle = `Last seen ${Math.floor(diffInMinutes / 1440)}d ago`;
      else subtitle = "Last seen long ago";
    }

    return {
      title: userObj?.username || "User",
      subtitle,
      avatar: userObj?.profilePicture,
      icon: <Person />,
    };
  };

  const chatInfo = getChatInfo();

  // Show loading state
  if (!chat && chatId) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {chatInfo.isGroupMember ? "User Info" : "Chat Info"}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>

        {/* User Avatar and Info */}
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
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: "0.8rem" }}
          >
            {chatInfo.subtitle}
          </Typography>
        </Box>
      </Box>

      {/* User Details */}
      <Box sx={{ flexGrow: 1, p: 2 }}>
        {chat &&
          chat.type === "private" &&
          (() => {
            const otherParticipant = chat.participants.find(
              (p) => p.user._id !== user._id
            );

            if (!otherParticipant) return null;

            const isOnline = onlineUsers.has(otherParticipant.user._id);

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

                <Typography variant="subtitle2" gutterBottom>
                  Email
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {otherParticipant.user.email || "Not provided"}
                </Typography>

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

        {chat && chat.type === "group" && (
          <Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              Description
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {chat.description || "No description"}
            </Typography>
            <Typography variant="subtitle2" gutterBottom>
              Members
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {chat.participants.length} members
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default UserList;
