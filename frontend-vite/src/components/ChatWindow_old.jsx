import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  IconButton,
  Divider,
  Chip,
} from '@mui/material';
import {
  Info,
  MoreVert,
  Group,
  Person,
} from '@mui/icons-material';
import InfiniteScroll from 'react-infinite-scroll-component';
import MessageInput from './MessageInput';
import Message from './Message';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const ChatWindow = ({ chatId, onShowUserList }) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  
  const { user } = useAuth();
  const { joinChat, leaveChat, typingUsers } = useSocket();
  const {
    chat,
    messages,
    loading,
    hasMore,
    sendMessage,
    loadMoreMessages,
  } = useChat(chatId);

  // Join/leave chat on mount/unmount
  useEffect(() => {
    if (chatId) {
      joinChat(chatId);
      return () => leaveChat(chatId);
    }
  }, [chatId, joinChat, leaveChat]);

  // Scroll to bottom when new messages arrive or chat changes
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        container.scrollTop = container.scrollHeight;
      }
    };

    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages.length, chatId]); // Scroll when message count changes or chat changes

  // Handle scroll events to determine if we should auto-scroll
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldScrollToBottom(isNearBottom);
  };

  const getChatDisplayName = () => {
    if (!chat) return '';
    
    if (chat.type === 'group') {
      return chat.name || 'Group Chat';
    }
    
    const otherParticipant = chat.participants.find(
      p => p.user._id !== user._id
    );
    
    return otherParticipant?.user.username || 'Unknown User';
  };

  const getChatAvatar = () => {
    if (!chat) return '';
    
    if (chat.type === 'group') {
      return chat.chatImage || '';
    }
    
    const otherParticipant = chat.participants.find(
      p => p.user._id !== user._id
    );
    
    return otherParticipant?.user.profilePicture || '';
  };

  const getTypingIndicator = () => {
    if (!chatId || !typingUsers.has(chatId)) return null;
    
    const typingUserIds = Array.from(typingUsers.get(chatId));
    const typingNames = typingUserIds
      .filter(userId => userId !== user._id)
      .map(userId => {
        const participant = chat?.participants.find(p => p.user._id === userId);
        return participant?.user.username || 'Someone';
      });
    
    if (typingNames.length === 0) return null;
    
    const text = typingNames.length === 1 
      ? `${typingNames[0]} is typing...`
      : `${typingNames.join(', ')} are typing...`;
    
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
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column'
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
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}
      >
        <Typography>Loading chat...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chat Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          borderRadius: 0
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar src={getChatAvatar()} sx={{ mr: 2 }}>
            {chat?.type === 'group' ? (
              <Group />
            ) : (
              getChatDisplayName()[0]?.toUpperCase()
            )}
          </Avatar>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              {getChatDisplayName()}
            </Typography>
            {chat?.type === 'group' && (
              <Typography variant="body2" color="text.secondary">
                {chat.participants.length} members
              </Typography>
            )}
          </Box>

          <IconButton onClick={onShowUserList}>
            <Info />
          </IconButton>
          
          <IconButton>
            <MoreVert />
          </IconButton>
        </Box>
      </Paper>

      {/* Messages Container */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        <Box
          id="messages-container"
          ref={messagesContainerRef}
          onScroll={handleScroll}
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 0'
          }}
        >
          {/* Messages */}
          <InfiniteScroll
            dataLength={messages.length}
            next={loadMoreMessages}
            hasMore={hasMore}
            loader={
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Loading more messages...
                </Typography>
              </Box>
            }
            scrollableTarget="messages-container"
            style={{ 
              display: 'flex', 
              flexDirection: 'column',
              minHeight: '100%'
            }}
          >
          {messages.map((message, index) => {
            const prevMessage = messages[index - 1];
            const showAvatar = !prevMessage || 
              prevMessage.sender._id !== message.sender._id ||
              new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() > 300000; // 5 minutes

            return (
              <Message
                key={message._id}
                message={message}
                showAvatar={showAvatar}
                isOwn={message.sender._id === user._id}
              />
            );
            })}
          </InfiniteScroll>

          {/* Spacer to push content up */}
          <Box sx={{ flex: '1 1 auto', minHeight: '20px' }} />

          {/* Typing Indicator */}
          {getTypingIndicator()}
          
          <div ref={messagesEndRef} />
        </Box>        {messages.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No messages yet. Say hello! 👋
            </Typography>
          </Box>
        )}
      </Box>

      {/* Message Input */}
      <Divider />
      <MessageInput 
        chatId={chatId}
        onSendMessage={sendMessage}
      />
    </Box>
  );
};

export default ChatWindow;