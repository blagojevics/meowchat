import React, { useState } from "react";
import {
  Box,
  Avatar,
  Typography,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Tooltip,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  DialogActions,
  Button,
} from "@mui/material";
import {
  MoreVert,
  Edit,
  Delete,
  Reply,
  EmojiEmotions,
  ContentCopy,
  Forward,
} from "@mui/icons-material";
import { format, isToday, isYesterday } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";

const Message = ({
  message,
  showAvatar,
  isOwn,
  onEdit,
  onDelete,
  onReply,
  onUserClick,
  chatType,
  isMobile = false,
}) => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { user } = useAuth();
  const { addReaction } = useSocket();

  const formatMessageTime = (date) => {
    const messageDate = new Date(date);

    if (isToday(messageDate)) {
      return format(messageDate, "HH:mm");
    }

    if (isYesterday(messageDate)) {
      return `Yesterday ${format(messageDate, "HH:mm")}`;
    }

    return format(messageDate, "MMM dd, HH:mm");
  };

  const handleMenuOpen = (event) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleReaction = (emoji) => {
    addReaction(message._id, emoji);
    handleMenuClose();
  };

  const handleEdit = () => {
    handleMenuClose();
    if (onEdit) {
      onEdit(message);
    }
  };

  const handleDelete = () => {
    handleMenuClose();
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    setDeleteConfirmOpen(false);
    if (onDelete) {
      await onDelete(message._id);
    }
  };

  const handleReply = () => {
    handleMenuClose();
    if (onReply) {
      onReply(message);
    }
  };

  const handleCopy = () => {
    handleMenuClose();
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      // TODO: Show snackbar confirmation
    }
  };

  const handleForward = () => {
    handleMenuClose();
    // TODO: Implement forward functionality
    if (onForward) {
      onForward(message);
    }
  };

  const renderReactions = () => {
    if (!message.reactions || message.reactions.length === 0) return null;

    // Group reactions by emoji
    const reactionGroups = message.reactions.reduce((groups, reaction) => {
      const emoji = reaction.emoji;
      if (!groups[emoji]) {
        groups[emoji] = [];
      }
      groups[emoji].push(reaction);
      return groups;
    }, {});

    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
        {Object.entries(reactionGroups).map(([emoji, reactions]) => {
          const userReacted = reactions.some((r) => r.user === user._id);

          return (
            <Chip
              key={emoji}
              label={`${emoji} ${reactions.length}`}
              size="small"
              variant={userReacted ? "filled" : "outlined"}
              color={userReacted ? "primary" : "default"}
              onClick={() => handleReaction(emoji)}
              sx={{
                height: 24,
                fontSize: "0.75rem",
                cursor: "pointer",
                "&:hover": {
                  bgcolor: userReacted ? "primary.dark" : "action.hover",
                },
              }}
            />
          );
        })}
      </Box>
    );
  };

  const renderMessageContent = () => {
    if (message.isDeleted) {
      return (
        <Typography variant="body2" color="text.secondary" fontStyle="italic">
          This message was deleted
        </Typography>
      );
    }

    switch (message.type) {
      case "image":
        return (
          <Box>
            {message.image && (
              <Box
                onClick={() => setImageDialogOpen(true)}
                sx={{
                  cursor: "pointer",
                  position: "relative",
                  "&:hover": {
                    opacity: 0.9,
                  },
                }}
              >
                <img
                  src={
                    message.image.url.startsWith("http")
                      ? message.image.url
                      : `http://localhost:5000${message.image.url}`
                  }
                  alt="Shared image"
                  style={{
                    maxWidth: "100%",
                    maxHeight: 300,
                    borderRadius: 8,
                    marginBottom: message.content ? 8 : 0,
                    display: "block",
                  }}
                />
              </Box>
            )}
            {message.content && (
              <Typography variant="body1">{message.content}</Typography>
            )}
          </Box>
        );

      case "file":
        return (
          <Box>
            {message.file && (
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  mb: message.content ? 1 : 0,
                  display: "inline-block",
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
                onClick={() => {
                  // Download the file
                  const fileUrl = message.file.url.startsWith("http")
                    ? message.file.url
                    : `http://localhost:5000${message.file.url}`;
                  window.open(fileUrl, "_blank");
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  📎 {message.file.filename}
                  <Typography variant="caption" color="text.secondary">
                    ({(message.file.size / 1024).toFixed(2)} KB)
                  </Typography>
                </Typography>
              </Paper>
            )}
            {message.content && (
              <Typography variant="body1">{message.content}</Typography>
            )}
          </Box>
        );

      default:
        return (
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
            {message.content}
          </Typography>
        );
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isOwn ? "row-reverse" : "row",
        alignItems: "flex-start",
        px: isMobile ? 1 : 2,
        py: showAvatar ? (isMobile ? 0.75 : 1) : isMobile ? 0.125 : 0.25,
        "&:hover .message-actions": {
          opacity: 1,
        },
      }}
    >
      {/* Avatar */}
      <Box
        sx={{ width: isMobile ? 32 : 40, mr: isOwn ? 0 : 1, ml: isOwn ? 1 : 0 }}
      >
        {showAvatar && !isOwn && (
          <Avatar
            src={message.sender.profilePicture}
            sx={{
              width: isMobile ? 28 : 32,
              height: isMobile ? 28 : 32,
              cursor:
                chatType === "group" && onUserClick ? "pointer" : "default",
              "&:hover":
                chatType === "group" && onUserClick
                  ? {
                      opacity: 0.8,
                      transform: "scale(1.05)",
                      transition: "all 0.2s",
                    }
                  : {},
            }}
            onClick={() => {
              if (chatType === "group" && onUserClick && message.sender?._id) {
                onUserClick(message.sender._id);
              }
            }}
          >
            {message.sender.username[0]?.toUpperCase()}
          </Avatar>
        )}
      </Box>

      {/* Message Content */}
      <Box
        sx={{
          maxWidth: isMobile ? "85%" : "70%",
          display: "flex",
          flexDirection: "column",
          alignItems: isOwn ? "flex-end" : "flex-start",
        }}
      >
        {/* Sender Name and Time (for group chats or when showing avatar) */}
        {showAvatar && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 0.5,
              flexDirection: isOwn ? "row-reverse" : "row",
            }}
          >
            <Typography
              variant="caption"
              fontWeight="bold"
              color="text.secondary"
              sx={{
                cursor:
                  !isOwn && chatType === "group" && onUserClick
                    ? "pointer"
                    : "default",
                "&:hover":
                  !isOwn && chatType === "group" && onUserClick
                    ? {
                        textDecoration: "underline",
                      }
                    : {},
              }}
              onClick={() => {
                if (
                  !isOwn &&
                  chatType === "group" &&
                  onUserClick &&
                  message.sender?._id
                ) {
                  onUserClick(message.sender._id);
                }
              }}
            >
              {isOwn ? "You" : message.sender.username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatMessageTime(message.createdAt)}
            </Typography>
          </Box>
        )}

        {/* Message Bubble */}
        <Paper
          elevation={isMobile ? 0 : 1}
          sx={{
            p: isMobile ? 1.25 : 1.5,
            bgcolor: isOwn ? "primary.main" : "background.paper",
            color: isOwn ? "primary.contrastText" : "text.primary",
            borderRadius: isMobile ? 3 : 2,
            borderTopLeftRadius:
              isOwn || !showAvatar ? (isMobile ? 3 : 2) : isMobile ? 1 : 0.5,
            borderTopRightRadius:
              !isOwn || !showAvatar ? (isMobile ? 3 : 2) : isMobile ? 1 : 0.5,
            position: "relative",
            wordBreak: "break-word",
            maxWidth: "100%",
            border: isMobile ? "1px solid rgba(0,0,0,0.08)" : "none",
            boxShadow: isMobile
              ? "0 1px 0.5px rgba(0,0,0,0.13)"
              : "0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)",
          }}
        >
          {/* Reply Preview */}
          {message.replyTo && (
            <Box
              sx={{
                borderLeft: 3,
                borderColor: isOwn ? "primary.light" : "primary.main",
                pl: 1,
                mb: 1,
                opacity: 0.7,
              }}
            >
              <Typography variant="caption" display="block">
                Replying to {message.replyTo.sender?.username || "Unknown"}
              </Typography>
              <Typography variant="body2" noWrap>
                {message.replyTo.content}
              </Typography>
            </Box>
          )}

          {/* Message Content */}
          {renderMessageContent()}

          {/* Edited Indicator */}
          {message.edited?.isEdited && (
            <Typography
              variant="caption"
              color={isOwn ? "primary.light" : "text.secondary"}
              sx={{ display: "block", mt: 0.5, fontStyle: "italic" }}
            >
              (edited)
            </Typography>
          )}

          {/* Message Actions */}
          <IconButton
            className="message-actions"
            size="small"
            onClick={handleMenuOpen}
            sx={{
              position: "absolute",
              top: -8,
              right: isOwn ? "auto" : -8,
              left: isOwn ? -8 : "auto",
              opacity: 0,
              transition: "opacity 0.2s",
              bgcolor: "background.paper",
              boxShadow: 1,
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Paper>

        {/* Reactions */}
        {renderReactions()}
      </Box>

      {/* Message Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { minWidth: 120 },
        }}
      >
        <MenuItem onClick={() => handleReaction("👍")}>
          <EmojiEmotions sx={{ mr: 1 }} />
          👍
        </MenuItem>
        <MenuItem onClick={() => handleReaction("❤️")}>
          <EmojiEmotions sx={{ mr: 1 }} />
          ❤️
        </MenuItem>
        <MenuItem onClick={() => handleReaction("😊")}>
          <EmojiEmotions sx={{ mr: 1 }} />
          😊
        </MenuItem>
        <MenuItem onClick={handleReply}>
          <Reply sx={{ mr: 1 }} />
          Reply
        </MenuItem>
        <MenuItem onClick={handleCopy}>
          <ContentCopy sx={{ mr: 1 }} />
          Copy
        </MenuItem>
        <MenuItem onClick={handleForward}>
          <Forward sx={{ mr: 1 }} />
          Forward
        </MenuItem>
        {isOwn && (
          <>
            <MenuItem onClick={handleEdit}>
              <Edit sx={{ mr: 1 }} />
              Edit
            </MenuItem>
            <MenuItem onClick={handleDelete}>
              <Delete sx={{ mr: 1 }} />
              Delete
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Image Lightbox Dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent sx={{ p: 0, bgcolor: "black" }}>
          {message.image && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 400,
              }}
            >
              <img
                src={
                  message.image.url.startsWith("http")
                    ? message.image.url
                    : `http://localhost:5000${message.image.url}`
                }
                alt="Full size"
                style={{
                  maxWidth: "100%",
                  maxHeight: "80vh",
                  objectFit: "contain",
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialogOpen(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Message?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this message? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Message;
