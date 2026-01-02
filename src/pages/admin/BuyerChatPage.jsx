import React, { useEffect, useState, useRef } from 'react';
import {
  Avatar, TextField, Button, Divider, Badge, Stack, CircularProgress,
  IconButton, Chip, Alert, FormControl, Select, MenuItem, InputLabel, Link,
  Snackbar, ListItemButton, Box, Paper, Typography, List, ListItem, ListItemText, ListItemAvatar
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import EmailIcon from '@mui/icons-material/Email';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MarkAsUnreadIcon from '@mui/icons-material/MarkAsUnread';
import api from '../../lib/api';

// Session storage key for persisting state
const CHAT_STORAGE_KEY = 'buyer_chat_page_state';

// Helper to get initial state from sessionStorage
const getInitialState = (key, defaultValue) => {
  try {
    const stored = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed[key] !== undefined ? parsed[key] : defaultValue;
    }
  } catch (e) {
    console.error('Error reading sessionStorage:', e);
  }
  return defaultValue;
};

export default function BuyerChatPage() {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(() => getInitialState('selectedThread', null));
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [syncingInbox, setSyncingInbox] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => getInitialState('searchQuery', ''));
  const [searchError, setSearchError] = useState('');
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(() => getInitialState('selectedSeller', ''));
  const [filterType, setFilterType] = useState(() => getInitialState('filterType', 'ALL'));
  const [filterMarketplace, setFilterMarketplace] = useState(() => getInitialState('filterMarketplace', ''));
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingThreads, setLoadingThreads] = useState(false);

  const [metaCategory, setMetaCategory] = useState('');
  const [metaCaseStatus, setMetaCaseStatus] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  // Snackbar state for sync results
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');


  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const hasFetchedInitialData = useRef(false);
  const fileInputRef = useRef(null);

  const handleCopy = (text) => {
    const val = text || '-';
    if (val === '-') return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(val);
      setCopiedText(val);
      setTimeout(() => setCopiedText(''), 1200);
    }
  };

  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [markingUnread, setMarkingUnread] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  // Persist state to sessionStorage
  useEffect(() => {
    const stateToSave = {
      selectedThread,
      searchQuery,
      selectedSeller,
      selectedSeller,
      filterType,
      filterMarketplace
    };
    try {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Error saving to sessionStorage:', e);
    }
  }, [selectedThread, searchQuery, selectedSeller]);





  useEffect(() => {
    if (selectedThread && !selectedThread.isNew) {
      fetchMeta(selectedThread);
    } else {
      setMetaCategory('');
      setMetaCaseStatus('');
    }
  }, [selectedThread]);

  async function fetchMeta(thread) {
    try {
      const params = {
        sellerId: thread.sellerId,
        buyerUsername: thread.buyerUsername,
        itemId: thread.itemId,
        orderId: thread.orderId || ''
      };

      const { data } = await api.get('/ebay/conversation-meta/single', { params });
      // If data exists, fill state. If not, reset to empty/default.
      if (data && data._id) {
        setMetaCategory(data.category);
        setMetaCaseStatus(data.caseStatus);
      } else {
        setMetaCategory('');
        setMetaCaseStatus('');
      }
    } catch (e) {
      console.error("Failed to fetch meta tags", e);
    }
  }

  async function handleSaveMeta() {
    if (!metaCategory || !metaCaseStatus) {
      alert("Please select both 'About' and 'Case' fields.");
      return;
    }

    setSavingMeta(true);
    try {
      await api.post('/ebay/conversation-meta', {
        sellerId: selectedThread.sellerId,
        buyerUsername: selectedThread.buyerUsername,
        orderId: selectedThread.orderId,
        itemId: selectedThread.itemId,
        category: metaCategory,
        caseStatus: metaCaseStatus
      });
      // Optional: Show a small success toast or icon change
    } catch (e) {
      alert("Failed to save tags: " + e.message);
    } finally {
      setSavingMeta(false);
    }
  }




  async function fetchSellers() {
    try {
      const { data } = await api.get('/sellers/all');
      setSellers(data || []);
    } catch (e) {
      console.error('Failed to load sellers');
    }
  }

  // 1. Initial Load - only run once
  useEffect(() => {
    if (!hasFetchedInitialData.current) {
      hasFetchedInitialData.current = true;
      fetchSellers();
      loadThreads(true);

      // If we have a restored selectedThread, load its messages
      if (selectedThread && !selectedThread.isNew) {
        loadMessages(selectedThread);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track previous values to detect actual changes
  const prevSearchQuery = useRef(searchQuery);
  const prevSelectedSeller = useRef(selectedSeller);
  const prevFilterType = useRef(filterType);
  const prevFilterMarketplace = useRef(filterMarketplace);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip on first render (initial data already loaded above)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Only reload if values actually changed
    if (prevSearchQuery.current !== searchQuery || prevSelectedSeller.current !== selectedSeller || prevFilterType.current !== filterType || prevFilterMarketplace.current !== filterMarketplace) {
      prevSearchQuery.current = searchQuery;
      prevSelectedSeller.current = selectedSeller;
      prevFilterType.current = filterType;
      prevFilterMarketplace.current = filterMarketplace;

      const delayDebounceFn = setTimeout(() => {
        setPage(1);
        loadThreads(true);
      }, 500);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchQuery, selectedSeller, filterType, filterMarketplace]);

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
      }, 10000);
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

        // Show snackbar with results
        const { syncResults, totalNewMessages } = res.data;
        if (totalNewMessages > 0 && syncResults) {
          // Build summary by seller
          const sellerSummary = syncResults
            .filter(r => r.newMessages > 0)
            .map(r => `${r.sellerName}: ${r.newMessages} new`)
            .join('\n');

          setSnackbarMsg(`Found ${totalNewMessages} new message${totalNewMessages > 1 ? 's' : ''}!\n\n${sellerSummary}`);
          setSnackbarSeverity('success');
        } else {
          setSnackbarMsg('No new messages found.');
          setSnackbarSeverity('info');
        }
        setSnackbarOpen(true);
      }
    } catch (e) {
      console.error("Inbox Sync failed", e);
      setSnackbarMsg('Sync failed: ' + (e.response?.data?.error || e.message));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
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
        limit: 50,
        search: searchQuery,
        search: searchQuery,
        filterType: filterType,
        filterMarketplace: filterMarketplace
      };

      if (selectedSeller) params.sellerId = selectedSeller;

      const res = await api.get('/ebay/chat/threads', { params });
      const newThreads = res.data.threads;

      if (reset) {
        setThreads(newThreads);
      } else {
        setThreads(prev => [...prev, ...newThreads]);
      }

      setHasMore(newThreads.length === 50); // If we got full page, assume more exists
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
        body: newMessage,
        mediaUrls: attachments.map(a => a.url)
      });

      setMessages([...messages, res.data.message]);
      setNewMessage('');
      setAttachments([]);

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

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newAttachments = res.data.urls.map((url, index) => ({
        url,
        name: files[index].name
      }));

      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (e) {
      alert('Upload failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleRemoveAttachment(index) {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }

  async function handleMarkAsUnread() {
    if (!selectedThread) return;

    setMarkingUnread(true);
    try {
      const payload = {
        orderId: selectedThread.orderId,
        buyerUsername: selectedThread.buyerUsername,
        itemId: selectedThread.itemId
      };

      await api.post('/ebay/chat/mark-unread', payload);

      // Update local thread state to show unread badge
      setThreads(prevThreads =>
        prevThreads.map(t => {
          const isMatch = t.orderId
            ? t.orderId === selectedThread.orderId
            : (t.buyerUsername === selectedThread.buyerUsername && t.itemId === selectedThread.itemId);

          if (isMatch) {
            // Count buyer messages to set unread count
            const buyerMessageCount = messages.filter(m => m.sender === 'BUYER').length;
            return { ...t, unreadCount: buyerMessageCount };
          }
          return t;
        })
      );

      // Show success notification
      setSnackbarMsg('Conversation marked as unread');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

      // Close conversation
      setSelectedThread(null);
      setMessages([]);

    } catch (err) {
      setSnackbarMsg('Failed to mark as unread: ' + (err.response?.data?.error || err.message));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setMarkingUnread(false);
    }
  }

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

          {/* MESSAGE TYPE FILTER */}
          <FormControl fullWidth size="small" sx={{ mb: 2, bgcolor: 'white' }}>
            <InputLabel>Filter by Type</InputLabel>
            <Select
              value={filterType}
              label="Filter by Type"
              onChange={(e) => setFilterType(e.target.value)}
            >
              <MenuItem value="ALL">All Messages</MenuItem>
              <MenuItem value="ORDER">Order Related</MenuItem>
              <MenuItem value="INQUIRY">Inquiries Only</MenuItem>
            </Select>
          </FormControl>

          {/* MARKETPLACE FILTER */}
          <FormControl fullWidth size="small" sx={{ mb: 2, bgcolor: 'white' }}>
            <InputLabel>Filter by Marketplace</InputLabel>
            <Select
              value={filterMarketplace}
              label="Filter by Marketplace"
              onChange={(e) => setFilterMarketplace(e.target.value)}
            >
              <MenuItem value="">All Marketplaces</MenuItem>
              <MenuItem value="EBAY_US">United States (US)</MenuItem>
              <MenuItem value="EBAY_CA">Canada (CA)</MenuItem>
              <MenuItem value="EBAY_AU">Australia (AU)</MenuItem>
              {/* Add more as needed */}
            </Select>
          </FormControl>

          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Inbox</Typography>
            <Button
              size="small"
              startIcon={syncingInbox ? <CircularProgress size={16} /> : <RefreshIcon />}
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
                <ListItem disablePadding>
                  <ListItemButton
                    selected={isSelected}
                    onClick={() => handleThreadSelect(thread)}
                    alignItems="flex-start"
                  >
                    <ListItemAvatar>
                      <Badge color="error" badgeContent={thread.unreadCount}>
                        <Avatar sx={{
                          bgcolor: thread.messageType === 'ORDER'
                            ? 'primary.main'
                            : thread.messageType === 'DIRECT'
                              ? 'warning.main'
                              : 'secondary.main'
                        }}>
                          {thread.messageType === 'ORDER'
                            ? <ShoppingBagIcon fontSize="small" />
                            : thread.messageType === 'DIRECT'
                              ? <EmailIcon fontSize="small" />
                              : <QuestionAnswerIcon fontSize="small" />
                          }
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
                        <Box>
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
                            {/* MARKETPLACE BADGE */}
                            {thread.marketplaceId && (
                              <Chip
                                label={thread.marketplaceId.replace('EBAY_', '')}
                                size="small"
                                sx={{
                                  height: 16,
                                  fontSize: '0.65rem',
                                  minWidth: 24,
                                  px: 0,
                                  '& .MuiChip-label': { px: 0.5 },
                                  bgcolor: thread.marketplaceId === 'EBAY_US' ? '#e3f2fd' : '#fff3e0',
                                  color: thread.marketplaceId === 'EBAY_US' ? '#1565c0' : '#e65100',
                                  fontWeight: 'bold'
                                }}
                              />
                            )}
                            <Typography variant="caption" display="block" color="text.secondary" noWrap>
                              {thread.orderId
                                ? `#${thread.orderId}`
                                : thread.messageType === 'DIRECT'
                                  ? 'Direct Message'
                                  : 'Inquiry'
                              }
                            </Typography>
                          </Stack>
                          <Stack direction="row" alignItems="center">
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, mr: 1 }}>
                              {thread.itemId === 'DIRECT_MESSAGE' ? 'No Item' : (thread.itemTitle || thread.itemId)}
                            </Typography>
                          </Stack>

                          <Typography variant="body2" noWrap sx={{ fontWeight: thread.unreadCount > 0 ? 'bold' : 'normal', color: 'text.primary', mt: 0.5 }}>
                            {thread.sender === 'SELLER' ? 'You: ' : ''}{thread.lastMessage}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
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
      </Paper >

      {/* RIGHT: CHAT AREA (Keep exactly the same) */}
      < Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }
      }>
        {/* ... existing chat area code ... */}
        {
          selectedThread ? (
            <>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: '#fff', position: 'relative' }}>

                {/* --- NEW: TOP RIGHT CORNER (Seller + Close) --- */}
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ position: 'absolute', top: 12, right: 12 }}
                >

                  {/* 1. DROPDOWN: Conversation About */}
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel sx={{ fontSize: '0.8rem' }}>About</InputLabel>
                    <Select
                      value={metaCategory}
                      label="About"
                      onChange={(e) => setMetaCategory(e.target.value)}
                      sx={{ height: 32, fontSize: '0.8rem' }}
                    >
                      <MenuItem value="INR">INR</MenuItem>
                      <MenuItem value="Cancellation">Cancellation</MenuItem>
                      <MenuItem value="Return">Return</MenuItem>
                      <MenuItem value="Out of Stock">Out of Stock</MenuItem>
                      <MenuItem value="Issue with Product">Issue with Product</MenuItem>
                      <MenuItem value="Inquiry">Inquiry</MenuItem>
                    </Select>
                  </FormControl>

                  {/* 2. DROPDOWN: Case Status */}
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel sx={{ fontSize: '0.8rem' }}>Case</InputLabel>
                    <Select
                      value={metaCaseStatus}
                      label="Case"
                      onChange={(e) => setMetaCaseStatus(e.target.value)}
                      sx={{ height: 32, fontSize: '0.8rem' }}
                    >
                      <MenuItem value="Case Opened">Case Opened</MenuItem>
                      <MenuItem value="Case Not Opened">Case Not Opened</MenuItem>
                    </Select>
                  </FormControl>

                  {/* 3. SAVE BUTTON */}
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSaveMeta}
                    disabled={savingMeta}
                    sx={{ minWidth: 40, height: 32, px: 1 }}
                  >
                    {savingMeta ? <CircularProgress size={16} color="inherit" /> : <SaveIcon fontSize="small" />}
                  </Button>


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

                  {/* Mark as Unread Button */}
                  {!selectedThread.isNew && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleMarkAsUnread}
                      disabled={markingUnread}
                      startIcon={markingUnread ? <CircularProgress size={16} color="inherit" /> : <MarkAsUnreadIcon fontSize="small" />}
                      sx={{ height: 30, fontSize: '0.75rem' }}
                    >
                      {markingUnread ? 'Marking...' : 'Mark Unread'}
                    </Button>
                  )}

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
                    {/* DIRECT MESSAGE - No item link */}
                    {selectedThread.itemId === 'DIRECT_MESSAGE' ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <EmailIcon sx={{ fontSize: 20, color: 'warning.main' }} />
                        <Typography
                          variant="subtitle2"
                          sx={{
                            color: 'warning.main',
                            fontWeight: 600,
                            lineHeight: 1.3
                          }}
                        >
                          Direct Message (No Item Context)
                        </Typography>
                        <Chip
                          label="Cannot Reply via API"
                          size="small"
                          color="warning"
                          sx={{ height: 24, fontSize: '0.7rem' }}
                        />
                      </Box>
                    ) : (
                      /* REGULAR ITEM LINK */
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5 }}>
                        <Link
                          href={`https://www.ebay.com/itm/${selectedThread.itemId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="hover"
                          sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{
                              color: 'primary.main',
                              fontWeight: 600,
                              lineHeight: 1.3
                            }}
                          >
                            {selectedThread.itemTitle || `Item ID: ${selectedThread.itemId}`}
                          </Typography>
                          <OpenInNewIcon sx={{ fontSize: 16, color: 'primary.main', mt: 0.3 }} />
                        </Link>
                        <IconButton 
                          size="small" 
                          onClick={() => handleCopy(selectedThread.itemTitle || `Item ID: ${selectedThread.itemId}`)}
                          aria-label="copy product title"
                          sx={{ p: 0.5, mt: -0.2 }}
                        >
                          <ContentCopyIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    )}

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
                    {/* MARKETPLACE BADGE (In Header) */}
                    {selectedThread.marketplaceId && (
                      <Chip
                        label={selectedThread.marketplaceId.replace('EBAY_', '')}
                        size="small"
                        sx={{
                          ml: 1,
                          borderRadius: 1,
                          height: 30,
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          bgcolor: selectedThread.marketplaceId === 'EBAY_US' ? '#e3f2fd' : '#fff3e0',
                          color: selectedThread.marketplaceId === 'EBAY_US' ? '#1565c0' : '#e65100',
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
                                      bgcolor: msg.sender === 'SELLER' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
                                      color: 'inherit',
                                      maxWidth: 200
                                    }}
                                  />
                                );
                              })}
                            </Box>
                          )}
                        </Paper>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: msg.sender === 'SELLER' ? 'right' : 'left' }}>
                          {new Date(msg.messageDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {msg.sender === 'SELLER' && (msg.read ? ' • Read' : ' • Sent')}
                        </Typography>
                      </Box>
                    ))}
                    <div ref={messagesEndRef} />
                  </Stack>
                )}
              </Box>

              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: '#fff', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {selectedThread.itemId === 'DIRECT_MESSAGE' ? (
                  <Alert severity="warning" sx={{ width: '100%' }}>
                    <strong>Direct messages cannot be replied to via API.</strong> These are account-level messages without item context. Please respond through eBay's messaging center directly.
                  </Alert>
                ) : (
                  <>
                    {/* ATTACHMENT PREVIEWS */}
                    {attachments.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        {attachments.map((att, idx) => (
                          <Chip
                            key={idx}
                            label={att.name}
                            onDelete={() => handleRemoveAttachment(idx)}
                            variant="outlined"
                            size="small"
                            sx={{ maxWidth: 200 }}
                          />
                        ))}
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                      />
                      <IconButton
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || sending}
                        sx={{ alignSelf: 'flex-end', mb: 0.5 }}
                      >
                        {uploading ? <CircularProgress size={24} /> : <AttachFileIcon />}
                      </IconButton>

                      <TextField
                        fullWidth
                        multiline
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={sending}
                      />
                      <Button
                        variant="contained"
                        sx={{ px: 3, alignSelf: 'flex-end', mb: 0.5 }}
                        endIcon={sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                        onClick={handleSendMessage}
                        disabled={sending || (!newMessage.trim() && attachments.length === 0)}
                      >
                        Send
                      </Button>
                    </Box>
                  </>
                )}
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: '#fafafa' }}>
              <Stack alignItems="center" spacing={1}>
                <QuestionAnswerIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.2 }} />
                <Typography color="text.secondary">Select a conversation or search an Order ID</Typography>
              </Stack>
            </Box>
          )
        }
      </Paper >

      {/* Snackbar for sync results */}
      < Snackbar
        open={snackbarOpen}
        autoHideDuration={8000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{
            width: '100%',
            whiteSpace: 'pre-line',
            minWidth: 300
          }}
          elevation={6}
          variant="filled"
        >
          {snackbarMsg}
        </Alert>
      </Snackbar >

      {/* Copy Feedback Snackbar */}
      <Snackbar
        open={!!copiedText}
        autoHideDuration={1200}
        message="Copied to clipboard!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box >
  );
}
