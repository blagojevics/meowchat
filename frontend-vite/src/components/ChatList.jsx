import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Search,
  Add,
  MoreVert,
  Group,
  Person,
  Logout,
} from '@mui/icons-material';
import { format, isToday, isYesterday } from 'date-fns';
import { useChats } from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const ChatList = ({ selectedChatId, onChatSelect, onShowUserList }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  
  const { chats, loading, createChat } = useChats();
  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();

  // Filter chats based on search term
  const filteredChats = chats.filter(chat => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // For group chats, search by chat name
    if (chat.type === 'group') {
      return chat.name?.toLowerCase().includes(searchLower);
    }
    
    // For private chats, search by other participant's username
    const otherParticipant = chat.participants.find(
      p => p.user._id !== user._id
    );
    
    return otherParticipant?.user.username.toLowerCase().includes(searchLower);
  });

  const formatMessageTime = (date) => {
    const messageDate = new Date(date);
    
    if (isToday(messageDate)) {
      return format(messageDate, 'HH:mm');
    }
    
    if (isYesterday(messageDate)) {
      return 'Yesterday';
    }
    
    return format(messageDate, 'MMM dd');
  };

  const getChatDisplayName = (chat) => {
    if (chat.type === 'group') {
      return chat.name || 'Group Chat';
    }
    
    const otherParticipant = chat.participants.find(
      p => p.user._id !== user._id
    );
    
    return otherParticipant?.user.username || 'Unknown User';
  };

  const getChatAvatar = (chat) => {
    if (chat.type === 'group') {
      return chat.chatImage || '';
    }
    
    const otherParticipant = chat.participants.find(
      p => p.user._id !== user._id
    );
    
    return otherParticipant?.user.profilePicture || '';
  };

  const isUserOnline = (chat) => {
    if (chat.type === 'group') return false;
    
    const otherParticipant = chat.participants.find(
      p => p.user._id !== user._id
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
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography>Loading chats...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar 
            src={user?.profilePicture} 
            sx={{ mr: 2 }}
          >
            {user?.username?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              {user?.username}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.bio || 'Available'}
            </Typography>
          </Box>
          <IconButton onClick={handleMenuOpen}>
            <MoreVert />
          </IconButton>
        </Box>

        {/* Search */}
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
      </Box>

      {/* Chat List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {filteredChats.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {searchTerm ? 'No chats found' : 'No chats yet'}
            </Typography>
            {!searchTerm && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateChat}
                sx={{ mt: 2 }}
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
                  borderBottom: 1,
                  borderColor: 'divider',
                  '&.Mui-selected': {
                    bgcolor: 'action.selected',
                  },
                }}
              >
                <ListItemAvatar>
                  <Badge
                    variant="dot"
                    color="success"
                    invisible={!isUserOnline(chat)}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                  >
                    <Avatar src={getChatAvatar(chat)}>
                      {chat.type === 'group' ? (
                        <Group />
                      ) : (
                        getChatDisplayName(chat)[0]?.toUpperCase()
                      )}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" fontWeight="medium">
                      {getChatDisplayName(chat)}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ flexGrow: 1, mr: 1 }}
                        noWrap
                      >
                        {chat.lastMessage?.content || 'No messages yet'}
                      </Typography>
                      {chat.lastActivity && (
                        <Typography variant="caption" color="text.secondary">
                          {formatMessageTime(chat.lastActivity)}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="create chat"
        onClick={handleCreateChat}
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
        }}
      >
        <Add />
      </Fab>

      {/* Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={onShowUserList}>
          <Person sx={{ mr: 1 }} />
          Online Users
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Create Chat Dialog - Placeholder */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Chat</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Chat creation feature coming soon! This will allow you to search for users and create new private or group chats.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatList;