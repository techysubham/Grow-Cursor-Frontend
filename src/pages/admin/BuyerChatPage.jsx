import React, { useEffect, useState, useRef } from 'react';
import {
  Avatar, TextField, Button, Divider, Badge, Stack, CircularProgress, Fade,
  IconButton, Chip, Alert, FormControl, Select, MenuItem, InputLabel, Link,
  Snackbar, ListItemButton, Box, Paper, Typography, List, ListItem, ListItemText, ListItemAvatar,
  useTheme, useMediaQuery, Menu, ListSubheader, Tooltip, Switch, FormControlLabel
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
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
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SettingsIcon from '@mui/icons-material/Settings';
import api from '../../lib/api';
import TemplateManagementModal from '../../components/TemplateManagementModal';
import OrderDetailsModal from '../../components/OrderDetailsModal';
import { dashboardSignatureTokens } from '../../theme/appTheme';
import { yellowFilledButtonSx, yellowOutlinedButtonSx } from '../../theme/tableStyles';
import { BRAND_YELLOW, BRAND_DARK, BRAND_YELLOW_DARK } from '../../constants/brandTheme';

// Session storage key for persisting state
const CHAT_STORAGE_KEY = 'buyer_chat_page_state';

// CHAT_TEMPLATES are now fetched from API - see chatTemplates state in component

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
  const [showUnreadOnly, setShowUnreadOnly] = useState(() => getInitialState('showUnreadOnly', false));
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingThreads, setLoadingThreads] = useState(false);

  // Pending filter state — only applied when user clicks "Apply Filters"
  const initialFilters = { seller: '', filterType: 'ALL', filterMarketplace: '', showUnreadOnly: false, searchQuery: '', dateMode: 'none', dateSingle: '', dateFrom: '', dateTo: '', excludeClient: true };
  const [pendingFilters, setPendingFilters] = useState({
    ...initialFilters,
    seller: getInitialState('selectedSeller', ''),
    filterType: getInitialState('filterType', 'ALL'),
    filterMarketplace: getInitialState('filterMarketplace', ''),
    showUnreadOnly: getInitialState('showUnreadOnly', false),
    searchQuery: getInitialState('searchQuery', ''),
    excludeClient: getInitialState('excludeClient', true),
  });
  const [appliedDateMode, setAppliedDateMode] = useState('none');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [metaCategory, setMetaCategory] = useState('');
  const [metaCaseStatus, setMetaCaseStatus] = useState('');
  const [metaPickedUpBy, setMetaPickedUpBy] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  // Chat agents for "Picked Up By" dropdown
  const [chatAgents, setChatAgents] = useState([]);

  // Order details modal
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Thread thumbnail image
  const [threadThumbnail, setThreadThumbnail] = useState(null);

  // Store fetched product images for threads (itemId -> imageUrl)
  const [threadImages, setThreadImages] = useState({});
  const [fetchingImages, setFetchingImages] = useState(new Set());

  // Snackbar state for sync results
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');


  const messagesEndRef = useRef(null);
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
  const [markingRead, setMarkingRead] = useState(false);
  const [copiedText, setCopiedText] = useState('');
  const [templateAnchorEl, setTemplateAnchorEl] = useState(null);
  const [chatTemplates, setChatTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);

  // Responsive hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // < 600px
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 600px - 960px
  const isDesktop = !isMobile && !isTablet;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const prevIsDesktopRef = useRef(null);

  // Sync sidebar state with breakpoints - closed on mobile/tablet, open on desktop
  useEffect(() => {
    // On initial mount or when switching breakpoint categories
    if (prevIsDesktopRef.current === null || prevIsDesktopRef.current !== isDesktop) {
      setSidebarOpen(isDesktop);
      prevIsDesktopRef.current = isDesktop;
    }
  }, [isDesktop]);

  // On tablet, keep sidebar closed when viewing a chat
  useEffect(() => {
    if (isTablet && selectedThread) {
      setSidebarOpen(false);
    }
  }, [isTablet, selectedThread]);

  // Persist state to sessionStorage
  useEffect(() => {
    const stateToSave = {
      selectedThread,
      searchQuery,
      selectedSeller,
      filterType,
      filterMarketplace,
      showUnreadOnly,
      excludeClient: pendingFilters.excludeClient
    };
    try {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Error saving to sessionStorage:', e);
    }
  }, [selectedThread, searchQuery, selectedSeller, pendingFilters.excludeClient]);





  useEffect(() => {
    if (selectedThread && !selectedThread.isNew) {
      fetchMeta(selectedThread);
    } else {
      setMetaCategory('');
      setMetaCaseStatus('');
      setMetaPickedUpBy('');
    }
  }, [selectedThread]);

  // Fetch thumbnail image when thread changes
  useEffect(() => {
    setThreadThumbnail(null);
    if (
      selectedThread &&
      selectedThread.itemId &&
      selectedThread.itemId !== 'DIRECT_MESSAGE' &&
      selectedThread.sellerId
    ) {
      api
        .get(`/ebay/item-images/${selectedThread.itemId}`, {
          params: { sellerId: selectedThread.sellerId, thumbnail: true }
        })
        .then((res) => {
          const url = res.data?.thumbnail || res.data?.images?.[0] || null;
          setThreadThumbnail(url);
        })
        .catch(() => setThreadThumbnail(null));
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
        setMetaCaseStatus(data.status || data.caseStatus || '');
        setMetaPickedUpBy(data.pickedUpBy || '');
      } else {
        setMetaCategory('');
        setMetaCaseStatus('');
        setMetaPickedUpBy('');
      }
    } catch (e) {
      // Don't log 401 errors - they're handled by the interceptor
      if (e.response?.status !== 401) {
        console.error("Failed to fetch meta tags", e);
      }
      // Reset to empty on error
      setMetaCategory('');
      setMetaCaseStatus('');
      setMetaPickedUpBy('');
    }
  }

  async function handleSaveMeta() {
    if (!metaCaseStatus) {
      alert("Please select a 'Status' field.");
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
        caseStatus: metaCaseStatus,  // keep backward-compat field
        status: metaCaseStatus,      // synced status field
        pickedUpBy: metaPickedUpBy || null
      });
      // Optional: Show a small success toast or icon change
    } catch (e) {
      alert("Failed to save tags: " + e.message);
    } finally {
      setSavingMeta(false);
    }
  }




  async function fetchAgents() {
    try {
      const { data } = await api.get('/ebay/chat-agents');
      setChatAgents(data || []);
    } catch (e) {
      console.error('Failed to load chat agents', e);
    }
  }

  async function loadChatTemplates() {
    setTemplatesLoading(true);
    try {
      const { data } = await api.get('/chat-templates');
      if (data.templates && data.templates.length > 0) {
        setChatTemplates(data.templates);
      }
    } catch (e) {
      console.error('Failed to load chat templates:', e);
    } finally {
      setTemplatesLoading(false);
    }
  }

  async function fetchSellers() {
    try {
      const { data } = await api.get('/sellers/all');
      setSellers(data || []);
    } catch (e) {
      // Don't log 401 errors - they're handled by the interceptor
      if (e.response?.status !== 401) {
        console.error('Failed to load sellers', e);
      }
      // Set empty array on error to prevent crashes
      setSellers([]);
    }
  }

  // 1. Initial Load - only run once
  useEffect(() => {
    if (!hasFetchedInitialData.current) {
      hasFetchedInitialData.current = true;
      fetchSellers();
      loadThreads(true);
      loadChatTemplates();
      fetchAgents();

      // If we have a restored selectedThread, load its messages
      if (selectedThread && !selectedThread.isNew) {
        loadMessages(selectedThread);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // 2. Scroll Effect
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. FETCH MISSING PRODUCT IMAGES (from eBay API)
  useEffect(() => {
    const fetchMissingImages = async () => {
      // Find threads that need images (ORDER type without productImageUrl)
      const threadsNeedingImages = threads.filter(thread => {
        const msgType = thread.actualMessageType || thread.messageType;
        return (
          msgType === 'ORDER' &&
          !thread.productImageUrl &&
          thread.itemId &&
          thread.itemId !== 'DIRECT_MESSAGE' &&
          thread.sellerId &&
          !threadImages[thread.itemId] && // Not already fetched
          !fetchingImages.has(thread.itemId) // Not currently fetching
        );
      });

      if (threadsNeedingImages.length === 0) return;

      // Mark as fetching
      const newFetching = new Set(fetchingImages);
      threadsNeedingImages.forEach(t => newFetching.add(t.itemId));
      setFetchingImages(newFetching);

      // Fetch images in parallel (max 5 at a time to avoid overwhelming the server)
      const batchSize = 5;
      for (let i = 0; i < threadsNeedingImages.length; i += batchSize) {
        const batch = threadsNeedingImages.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (thread) => {
            try {
              const res = await api.get(`/ebay/item-images/${thread.itemId}`, {
                params: { sellerId: thread.sellerId, thumbnail: true }
              });
              const url = res.data?.thumbnail || res.data?.images?.[0] || null;
              
              if (url) {
                setThreadImages(prev => ({ ...prev, [thread.itemId]: url }));
              }
            } catch (err) {
              // Silently fail - just won't show image for this thread
              console.debug(`Failed to fetch image for ${thread.itemId}`, err.message);
            } finally {
              // Remove from fetching set
              setFetchingImages(prev => {
                const updated = new Set(prev);
                updated.delete(thread.itemId);
                return updated;
              });
            }
          })
        );
      }
    };

    fetchMissingImages();
  }, [threads]); // Re-run when threads change

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
      // Don't log 401 errors - they're handled by the interceptor
      if (e.response?.status !== 401) {
        console.error("Inbox Sync failed", e);
        setSnackbarMsg('Sync failed: ' + (e.response?.data?.error || e.message));
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } finally {
      setSyncingInbox(false);
    }
  }

  function handleClearFilters() {
    const reset = { seller: '', filterType: 'ALL', filterMarketplace: '', showUnreadOnly: false, searchQuery: '', dateMode: 'none', dateSingle: '', dateFrom: '', dateTo: '', excludeClient: pendingFilters.excludeClient };
    setPendingFilters(reset);
    setSelectedSeller('');
    setFilterType('ALL');
    setFilterMarketplace('');
    setShowUnreadOnly(false);
    setSearchQuery('');
    setAppliedDateMode('none');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    loadThreads(true, { sellerId: '', filterType: 'ALL', filterMarketplace: '', showUnreadOnly: false, searchQuery: '', dateFrom: '', dateTo: '', excludeClient: pendingFilters.excludeClient });
  }

  function handleApplyFilters() {
    const { seller, filterType: ft, filterMarketplace: fm, showUnreadOnly: su, searchQuery: sq, dateMode, dateSingle, dateFrom: df, dateTo: dt, excludeClient: ec } = pendingFilters;
    const effectiveDateFrom = dateMode === 'single' ? dateSingle : dateMode === 'range' ? df : '';
    const effectiveDateTo = dateMode === 'single' ? dateSingle : dateMode === 'range' ? dt : '';
    setSelectedSeller(seller);
    setFilterType(ft);
    setFilterMarketplace(fm);
    setShowUnreadOnly(su);
    setSearchQuery(sq);
    setAppliedDateMode(dateMode);
    setDateFrom(effectiveDateFrom);
    setDateTo(effectiveDateTo);
    setPage(1);
    loadThreads(true, { sellerId: seller, filterType: ft, filterMarketplace: fm, showUnreadOnly: su, searchQuery: sq, dateFrom: effectiveDateFrom, dateTo: effectiveDateTo, excludeClient: ec });
  }

  async function loadThreads(reset = false, overrides = {}) {
    if (loadingThreads) return;
    setLoadingThreads(true);
    if (reset) setThreads([]); // Clear immediately so stale results don't show during load

    try {
      const currentPage = reset ? 1 : page;
      const effectiveSeller = 'sellerId' in overrides ? overrides.sellerId : selectedSeller;
      const effectiveFilterType = 'filterType' in overrides ? overrides.filterType : filterType;
      const effectiveFilterMarketplace = 'filterMarketplace' in overrides ? overrides.filterMarketplace : filterMarketplace;
      const effectiveShowUnreadOnly = 'showUnreadOnly' in overrides ? overrides.showUnreadOnly : showUnreadOnly;
      const effectiveSearch = 'searchQuery' in overrides ? overrides.searchQuery : searchQuery;
      const effectiveDateFrom = 'dateFrom' in overrides ? overrides.dateFrom : dateFrom;
      const effectiveDateTo = 'dateTo' in overrides ? overrides.dateTo : dateTo;
      const effectiveExcludeClient = 'excludeClient' in overrides ? overrides.excludeClient : pendingFilters.excludeClient;

      const params = {
        page: currentPage,
        limit: 50,
        search: effectiveSearch,
        filterType: effectiveFilterType,
        filterMarketplace: effectiveFilterMarketplace,
        showUnreadOnly: effectiveShowUnreadOnly,
        excludeClient: effectiveExcludeClient
      };

      if (effectiveSeller) params.sellerId = effectiveSeller;
      if (effectiveDateFrom) params.dateFrom = effectiveDateFrom;
      if (effectiveDateTo) params.dateTo = effectiveDateTo;

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
      // Don't log 401 errors - they're handled by the interceptor
      if (e.response?.status !== 401) {
        console.error('Failed to load threads', e);
      }
      // Set empty array on error to prevent crashes
      if (reset) {
        setThreads([]);
      }
    } finally {
      setLoadingThreads(false);
    }
  }

  async function handleThreadSelect(thread) {
    setSelectedThread(thread);
    setSearchError('');

    // Close sidebar on mobile and tablet when thread is selected
    if (isMobile || isTablet) {
      setSidebarOpen(false);
    }

    // Load messages without changing read state. Read/unread is now explicit.
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
      // Don't log 401 errors - they're handled by the interceptor
      if (e.response?.status !== 401) {
        console.error('Failed to load messages', e);
      }
      // Set empty array on error to prevent crashes
      setMessages([]);
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

  const isSameThread = (thread, target) => {
    if (!thread || !target) return false;
    return thread.orderId
      ? thread.orderId === target.orderId
      : (thread.buyerUsername === target.buyerUsername && thread.itemId === target.itemId);
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

  // Template menu handlers
  const handleTemplateClick = (event) => {
    setTemplateAnchorEl(event.currentTarget);
  };

  const handleTemplateClose = () => {
    setTemplateAnchorEl(null);
  };

  const handleSelectTemplate = (templateText) => {
    // Get buyer name from selectedThread
    const buyerName = selectedThread?.buyerName || selectedThread?.buyerUsername || 'Buyer';
    const firstName = buyerName.split(' ')[0];

    // Replace "Hi," with "Hi Name,"
    let personalizedText = templateText;
    if (personalizedText.startsWith('Hi,')) {
      personalizedText = personalizedText.replace('Hi,', `Hi ${firstName},`);
    } else {
      personalizedText = `Hi ${firstName},\n\n${personalizedText}`;
    }

    setNewMessage(personalizedText);
    handleTemplateClose();
  };

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
          if (isSameThread(t, selectedThread)) {
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

  async function handleMarkAsRead() {
    if (!selectedThread) return;

    setMarkingRead(true);
    try {
      const payload = {
        orderId: selectedThread.orderId,
        buyerUsername: selectedThread.buyerUsername,
        itemId: selectedThread.itemId
      };

      await api.post('/ebay/chat/mark-read', payload);

      setThreads(prevThreads =>
        prevThreads.map(t => isSameThread(t, selectedThread) ? { ...t, unreadCount: 0 } : t)
      );
      setSelectedThread(prev => prev ? { ...prev, unreadCount: 0 } : prev);
      setMessages(prev => prev.map(m => m.sender === 'BUYER' ? { ...m, read: true } : m));

      setSnackbarMsg('Conversation marked as read');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

    } catch (err) {
      setSnackbarMsg('Failed to mark as read: ' + (err.response?.data?.error || err.message));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setMarkingRead(false);
    }
  }

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: { xs: 'column', md: 'row' },
      height: { xs: '100vh', md: '85vh' },
      gap: { xs: 0, md: 2 },
      position: 'relative'
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

      {/* LEFT: SIDEBAR */}
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
        boxShadow: { xs: 3, sm: 3, md: 1 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: `${dashboardSignatureTokens.radius.card}px`,
      }}>
        <Box sx={{
          p: { xs: 1.5, md: 2 },
          background: dashboardSignatureTokens.surfaces.pageCard,
          borderBottom: '1px solid',
          borderColor: 'divider',
          overflowY: 'auto',
        }}>
          {/* Header row */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: 0.2 }}>
              Inbox Filters
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              {(isMobile || isTablet) && (
                <IconButton onClick={() => setSidebarOpen(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
              )}
            </Stack>
          </Stack>

          {/* Filters - Vertically stacked, full width */}
          <Stack
            direction="column"
            spacing={1.5}
            sx={{ mb: 2, pointerEvents: loadingThreads ? 'none' : 'auto', opacity: loadingThreads ? 0.5 : 1, transition: 'opacity 0.2s' }}
          >
            <FormControl fullWidth size="small">
              <InputLabel>Seller</InputLabel>
              <Select
                value={pendingFilters.seller}
                label="Seller"
                onChange={(e) => setPendingFilters(p => ({ ...p, seller: e.target.value }))}
              >
                <MenuItem value=""><em>All Sellers</em></MenuItem>
                {sellers.map((s) => (
                  <MenuItem key={s._id} value={s._id}>{s.user?.username || s.user?.email}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Message Type</InputLabel>
              <Select
                value={pendingFilters.filterType}
                label="Message Type"
                onChange={(e) => setPendingFilters(p => ({ ...p, filterType: e.target.value }))}
              >
                <MenuItem value="ALL">All Messages</MenuItem>
                <MenuItem value="ORDER">Order Related</MenuItem>
                <MenuItem value="INQUIRY">Inquiries Only</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Marketplace</InputLabel>
              <Select
                value={pendingFilters.filterMarketplace}
                label="Marketplace"
                onChange={(e) => setPendingFilters(p => ({ ...p, filterMarketplace: e.target.value }))}
              >
                <MenuItem value="">All Marketplaces</MenuItem>
                <MenuItem value="EBAY_US">United States (US)</MenuItem>
                <MenuItem value="EBAY_CA">Canada (CA)</MenuItem>
                <MenuItem value="EBAY_AU">Australia (AU)</MenuItem>
                <MenuItem value="EBAY_GB">United Kingdom (GB)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Read Status</InputLabel>
              <Select
                value={pendingFilters.showUnreadOnly}
                label="Read Status"
                onChange={(e) => setPendingFilters(p => ({ ...p, showUnreadOnly: e.target.value }))}
              >
                <MenuItem value={false}>All Conversations</MenuItem>
                <MenuItem value={true}>Unread Only</MenuItem>
                <MenuItem value="readOnly">Read Only</MenuItem>
              </Select>
            </FormControl>

            {/* DATE FILTER — mode selector + conditional inputs */}
            <FormControl fullWidth size="small">
              <InputLabel>Date Filter</InputLabel>
              <Select
                value={pendingFilters.dateMode}
                label="Date Filter"
                onChange={(e) => setPendingFilters(p => ({ ...p, dateMode: e.target.value, dateSingle: '', dateFrom: '', dateTo: '' }))}
              >
                <MenuItem value="none">No Date Filter</MenuItem>
                <MenuItem value="single">Single Day (PT)</MenuItem>
                <MenuItem value="range">Date Range (PT)</MenuItem>
              </Select>
            </FormControl>

            {pendingFilters.dateMode === 'single' && (
              <TextField
                fullWidth size="small" label="Date (PT)" type="date"
                value={pendingFilters.dateSingle}
                onChange={(e) => setPendingFilters(p => ({ ...p, dateSingle: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            )}
            {pendingFilters.dateMode === 'range' && (
              <>
                <TextField
                  fullWidth size="small" label="From (PT)" type="date"
                  value={pendingFilters.dateFrom}
                  onChange={(e) => setPendingFilters(p => ({ ...p, dateFrom: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth size="small" label="To (PT)" type="date"
                  value={pendingFilters.dateTo}
                  onChange={(e) => setPendingFilters(p => ({ ...p, dateTo: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </>
            )}

            {/* Exclude Client Toggle */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5, py: 0.25, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>Exclude Client</Typography>
              <Switch
                size="small"
                checked={!!pendingFilters.excludeClient}
                onChange={(e) => setPendingFilters(p => ({ ...p, excludeClient: e.target.checked }))}
                sx={{ '& .MuiSwitch-thumb': { bgcolor: pendingFilters.excludeClient ? BRAND_YELLOW : undefined }, '& .MuiSwitch-track': { bgcolor: pendingFilters.excludeClient ? `${BRAND_YELLOW} !important` : undefined } }}
              />
            </Box>

            {/* Search */}
            <TextField
              size="small" fullWidth
              placeholder="Search User, Order, or Item..."
              value={pendingFilters.searchQuery}
              onChange={(e) => setPendingFilters(p => ({ ...p, searchQuery: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleApplyFilters(); }}
            />
          </Stack>

          {/* Action buttons row */}
          <Stack direction="row" spacing={1} mb={1.5}>
            <Button
              variant="contained"
              fullWidth
              size="small"
              disabled={loadingThreads}
              onClick={handleApplyFilters}
              startIcon={loadingThreads ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
              sx={{ ...yellowFilledButtonSx, height: 36 }}
            >
              {loadingThreads ? 'Loading...' : 'Apply Filters'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={loadingThreads}
              onClick={handleClearFilters}
              startIcon={<FilterListOffIcon />}
              sx={{ ...yellowOutlinedButtonSx, height: 36, minWidth: 'auto', px: 1.5 }}
            >
              Clear
            </Button>
          </Stack>

          {/* Check New row */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
              Inbox
            </Typography>
            <Button
              size="small"
              startIcon={syncingInbox ? <CircularProgress size={14} /> : <RefreshIcon fontSize="small" />}
              onClick={handleManualSync}
              disabled={syncingInbox || loadingThreads}
              variant="outlined"
              sx={{ ...yellowOutlinedButtonSx, height: 30, fontSize: '0.75rem' }}
            >
              {syncingInbox ? 'Syncing...' : 'Check New'}
            </Button>
          </Stack>
        </Box>

        {/* THREAD LIST — wrapped in relative container for overlay */}
        <Box sx={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Loading overlay: blocks all interaction while threads are fetching */}
          {loadingThreads && (
            <Box sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              bgcolor: 'rgba(255,255,255,0.75)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              backdropFilter: 'blur(2px)'
            }}>
              <CircularProgress />
              <Typography variant="caption" color="text.secondary">Loading conversations…</Typography>
            </Box>
          )}
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
                    sx={isSelected ? { borderLeft: `3px solid ${BRAND_YELLOW}`, bgcolor: BRAND_YELLOW + '1a' } : { borderLeft: '3px solid transparent' }}
                  >
                    <ListItemAvatar>
                      <Badge color="error" badgeContent={thread.unreadCount}>
                        {/* Use actualMessageType (computed in real-time) if available, else fallback to messageType */}
                        {(() => {
                          const msgType = thread.actualMessageType || thread.messageType;
                          const isOrder = msgType === 'ORDER';
                          const isDirect = msgType === 'DIRECT';

                          // Get image URL from DB or fetched state
                          const imageUrl = thread.productImageUrl || threadImages[thread.itemId] || null;
                          const isLoadingImage = fetchingImages.has(thread.itemId);

                          // Show product thumbnail for ORDER messages if image is available
                          if (isOrder && imageUrl) {
                            return (
                              <Avatar
                                src={imageUrl}
                                variant="rounded"
                                sx={{
                                  width: 48,
                                  height: 48,
                                  border: '2px solid',
                                  borderColor: BRAND_YELLOW
                                }}
                              />
                            );
                          }

                          // Show loading spinner if fetching image for ORDER
                          if (isOrder && isLoadingImage) {
                            return (
                              <Avatar
                                variant="rounded"
                                sx={{
                                  width: 48,
                                  height: 48,
                                  border: '2px solid',
                                  borderColor: BRAND_YELLOW,
                                  bgcolor: BRAND_YELLOW + '33'
                                }}
                              >
                                <CircularProgress size={20} />
                              </Avatar>
                            );
                          }

                          // Otherwise show icon
                          return (
                            <Avatar sx={{
                              bgcolor: isOrder
                                ? BRAND_YELLOW
                                : isDirect
                                  ? BRAND_DARK
                                  : BRAND_YELLOW_DARK,
                              color: isOrder
                                ? BRAND_DARK
                                : '#fff'
                            }}>
                              {isOrder
                                ? <ShoppingBagIcon fontSize="small" />
                                : isDirect
                                  ? <EmailIcon fontSize="small" />
                                  : <QuestionAnswerIcon fontSize="small" />
                              }
                            </Avatar>
                          );
                        })()}
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
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
                                  bgcolor: BRAND_YELLOW + '22',
                                  color: BRAND_DARK,
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
                sx={yellowOutlinedButtonSx}
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
        </Box>
      </Paper>

      {/* Button to open sidebar when closed */}
      {!sidebarOpen && !selectedThread && (
        <Box sx={{ p: 2, width: '100%' }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<QuestionAnswerIcon />}
            onClick={() => setSidebarOpen(true)}
            sx={yellowFilledButtonSx}
          >
            View Conversations
          </Button>
        </Box>
      )}

      {/* RIGHT: CHAT AREA */}
      <Paper sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        width: { xs: '100%', md: 'auto' },
        height: { xs: '100vh', md: '100%' },
        minWidth: 0,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: `${dashboardSignatureTokens.radius.card}px`,
        boxShadow: dashboardSignatureTokens.shadows.card,
        overflow: 'hidden',
      }}>
        {/* ... existing chat area code ... */}
        {
          selectedThread ? (
            <>
              <Box sx={{
                p: { xs: 1.5, md: 2 },
                borderBottom: '1px solid',
                borderColor: 'divider',
                background: dashboardSignatureTokens.surfaces.pageCard,
                position: 'relative'
              }}>
                {/* Mobile & Tablet: Back button */}
                {(isMobile || isTablet) && (
                  <IconButton
                    onClick={() => {
                      setSelectedThread(null);
                      setSidebarOpen(true);
                    }}
                    sx={{ mb: 1 }}
                  >
                    <CloseIcon />
                  </IconButton>
                )}

                {/* ROW 1: Seller identity + quick actions */}
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Chip
                    label={getSellerName(selectedThread.sellerId)}
                    size="small"
                    icon={<PersonIcon style={{ fontSize: 16 }} />}
                    sx={{
                      bgcolor: BRAND_DARK,
                      color: BRAND_YELLOW,
                      fontWeight: 'bold',
                      height: 28,
                      fontSize: '0.8rem'
                    }}
                  />
                  {selectedThread.isNew && (
                    <Chip label="New" size="small" color="success" sx={{ height: 24 }} />
                  )}
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title="Choose a response template">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleTemplateClick}
                      disabled={sending}
                      sx={{
                        height: 28,
                        fontSize: '0.72rem',
                        minWidth: 90,
                        bgcolor: 'background.paper',
                        px: 1
                      }}
                      endIcon={<ExpandMoreIcon sx={{ fontSize: '14px !important' }} />}
                    >
                      Templates
                    </Button>
                  </Tooltip>
                  {!selectedThread.isNew && (
                    <>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleMarkAsRead}
                        disabled={markingRead}
                        startIcon={markingRead ? <CircularProgress size={12} color="inherit" /> : <MarkEmailReadIcon sx={{ fontSize: '14px !important' }} />}
                        sx={{ height: 28, fontSize: '0.72rem', px: 1 }}
                      >
                        {markingRead ? 'Marking...' : 'Mark Read'}
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleMarkAsUnread}
                        disabled={markingUnread}
                        startIcon={markingUnread ? <CircularProgress size={12} color="inherit" /> : <MarkAsUnreadIcon sx={{ fontSize: '14px !important' }} />}
                        sx={{ height: 28, fontSize: '0.72rem', px: 1 }}
                      >
                        {markingUnread ? 'Marking...' : 'Mark Unread'}
                      </Button>
                    </>
                  )}
                  <IconButton
                    onClick={() => setSelectedThread(null)}
                    size="small"
                    sx={{ color: 'text.disabled' }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Stack>

                {/* ROW 2: Case meta fields */}
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  flexWrap="wrap"
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  sx={{ mb: 1.5, gap: 1 }}
                >
                  <FormControl
                    size="small"
                    sx={{
                      minWidth: { xs: '100%', sm: 130, md: 150 },
                      '& .MuiInputBase-root': { height: 32 }
                    }}
                  >
                    <InputLabel shrink sx={{ fontSize: '0.78rem' }}>About</InputLabel>
                    <Select
                      value={metaCategory}
                      label="About"
                      displayEmpty
                      notched
                      onChange={(e) => setMetaCategory(e.target.value)}
                      sx={{ fontSize: '0.78rem' }}
                      renderValue={(selected) => selected ? selected : <em style={{ color: '#999', fontSize: '0.78rem' }}>— Not a Case —</em>}
                    >
                      <MenuItem value=""><em>— Not a Case —</em></MenuItem>
                      <MenuItem value="INR">INR</MenuItem>
                      <MenuItem value="Cancellation">Cancellation</MenuItem>
                      <MenuItem value="Return">Return</MenuItem>
                      <MenuItem value="Refund">Refund</MenuItem>
                      <MenuItem value="Replace">Replace</MenuItem>
                      <MenuItem value="Out of Stock">Out of Stock</MenuItem>
                      <MenuItem value="Issue with Product">Issue with Product</MenuItem>
                      <MenuItem value="Inquiry">Inquiry</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl
                    size="small"
                    sx={{
                      minWidth: { xs: '100%', sm: 120, md: 140 },
                      '& .MuiInputBase-root': { height: 32 }
                    }}
                  >
                    <InputLabel sx={{ fontSize: '0.78rem' }}>Status</InputLabel>
                    <Select
                      value={metaCaseStatus}
                      label="Status"
                      onChange={(e) => setMetaCaseStatus(e.target.value)}
                      sx={{ fontSize: '0.78rem' }}
                    >
                      <MenuItem value="Case Not Opened">Case Not Opened</MenuItem>
                      <MenuItem value="Open">Open</MenuItem>
                      <MenuItem value="In Progress">In Progress</MenuItem>
                      <MenuItem value="Resolved">Resolved</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl
                    size="small"
                    sx={{
                      minWidth: { xs: '100%', sm: 140, md: 170 },
                      '& .MuiInputBase-root': { height: 32 }
                    }}
                  >
                    <InputLabel shrink sx={{ fontSize: '0.78rem' }}>Picked Up By</InputLabel>
                    <Select
                      value={metaPickedUpBy}
                      label="Picked Up By"
                      onChange={(e) => setMetaPickedUpBy(e.target.value)}
                      sx={{ fontSize: '0.78rem' }}
                      displayEmpty
                      renderValue={(selected) => (selected ? selected : '— Unassigned —')}
                    >
                      <MenuItem value=""><em>— Unassigned —</em></MenuItem>
                      {chatAgents.map(agent => (
                        <MenuItem key={agent._id} value={agent.name}>{agent.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSaveMeta}
                    disabled={savingMeta}
                    sx={{
                      ...yellowFilledButtonSx,
                      height: 32,
                      minWidth: 36,
                      px: 1
                    }}
                  >
                    {savingMeta ? <CircularProgress size={14} color="inherit" /> : <SaveIcon sx={{ fontSize: 16 }} />}
                  </Button>
                </Stack>

                {/* Templates Menu - Positioned outside the header Stack */}
                <Menu
                  anchorEl={templateAnchorEl}
                  open={Boolean(templateAnchorEl)}
                  onClose={handleTemplateClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  PaperProps={{
                    style: {
                      maxHeight: 400,
                      width: 320,
                    },
                  }}
                >
                  {/* Manage Templates Button */}
                  <MenuItem
                    onClick={() => { handleTemplateClose(); setManageTemplatesOpen(true); }}
                    sx={{
                      borderBottom: '2px solid #e0e0e0',
                      bgcolor: '#f9f9ff',
                      py: 1.5
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <SettingsIcon fontSize="small" color="primary" />
                      <Typography variant="subtitle2" color="primary">Manage Templates</Typography>
                    </Stack>
                  </MenuItem>

                  {templatesLoading ? (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <CircularProgress size={20} />
                    </Box>
                  ) : chatTemplates.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                      No templates available. Click "Manage Templates" to add some.
                    </Typography>
                  ) : (
                    chatTemplates.map((group, index) => (
                      <Box key={index}>
                        <ListSubheader
                          sx={{
                            bgcolor: 'background.default',
                            fontWeight: 'bold',
                            lineHeight: '32px',
                            color: 'primary.main',
                            fontSize: '0.75rem'
                          }}
                        >
                          {group.category}
                        </ListSubheader>
                        {group.items.map((item, idx) => (
                          <MenuItem
                            key={item._id || idx}
                            onClick={() => handleSelectTemplate(item.text)}
                            sx={{
                              fontSize: '0.85rem',
                              whiteSpace: 'normal',
                              py: 1,
                              borderBottom: '1px solid #f0f0f0',
                              display: 'block'
                            }}
                          >
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                              {item.label}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                fontSize: '0.75rem'
                              }}
                            >
                              {item.text}
                            </Typography>
                          </MenuItem>
                        ))}
                      </Box>
                    ))
                  )}
                </Menu>

                {/* Template Management Modal */}
                <TemplateManagementModal
                  open={manageTemplatesOpen}
                  onClose={() => {
                    setManageTemplatesOpen(false);
                    loadChatTemplates();
                  }}
                />

                {/* MAIN CONTENT - Responsive padding */}
                <Stack spacing={1.5} sx={{
                  pl: { xs: 0, md: 0 },
                  pr: { xs: 0, md: 0 },
                  mt: { xs: 1, md: 1 },
                  mb: { md: 0 }
                }}>

                  {/* 1. BUYER IDENTITY - Stack on mobile */}
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={{ xs: 1, sm: 3 }}
                  >
                    <Box>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        Buyer Name
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.1, fontSize: { xs: '0.9rem', md: '1rem' } }}>
                        {selectedThread.buyerName || '-'}
                      </Typography>
                    </Box>

                    {!isMobile && (
                      <Divider orientation="vertical" flexItem sx={{ height: 20, alignSelf: 'center', opacity: 0.5 }} />
                    )}

                    <Box>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        Username
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(0,0,0,0.05)', px: 0.5, borderRadius: 0.5, fontSize: { xs: '0.8rem', md: '0.875rem' } }}>
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
                        {/* Product thumbnail */}
                        {threadThumbnail && (
                          <Box
                            component="img"
                            src={threadThumbnail}
                            alt="Product"
                            sx={{
                              width: 44,
                              height: 44,
                              objectFit: 'cover',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'grey.300',
                              flexShrink: 0,
                              mr: 0.5
                            }}
                          />
                        )}
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
                        onClick={() => setSelectedOrderId(selectedThread.orderId)}
                        sx={{
                          borderRadius: 1,
                          height: 30,
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          color: BRAND_DARK,
                          borderColor: BRAND_YELLOW_DARK,
                          bgcolor: BRAND_YELLOW + '15',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: BRAND_YELLOW + '33' }
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
                          bgcolor: BRAND_YELLOW + '22',
                          color: BRAND_DARK,
                        }}
                      />
                    )}
                  </Box>

                </Stack>
              </Box>

              <Box sx={{
                flex: 1,
                p: { xs: 1.5, md: 2 },
                overflowY: 'auto',
                bgcolor: dashboardSignatureTokens.tones.neutral.background
              }}>
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
                          maxWidth: { xs: '85%', sm: '75%', md: '70%' }
                        }}
                      >
                        <Paper
                          elevation={1}
                          sx={{
                            p: { xs: 1, md: 1.5 },
                            bgcolor: msg.sender === 'SELLER' ? '#fef9e7' : 'background.paper',
                            color: msg.sender === 'SELLER' ? BRAND_DARK : 'text.primary',
                            border: msg.sender === 'SELLER' ? `1px solid ${BRAND_YELLOW}` : '1px solid',
                            borderColor: msg.sender === 'SELLER' ? BRAND_YELLOW : 'divider',
                            borderRadius: 2,
                            position: 'relative'
                          }}
                        >
                          <Typography
                            variant="body1"
                            sx={{
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontSize: { xs: '0.875rem', md: '1rem' }
                            }}
                          >
                            {msg.body}
                          </Typography>

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
                                      maxWidth: { xs: 150, md: 200 },
                                      fontSize: { xs: '0.7rem', md: '0.75rem' }
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
                          sx={{
                            display: 'block',
                            mt: 0.5,
                            textAlign: msg.sender === 'SELLER' ? 'right' : 'left',
                            fontSize: { xs: '0.7rem', md: '0.75rem' }
                          }}
                        >
                          {new Date(msg.messageDate).toLocaleString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} UTC
                          {msg.sender === 'SELLER' && (msg.read ? ' • Read' : ' • Sent')}
                        </Typography>
                      </Box>
                    ))}
                    <div ref={messagesEndRef} />
                  </Stack>
                )}
              </Box>

              <Box sx={{
                p: { xs: 1.5, md: 2 },
                borderTop: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                gap: 1
              }}>
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
                            sx={{ maxWidth: { xs: 150, md: 200 } }}
                          />
                        ))}
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
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
                        maxRows={isMobile ? 3 : 5}
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={sending}
                        size={isMobile ? 'small' : 'medium'}
                      />

                      <Button
                        variant="contained"
                        sx={{
                          ...yellowFilledButtonSx,
                          px: { xs: 2, md: 3 },
                          alignSelf: 'flex-end',
                          mb: 0.5,
                          minWidth: { xs: 'auto', md: 'auto' }
                        }}
                        endIcon={sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                        onClick={handleSendMessage}
                        disabled={sending || (!newMessage.trim() && attachments.length === 0)}
                      >
                        {isMobile ? '' : 'Send'}
                      </Button>
                    </Box>
                  </>
                )}
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: 'background.default' }}>
              <Stack alignItems="center" spacing={1}>
                <QuestionAnswerIcon sx={{ fontSize: { xs: 40, md: 60 }, color: 'text.secondary', opacity: 0.2 }} />
                <Typography color="text.secondary" sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
                  {isMobile ? 'Select a conversation' : 'Select a conversation or search an Order ID'}
                </Typography>
                {!sidebarOpen && (
                  <Button
                    variant="contained"
                    onClick={() => setSidebarOpen(true)}
                    sx={{ ...yellowFilledButtonSx, mt: 1 }}
                    startIcon={<MenuIcon />}
                  >
                    View Conversations
                  </Button>
                )}
              </Stack>
            </Box>
          )
        }
      </Paper>

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

      {/* Order Details Modal */}
      {selectedOrderId && (
        <OrderDetailsModal
          open={Boolean(selectedOrderId)}
          onClose={() => setSelectedOrderId(null)}
          orderId={selectedOrderId}
        />
      )}
    </Box >
  );
}
