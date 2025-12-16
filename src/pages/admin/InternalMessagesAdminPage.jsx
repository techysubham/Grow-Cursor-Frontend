import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, List, ListItem, ListItemButton, ListItemText,
  Stack, CircularProgress, Chip, Divider, TextField, InputAdornment,
  Alert, Avatar, ListItemAvatar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PeopleIcon from '@mui/icons-material/People';
import MessageIcon from '@mui/icons-material/Message';
import api from '../../lib/api.js';

export default function InternalMessagesAdminPage() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAllConversations();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadAllConversations();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  async function loadAllConversations() {
    setLoadingConversations(true);
    try {
      const { data } = await api.get('/internal-messages/admin/all-conversations', {
        params: { search: searchQuery }
      });
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }

  async function loadConversation(conversationId) {
    setLoadingMessages(true);
    try {
      const { data } = await api.get(`/internal-messages/admin/conversation/${conversationId}`);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function handleConversationSelect(conversation) {
    setSelectedConversation(conversation);
    await loadConversation(conversation.conversationId);
  }

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 2, bgcolor: '#f5f5f5' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <AdminPanelSettingsIcon sx={{ fontSize: 40, color: 'error.main' }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Internal Messages - Admin Oversight
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View all internal conversations between users (Read-Only)
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Box sx={{ display: 'flex', height: '75vh', gap: 2 }}>
        
        {/* LEFT SIDEBAR: All Conversations */}
        <Paper sx={{ width: 380, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>All Conversations</Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Box>

          <List sx={{ overflow: 'auto', flex: 1 }}>
            {loadingConversations ? (
              <Box display="flex" justifyContent="center" mt={4}>
                <CircularProgress />
              </Box>
            ) : conversations.length === 0 ? (
              <Typography variant="caption" sx={{ p: 3, display: 'block', textAlign: 'center', color: 'text.secondary' }}>
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </Typography>
            ) : (
              conversations.map((conv) => (
                <div key={conv.conversationId}>
                  <ListItem
                    button
                    selected={selectedConversation?.conversationId === conv.conversationId}
                    onClick={() => handleConversationSelect(conv)}
                    alignItems="flex-start"
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'secondary.main' }}>
                        <PeopleIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {conv.user1.username}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">↔</Typography>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {conv.user2.username}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.5}>
                          <Stack direction="row" spacing={0.5}>
                            <Chip label={conv.user1.role} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                            <Chip label={conv.user2.role} size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">
                              {conv.messageCount} messages
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(conv.lastMessageDate).toLocaleDateString()}
                            </Typography>
                          </Stack>
                        </Stack>
                      }
                    />
                  </ListItem>
                  <Divider component="li" />
                </div>
              ))
            )}
          </List>
        </Paper>

        {/* RIGHT: Messages View (Read-Only) */}
        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedConversation ? (
            <>
              {/* Header */}
              <Box sx={{ p: 2, bgcolor: '#fff3e0', borderBottom: 1, borderColor: 'divider' }}>
                <Alert severity="warning" sx={{ mb: 1 }}>
                  <strong>Read-Only Mode:</strong> You are viewing this conversation as an administrator. You cannot send messages.
                </Alert>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                      {selectedConversation.user1.username[0].toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {selectedConversation.user1.username}
                      </Typography>
                      <Chip 
                        label={selectedConversation.user1.role} 
                        size="small" 
                        sx={{ height: 18, fontSize: '0.65rem' }} 
                      />
                    </Box>
                  </Stack>

                  <Typography variant="h6" color="text.secondary">↔</Typography>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                      {selectedConversation.user2.username[0].toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {selectedConversation.user2.username}
                      </Typography>
                      <Chip 
                        label={selectedConversation.user2.role} 
                        size="small" 
                        sx={{ height: 18, fontSize: '0.65rem' }} 
                      />
                    </Box>
                  </Stack>

                  <Box sx={{ flex: 1 }} />

                  <Chip 
                    icon={<MessageIcon />}
                    label={`${selectedConversation.messageCount} messages`}
                    size="small"
                  />
                </Stack>
              </Box>

              {/* Messages Area */}
              <Box sx={{ flex: 1, p: 2, overflowY: 'auto', bgcolor: '#f0f2f5' }}>
                {loadingMessages ? (
                  <Box display="flex" justifyContent="center" mt={4}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {messages.length === 0 && (
                      <Alert severity="info">No messages in this conversation.</Alert>
                    )}

                    {messages.map((msg) => {
                      const isUser1 = msg.sender._id === selectedConversation.user1._id;
                      return (
                        <Box
                          key={msg._id}
                          sx={{
                            alignSelf: isUser1 ? 'flex-start' : 'flex-end',
                            maxWidth: '70%'
                          }}
                        >
                          <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                              {msg.sender.username} ({msg.sender.role})
                            </Typography>
                            <Paper
                              elevation={1}
                              sx={{
                                p: 1.5,
                                bgcolor: isUser1 ? '#e3f2fd' : '#f3e5f5',
                                color: 'text.primary',
                                borderRadius: 2
                              }}
                            >
                              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                {msg.body}
                              </Typography>

                              {/* Attachments */}
                              {msg.mediaUrls && msg.mediaUrls.length > 0 && (
                                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                  {msg.mediaUrls.map((url, idx) => {
                                    const fileName = url.split('/').pop() || 'Attachment';
                                    return (
                                      <Chip
                                        key={idx}
                                        icon={<MessageIcon />}
                                        label={fileName}
                                        onClick={() => window.open(url, '_blank')}
                                        size="small"
                                        sx={{ cursor: 'pointer' }}
                                      />
                                    );
                                  })}
                                </Box>
                              )}
                            </Paper>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ textAlign: isUser1 ? 'left' : 'right' }}
                            >
                              {new Date(msg.messageDate).toLocaleString()}
                            </Typography>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Box>

              {/* Stats Footer */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: '#f5f5f5' }}>
                <Stack direction="row" spacing={3}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Total Messages:</strong> {messages.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>First Message:</strong> {messages[0] ? new Date(messages[0].messageDate).toLocaleString() : 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Last Message:</strong> {messages[messages.length - 1] ? new Date(messages[messages.length - 1].messageDate).toLocaleString() : 'N/A'}
                  </Typography>
                </Stack>
              </Box>
            </>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'text.secondary'
              }}
            >
              <Stack alignItems="center" spacing={2}>
                <AdminPanelSettingsIcon sx={{ fontSize: 60 }} />
                <Typography variant="h6">Select a conversation to view messages</Typography>
              </Stack>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
