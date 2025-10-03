import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  IconButton,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import {
  Info,
  MoreVert,
  Group,
  Delete,
  Block,
  Report,
  Clear,
} from "@mui/icons-material";
import MessageInput from "./MessageInput";
import Message from "./Message";
import { useChat } from "../hooks/useChat";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";

const ChatWindow = ({
  chatId,
  onToggleUserInfo,
  showUserInfo,
  onUserClick,
}) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [clearChatDialog, setClearChatDialog] = useState(false);
  const [deleteChatDialog, setDeleteChatDialog] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  const { user } = useAuth();
  const { joinChat, leaveChat, typingUsers } = useSocket();
  const {
    chat,
    messages,
    loading,
    sendMessage,
    deleteChat,
    editMessage,
    deleteMessage,
  } = useChat(chatId);

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

  const handleMenuOpen = (event) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleClearChat = () => {
    handleMenuClose();
    setClearChatDialog(true);
  };

  const confirmClearChat = async () => {
    try {
      // Call API to clear all messages
      const response = await fetch(
        `http://localhost:5000/api/messages/chat/${chatId}/clear`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        console.log("Chat cleared:", chatId);
        setClearChatDialog(false);
        // Reload the page to refresh messages
        window.location.reload();
      } else {
        console.error("Failed to clear chat");
      }
    } catch (error) {
      console.error("Error clearing chat:", error);
    }
  };

  const handleDeleteConversation = () => {
    handleMenuClose();
    setDeleteChatDialog(true);
  };

  const confirmDeleteChat = async () => {
    try {
      if (deleteChat) {
        await deleteChat();
        setDeleteChatDialog(false);
        console.log("Chat deleted:", chatId);
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const handleBlockUser = () => {
    handleMenuClose();
    // TODO: Implement block user
    console.log("Block user");
  };

  const handleReportUser = () => {
    handleMenuClose();
    // TODO: Implement report user
    console.log("Block user");
  };

  const handleEditMessage = (message) => {
    setEditingMessage(message);
    setReplyingTo(null);
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      if (deleteMessage) {
        await deleteMessage(messageId);
        console.log("Message deleted:", messageId);
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handleReplyToMessage = (message) => {
    setReplyingTo(message);
    setEditingMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const getChatDisplayName = () => {
    if (!chat) {
      return "";
    }

    if (chat.type === "group") {
      return chat.name || "Group Chat";
    }

    // Show the OTHER participant's name
    const otherParticipant = chat.participants.find((p) => {
      const participantId = typeof p.user === "object" ? p.user._id : p.user;
      return participantId.toString() !== user._id.toString();
    });

    if (!otherParticipant) {
      return "Unknown User";
    }

    const username =
      typeof otherParticipant.user === "object"
        ? otherParticipant.user.username
        : "User";

    return username;
  };

  const getChatAvatar = () => {
    if (!chat) return "";

    if (chat.type === "group") {
      return chat.chatImage || "";
    }

    // Show the OTHER participant's avatar
    const otherParticipant = chat.participants.find((p) => {
      const participantId = typeof p.user === "object" ? p.user._id : p.user;
      return participantId.toString() !== user._id.toString();
    });

    if (!otherParticipant) return "";

    return typeof otherParticipant.user === "object"
      ? otherParticipant.user.profilePicture || ""
      : "";
  };

  const getChatStatus = () => {
    if (!chat) return "";

    if (chat.type === "group") {
      return `${chat.participants.length} members`;
    }

    // Check if other participant is online
    const otherParticipant = chat.participants.find((p) => {
      const participantId = typeof p.user === "object" ? p.user._id : p.user;
      return participantId.toString() !== user._id.toString();
    });

    if (!otherParticipant) return "Offline";

    const userObj =
      typeof otherParticipant.user === "object" ? otherParticipant.user : null;

    const isOnline = userObj?.isOnline || false;
    return isOnline ? "Online" : "Offline";
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
        overflow: "hidden",
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
            {getChatDisplayName()[0]?.toUpperCase()}
          </Avatar>

          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              {getChatDisplayName()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getChatStatus()}
            </Typography>
          </Box>

          <IconButton
            onClick={onToggleUserInfo}
            color={showUserInfo ? "primary" : "default"}
          >
            <Info />
          </IconButton>

          <IconButton onClick={handleMenuOpen}>
            <MoreVert />
          </IconButton>
        </Box>
      </Paper>

      {/* Three-dot Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={handleClearChat}>
          <ListItemIcon>
            <Clear fontSize="small" />
          </ListItemIcon>
          <ListItemText>Clear chat</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteConversation}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete conversation</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleBlockUser}>
          <ListItemIcon>
            <Block fontSize="small" />
          </ListItemIcon>
          <ListItemText>Block</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleReportUser}>
          <ListItemIcon>
            <Report fontSize="small" />
          </ListItemIcon>
          <ListItemText>Report</ListItemText>
        </MenuItem>
      </Menu>

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
          minHeight: 0,
          maxHeight: "100%",
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
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
                onReply={handleReplyToMessage}
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
        <MessageInput
          chatId={chatId}
          onSendMessage={sendMessage}
          editingMessage={editingMessage}
          replyingTo={replyingTo}
          onCancelEdit={handleCancelEdit}
          onCancelReply={handleCancelReply}
          onEdit={editMessage}
        />
      </Box>

      {/* Clear Chat Confirmation Dialog */}
      <Dialog open={clearChatDialog} onClose={() => setClearChatDialog(false)}>
        <DialogTitle>Clear Chat History?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to clear all messages in this chat? This
            action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearChatDialog(false)}>Cancel</Button>
          <Button onClick={confirmClearChat} color="error" variant="contained">
            Clear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Chat Confirmation Dialog */}
      <Dialog
        open={deleteChatDialog}
        onClose={() => setDeleteChatDialog(false)}
      >
        <DialogTitle>Delete Conversation?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this entire conversation? This
            action cannot be undone and will remove all messages permanently.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteChatDialog(false)}>Cancel</Button>
          <Button onClick={confirmDeleteChat} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatWindow;
