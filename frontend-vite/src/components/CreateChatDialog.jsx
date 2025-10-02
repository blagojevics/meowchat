import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  Checkbox,
  Typography,
  Box,
  Tab,
  Tabs,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Search, Person, Group, Close } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import api from "../services/api";

const CreateChatDialog = ({ open, onClose, onChatCreated }) => {
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [chatName, setChatName] = useState("");
  const [chatDescription, setChatDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const { user } = useAuth();
  const { onlineUsers } = useSocket();

  // Load all users when dialog opens
  useEffect(() => {
    if (open) {
      loadAllUsers();
    }
  }, [open]);

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(allUsers);
    } else {
      const filtered = allUsers.filter(
        (u) =>
          u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, allUsers]);

  const loadAllUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/auth/users");
      setAllUsers(response.data.users);
    } catch (error) {
      console.error("Error loading users:", error);
      setError("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (userId) => {
    setSelectedUsers((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        // For private chats, only allow one user
        if (tabValue === 0) {
          return [userId];
        }
        return [...prev, userId];
      }
    });
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) {
      setError("Please select at least one user");
      return;
    }

    if (tabValue === 1 && !chatName.trim()) {
      setError("Please enter a group name");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const chatData = {
        type: tabValue === 0 ? "private" : "group",
        participants: selectedUsers,
      };

      if (tabValue === 1) {
        chatData.name = chatName.trim();
        chatData.description = chatDescription.trim();
      }

      const response = await api.post("/chats", chatData);

      if (onChatCreated) {
        onChatCreated(response.data.chat);
      }

      handleClose();
    } catch (error) {
      console.error("Error creating chat:", error);
      setError(error.response?.data?.message || "Failed to create chat");
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setTabValue(0);
    setSearchTerm("");
    setSelectedUsers([]);
    setChatName("");
    setChatDescription("");
    setError("");
    onClose();
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const getButtonText = () => {
    if (tabValue === 0) {
      return selectedUsers.length === 1 ? "Start Chat" : "Select User";
    } else {
      return selectedUsers.length > 0
        ? `Create Group (${selectedUsers.length + 1} members)`
        : "Select Members";
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { height: "80vh", maxHeight: 600 },
      }}
    >
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6">Create New Chat</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Chat Type Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => {
              setTabValue(newValue);
              setSelectedUsers([]);
              setError("");
            }}
            variant="fullWidth"
          >
            <Tab icon={<Person />} label="Private Chat" />
            <Tab icon={<Group />} label="Group Chat" />
          </Tabs>
        </Box>

        <Box sx={{ p: 2 }}>
          {/* Group Chat Settings */}
          {tabValue === 1 && (
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label="Group Name"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                margin="dense"
                required
              />
              <TextField
                fullWidth
                label="Description (Optional)"
                value={chatDescription}
                onChange={(e) => setChatDescription(e.target.value)}
                margin="dense"
                multiline
                rows={2}
              />
            </Box>
          )}

          {/* Selected Users Display */}
          {selectedUsers.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Selected ({selectedUsers.length}):
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {selectedUsers.map((userId) => {
                  const selectedUser = allUsers.find((u) => u._id === userId);
                  return selectedUser ? (
                    <Chip
                      key={userId}
                      label={selectedUser.username}
                      onDelete={() => handleUserToggle(userId)}
                      avatar={<Avatar src={selectedUser.profilePicture} />}
                      size="small"
                    />
                  ) : null;
                })}
              </Box>
            </Box>
          )}

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
            sx={{ mb: 2 }}
          />

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Users List */}
          <Box sx={{ maxHeight: 300, overflow: "auto" }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress />
              </Box>
            ) : filteredUsers.length === 0 ? (
              <Box sx={{ textAlign: "center", p: 3 }}>
                <Typography color="text.secondary">
                  {searchTerm ? "No users found" : "No users available"}
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {filteredUsers.map((chatUser) => {
                  const isSelected = selectedUsers.includes(chatUser._id);
                  const isOnline = isUserOnline(chatUser._id);

                  return (
                    <ListItem
                      key={chatUser._id}
                      button
                      onClick={() => handleUserToggle(chatUser._id)}
                      selected={isSelected}
                    >
                      <Checkbox
                        checked={isSelected}
                        tabIndex={-1}
                        disableRipple
                        size="small"
                      />
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
                            >
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
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleCreateChat}
          disabled={
            creating ||
            selectedUsers.length === 0 ||
            (tabValue === 1 && !chatName.trim())
          }
          startIcon={creating ? <CircularProgress size={16} /> : null}
        >
          {creating ? "Creating..." : getButtonText()}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateChatDialog;
