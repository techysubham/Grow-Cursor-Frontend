import { useEffect, useState, useRef } from 'react';
import {
  Box, Paper, Typography, List, ListItem, ListItemButton, ListItemText, ListItemAvatar,
  Avatar, TextField, IconButton, Stack, CircularProgress, Badge, Divider, Chip,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Alert,
  useTheme, useMediaQuery
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import { alpha } from '@mui/material/styles';
import api from '../../lib/api.js';
import { dashboardSignatureTokens } from '../../theme/appTheme.js';
import { BRAND_DARK, BRAND_DARK_ALT, BRAND_DARK_DEEP, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';

export default function InternalMessagesPage() {
  // State
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  // New conversation dialog
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // File attachments
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Refs
  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const loadingConversationIdsRef = useRef(new Set());
  const messageInputRef = useRef(null);

  // Responsive hooks (match BuyerChatPage behavior)
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // < 600px
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 600px - 960px
  const isDesktop = !isMobile && !isTablet;
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);
  const prevIsDesktopRef = useRef(null);
  const cardRadius = dashboardSignatureTokens.radius.card;

  // Sync sidebar state with breakpoints - closed on mobile/tablet, open on desktop
  useEffect(() => {
    if (prevIsDesktopRef.current === null || prevIsDesktopRef.current !== isDesktop) {
      setSidebarOpen(isDesktop);
      prevIsDesktopRef.current = isDesktop;
    }
  }, [isDesktop]);

  // On tablet, keep sidebar closed when viewing a chat
  useEffect(() => {
    if (isTablet && selectedConversation) {
      setSidebarOpen(false);
    }
  }, [isTablet, selectedConversation]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('team-chat-active-conversation', {
      detail: { conversationId: selectedConversation?.conversationId || null }
    }));

    return () => {
      window.dispatchEvent(new CustomEvent('team-chat-active-conversation', {
        detail: { conversationId: null }
      }));
    };
  }, [selectedConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!selectedConversation) return;

    messageInputRef.current?.focus();
  }, [selectedConversation]);

  useEffect(() => {
    const handleTeamChatNotification = (event) => {
      const payload = event.detail || {};
      const isSelectedConversation =
        selectedConversation?.conversationId &&
        payload.conversationId === selectedConversation.conversationId;

      loadConversations(false);

      if (payload.reason === 'messages-read' && isSelectedConversation) {
        return;
      }

      if (isSelectedConversation) {
        loadMessages(selectedConversation.conversationId, false);
      }
    };

    window.addEventListener('team-chat-notification', handleTeamChatNotification);

    return () => {
      window.removeEventListener('team-chat-notification', handleTeamChatNotification);
    };
  }, [selectedConversation]);

  // Polling for new messages
  useEffect(() => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    if (selectedConversation) {
      pollingIntervalRef.current = setInterval(() => {
        loadMessages(selectedConversation.conversationId, false);
      }, 10000); // Poll every 10 seconds
    }

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // API Functions
  async function loadConversations(showLoading = true) {
    if (showLoading) setLoadingConversations(true);
    try {
      const { data } = await api.get('/internal-messages/conversations');
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      if (showLoading) setLoadingConversations(false);
    }
  }

  async function loadMessages(conversationId, showLoading = true) {
    if (!conversationId) return;
    if (loadingConversationIdsRef.current.has(conversationId)) return;

    loadingConversationIdsRef.current.add(conversationId);
    if (showLoading) setLoadingMessages(true);
    try {
      const { data } = await api.get(`/internal-messages/messages/${conversationId}`);
      setMessages(data);

      // Update conversation unread count
      setConversations(prev =>
        prev.map(conv =>
          conv.conversationId === conversationId
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      loadingConversationIdsRef.current.delete(conversationId);
      if (showLoading) setLoadingMessages(false);
    }
  }

  async function handleConversationSelect(conversation) {
    setSelectedConversation(conversation);
    // Close sidebar on mobile and tablet when conversation is selected
    if (isMobile || isTablet) {
      setSidebarOpen(false);
    }
    await loadMessages(conversation.conversationId);
  }

  async function handleSendMessage() {
    if (sending) return;
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!selectedConversation) return;

    setSending(true);
    try {
      const { data } = await api.post('/internal-messages/send', {
        recipientId: selectedConversation.otherUser._id,
        body: newMessage,
        mediaUrls: attachments.map(a => a.url)
      });

      setMessages([...messages, data]);
      setNewMessage('');
      setAttachments([]);
      requestAnimationFrame(() => {
        messageInputRef.current?.focus();
      });

      // Refresh conversations list to update "last message"
      loadConversations(false);
    } catch (err) {
      alert('Failed to send message: ' + (err.response?.data?.error || err.message));
    } finally {
      setSending(false);
    }
  }

  async function searchUsers(query) {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const { data } = await api.get('/internal-messages/search-users', {
        params: { q: query }
      });
      setSearchResults(data);
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setSearchingUsers(false);
    }
  }

  async function startNewConversation() {
    if (!selectedUser) return;

    // Check if conversation already exists
    const existingConv = conversations.find(
      conv => conv.otherUser._id === selectedUser._id
    );

    if (existingConv) {
      // Select existing conversation
      setSelectedConversation(existingConv);
      await loadMessages(existingConv.conversationId);
      setNewChatOpen(false);
      setSelectedUser(null);
      setSearchQuery('');
      return;
    }

    // Create new conversation (virtual)
    const newConv = {
      conversationId: null, // Will be created on first message
      otherUser: selectedUser,
      lastMessage: null,
      lastMessageDate: null,
      unreadCount: 0,
      isNew: true
    };

    setSelectedConversation(newConv);
    setMessages([]);
    setNewChatOpen(false);
    setSelectedUser(null);
    setSearchQuery('');
  }

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadedFiles = data.urls.map((url, idx) => ({
        name: files[idx].name,
        url: url
      }));

      setAttachments([...attachments, ...uploadedFiles]);
    } catch (err) {
      alert('Failed to upload files: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleRemoveAttachment(index) {
    setAttachments(attachments.filter((_, i) => i !== index));
  }

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      height: { xs: '100vh', md: '85vh' },
      gap: { xs: 0, md: 2 },
      position: 'relative',
      p: { xs: 0, md: 1 },
      background: 'linear-gradient(180deg, #f6f8fc 0%, #eef3fb 100%)'
    }}>

      {/* Mobile & Tablet: Backdrop overlay when sidebar is open */}
      {(isMobile || isTablet) && sidebarOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1500,
            display: { xs: 'block', sm: 'block', md: 'none' }
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR: Conversations List */}
      <Paper sx={{
        width: { xs: '100%', sm: sidebarOpen ? '100%' : 0, md: 340 },
        display: { xs: sidebarOpen ? 'flex' : 'none', sm: sidebarOpen ? 'flex' : 'none', md: 'flex' },
        flexDirection: 'column',
        height: { xs: '100%', sm: '100%', md: '100%' },
        position: { xs: 'fixed', sm: 'fixed', md: 'relative' },
        top: { xs: 0, sm: 0, md: 'auto' },
        left: { xs: 0, sm: 0, md: 'auto' },
        zIndex: { xs: 1600, sm: 1600, md: 1 },
        overflow: 'hidden',
        borderRadius: { xs: 0, md: `${cardRadius}px` },
        border: { xs: 'none', md: `1px solid ${alpha(BRAND_DARK, 0.08)}` },
        background: dashboardSignatureTokens.surfaces.pageCard,
        boxShadow: { xs: 3, sm: 3, md: dashboardSignatureTokens.shadows.card }
      }}>
        <Box sx={{
          p: { xs: 1.5, md: 2 },
          background: `linear-gradient(135deg, ${BRAND_DARK_DEEP} 0%, ${BRAND_DARK_ALT} 100%)`,
          borderBottom: `1px solid ${alpha(BRAND_YELLOW, 0.18)}`
        }}>
          {/* Mobile & Tablet: Close button */}
          {(isMobile || isTablet) && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700, color: '#fff8dc' }}>Team Chat</Typography>
              <IconButton
                onClick={() => setSidebarOpen(false)}
                size="small"
                sx={{ color: BRAND_YELLOW }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          )}

          {!isMobile && <Typography variant="h6" sx={{ mb: 1, fontWeight: 800, letterSpacing: '0.02em', color: '#fff8dc' }}>Team Chat</Typography>}
          <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: alpha(BRAND_YELLOW, 0.82), letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Internal messaging
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            fullWidth
            onClick={() => setNewChatOpen(true)}
            sx={{
              minHeight: 42,
              borderRadius: '999px',
              fontWeight: 700,
              color: BRAND_DARK,
              background: `linear-gradient(135deg, ${BRAND_YELLOW} 0%, ${BRAND_YELLOW_DARK} 100%)`,
              boxShadow: '0 10px 24px rgba(245, 200, 66, 0.26)',
              '&:hover': {
                background: `linear-gradient(135deg, ${BRAND_YELLOW} 0%, ${BRAND_YELLOW_DARK} 100%)`,
                boxShadow: '0 14px 28px rgba(245, 200, 66, 0.32)'
              }
            }}
          >
            New Chat
          </Button>
        </Box>

        <List sx={{ overflow: 'auto', flex: 1, px: 1, py: 1.25, background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(247,250,255,0.98) 100%)' }}>
          {loadingConversations ? (
            <Box display="flex" justifyContent="center" mt={4}>
              <CircularProgress sx={{ color: BRAND_YELLOW_DARK }} />
            </Box>
          ) : conversations.length === 0 ? (
            <Typography variant="caption" sx={{ p: 3, display: 'block', textAlign: 'center', color: alpha(BRAND_DARK, 0.62) }}>
              No conversations yet. Start a new chat!
            </Typography>
          ) : (
            conversations.map((conv) => (
              <Box key={conv.conversationId} sx={{ mb: 1 }}>
                <ListItem disablePadding>
                  <ListItemButton
                    selected={selectedConversation?.conversationId === conv.conversationId}
                    onClick={() => handleConversationSelect(conv)}
                    alignItems="flex-start"
                    sx={{
                      borderRadius: 3,
                      px: 1.25,
                      py: 1.1,
                      border: `1px solid ${alpha(BRAND_DARK, selectedConversation?.conversationId === conv.conversationId ? 0.12 : 0.06)}`,
                      background: selectedConversation?.conversationId === conv.conversationId
                        ? `linear-gradient(135deg, ${alpha(BRAND_YELLOW, 0.24)} 0%, ${alpha(BRAND_YELLOW_DARK, 0.14)} 100%)`
                        : 'rgba(255,255,255,0.9)',
                      boxShadow: selectedConversation?.conversationId === conv.conversationId
                        ? '0 14px 28px rgba(245, 200, 66, 0.16)'
                        : 'none',
                      '&:hover': {
                        background: `linear-gradient(135deg, ${alpha(BRAND_YELLOW, 0.18)} 0%, ${alpha(BRAND_YELLOW_DARK, 0.1)} 100%)`
                      },
                      '&.Mui-selected': {
                        background: `linear-gradient(135deg, ${alpha(BRAND_YELLOW, 0.24)} 0%, ${alpha(BRAND_YELLOW_DARK, 0.14)} 100%)`
                      },
                      '&.Mui-selected:hover': {
                        background: `linear-gradient(135deg, ${alpha(BRAND_YELLOW, 0.3)} 0%, ${alpha(BRAND_YELLOW_DARK, 0.16)} 100%)`
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        color="error"
                        badgeContent={conv.unreadCount}
                        sx={{
                          '& .MuiBadge-badge': {
                            fontWeight: 700,
                            minWidth: 18,
                            height: 18,
                            boxShadow: '0 0 0 2px #fff'
                          }
                        }}
                      >
                        <Avatar sx={{ bgcolor: BRAND_DARK, color: BRAND_YELLOW, boxShadow: `0 8px 20px ${alpha(BRAND_DARK, 0.16)}` }}>
                          <PersonIcon />
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" justifyContent="space-between" spacing={1}>
                          <Typography variant="subtitle2" noWrap sx={{ maxWidth: 140, fontWeight: 800, color: BRAND_DARK }}>
                            {conv.otherUser.username}
                          </Typography>
                          {conv.lastMessageDate && (
                            <Typography variant="caption" sx={{ color: alpha(BRAND_DARK, 0.52), whiteSpace: 'nowrap' }}>
                              {new Date(conv.lastMessageDate).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} PT
                            </Typography>
                          )}
                        </Stack>
                      }
                      secondaryTypographyProps={{ component: 'div' }}
                      secondary={
                        <>
                          <Chip
                            label={conv.otherUser.role}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              mb: 0.65,
                              fontWeight: 700,
                              borderRadius: '999px',
                              color: BRAND_DARK,
                              bgcolor: alpha(BRAND_YELLOW, 0.22),
                              border: `1px solid ${alpha(BRAND_YELLOW_DARK, 0.26)}`
                            }}
                          />
                          <Typography variant="body2" noWrap sx={{ fontWeight: conv.unreadCount > 0 ? 700 : 500, color: conv.unreadCount > 0 ? BRAND_DARK : alpha(BRAND_DARK, 0.68) }}>
                            {conv.lastMessage || 'Start a conversation'}
                          </Typography>
                        </>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              </Box>
            ))
          )}
        </List>
      </Paper>

      {/* Button to open sidebar when closed */}
      {!sidebarOpen && !selectedConversation && (
        <Box sx={{ p: 2, width: '100%' }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setSidebarOpen(true)}
          >
            View Conversations
          </Button>
        </Box>
      )}

      {/* RIGHT: Chat Area */}
      <Paper sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        width: { xs: '100%', md: 'auto' },
        height: { xs: '100vh', md: '100%' },
        minWidth: 0,
        borderRadius: { xs: 0, md: `${cardRadius}px` },
        border: { xs: 'none', md: `1px solid ${alpha(BRAND_DARK, 0.08)}` },
        background: dashboardSignatureTokens.surfaces.pageCard,
        boxShadow: { xs: 'none', md: dashboardSignatureTokens.shadows.card },
        overflow: 'hidden'
      }}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <Box sx={{
              p: { xs: 1.5, md: 2 },
              background: `linear-gradient(135deg, ${BRAND_DARK_DEEP} 0%, ${BRAND_DARK_ALT} 100%)`,
              borderBottom: `1px solid ${alpha(BRAND_YELLOW, 0.18)}`
            }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                {/* Mobile & Tablet: Back button */}
                {(isMobile || isTablet) && (
                  <IconButton
                    onClick={() => {
                      setSelectedConversation(null);
                      setSidebarOpen(true);
                    }}
                    size="small"
                    sx={{ color: BRAND_YELLOW }}
                  >
                    <CloseIcon />
                  </IconButton>
                )}
                <Avatar sx={{ bgcolor: BRAND_YELLOW, color: BRAND_DARK, boxShadow: '0 10px 26px rgba(245, 200, 66, 0.24)' }}>
                  <PersonIcon />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fffaf0' }}>
                    {selectedConversation.otherUser.username}
                  </Typography>
                  <Chip
                    label={selectedConversation.otherUser.role}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: BRAND_YELLOW,
                      bgcolor: alpha(BRAND_YELLOW, 0.1),
                      border: `1px solid ${alpha(BRAND_YELLOW, 0.24)}`
                    }}
                  />
                </Box>
                {selectedConversation.isNew && (
                  <Chip label="New Conversation" size="small" sx={{ fontWeight: 700, color: BRAND_DARK, bgcolor: BRAND_YELLOW }} />
                )}
                {!isMobile && !isTablet && (
                  <IconButton
                    onClick={() => setSelectedConversation(null)}
                    size="small"
                    sx={{ color: alpha(BRAND_YELLOW, 0.9), ml: 1 }}
                  >
                    <CloseIcon />
                  </IconButton>
                )}
              </Stack>
            </Box>

            {/* Messages Area */}
            <Box sx={{
              flex: 1,
              p: { xs: 1.5, md: 2 },
              overflowY: 'auto',
              background: `linear-gradient(180deg, ${alpha(BRAND_YELLOW, 0.08)} 0%, #f7f9fd 18%, #eef3fb 100%)`
            }}>
              {loadingMessages ? (
                <Box display="flex" justifyContent="center" mt={4}>
                  <CircularProgress sx={{ color: BRAND_YELLOW_DARK }} />
                </Box>
              ) : (
                <Stack spacing={2}>
                  {messages.length === 0 && (
                    <Alert
                      severity="info"
                      sx={{
                        borderRadius: 3,
                        border: `1px solid ${alpha(BRAND_YELLOW_DARK, 0.18)}`,
                        bgcolor: alpha(BRAND_YELLOW, 0.12)
                      }}
                    >
                      Start the conversation by typing a message below!
                    </Alert>
                  )}

                  {messages.map((msg) => {
                    const isMe = msg.sender?._id === JSON.parse(localStorage.getItem('user'))?.id;
                    return (
                      <Box
                        key={msg._id}
                        sx={{
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: { xs: '85%', sm: '75%', md: '70%' }
                        }}
                      >
                        <Paper
                          elevation={1}
                          sx={{
                            p: 1.5,
                            background: isMe
                              ? `linear-gradient(135deg, ${BRAND_DARK} 0%, ${BRAND_DARK_ALT} 100%)`
                              : 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
                            color: isMe ? '#fffaf0' : BRAND_DARK,
                            borderRadius: 3,
                            border: isMe
                              ? `1px solid ${alpha(BRAND_YELLOW, 0.22)}`
                              : `1px solid ${alpha(BRAND_DARK, 0.08)}`,
                            boxShadow: isMe
                              ? '0 14px 28px rgba(26, 26, 46, 0.22)'
                              : '0 10px 24px rgba(15, 23, 42, 0.06)'
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
                                    icon={<AttachFileIcon />}
                                    label={fileName}
                                    onClick={() => window.open(url, '_blank')}
                                    sx={{
                                      cursor: 'pointer',
                                      bgcolor: isMe ? alpha(BRAND_YELLOW, 0.12) : alpha(BRAND_DARK, 0.06),
                                      color: 'inherit',
                                      maxWidth: 200,
                                      border: `1px solid ${isMe ? alpha(BRAND_YELLOW, 0.22) : alpha(BRAND_DARK, 0.08)}`
                                    }}
                                  />
                                );
                              })}
                            </Box>
                          )}
                        </Paper>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          secondaryTypographyProps={{ component: 'div' }}
                          sx={{ display: 'block', mt: 0.65, textAlign: isMe ? 'right' : 'left', color: alpha(BRAND_DARK, 0.54) }}
                        >
                          {new Date(msg.messageDate).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} PT
                        </Typography>
                      </Box>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </Stack>
              )}
            </Box>

            {/* Input Area */}
            <Box sx={{ p: 2, borderTop: `1px solid ${alpha(BRAND_DARK, 0.08)}`, bgcolor: '#ffffff' }}>
              {/* Attachment Previews */}
              {attachments.length > 0 && (
                <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {attachments.map((file, idx) => (
                    <Chip
                      key={idx}
                      label={file.name}
                      onDelete={() => handleRemoveAttachment(idx)}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        bgcolor: alpha(BRAND_YELLOW, 0.12),
                        border: `1px solid ${alpha(BRAND_YELLOW_DARK, 0.18)}`
                      }}
                    />
                  ))}
                </Box>
              )}

              <Stack direction="row" spacing={1}>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                  multiple
                />
                <IconButton
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  sx={{
                    alignSelf: 'flex-end',
                    mb: 0.4,
                    color: BRAND_DARK,
                    border: `1px solid ${alpha(BRAND_DARK, 0.1)}`,
                    bgcolor: alpha(BRAND_YELLOW, 0.1),
                    '&:hover': {
                      bgcolor: alpha(BRAND_YELLOW, 0.18)
                    }
                  }}
                >
                  {uploading ? <CircularProgress size={24} sx={{ color: BRAND_YELLOW_DARK }} /> : <AttachFileIcon />}
                </IconButton>

                <TextField
                  inputRef={messageInputRef}
                  autoFocus
                  fullWidth
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  multiline
                  maxRows={4}
                  InputProps={{
                    readOnly: sending,
                    sx: {
                      borderRadius: 3,
                      backgroundColor: '#fffdf7'
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      alignItems: 'flex-start',
                      '& fieldset': {
                        borderColor: alpha(BRAND_DARK, 0.12)
                      },
                      '&:hover fieldset': {
                        borderColor: alpha(BRAND_YELLOW_DARK, 0.4)
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: BRAND_YELLOW_DARK,
                        boxShadow: `0 0 0 3px ${alpha(BRAND_YELLOW, 0.12)}`
                      }
                    }
                  }}
                />

                <IconButton
                  color="primary"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleSendMessage}
                  disabled={sending || (!newMessage.trim() && attachments.length === 0)}
                  sx={{
                    alignSelf: 'flex-end',
                    mb: 0.4,
                    color: BRAND_DARK,
                    background: `linear-gradient(135deg, ${BRAND_YELLOW} 0%, ${BRAND_YELLOW_DARK} 100%)`,
                    boxShadow: '0 10px 24px rgba(245, 200, 66, 0.26)',
                    '&:hover': {
                      background: `linear-gradient(135deg, ${BRAND_YELLOW} 0%, ${BRAND_YELLOW_DARK} 100%)`,
                      boxShadow: '0 14px 28px rgba(245, 200, 66, 0.3)'
                    },
                    '&.Mui-disabled': {
                      color: alpha(BRAND_DARK, 0.45),
                      background: alpha(BRAND_YELLOW, 0.35)
                    }
                  }}
                >
                  {sending ? <CircularProgress size={24} sx={{ color: BRAND_DARK }} /> : <SendIcon />}
                </IconButton>
              </Stack>
            </Box>
          </>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 1,
              color: alpha(BRAND_DARK, 0.6),
              background: `linear-gradient(180deg, ${alpha(BRAND_YELLOW, 0.08)} 0%, #f9fbff 100%)`
            }}
          >
            <Avatar sx={{ width: 56, height: 56, bgcolor: BRAND_DARK, color: BRAND_YELLOW, boxShadow: '0 16px 30px rgba(26, 26, 46, 0.16)' }}>
              <PersonIcon />
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 800, color: BRAND_DARK }}>
              {isMobile ? 'Select a conversation' : 'Select a conversation to start chatting'}
            </Typography>
            <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.58) }}>
              Messages, attachments, and unread status now live here.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* New Chat Dialog */}
      <Dialog
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: `${cardRadius}px`,
            overflow: 'hidden',
            border: `1px solid ${alpha(BRAND_DARK, 0.08)}`
          }
        }}
      >
        <DialogTitle sx={{ background: `linear-gradient(135deg, ${BRAND_DARK_DEEP} 0%, ${BRAND_DARK_ALT} 100%)`, color: '#fff8dc', fontWeight: 800 }}>
          Start New Conversation
        </DialogTitle>
        <DialogContent>
          <Autocomplete
            options={searchResults}
            getOptionLabel={(option) => `${option.username} (${option.role})`}
            loading={searchingUsers}
            onInputChange={(e, value) => {
              setSearchQuery(value);
              searchUsers(value);
            }}
            onChange={(e, value) => setSelectedUser(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search users"
                placeholder="Type username..."
                autoFocus
                sx={{
                  mt: 1,
                  '& .MuiOutlinedInput-root.Mui-focused fieldset': {
                    borderColor: BRAND_YELLOW_DARK,
                    boxShadow: `0 0 0 3px ${alpha(BRAND_YELLOW, 0.12)}`
                  }
                }}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            )}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setNewChatOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={startNewConversation}
            disabled={!selectedUser}
            sx={{
              fontWeight: 700,
              color: BRAND_DARK,
              background: `linear-gradient(135deg, ${BRAND_YELLOW} 0%, ${BRAND_YELLOW_DARK} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${BRAND_YELLOW} 0%, ${BRAND_YELLOW_DARK} 100%)`
              }
            }}
          >
            Start Chat
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
