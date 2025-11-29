import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Paper, Typography, List, ListItem, ListItemText, ListItemAvatar,
  Avatar, TextField, Button, Divider, Badge, Stack, CircularProgress, 
  IconButton, Chip, Alert, FormControl, Select, MenuItem, InputLabel
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import CloseIcon from '@mui/icons-material/Close'; // <--- IMPORT ADDED
import api from '../../lib/api';

export default function BuyerChatPage() {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [syncingInbox, setSyncingInbox] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [sellers, setSellers] = useState([]); 
  const [selectedSeller, setSelectedSeller] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingThreads, setLoadingThreads] = useState(false);
  
  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  async function fetchSellers() {
    try {
      const { data } = await api.get('/sellers/all');
      setSellers(data || []);
    } catch (e) {
      console.error('Failed to load sellers');
    }
  }

  // 1. Initial Load
  useEffect(() => {
    fetchSellers(); // Fetch sellers on mount
    
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1); // Reset page
      loadThreads(true); // True = Reset List
    }, 500); // 500ms delay to stop API spam while typing

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedSeller]);

  // 2. Scroll Effect
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. ACTIVE POLLING
  useEffect(() => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    if (selectedThread && !selectedThread.isNew) {
      pollingIntervalRef.current = setInterval(() => {
        pollActiveThread();
      },60000);
    }

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [selectedThread]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // API CALLS
  async function handleManualSync() {
  setSyncingInbox(true);
  try {
    const res = await api.post('/ebay/sync-inbox');
    if (res.data.success) {
      // PASS TRUE TO RESET THE LIST AND SHOW NEWEST MESSAGES AT TOP
      setPage(1); 
      loadThreads(true); 
    }
  } catch (e) {
    console.error("Inbox Sync failed", e);
  } finally {
    setSyncingInbox(false);
  }
}

 async function pollActiveThread() {
    // SAFETY CHECK: Don't poll if we don't have the required IDs
    if (!selectedThread || !selectedThread.sellerId || !selectedThread.buyerUsername) {
        return; 
    }

    try {
      const res = await api.post('/ebay/sync-thread', {
        sellerId: selectedThread.sellerId,
        buyerUsername: selectedThread.buyerUsername,
        itemId: selectedThread.itemId
      });

      if (res.data.newMessagesFound) {
        loadMessages(selectedThread, false);
      }
    } catch (e) {
      // Use silent error logging to avoid spamming console if it's just a timeout
      if (e.response && e.response.status !== 400) {
          console.error("Thread Poll failed", e);
      }
    }
  }

  async function loadThreads(reset = false) {
    if (loadingThreads) return;
    setLoadingThreads(true);

    try {
      const currentPage = reset ? 1 : page;
      const params = { 
        page: currentPage, 
        limit: 20,
        search: searchQuery 
      };
      
      if (selectedSeller) params.sellerId = selectedSeller;

      const res = await api.get('/ebay/chat/threads', { params });
      const newThreads = res.data.threads;

      if (reset) {
        setThreads(newThreads);
      } else {
        setThreads(prev => [...prev, ...newThreads]);
      }

      setHasMore(newThreads.length === 20); // If we got full page, assume more exists
      setPage(currentPage + 1);

    } catch (e) {
      console.error(e);
    } finally {
      setLoadingThreads(false);
    }
  }

  async function handleThreadSelect(thread) {
  setSelectedThread(thread);
  setSearchError('');

  // 1. OPTIMISTIC UPDATE: Remove Red Dot Immediately
  if (thread.unreadCount > 0) {
    setThreads(prevThreads => 
      prevThreads.map(t => {
        // Match by OrderId OR (Buyer + Item)
        const isMatch = t.orderId 
          ? t.orderId === thread.orderId 
          : (t.buyerUsername === thread.buyerUsername && t.itemId === thread.itemId);

        if (isMatch) {
          return { ...t, unreadCount: 0 }; // Zero out unread count
        }
        return t;
      })
    );
  }

  // 2. Load Messages (Backend will mark as read in DB)
  if (!thread.isNew) {
    await loadMessages(thread, true);
  } else {
    setMessages([]);
  }
}

  async function loadMessages(thread, showLoading = true) {
    if (showLoading) setLoadingMessages(true);
    try {
      const params = {};
      if (thread.orderId) params.orderId = thread.orderId;
      else {
        params.buyerUsername = thread.buyerUsername;
        params.itemId = thread.itemId;
      }

      const res = await api.get('/ebay/chat/messages', { params });
      setMessages(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const res = await api.post('/ebay/send-message', {
        orderId: selectedThread.orderId,
        itemId: selectedThread.itemId,
        buyerUsername: selectedThread.buyerUsername,
        body: newMessage
      });
      
      setMessages([...messages, res.data.message]);
      setNewMessage('');
      
      if (selectedThread.isNew) {
        loadThreads();
        const newThread = { ...selectedThread, isNew: false };
        setSelectedThread(newThread);
      }
    } catch (e) {
      alert('Failed to send: ' + (e.response?.data?.error || e.message));
    } finally {
      setSending(false);
    }
  }

  async function handleSearchOrder() {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return;
  setSearchError('');

  // 1. Local Search (Checks OrderID OR Username)
  const foundLocal = threads.find(t => 
    (t.orderId && t.orderId.toLowerCase().includes(query)) ||
    (t.buyerUsername && t.buyerUsername.toLowerCase().includes(query)) ||
    (t.buyerName && t.buyerName.toLowerCase().includes(query))
  );

  if (foundLocal) {
    handleThreadSelect(foundLocal);
    return;
  }

  // 2. Remote Search (Only if looks like Order ID)
  // We assume usernames are found locally since you fetch all active threads.
  // Only fetch from API if it looks like an Order ID (contains hyphens or numbers)
  if (query.match(/[\d-]/)) {
      try {
        const res = await api.get('/ebay/chat/search-order', { params: { orderId: searchQuery.trim() } });
        handleThreadSelect(res.data);
      } catch (e) {
        setSearchError('Not found locally or remotely.');
      }
  } else {
      setSearchError('User conversation not found in active threads.');
  }
}

  const getSellerName = (id) => {
    const seller = sellers.find(s => s._id === id);
    return seller?.user?.username || 'Unknown Seller';
  };

 return (
    <Box sx={{ display: 'flex', height: '85vh', gap: 2 }}>
      
      {/* LEFT: SIDEBAR */}
      <Paper sx={{ width: 340, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderBottom: 1, borderColor: 'divider' }}>
            
            {/* SELLER FILTER */}
            <FormControl fullWidth size="small" sx={{ mb: 2, bgcolor: 'white' }}>
              <InputLabel>Filter by Seller</InputLabel>
              <Select
                value={selectedSeller}
                label="Filter by Seller"
                onChange={(e) => setSelectedSeller(e.target.value)}
              >
                <MenuItem value="">
                  <em>All Sellers</em>
                </MenuItem>
                {sellers.map((s) => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.user?.username || s.user?.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Inbox</Typography>
                <Button 
                    size="small" 
                    startIcon={syncingInbox ? <CircularProgress size={16}/> : <RefreshIcon/>} 
                    onClick={handleManualSync}
                    disabled={syncingInbox}
                    variant="outlined"
                >
                    {syncingInbox ? 'Syncing...' : 'Check New'}
                </Button>
            </Stack>
            
            {/* SEARCH INPUT (Automatic Debounce) */}
            <TextField 
                size="small" 
                fullWidth 
                placeholder="Search User, Order, or Item..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                // We removed the search button because useEffect handles it now
            />
        </Box>

        {/* THREAD LIST */}
        <List sx={{ overflow: 'auto', flex: 1 }}>
           {threads.map((thread, index) => {
             // Unique Key: OrderID + ItemID (handles multi-item orders correctly)
             const uniqueKey = `${thread.orderId || 'inq'}-${thread.itemId || index}`;
             
             // Selection Logic: Matches if OrderID matches OR (Buyer + Item) matches
             const isSelected = selectedThread && (
                (selectedThread.orderId && selectedThread.orderId === thread.orderId) || 
                (!selectedThread.orderId && selectedThread.buyerUsername === thread.buyerUsername && selectedThread.itemId === thread.itemId)
             );

             return (
                <React.Fragment key={uniqueKey}>
                  <ListItem 
                    button 
                    selected={isSelected}
                    onClick={() => handleThreadSelect(thread)}
                    alignItems="flex-start"
                  >
                    <ListItemAvatar>
                      <Badge color="error" badgeContent={thread.unreadCount}>
                        <Avatar sx={{ bgcolor: thread.messageType === 'ORDER' ? 'primary.main' : 'secondary.main' }}>
                           {thread.messageType === 'ORDER' ? <ShoppingBagIcon fontSize="small"/> : <QuestionAnswerIcon fontSize="small"/>}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" justifyContent="space-between">
                           <Typography variant="subtitle2" noWrap sx={{ maxWidth: 140, fontWeight: 'bold' }}>
                              {thread.buyerName || thread.buyerUsername || 'Unknown Buyer'}
                           </Typography>
                           <Typography variant="caption" color="text.secondary">
                              {new Date(thread.lastDate).toLocaleDateString()}
                           </Typography>
                        </Stack>
                      }
                      secondary={
                        <>
                           <Typography variant="caption" display="block" color="text.secondary" noWrap>
                             {thread.orderId ? `#${thread.orderId}` : 'Inquiry'} • {thread.itemTitle || thread.itemId}
                           </Typography>
                           <Typography variant="body2" noWrap sx={{ fontWeight: thread.unreadCount > 0 ? 'bold' : 'normal', color: 'text.primary' }}>
                             {thread.sender === 'SELLER' ? 'You: ' : ''}{thread.lastMessage}
                           </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
             );
           })}

           {/* LOAD MORE BUTTON */}
           {hasMore && threads.length > 0 && (
             <Box sx={{ p: 2, textAlign: 'center' }}>
               <Button 
                 size="small" 
                 onClick={() => loadThreads(false)} 
                 disabled={loadingThreads}
               >
                 {loadingThreads ? <CircularProgress size={20} /> : 'Load More'}
               </Button>
             </Box>
           )}

           {/* EMPTY STATE */}
           {threads.length === 0 && !loadingThreads && (
             <Typography variant="caption" sx={{ p: 3, display: 'block', textAlign: 'center', color: 'text.secondary' }}>
                No conversations found.
             </Typography>
           )}
        </List>
      </Paper>

      {/* RIGHT: CHAT AREA (Keep exactly the same) */}
      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* ... existing chat area code ... */}
        {selectedThread ? (
          <>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: '#fff', position: 'relative' }}>
  
  {/* --- NEW: TOP RIGHT CORNER (Seller + Close) --- */}
  <Stack 
    direction="row" 
    spacing={1} 
    alignItems="center" 
    sx={{ position: 'absolute', top: 12, right: 12 }}
  >
     {/* Seller Name */}
    <Chip 
      label={getSellerName(selectedThread.sellerId)} 
      size="small" 
      icon={<PersonIcon style={{ fontSize: 20 }} />} 
      sx={{ 
        bgcolor: '#e3f2fd', 
        color: '#1565c0', 
        fontWeight: 'bold', 
        height: 30,
        fontSize: '1rem'
      }} 
    />
    {selectedThread.isNew && <Chip label="New" size="small" color="success" sx={{ height: 24 }} />}
    
    {/* Close Button */}
    <IconButton 
      onClick={() => setSelectedThread(null)}
      size="small"
      sx={{ color: 'text.disabled', ml: 1 }}
    >
      <CloseIcon />
    </IconButton>
  </Stack>

  {/* --- MAIN CONTENT (Left Side) --- */}
  <Stack spacing={1.5} sx={{ pr: 12 }}> {/* Added Padding Right to avoid overlapping the chip */}

    {/* 1. BUYER IDENTITY */}
    <Stack direction="row" alignItems="center" spacing={3} sx={{ mt: 0.5 }}>
        <Box>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Buyer Name
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.1 }}>
                {selectedThread.buyerName || '-'}
            </Typography>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ height: 20, alignSelf: 'center', opacity: 0.5 }} />

        <Box>
            <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Username
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(0,0,0,0.05)', px: 0.5, borderRadius: 0.5 }}>
                {selectedThread.buyerUsername}
            </Typography>
        </Box>
    </Stack>

    {/* 2. PRODUCT & ORDER */}
    <Box>
        <Typography 
            variant="subtitle2" 
            sx={{ 
                color: 'primary.main', 
                fontWeight: 600,
                lineHeight: 1.3,
                mb: 0.5
            }}
        >
             {selectedThread.itemTitle || `Item ID: ${selectedThread.itemId}`}
        </Typography>

        {selectedThread.orderId && (
            <Chip 
                label={`Order #: ${selectedThread.orderId}`}
                size="small"
                variant="outlined"
                sx={{ 
                    borderRadius: 1, 
                    height: 30, 
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    color: 'text.secondary',
                    borderColor: 'divider',
                    bgcolor: '#fafafa'
                }}
            />
        )}
    </Box>

  </Stack>
</Box>

            <Box sx={{ flex: 1, p: 2, overflowY: 'auto', bgcolor: '#f0f2f5' }}>
              {loadingMessages ? (
                  <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
              ) : (
                <Stack spacing={2}>
                  {messages.length === 0 && selectedThread.isNew && (
                      <Alert severity="info">Start the conversation by typing a welcome message below!</Alert>
                  )}
                  
                  {messages.map((msg) => (
                    <Box 
                      key={msg._id} 
                      sx={{ 
                        alignSelf: msg.sender === 'SELLER' ? 'flex-end' : 'flex-start',
                        maxWidth: '70%'
                      }}
                    >
                      <Paper 
                        elevation={1}
                        sx={{ 
                          p: 1.5, 
                          bgcolor: msg.sender === 'SELLER' ? '#1976d2' : '#ffffff',
                          color: msg.sender === 'SELLER' ? '#fff' : 'text.primary',
                          borderRadius: 2,
                          position: 'relative'
                        }}
                      >
                         {/* TEXT */}
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{msg.body}</Typography>
                        
                         {/* IMAGES */}
                         {msg.mediaUrls && msg.mediaUrls.length > 0 && (
                            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {msg.mediaUrls.map((url, idx) => (
                                <Box 
                                    key={idx}
                                    component="img"
                                    src={url}
                                    alt="Attachment"
                                    sx={{ 
                                        width: 100, 
                                        height: 100, 
                                        objectFit: 'cover', 
                                        borderRadius: 1,
                                        cursor: 'pointer',
                                        border: '1px solid #ccc'
                                    }}
                                    onClick={() => window.open(url, '_blank')}
                                />
                              ))}
                            </Box>
                          )}
                      </Paper>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: msg.sender === 'SELLER' ? 'right' : 'left' }}>
                        {new Date(msg.messageDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        {msg.sender === 'SELLER' && (msg.read ? ' • Read' : ' • Sent')}
                      </Typography>
                    </Box>
                  ))}
                  <div ref={messagesEndRef} />
                </Stack>
              )}
            </Box>

            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: '#fff', display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                multiline
                maxRows={3}
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                    if(e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                    }
                }}
                disabled={sending}
              />
              <Button 
                variant="contained" 
                sx={{ px: 3 }}
                endIcon={sending ? <CircularProgress size={20} color="inherit"/> : <SendIcon />}
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
              >
                Send
              </Button>
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: '#fafafa' }}>
            <Stack alignItems="center" spacing={1}>
                <QuestionAnswerIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.2 }} />
                <Typography color="text.secondary">Select a conversation or search an Order ID</Typography>
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
