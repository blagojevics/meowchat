import React, { useState } from 'react';
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
} from '@mui/material';
import {
  MoreVert,
  Edit,
  Delete,
  Reply,
  EmojiEmotions,
} from '@mui/icons-material';
import { format, isToday, isYesterday } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const Message = ({ message, showAvatar, isOwn }) => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const { user } = useAuth();
  const { addReaction } = useSocket();

  const formatMessageTime = (date) => {
    const messageDate = new Date(date);
    
    if (isToday(messageDate)) {
      return format(messageDate, 'HH:mm');
    }
    
    if (isYesterday(messageDate)) {
      return `Yesterday ${format(messageDate, 'HH:mm')}`;
    }
    
    return format(messageDate, 'MMM dd, HH:mm');
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
    // TODO: Implement message editing
    console.log('Edit message:', message._id);
    handleMenuClose();
  };

  const handleDelete = () => {
    // TODO: Implement message deletion
    console.log('Delete message:', message._id);
    handleMenuClose();
  };

  const handleReply = () => {
    // TODO: Implement message reply
    console.log('Reply to message:', message._id);
    handleMenuClose();
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
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
        {Object.entries(reactionGroups).map(([emoji, reactions]) => {
          const userReacted = reactions.some(r => r.user === user._id);
          
          return (
            <Chip
              key={emoji}
              label={`${emoji} ${reactions.length}`}
              size="small"
              variant={userReacted ? 'filled' : 'outlined'}
              color={userReacted ? 'primary' : 'default'}
              onClick={() => handleReaction(emoji)}
              sx={{
                height: 24,
                fontSize: '0.75rem',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: userReacted ? 'primary.dark' : 'action.hover',
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
        <Typography
          variant="body2"
          color="text.secondary"
          fontStyle="italic"
        >
          This message was deleted
        </Typography>
      );
    }

    switch (message.type) {
      case 'image':
        return (
          <Box>
            {message.image && (
              <img
                src={message.image.url}
                alt="Shared image"
                style={{
                  maxWidth: '100%',
                  maxHeight: 300,
                  borderRadius: 8,
                  marginBottom: message.content ? 8 : 0,
                }}
              />
            )}
            {message.content && (
              <Typography variant="body1">{message.content}</Typography>
            )}
          </Box>
        );
      
      case 'file':
        return (
          <Box>
            {message.file && (
              <Paper
                variant="outlined"
                sx={{ p: 1, mb: message.content ? 1 : 0, display: 'inline-block' }}
              >
                <Typography variant="body2">
                  📎 {message.file.filename}
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
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Typography>
        );
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        px: 2,
        py: showAvatar ? 1 : 0.25,
        '&:hover .message-actions': {
          opacity: 1,
        },
      }}
    >
      {/* Avatar */}
      <Box sx={{ width: 40, mr: isOwn ? 0 : 1, ml: isOwn ? 1 : 0 }}>
        {showAvatar && !isOwn && (
          <Avatar
            src={message.sender.profilePicture}
            sx={{ width: 32, height: 32 }}
          >
            {message.sender.username[0]?.toUpperCase()}
          </Avatar>
        )}
      </Box>

      {/* Message Content */}
      <Box
        sx={{
          maxWidth: '70%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isOwn ? 'flex-end' : 'flex-start',
        }}
      >
        {/* Sender Name and Time (for group chats or when showing avatar) */}
        {showAvatar && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 0.5,
              flexDirection: isOwn ? 'row-reverse' : 'row',
            }}
          >
            <Typography variant="caption" fontWeight="bold" color="text.secondary">
              {isOwn ? 'You' : message.sender.username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatMessageTime(message.createdAt)}
            </Typography>
          </Box>
        )}

        {/* Message Bubble */}
        <Paper
          elevation={1}
          sx={{
            p: 1.5,
            bgcolor: isOwn ? 'primary.main' : 'background.paper',
            color: isOwn ? 'primary.contrastText' : 'text.primary',
            borderRadius: 2,
            borderTopLeftRadius: isOwn || !showAvatar ? 2 : 0.5,
            borderTopRightRadius: !isOwn || !showAvatar ? 2 : 0.5,
            position: 'relative',
            wordBreak: 'break-word',
          }}
        >
          {/* Reply Preview */}
          {message.replyTo && (
            <Box
              sx={{
                borderLeft: 3,
                borderColor: isOwn ? 'primary.light' : 'primary.main',
                pl: 1,
                mb: 1,
                opacity: 0.7,
              }}
            >
              <Typography variant="caption" display="block">
                Replying to {message.replyTo.sender?.username || 'Unknown'}
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
              color={isOwn ? 'primary.light' : 'text.secondary'}
              sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}
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
              position: 'absolute',
              top: -8,
              right: isOwn ? 'auto' : -8,
              left: isOwn ? -8 : 'auto',
              opacity: 0,
              transition: 'opacity 0.2s',
              bgcolor: 'background.paper',
              boxShadow: 1,
              '&:hover': {
                bgcolor: 'action.hover',
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
        <MenuItem onClick={() => handleReaction('👍')}>
          <EmojiEmotions sx={{ mr: 1 }} />
          👍
        </MenuItem>
        <MenuItem onClick={() => handleReaction('❤️')}>
          <EmojiEmotions sx={{ mr: 1 }} />
          ❤️
        </MenuItem>
        <MenuItem onClick={() => handleReaction('😊')}>
          <EmojiEmotions sx={{ mr: 1 }} />
          😊
        </MenuItem>
        <MenuItem onClick={handleReply}>
          <Reply sx={{ mr: 1 }} />
          Reply
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
    </Box>
  );
};

export default Message;