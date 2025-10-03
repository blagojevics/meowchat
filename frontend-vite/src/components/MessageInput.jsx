import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  TextField,
  IconButton,
  Paper,
  InputAdornment,
  Tooltip,
  Popover,
  Grid,
  Chip,
  Typography,
} from "@mui/material";
import {
  Send,
  EmojiEmotions,
  AttachFile,
  Image,
  Close,
  Edit as EditIcon,
} from "@mui/icons-material";
import EmojiPicker from "emoji-picker-react";
import { useSocket } from "../contexts/SocketContext";

const MessageInput = ({
  chatId,
  onSendMessage,
  editingMessage,
  replyingTo,
  onCancelEdit,
  onCancelReply,
  onEdit,
  isMobile = false,
}) => {
  const [message, setMessage] = useState("");
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { startTyping, stopTyping } = useSocket();

  // Set message when editing
  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.content);
    }
  }, [editingMessage]);

  // Handle typing indicators
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleTypingStart = () => {
    if (!isTyping && chatId) {
      setIsTyping(true);
      startTyping(chatId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 3000); // Stop typing after 3 seconds of inactivity
  };

  const handleTypingStop = () => {
    if (isTyping && chatId) {
      setIsTyping(false);
      stopTyping(chatId);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleMessageChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    if (value.trim()) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
  };

  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || !chatId) return;

    // Stop typing indicator
    handleTypingStop();

    // Check if editing
    if (editingMessage) {
      if (onEdit) {
        await onEdit(editingMessage._id, trimmedMessage);
        onCancelEdit();
      }
    } else {
      // Send new message (with reply if replying)
      const messageData = {
        content: trimmedMessage,
        type: "text",
      };

      if (replyingTo) {
        messageData.replyTo = replyingTo._id;
      }

      onSendMessage(messageData);

      if (replyingTo && onCancelReply) {
        onCancelReply();
      }
    }

    // Clear input
    setMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setEmojiAnchor(null);

    // Focus back on input
    setTimeout(() => {
      document.getElementById("message-input")?.focus();
    }, 100);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("content", `📎 ${file.name}`);
      formData.append("type", "file");

      // Upload file to backend
      const response = await fetch(
        `http://localhost:5000/api/messages/${chatId}/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("File uploaded successfully:", data);
      } else {
        console.error("File upload failed");
      }
    } catch (error) {
      console.error("File upload error:", error);
    } finally {
      event.target.value = "";
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("content", "");
      formData.append("type", "image");

      // Upload image to backend
      const response = await fetch(
        `http://localhost:5000/api/messages/${chatId}/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Image uploaded successfully:", data);
      } else {
        console.error("Image upload failed");
      }
    } catch (error) {
      console.error("Image upload error:", error);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: isMobile ? 1.5 : 2,
        borderTop: isMobile ? 0 : 1,
        borderColor: "divider",
        borderRadius: 0,
        bgcolor: "background.paper",
      }}
    >
      {/* Edit/Reply Indicator */}
      {(editingMessage || replyingTo) && (
        <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
          {editingMessage && (
            <Chip
              icon={<EditIcon />}
              label={`Editing: ${editingMessage.content.substring(0, 50)}...`}
              onDelete={onCancelEdit}
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
          {replyingTo && (
            <Chip
              label={`Replying to: ${
                replyingTo.sender.username
              } - ${replyingTo.content.substring(0, 40)}...`}
              onDelete={onCancelReply}
              color="secondary"
              variant="outlined"
              size="small"
            />
          )}
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: isMobile ? 0.5 : 1,
        }}
      >
        {/* File Upload Buttons */}
        {!isMobile ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Tooltip title="Attach File">
              <IconButton
                size="small"
                color="primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <AttachFile />
              </IconButton>
            </Tooltip>

            <Tooltip title="Attach Image">
              <IconButton
                size="small"
                color="primary"
                onClick={() => imageInputRef.current?.click()}
              >
                <Image />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          /* Mobile: Show attach button */
          <Tooltip title="Attach">
            <IconButton
              size="small"
              color="primary"
              onClick={() => imageInputRef.current?.click()}
              sx={{
                bgcolor: "action.hover",
                "&:hover": { bgcolor: "action.selected" },
              }}
            >
              <AttachFile />
            </IconButton>
          </Tooltip>
        )}

        {/* Message Input */}
        <TextField
          id="message-input"
          fullWidth
          multiline
          maxRows={4}
          variant="outlined"
          placeholder="Type a message..."
          value={message}
          onChange={handleMessageChange}
          onKeyPress={handleKeyPress}
          onBlur={handleTypingStop}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Emoji">
                  <IconButton
                    onClick={(e) => setEmojiAnchor(e.currentTarget)}
                    edge="end"
                    size={isMobile ? "small" : "medium"}
                  >
                    <EmojiEmotions />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: isMobile ? 3 : 3,
              bgcolor: "background.default",
              "& fieldset": {
                borderColor: isMobile ? "rgba(0,0,0,0.1)" : "divider",
              },
              "&:hover fieldset": {
                borderColor: isMobile ? "rgba(0,0,0,0.2)" : "primary.main",
              },
              "&.Mui-focused fieldset": {
                borderColor: isMobile ? "#075e54" : "primary.main",
              },
            },
            "& .MuiInputBase-input": {
              fontSize: isMobile ? "1rem" : "inherit",
              padding: isMobile ? "12px 14px" : "16.5px 14px",
            },
          }}
        />

        {/* Send/Update Button */}
        <Tooltip title={editingMessage ? "Update Message" : "Send Message"}>
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!message.trim()}
            size={isMobile ? "medium" : "large"}
            sx={{
              bgcolor: editingMessage
                ? "secondary.main"
                : isMobile
                ? "#075e54"
                : "primary.main",
              color: "white",
              width: isMobile ? 40 : 48,
              height: isMobile ? 40 : 48,
              "&:hover": {
                bgcolor: editingMessage
                  ? "secondary.dark"
                  : isMobile
                  ? "#064e45"
                  : "primary.dark",
              },
              "&.Mui-disabled": {
                bgcolor: "action.disabled",
                color: "action.disabled",
              },
            }}
          >
            {editingMessage ? <EditIcon /> : <Send />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Emoji Picker Popover */}
      <Popover
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          disableAutoFocus={true}
          disableSearchBar={false}
          disableSkinTonePicker={false}
          width={350}
          height={400}
        />
      </Popover>

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        style={{ display: "none" }}
        accept="*/*"
      />

      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageUpload}
        style={{ display: "none" }}
        accept="image/*"
      />
    </Paper>
  );
};

export default MessageInput;
