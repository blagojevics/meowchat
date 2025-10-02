import React from 'react';
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
} from '@mui/material';
import {
  Close,
  Group,
  AdminPanelSettings,
  Person,
} from '@mui/icons-material';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const UserList = ({ chatId, onClose }) => {
  const { chat } = useChat(chatId);
  const { user } = useAuth();
  const { onlineUsers } = useSocket();

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
    if (chat.type === 'group') {
      return {
        title: chat.name || 'Group Chat',
        subtitle: `${chat.participants.length} members`,
        avatar: chat.chatImage,
        icon: <Group />
      };
    } else {
      const otherParticipant = chat.participants.find(
        p => p.user._id !== user._id
      );
      
      return {
        title: otherParticipant?.user.username || 'Unknown User',
        subtitle: isUserOnline(otherParticipant?.user._id) ? 'Online' : 'Offline',
        avatar: otherParticipant?.user.profilePicture,
        icon: <Person />
      };
    }
  };

  const chatInfo = getChatInfo();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Chat Info
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>

        {/* Chat Avatar and Info */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Avatar
            src={chatInfo.avatar}
            sx={{ 
              width: 80, 
              height: 80, 
              mx: 'auto', 
              mb: 1,
              bgcolor: 'primary.main'
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
        {chat.type === 'group' && chat.description && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {chat.description}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Participants List (for group chats) */}
      {chat.type === 'group' && (
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
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
                        vertical: 'bottom',
                        horizontal: 'right',
                      }}
                    >
                      <Avatar src={participant.user.profilePicture}>
                        {participant.user.username[0]?.toUpperCase()}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">
                          {participant.user.username}
                          {isCurrentUser && ' (You)'}
                        </Typography>
                        {role === 'admin' && (
                          <Chip
                            label="Admin"
                            size="small"
                            color="primary"
                            variant="outlined"
                            icon={<AdminPanelSettings />}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {isOnline ? 'Online' : 'Offline'}
                        </Typography>
                        {participant.user.bio && (
                          <Typography variant="caption" display="block" color="text.secondary">
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
      {chat.type === 'private' && (
        <Box sx={{ flexGrow: 1, p: 2 }}>
          {(() => {
            const otherParticipant = chat.participants.find(
              p => p.user._id !== user._id
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
                  label={isOnline ? 'Online' : 'Offline'}
                  color={isOnline ? 'success' : 'default'}
                  variant="outlined"
                  size="small"
                  sx={{ mb: 2 }}
                />

                {otherParticipant.user.bio && (
                  <>
                    <Typography variant="subtitle2" gutterBottom>
                      About
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
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