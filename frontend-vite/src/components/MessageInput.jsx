import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  InputAdornment,
  Tooltip,
  Popover,
  Grid,
} from '@mui/material';
import {
  Send,
  EmojiEmotions,
  AttachFile,
  Image,
} from '@mui/icons-material';
import EmojiPicker from 'emoji-picker-react';
import { useSocket } from '../contexts/SocketContext';

const MessageInput = ({ chatId, onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { startTyping, stopTyping } = useSocket();

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

  const handleSendMessage = () => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage || !chatId) return;

    // Stop typing indicator
    handleTypingStop();

    // Send message
    onSendMessage({
      content: trimmedMessage,
      type: 'text'
    });

    // Clear input
    setMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
    setEmojiAnchor(null);
    
    // Focus back on input
    setTimeout(() => {
      document.getElementById('message-input')?.focus();
    }, 100);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // TODO: Implement file upload
    console.log('File upload:', file);
    
    // Reset file input
    event.target.value = '';
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // TODO: Implement image upload
    console.log('Image upload:', file);
    
    // Reset file input
    event.target.value = '';
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 2, 
        borderTop: 1, 
        borderColor: 'divider',
        borderRadius: 0
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        {/* File Upload Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
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
                  >
                    <EmojiEmotions />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
            },
          }}
        />

        {/* Send Button */}
        <Tooltip title="Send Message">
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!message.trim()}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
              '&.Mui-disabled': {
                bgcolor: 'action.disabled',
                color: 'action.disabled',
              },
            }}
          >
            <Send />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Emoji Picker Popover */}
      <Popover
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
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
        style={{ display: 'none' }}
        accept="*/*"
      />
      
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageUpload}
        style={{ display: 'none' }}
        accept="image/*"
      />
    </Paper>
  );
};

export default MessageInput;