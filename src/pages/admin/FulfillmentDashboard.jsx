import React, { useEffect, useState,useRef } from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  TextField,
  Tooltip,
  IconButton,
  Pagination,
  Link,
  Checkbox,
  FormControlLabel,
  Popover,
  List,
  ListItem
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';


import ChatIcon from '@mui/icons-material/Chat';

import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';

import PersonIcon from '@mui/icons-material/Person'; // <--- Add this
import OpenInNewIcon from '@mui/icons-material/OpenInNew'; // <--- Add this


import api from '../../lib/api';


// --- NEW COMPONENT: Chat Dialog (Visual Match with BuyerChatPage) ---
function ChatDialog({ open, onClose, order }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollingInterval = useRef(null);

  // Load messages when dialog opens
  useEffect(() => {
    if (open && order) {
      loadMessages();
      startPolling();
    } else {
      stopPolling();
      setMessages([]);
      setNewMessage('');
    }
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopPolling = () => {
    if (pollingInterval.current) clearInterval(pollingInterval.current);
  };

  const startPolling = () => {
    stopPolling();
    pollingInterval.current = setInterval(() => {
      if (order) {
        const itemId = order.itemNumber || order.lineItems?.[0]?.legacyItemId;
        api.post('/ebay/sync-thread', {
          sellerId: order.seller?._id || order.seller,
          buyerUsername: order.buyer?.username,
          itemId: itemId
        }).then(res => {
          if (res.data.newMessagesFound) {
            loadMessages(false);
          }
        }).catch(err => console.error("Polling error", err));
      }
    }, 10000);
  };

  async function loadMessages(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get('/ebay/chat/messages', {
        params: { orderId: order.orderId }
      });
      setMessages(data || []);
    } catch (e) {
      console.error("Failed to load messages", e);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const itemId = order.itemNumber || order.lineItems?.[0]?.legacyItemId;
      const { data } = await api.post('/ebay/send-message', {
        orderId: order.orderId,
        buyerUsername: order.buyer?.username,
        itemId: itemId,
        body: newMessage,
        subject: `Regarding Order #${order.orderId}`
      });

      setMessages([...messages, data.message]);
      setNewMessage('');
    } catch (e) {
      alert('Failed to send: ' + (e.response?.data?.error || e.message));
    } finally {
      setSending(false);
    }
  }

  // Helper to safely extract data from the Order object
  const sellerName = order?.seller?.user?.username || 'Seller';
  const buyerName = order?.buyer?.buyerRegistrationAddress?.fullName || '-';
  const buyerUsername = order?.buyer?.username || '-';
  const itemId = order?.itemNumber || order?.lineItems?.[0]?.legacyItemId || '';
  let itemTitle = order?.productName || order?.lineItems?.[0]?.title || '';
  const itemCount = order?.lineItems?.length || 0;
  if (itemCount > 1) {
     itemTitle = `${itemTitle} (+ ${itemCount - 1} other${itemCount - 1 > 1 ? 's' : ''})`;
  }

  

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      
      {/* --- HEADER (MATCHING BUYER CHAT PAGE) --- */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: '#fff', position: 'relative' }}>
        
        {/* Top Right: Seller Chip & Close */}
        <Stack 
          direction="row" 
          spacing={1} 
          alignItems="center" 
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          <Chip 
            label={sellerName} 
            size="small" 
            icon={<PersonIcon style={{ fontSize: 16 }} />} 
            sx={{ 
              bgcolor: '#e3f2fd', 
              color: '#1565c0', 
              fontWeight: 'bold', 
              height: 24,
              fontSize: '0.75rem'
            }} 
          />
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.disabled', ml: 1 }}>
            <CloseIcon />
          </IconButton>
        </Stack>

        {/* Main Content: Buyer & Item */}
        <Stack spacing={1.5} sx={{ pr: 12 }}> 
          
          {/* 1. Buyer Info */}
          <Stack direction="row" alignItems="center" spacing={3} sx={{ mt: 0.5 }}>
              <Box>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      Buyer Name
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.1 }}>
                      {buyerName}
                  </Typography>
              </Box>

              <Divider orientation="vertical" flexItem sx={{ height: 20, alignSelf: 'center', opacity: 0.5 }} />

              <Box>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      Username
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(0,0,0,0.05)', px: 0.5, borderRadius: 0.5 }}>
                      {buyerUsername}
                  </Typography>
              </Box>
          </Stack>

          {/* 2. Item Link & Order ID */}
          <Box>
              <Link 
                  href={`https://www.ebay.com/itm/${itemId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5 }}
              >
                  <Typography 
                      variant="subtitle2" 
                      sx={{ 
                          color: 'primary.main', 
                          fontWeight: 600,
                          lineHeight: 1.3
                      }}
                  >
                       {itemTitle || `Item ID: ${itemId}`}
                  </Typography>
                  <OpenInNewIcon sx={{ fontSize: 16, color: 'primary.main', mt: 0.3 }} />
              </Link>

              <Chip 
                  label={`Order #: ${order?.orderId}`}
                  size="small"
                  variant="outlined"
                  sx={{ 
                      borderRadius: 1, 
                      height: 22, 
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                      borderColor: 'divider',
                      bgcolor: '#fafafa'
                  }}
              />
          </Box>
        </Stack>
      </Box>

      {/* --- CHAT AREA (MATCHING BUYER CHAT PAGE) --- */}
      <DialogContent sx={{ p: 0, bgcolor: '#f0f2f5', height: '500px', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1, p: 2, overflowY: 'auto' }}>
          {loading ? (
            <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
          ) : (
            <Stack spacing={2}>
              {messages.length === 0 && (
                <Alert severity="info" sx={{ mx: 'auto', width: 'fit-content' }}>
                  No messages yet. Start the conversation below!
                </Alert>
              )}
              
              {messages.map((msg) => (
                <Box 
                  key={msg._id} 
                  sx={{ 
                    alignSelf: msg.sender === 'SELLER' ? 'flex-end' : 'flex-start',
                    maxWidth: '70%' // Constrain width like Buyer Chat
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
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{msg.body}</Typography>
                     
                     {/* Images */}
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
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: msg.sender === 'SELLER' ? 'right' : 'left', fontSize: '0.7rem' }}>
                    {new Date(msg.messageDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    {msg.sender === 'SELLER' && (msg.read ? ' • Read' : ' • Sent')}
                  </Typography>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Stack>
          )}
        </Box>

        {/* --- INPUT AREA --- */}
        <Box sx={{ p: 2, bgcolor: '#fff', borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
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
            size="small"
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
      </DialogContent>
    </Dialog>
  );
}




function EditableCell({ value, type = 'text', onSave }) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');
 

 

  useEffect(() => { setTempValue(value || ''); }, [value]);

  const handleSave = () => { onSave(tempValue); setEditing(false); };

  if (editing) {
    return (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <TextField 
          size="small" type={type} value={tempValue} autoFocus
          onChange={(e) => setTempValue(e.target.value)} 
          sx={{ width: type === 'date' ? 130 : 80, '& input': { p: 0.5 } }} 
        />
        <Button size="small" variant="contained" onClick={handleSave} sx={{ minWidth: 30, p: 0.5 }}>✓</Button>
        <Button size="small" onClick={() => setEditing(false)} sx={{ minWidth: 20, p: 0.5 }}>X</Button>
      </Stack>
    );
  }

  let display = value;
  if (type === 'date' && value) display = new Date(value).toLocaleDateString();
  else if (type === 'number' && value) display = `$${Number(value).toFixed(2)}`;

  return (
    <Box onClick={() => setEditing(true)} sx={{ cursor: 'pointer', minHeight: 24, borderBottom: '1px dashed transparent', '&:hover': { borderBottom: '1px dashed #ccc' } }}>
      <Typography variant="body2" color={!display ? 'text.disabled' : 'text.primary'}>{display || '-'}</Typography>
    </Box>
  );
}

export default function FulfillmentDashboard() {
  const [sellers, setSellers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pollResults, setPollResults] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  // Session storage key for persisting state
  const STORAGE_KEY = 'fulfillment_dashboard_state';

  // Helper to get initial state from sessionStorage
  const getInitialState = (key, defaultValue) => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed[key] !== undefined ? parsed[key] : defaultValue;
      }
    } catch (e) {
      console.error('Error reading sessionStorage:', e);
    }
    return defaultValue;
  };

  // Search filters - restored from sessionStorage
  const [selectedSeller, setSelectedSeller] = useState(() => getInitialState('selectedSeller', ''));
  const [searchOrderId, setSearchOrderId] = useState(() => getInitialState('searchOrderId', ''));
  const [searchBuyerName, setSearchBuyerName] = useState(() => getInitialState('searchBuyerName', ''));
  //const [searchSoldDate, setSearchSoldDate] = useState('');
  const [searchMarketplace, setSearchMarketplace] = useState(() => getInitialState('searchMarketplace', ''));
  const [filtersExpanded, setFiltersExpanded] = useState(() => getInitialState('filtersExpanded', false));

  // Pagination state - restored from sessionStorage
  const [currentPage, setCurrentPage] = useState(() => getInitialState('currentPage', 1));
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [ordersPerPage] = useState(50);

  // Expanded shipping addresses
  const [expandedShipping, setExpandedShipping] = useState({});

  // Editing messaging status
  const [editingMessagingStatus, setEditingMessagingStatus] = useState({});

  // Backfill Ad Fees state
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResults, setBackfillResults] = useState(null);

  // Editing item status
  const [editingItemStatus, setEditingItemStatus] = useState({});

  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [snackbarOrderIds, setSnackbarOrderIds] = useState([]); // Store order IDs for copying
  const [updatedOrderDetails, setUpdatedOrderDetails] = useState([]); // Store { orderId, changedFields }



  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedOrderForMessage, setSelectedOrderForMessage] = useState(null);
  const [messageBody, setMessageBody] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const [searchStartDate, setSearchStartDate] = useState('');
const [searchEndDate, setSearchEndDate] = useState('');

 const [amazonAccounts, setAmazonAccounts] = useState([]);
  
  // Column visibility state - persisted in sessionStorage
  const DEFAULT_VISIBLE_COLUMNS = [
    'seller', 'orderId', 'dateSold', 'shipBy', 'productName', 
    'buyerName', 'shippingAddress', 'marketplace', 'subtotal', 
    'shipping', 'salesTax', 'discount', 'transactionFees', 
    'adFeeGeneral', 'cancelStatus', 'refunds', 'trackingNumber',
    'amazonAccount', 'arriving', 'beforeTax', 'estimatedTax',
    'azOrderId', 'notes', 'messagingStatus'
  ];
  
  const ALL_COLUMNS = [
    { id: 'seller', label: 'Seller' },
    { id: 'orderId', label: 'Order ID' },
    { id: 'dateSold', label: 'Date Sold' },
    { id: 'shipBy', label: 'Ship By' },
    { id: 'productName', label: 'Product Name' },
    { id: 'buyerName', label: 'Buyer Name' },
    { id: 'shippingAddress', label: 'Shipping Address' },
    { id: 'marketplace', label: 'Marketplace' },
    { id: 'subtotal', label: 'Subtotal' },
    { id: 'shipping', label: 'Shipping' },
    { id: 'salesTax', label: 'Sales Tax' },
    { id: 'discount', label: 'Discount' },
    { id: 'transactionFees', label: 'Transaction Fees' },
    { id: 'adFeeGeneral', label: 'Ad Fee General' },
    { id: 'cancelStatus', label: 'Cancel Status' },
    { id: 'refunds', label: 'Refunds' },
    { id: 'trackingNumber', label: 'Tracking Number' },
    { id: 'amazonAccount', label: 'Amazon Acc' },
    { id: 'arriving', label: 'Arriving' },
    { id: 'beforeTax', label: 'Before Tax' },
    { id: 'estimatedTax', label: 'Estimated Tax' },
    { id: 'azOrderId', label: 'Az OrderID' },
    { id: 'notes', label: 'Notes' },
    { id: 'messagingStatus', label: 'Messaging' }
  ];
  
  const [visibleColumns, setVisibleColumns] = useState(() => 
    getInitialState('visibleColumns', DEFAULT_VISIBLE_COLUMNS)
  );
  const [columnSelectorOpen, setColumnSelectorOpen] = useState(false);

const [dateFilter, setDateFilter] = useState(() => getInitialState('dateFilter', {
    mode: 'none', // 'none' | 'single' | 'range'
    single: '',
    from: '',
    to: ''
  }));

  // Persist filter state to sessionStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
      selectedSeller,
      searchOrderId,
      searchBuyerName,
      searchMarketplace,
      filtersExpanded,
      currentPage,
      dateFilter,
      visibleColumns
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Error saving to sessionStorage:', e);
    }
  }, [selectedSeller, searchOrderId, searchBuyerName, searchMarketplace, filtersExpanded, currentPage, dateFilter, visibleColumns]);


const updateManualField = async (orderId, field, value) => {
  try {
    await api.patch(`/ebay/orders/${orderId}/manual-fields`, { [field]: value });
    
    // Update local state immediately
    setOrders(prev => prev.map(o => {
        if (o._id === orderId) {
            return { ...o, [field]: value };
        }
        return o;
    }));
    setSnackbarMsg('Updated successfully');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  } catch (e) {
    console.error(e);
    setSnackbarMsg('Failed to update');
    setSnackbarSeverity('error');
    setSnackbarOpen(true);
  }
};

  // Track if this is the initial mount
  const isInitialMount = useRef(true);
  const hasFetchedInitialData = useRef(false);
  
  // Track previous filter values to detect changes
  const prevFilters = useRef({
    selectedSeller,
    searchOrderId,
    searchBuyerName,
    searchMarketplace,
    dateFilter
  });

  // Fetch amazon accounts once
  useEffect(() => {
    if (!hasFetchedInitialData.current) {
      api.get('/amazon-accounts').then(({ data }) => setAmazonAccounts(data || [])).catch(console.error);
    }
  }, []);

  // Initial load - fetch sellers and orders once
  useEffect(() => {
    if (!hasFetchedInitialData.current) {
      hasFetchedInitialData.current = true;
      fetchSellers();
      loadStoredOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload orders when page changes (but not on initial mount)
  useEffect(() => {
    // Skip on initial mount (already loaded above)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadStoredOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // When filters change, reset to page 1 and reload
  useEffect(() => {
    // Check if any filter actually changed
    const filtersChanged = 
      prevFilters.current.selectedSeller !== selectedSeller ||
      prevFilters.current.searchOrderId !== searchOrderId ||
      prevFilters.current.searchBuyerName !== searchBuyerName ||
      prevFilters.current.searchMarketplace !== searchMarketplace ||
      JSON.stringify(prevFilters.current.dateFilter) !== JSON.stringify(dateFilter);
    
    // Update prev filters
    prevFilters.current = {
      selectedSeller,
      searchOrderId,
      searchBuyerName,
      searchMarketplace,
      dateFilter
    };

    // Skip on initial mount
    if (!hasFetchedInitialData.current) return;

    if (filtersChanged) {
      // Reset to page 1 when filters change
      if (currentPage === 1) {
        // Already on page 1, just reload
        loadStoredOrders();
      } else {
        // This will trigger the currentPage useEffect above
        setCurrentPage(1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeller, searchOrderId, searchBuyerName, searchMarketplace, dateFilter]);

  async function fetchSellers() {
    setError('');
    try {
      const { data } = await api.get('/sellers/all');
      setSellers(data || []);
    } catch (e) {
      setError('Failed to load sellers');
    }
  }

  async function loadStoredOrders() {
    setLoading(true);
    setError('');
    
    try {
      const params = {
        page: currentPage,
        limit: ordersPerPage
      };
      
      if (selectedSeller) params.sellerId = selectedSeller;
      if (searchOrderId.trim()) params.searchOrderId = searchOrderId.trim();
      if (searchBuyerName.trim()) params.searchBuyerName = searchBuyerName.trim();
      if (searchMarketplace) params.searchMarketplace = searchMarketplace;

      // --- NEW DATE LOGIC START ---
      if (dateFilter.mode === 'single' && dateFilter.single) {
        // For single day, start and end are the same day
        params.startDate = dateFilter.single;
        params.endDate = dateFilter.single;
      } else if (dateFilter.mode === 'range') {
        if (dateFilter.from) params.startDate = dateFilter.from;
        if (dateFilter.to) params.endDate = dateFilter.to;
      }
      // --- NEW DATE LOGIC END ---

      const { data } = await api.get('/ebay/stored-orders', { params });
      setOrders(data?.orders || []);
      
      // Update pagination metadata
      if (data?.pagination) {
        setTotalPages(data.pagination.totalPages);
        setTotalOrders(data.pagination.totalOrders);
      }
    } catch (e) {
      setOrders([]);
      setError(e?.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrders() {
    setLoading(true);
    setError('');
    setPollResults(null);
    setSnackbarOrderIds([]);
    setUpdatedOrderDetails([]);
    try {
      const { data } = await api.post('/ebay/poll-all-sellers');
      setPollResults(data || null);
      await loadStoredOrders();

      // Show snackbar if there are new or updated orders
      if (data && (data.totalNewOrders > 0 || data.totalUpdatedOrders > 0)) {
        // Extract new order IDs (simple strings)
        const newOrderIds = data.pollResults
          .filter(r => r.success && r.newOrders && r.newOrders.length > 0)
          .flatMap(r => r.newOrders);
        
        // Extract updated order details (objects with orderId + changedFields)
        const updatedDetails = data.pollResults
          .filter(r => r.success && r.updatedOrders && r.updatedOrders.length > 0)
          .flatMap(r => r.updatedOrders);
        
        const updatedOrderIds = updatedDetails.map(u => u.orderId);
        
        // Combine both lists (new orders first, then updated)
        setSnackbarOrderIds([...newOrderIds, ...updatedOrderIds]);
        setUpdatedOrderDetails(updatedDetails);
        
        setSnackbarMsg(
          `Polling Complete! New Orders: ${data.totalNewOrders}, Updated Orders: ${data.totalUpdatedOrders}`
        );
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else if (data) {
        setSnackbarMsg('Polling Complete! No new or updated orders.');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to poll orders');
    } finally {
      setLoading(false);
    }
  }



  const handleOpenMessageDialog = (order) => {
    setSelectedOrderForMessage(order);
    setMessageBody('');
    setMessageModalOpen(true);
  };

  const handleCloseMessageDialog = () => {
    setMessageModalOpen(false);
    setSelectedOrderForMessage(null);
  };

  const handleSendMessage = async () => {
    if (!messageBody.trim() || !selectedOrderForMessage) return;

    setSendingMessage(true);
    try {
      // Use the same endpoint as the BuyerChatPage
      await api.post('/ebay/send-message', {
        orderId: selectedOrderForMessage.orderId,
        buyerUsername: selectedOrderForMessage.buyer?.username,
        // Fallback for item ID if lineItems is missing
        itemId: selectedOrderForMessage.itemNumber || selectedOrderForMessage.lineItems?.[0]?.legacyItemId,
        body: messageBody,
        subject: `Regarding Order #${selectedOrderForMessage.orderId}`
      });

      setSnackbarMsg('Message sent successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      // Auto update status to "Ongoing Conversation"
      updateMessagingStatus(selectedOrderForMessage._id, 'Ongoing Conversation');
      
      handleCloseMessageDialog();
    } catch (e) {
      setSnackbarMsg('Failed to send message: ' + (e.response?.data?.error || e.message));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSendingMessage(false);
    }
  };




const updateFulfillmentNotes = async (orderId, value) => {
  try {
    // POINT TO NEW ENDPOINT
    await api.patch(`/ebay/orders/${orderId}/fulfillment-notes`, { fulfillmentNotes: value });
    
    // UPDATE LOCAL STATE with new field name
    setOrders(prev => prev.map(o => o._id === orderId ? { ...o, fulfillmentNotes: value } : o));
    
    setSnackbarMsg('Fulfillment notes updated');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  } catch (err) {
    console.error('Failed to update notes:', err);
    setSnackbarMsg('Failed to update notes');
    setSnackbarSeverity('error');
    setSnackbarOpen(true);
  }
};





  
  //  HELPER for the NotesCell
  const handleSaveNote = async (orderId, noteValue) => {
    await api.patch(`/ebay/orders/${orderId}/fulfillment-notes`, { fulfillmentNotes: noteValue });
    // Update local state
    setOrders(prev => prev.map(o => o._id === orderId ? { ...o, fulfillmentNotes: noteValue } : o));
  };

  //  HELPER for Notifications
  const showNotification = (severity, message) => {
    setSnackbarMsg(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };


function NotesCell({ order, onSave, onNotify }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [tempValue, setTempValue] = React.useState(order.fulfillmentNotes || '');
  const [isSaving, setIsSaving] = React.useState(false);

  // Sync state if order data changes from outside (e.g. polling)
  React.useEffect(() => {
    if (!isEditing) {
        setTempValue(order.fulfillmentNotes || '');
    }
  }, [order.fulfillmentNotes, isEditing]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(order._id, tempValue);
      setIsEditing(false);
      onNotify('success', 'Note saved successfully');
    } catch (e) {
      onNotify('error', 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTempValue(order.fulfillmentNotes || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 200 }}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          size="small"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          placeholder="Enter note..."
          autoFocus
        />
        <Stack direction="row" spacing={1}>
            <Button 
                variant="contained" 
                size="small" 
                onClick={handleSave} 
                disabled={isSaving}
                sx={{ fontSize: '0.7rem', py: 0.5 }}
            >
                {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button 
                variant="outlined" 
                size="small" 
                onClick={handleCancel}
                disabled={isSaving}
                sx={{ fontSize: '0.7rem', py: 0.5 }}
            >
                Cancel
            </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box 
        onClick={() => setIsEditing(true)} 
        sx={{ 
            cursor: 'pointer', 
            minHeight: 30, 
            minWidth: 150,
            display: 'flex', 
            alignItems: 'center',
            '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 1 }
        }}
    >
      {order.fulfillmentNotes ? (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
            {order.fulfillmentNotes}
        </Typography>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            + Add Note
        </Typography>
      )}
    </Box>
  );
}

  // Poll for NEW orders only
  async function pollNewOrders() {
    setLoading(true);
    setError('');
    setPollResults(null);
    setSnackbarOrderIds([]);
    setUpdatedOrderDetails([]);
    try {
      const { data } = await api.post('/ebay/poll-new-orders');
      setPollResults(data || null);
      
      // Reset filters to show all sellers and go to page 1
      setSelectedSeller('');
      setCurrentPage(1);
      
      // Reload orders with reset filters
      await loadStoredOrders();

      if (data && data.totalNewOrders > 0) {
        // Build summary by seller (don't show individual order IDs)
        const sellerSummary = data.pollResults
          .filter(r => r.success && r.newOrders && r.newOrders.length > 0)
          .map(r => `${r.sellerName}: ${r.newOrders.length} new order${r.newOrders.length > 1 ? 's' : ''}`)
          .join('\n');
        
        setSnackbarMsg(`Found ${data.totalNewOrders} new order${data.totalNewOrders > 1 ? 's' : ''}!\n\n${sellerSummary}`);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else if (data) {
        setSnackbarMsg('No new orders found.');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to poll new orders');
    } finally {
      setLoading(false);
    }
  }

  // Poll for order UPDATES only
  async function pollOrderUpdates() {
    setLoading(true);
    setError('');
    setPollResults(null);
    setSnackbarOrderIds([]);
    setUpdatedOrderDetails([]);
    try {
      const { data } = await api.post('/ebay/poll-order-updates');
      setPollResults(data || null);
      
      // Reset filters to show all sellers and go to page 1
      setSelectedSeller('');
      setCurrentPage(1);
      
      // Reload orders with reset filters
      await loadStoredOrders();

      if (data && data.totalUpdatedOrders > 0) {
        // Collect all updated order details (orderId + changedFields)
        const updatedDetails = data.pollResults
          .filter(r => r.success && r.updatedOrders && r.updatedOrders.length > 0)
          .flatMap(r => r.updatedOrders); // Each is { orderId, changedFields }
        
        const orderIds = updatedDetails.map(u => u.orderId);
        setSnackbarOrderIds(orderIds);
        setUpdatedOrderDetails(updatedDetails); // Store full details
        setSnackbarMsg(
          `Updated ${data.totalUpdatedOrders} order${data.totalUpdatedOrders > 1 ? 's' : ''}!`
        );
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else if (data) {
        setSnackbarOrderIds([]);
        setUpdatedOrderDetails([]);
        setSnackbarMsg('No order updates found.');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to poll order updates');
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = (text) => {
    const val = text || '-';
    if (val === '-') return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(val);
      setCopiedText(val);
      setTimeout(() => setCopiedText(''), 1200);
    }
  };

  // Backfill Ad Fees for selected seller
  const backfillAdFees = async () => {
    if (!selectedSeller) {
      setSnackbarMsg('Please select a seller first');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    setBackfillLoading(true);
    setBackfillResults(null);
    setError('');

    try {
      // First get count to show in snackbar
      const countRes = await api.get('/ebay/backfill-ad-fees/count', {
        params: { 
          sellerId: selectedSeller,
          sinceDate: '2025-11-01T00:00:00.000Z'
        }
      });
      
      const { needsBackfill, totalOrders: total } = countRes.data;
      
      if (needsBackfill === 0) {
        setSnackbarMsg(`All ${total} orders already have ad fees!`);
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
        setBackfillLoading(false);
        return;
      }

      setSnackbarMsg(`Starting backfill for ${needsBackfill} orders (out of ${total})...`);
      setSnackbarSeverity('info');
      setSnackbarOpen(true);

      // Now run the backfill
      const res = await api.post('/ebay/backfill-ad-fees', {
        sellerId: selectedSeller,
        sinceDate: '2025-11-01T00:00:00.000Z',
        skipAlreadySet: true
      });

      setBackfillResults(res.data.results);
      
      // Refresh orders to show updated ad fees
      await fetchOrders();

      setSnackbarMsg(res.data.message);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);

    } catch (e) {
      console.error('Backfill error:', e);
      setError(e?.response?.data?.error || 'Failed to backfill ad fees');
      setSnackbarMsg('Failed to backfill ad fees');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setBackfillLoading(false);
    }
  };

  // Update messaging status in database
  const updateMessagingStatus = async (orderId, status) => {
    try {
      await api.patch(`/ebay/orders/${orderId}/messaging-status`, { messagingStatus: status });
      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(o => (o._id === orderId ? { ...o, messagingStatus: status } : o))
      );
      setSnackbarMsg('Messaging status updated successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Failed to update messaging status:', err);
      setSnackbarMsg('Failed to update messaging status');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleMessagingStatusChange = (orderId, newStatus) => {
    updateMessagingStatus(orderId, newStatus);
  };

  // Update item status in database
  const updateItemStatus = async (orderId, status) => {
    try {
      await api.patch(`/ebay/orders/${orderId}/item-status`, { itemStatus: status });
      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(o => (o._id === orderId ? { ...o, itemStatus: status } : o))
      );
      setSnackbarMsg('Item status updated successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Failed to update item status:', err);
      setSnackbarMsg('Failed to update item status');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleItemStatusChange = (orderId, newStatus) => {
    updateItemStatus(orderId, newStatus);
  };

  const toggleShippingExpanded = (orderId) => {
    setExpandedShipping(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // helpers
  const formatDate = (dateStr, marketplaceId) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      
      // Default to UTC
      let timeZone = 'UTC';
      let timeZoneLabel = 'UTC';

      // Determine Timezone based on Marketplace
      if (marketplaceId === 'EBAY_US') {
        timeZone = 'America/Los_Angeles'; // Covers PST and PDT automatically
        timeZoneLabel = 'PT';
      } else if (marketplaceId === 'EBAY_CA' || marketplaceId === 'EBAY_ENCA') {
        timeZone = 'America/New_York';    // Covers EST and EDT automatically
        timeZoneLabel = 'ET';
      } else if (marketplaceId === 'EBAY_AU') {
        timeZone = 'Australia/Sydney';    // Covers AEST and AEDT automatically
        timeZoneLabel = 'AET';
      }

      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: timeZone,
      });

      // Optional: Add the time if you want to be precise
      const formattedTime = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timeZone,
      });

      return (
        <Stack spacing={0}>
            <Typography variant="body2">{formattedDate}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {formattedTime} ({timeZoneLabel})
            </Typography>
        </Stack>
      );
    } catch {
      return '-';
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const num = Number(value);
    if (Number.isNaN(num)) return '-';
    return `$${num.toFixed(2)}`;
  };

  const formatFieldName = (fieldName) => {
    // Convert camelCase to readable format
    return fieldName
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: 'calc(100vh - 100px)', // Full viewport minus top toolbar
      overflow: 'hidden',
      width: '100%',
      maxWidth: '100%'
    }}>
      {/* LOADING OVERLAY */}
      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Paper
            elevation={4}
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              borderRadius: 2,
            }}
          >
            <CircularProgress size={48} />
            <Typography variant="body1" color="text.secondary">
              Loading orders...
            </Typography>
          </Paper>
        </Box>
      )}

      {/* HEADER SECTION - FIXED */}
      <Paper sx={{ p: 2, mb: 2, flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LocalShippingIcon color="primary" />
            <Typography variant="h5" fontWeight="bold">Fulfillment Dashboard</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            {totalOrders > 0 && (
              <Chip
                icon={<ShoppingCartIcon />}
                label={`${totalOrders} total orders`}
                color="primary"
                variant="filled"
              />
            )}
            {orders.length > 0 && totalPages > 1 && (
              <Typography variant="body2" color="text.secondary">
                (Page {currentPage} of {totalPages})
              </Typography>
            )}
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* CONTROLS */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <InputLabel id="seller-select-label">Select Seller</InputLabel>
            <Select
              labelId="seller-select-label"
              value={selectedSeller}
              label="Select Seller"
              onChange={(e) => setSelectedSeller(e.target.value)}
            >
              <MenuItem value="">
                <em>-- Select Seller --</em>
              </MenuItem>
              {sellers.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  {s.user?.username || s.user?.email || s._id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            color="primary"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <ShoppingCartIcon />}
            onClick={pollNewOrders}
            disabled={loading}
            sx={{ minWidth: 180 }}
          >
            {loading ? 'Polling...' : 'Poll New Orders'}
          </Button>

          <Button
            variant="contained"
            color="secondary"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={pollOrderUpdates}
            disabled={loading}
            sx={{ minWidth: 180 }}
          >
            {loading ? 'Updating...' : 'Poll Order Updates'}
          </Button>

          <Tooltip title={selectedSeller ? "Fetch ad fees from eBay for all orders" : "Select a seller first"}>
            <span>
              <Button
                variant="outlined"
                color="warning"
                startIcon={backfillLoading ? <CircularProgress size={16} color="inherit" /> : <LocalShippingIcon />}
                onClick={backfillAdFees}
                disabled={backfillLoading || !selectedSeller}
                sx={{ minWidth: 180 }}
              >
                {backfillLoading ? 'Fetching Ad Fees...' : 'Backfill Ad Fees'}
              </Button>
            </span>
          </Tooltip>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="marketplace-filter-label">Marketplace</InputLabel>
            <Select
              labelId="marketplace-filter-label"
              value={searchMarketplace}
              label="Marketplace"
              onChange={(e) => setSearchMarketplace(e.target.value)}
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              <MenuItem value="EBAY_US">EBAY_US</MenuItem>
              <MenuItem value="EBAY_AU">EBAY_AU</MenuItem>
              <MenuItem value="EBAY_ENCA">EBAY_CA</MenuItem>
            </Select>
          </FormControl>

          {/* Column Selector Button */}
          <Tooltip title="Select Columns">
            <IconButton
              color="primary"
              onClick={(e) => setColumnSelectorOpen(e.currentTarget)}
              size="small"
            >
              <ViewColumnIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Column Selector Popover */}
        <Popover
          open={Boolean(columnSelectorOpen)}
          anchorEl={columnSelectorOpen}
          onClose={() => setColumnSelectorOpen(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <Box sx={{ p: 2, minWidth: 250 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              Select Columns to Display
            </Typography>
            <List dense>
              {ALL_COLUMNS.map((col) => (
                <ListItem key={col.id} disablePadding>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={visibleColumns.includes(col.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setVisibleColumns([...visibleColumns, col.id]);
                          } else {
                            setVisibleColumns(visibleColumns.filter(id => id !== col.id));
                          }
                        }}
                        size="small"
                      />
                    }
                    label={col.label}
                  />
                </ListItem>
              ))}
            </List>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)}
              sx={{ mt: 1 }}
            >
              Reset to Default
            </Button>
          </Box>
        </Popover>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* Backfill Results Display */}
        {backfillResults && (
          <Alert 
            severity="info" 
            sx={{ mt: 2 }}
            onClose={() => setBackfillResults(null)}
          >
            <Typography variant="subtitle2" fontWeight="bold">Ad Fee Backfill Results:</Typography>
            <Typography variant="body2">
              • Total processed: {backfillResults.total} orders<br/>
              • ✅ Updated with ad fees: {backfillResults.success}<br/>
              • ⏭️ No ad fee found: {backfillResults.skipped}<br/>
              • ❌ Failed: {backfillResults.failed}
              {backfillResults.errors?.length > 0 && (
                <><br/>• First errors: {backfillResults.errors.slice(0, 3).map(e => e.orderId).join(', ')}</>
              )}
            </Typography>
          </Alert>
        )}

        {/* SEARCH FILTERS */}
        
          {/* SEARCH FILTERS - REMOVED THE CONDITIONAL CHECK */}
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
            <Box 
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => setFiltersExpanded(!filtersExpanded)}
            >
              <Typography variant="subtitle2" fontWeight="bold">
                Search Filters
              </Typography>
              <IconButton size="small">
                {filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            {filtersExpanded && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1.5 }}>
                <TextField
                  size="small"
                  label="Order ID"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  placeholder="Search by order ID..."
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Buyer Name"
                  value={searchBuyerName}
                  onChange={(e) => setSearchBuyerName(e.target.value)}
                  placeholder="Search by buyer name..."
                  sx={{ flex: 1 }}
                />
                
                {/* 1. DATE MODE SELECTOR */}
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel id="date-mode-label">Date Mode</InputLabel>
                  <Select
                    labelId="date-mode-label"
                    value={dateFilter.mode}
                    label="Date Mode"
                    onChange={(e) => setDateFilter(prev => ({ ...prev, mode: e.target.value }))}
                  >
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="single">Single Day</MenuItem>
                    <MenuItem value="range">Date Range</MenuItem>
                  </Select>
                </FormControl>

                {/* 2. SINGLE DATE INPUT */}
                {dateFilter.mode === 'single' && (
                  <TextField
                    size="small"
                    label="Date"
                    type="date"
                    value={dateFilter.single}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, single: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 150 }}
                  />
                )}

                {/* 3. RANGE INPUTS */}
                {dateFilter.mode === 'range' && (
                  <>
                    <TextField
                      size="small"
                      label="From"
                      type="date"
                      value={dateFilter.from}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 150 }}
                    />
                    <TextField
                      size="small"
                      label="To"
                      type="date"
                      value={dateFilter.to}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 150 }}
                    />
                  </>
                )}

                {/* CLEAR BUTTON (Updated) */}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setSearchOrderId('');
                    setSearchBuyerName('');
                    // Reset Date Filter
                    setDateFilter({ mode: 'none', single: '', from: '', to: '' });
                  }}
                  sx={{ minWidth: 80 }}
                >
                  Clear
                </Button>
              </Stack>
            )}
        </Box>
        

        
      </Paper>

      {/* TABLE SECTION */}
      {orders.length === 0 && !loading ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ShoppingCartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No orders found. Click "Poll New Orders" to fetch orders from all sellers.
          </Typography>
        </Paper>
      ) : (
        <TableContainer 
          component={Paper} 
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            maxHeight: 'calc(100% - 50px)', // Reduced from 80px to 50px for smaller footer
            width: '100%',
            // Custom scrollbar styling
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#f1f1f1',
              borderRadius: '10px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#888',
              borderRadius: '10px',
              '&:hover': {
                backgroundColor: '#555',
              },
            },
          }}
        >
          <Table 
            size="small" 
            stickyHeader
            sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>SL No</TableCell>
                {visibleColumns.includes('seller') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Seller</TableCell>}
                {visibleColumns.includes('orderId') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Order ID</TableCell>}
                {visibleColumns.includes('dateSold') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Date Sold</TableCell>}
                {visibleColumns.includes('shipBy') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Ship By</TableCell>}
                {visibleColumns.includes('productName') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Product Name</TableCell>}
                {visibleColumns.includes('buyerName') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Buyer Name</TableCell>}
                {visibleColumns.includes('shippingAddress') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Shipping Address</TableCell>}
                {visibleColumns.includes('marketplace') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Marketplace</TableCell>}
                {visibleColumns.includes('subtotal') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }} align="right">Subtotal</TableCell>}
                {visibleColumns.includes('shipping') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }} align="right">Shipping</TableCell>}
                {visibleColumns.includes('salesTax') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }} align="right">Sales Tax</TableCell>}
                {visibleColumns.includes('discount') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }} align="right">Discount</TableCell>}
                {visibleColumns.includes('transactionFees') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }} align="right">Transaction Fees</TableCell>}
                {visibleColumns.includes('adFeeGeneral') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }} align="right">Ad Fee General</TableCell>}
                {visibleColumns.includes('cancelStatus') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Cancel Status</TableCell>}
                {visibleColumns.includes('refunds') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Refunds</TableCell>}
                {visibleColumns.includes('trackingNumber') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Tracking Number</TableCell>}
                {visibleColumns.includes('amazonAccount') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Amazon Acc</TableCell>}
                {visibleColumns.includes('arriving') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Arriving</TableCell>}
                {visibleColumns.includes('beforeTax') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Before Tax</TableCell>}
                {visibleColumns.includes('estimatedTax') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Estimated Tax</TableCell>}
                {visibleColumns.includes('azOrderId') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Az OrderID</TableCell>}
                {visibleColumns.includes('notes') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Notes</TableCell>}
                {visibleColumns.includes('messagingStatus') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Messaging</TableCell>}
                <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100, textAlign: 'center' }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order, idx) => {
                return (
                  <TableRow
                    key={order._id || idx}
                    sx={{
                      '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                      '&:hover': { backgroundColor: 'action.selected' },
                    }}
                  >
                    <TableCell>{(currentPage - 1) * ordersPerPage + idx + 1}</TableCell>
                    {visibleColumns.includes('seller') && (
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {order.seller?.user?.username ||
                          order.seller?.user?.email ||
                          order.sellerId ||
                          '-'}
                      </Typography>
                    </TableCell>
                    )}
                    {visibleColumns.includes('orderId') && (
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium" sx={{ color: 'primary.main' }}>
                        {order.orderId || order.legacyOrderId || '-'}
                      </Typography>
                    </TableCell>
                    )}
                    {visibleColumns.includes('dateSold') && <TableCell>{formatDate(order.dateSold, order.purchaseMarketplaceId)}</TableCell>}
                    {visibleColumns.includes('shipBy') && <TableCell>{formatDate(order.shipByDate, order.purchaseMarketplaceId)}</TableCell>}
                    {visibleColumns.includes('productName') && (
                    <TableCell sx={{ minWidth: 300, maxWidth: 400, pr: 1 }}>
                      <Stack spacing={1} sx={{ py: 1 }}>
                        {order.lineItems && order.lineItems.length > 0 ? (
                          order.lineItems.map((item, i) => (
                            <Box 
                              key={i} 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: 1, 
                                borderBottom: i < order.lineItems.length - 1 ? '1px dashed rgba(0,0,0,0.1)' : 'none',
                                pb: i < order.lineItems.length - 1 ? 1 : 0
                              }}
                            >
                              {/* 1. QUANTITY BADGE */}
                              <Chip
                                label={`x${item.quantity}`}
                                size="small"
                                color={item.quantity > 1 ? "warning" : "default"} 
                                sx={{ 
                                  height: 24, 
                                  minWidth: 35, 
                                  fontWeight: 'bold',
                                  borderRadius: 1,
                                  backgroundColor: item.quantity > 1 ? '#ed6c02' : '#e0e0e0',
                                  color: item.quantity > 1 ? '#fff' : 'rgba(0,0,0,0.87)'
                                }}
                              />

                              {/* 2. PRODUCT TITLE & ID */}
                              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                <Tooltip title={item.title} arrow placement="top">
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      lineHeight: 1.2,
                                      fontWeight: item.quantity > 1 ? '500' : '400',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden'
                                    }}
                                  >
                                    {item.title}
                                  </Typography>
                                </Tooltip>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  ID: {item.legacyItemId} {item.sku ? `| SKU: ${item.sku}` : ''}
                                </Typography>
                              </Box>

                              {/* 3. COPY BUTTON */}
                              <IconButton 
                                size="small" 
                                onClick={() => handleCopy(item.title)} 
                                aria-label="copy product name"
                                sx={{ mt: -0.5 }}
                              >
                                <ContentCopyIcon fontSize="small" sx={{ fontSize: '1rem' }} />
                              </IconButton>
                            </Box>
                          ))
                        ) : (
                          /* Fallback for old orders */
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip label="x1" size="small" />
                            <Typography variant="body2">
                              {order.productName || '-'}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </TableCell>
                    )}
                    {visibleColumns.includes('buyerName') && (
                    <TableCell sx={{ maxWidth: 150, pr: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                        <Tooltip title={order.buyer?.buyerRegistrationAddress?.fullName || '-'} arrow>
                          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.buyer?.buyerRegistrationAddress?.fullName || '-'}
                          </Typography>
                        </Tooltip>
                        <IconButton size="small" onClick={() => handleCopy(order.buyer?.buyerRegistrationAddress?.fullName || '-') } aria-label="copy buyer name">
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    )}
                    {visibleColumns.includes('shippingAddress') && (
                    <TableCell sx={{ maxWidth: 300 }}>
                      {expandedShipping[order._id] ? (
                        <Stack spacing={0.5}>
                          {/* Full Name */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingFullName || '-'} arrow>
                              <Typography variant="body2" fontWeight="medium" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingFullName || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingFullName)} aria-label="copy name">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Address Line 1 */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingAddressLine1 || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingAddressLine1 || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingAddressLine1)} aria-label="copy address">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Address Line 2 */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingAddressLine2 || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingAddressLine2 || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingAddressLine2)} aria-label="copy address line 2">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* City */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingCity || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingCity || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingCity)} aria-label="copy city">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* State */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingState || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingState || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingState)} aria-label="copy state">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Postal Code */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingPostalCode || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingPostalCode || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingPostalCode)} aria-label="copy postal code">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Country */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingCountry || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingCountry || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingCountry)} aria-label="copy country">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Phone */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingPhone || '0000000000'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                📞 {'0000000000'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy('0000000000')} aria-label="copy phone">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Collapse Button */}
                          <Button 
                            size="small" 
                            onClick={() => toggleShippingExpanded(order._id)}
                            startIcon={<ExpandLessIcon />}
                            sx={{ mt: 0.5 }}
                          >
                            Collapse
                          </Button>
                        </Stack>
                      ) : (
                        <Button 
                          size="small" 
                          onClick={() => toggleShippingExpanded(order._id)}
                          endIcon={<ExpandMoreIcon />}
                          sx={{ textTransform: 'none' }}
                        >
                          {order.shippingFullName || 'View Address'}
                        </Button>
                      )}
                    </TableCell>
                    )}
                    {visibleColumns.includes('marketplace') && (
                    <TableCell>
                      <Typography variant="body2">
                        {order.purchaseMarketplaceId || '-'}
                      </Typography>
                    </TableCell>
                    )}
                    {visibleColumns.includes('subtotal') && (
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(order.subtotal)}
                      </Typography>
                    </TableCell>
                    )}
                    {visibleColumns.includes('shipping') && <TableCell align="right">{formatCurrency(order.shipping)}</TableCell>}
                    {visibleColumns.includes('salesTax') && <TableCell align="right">{formatCurrency(order.salesTax)}</TableCell>}
                    {visibleColumns.includes('discount') && (
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        
                      >
                        {formatCurrency(order.discount)}
                      </Typography>
                    </TableCell>
                    )}
                    {visibleColumns.includes('transactionFees') && <TableCell align="right">{formatCurrency(order.transactionFees)}</TableCell>}
                    {visibleColumns.includes('adFeeGeneral') && (
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{ 
                          fontWeight: order.adFeeGeneral ? 'medium' : 'normal',
                          color: order.adFeeGeneral ? 'error.main' : 'text.secondary'
                        }}
                      >
                        {order.adFeeGeneral ? formatCurrency(order.adFeeGeneral) : '-'}
                      </Typography>
                    </TableCell>
                    )}
                    {visibleColumns.includes('cancelStatus') && (
                    <TableCell>
                      <Chip
                        label={order.cancelState || 'NONE_REQUESTED'}
                        size="small"
                        color={
                          order.cancelState === 'CANCELED' ? 'error' :
                          order.cancelState === 'CANCEL_REQUESTED' ? 'warning' :
                          order.cancelState === 'IN_PROGRESS' ? 'warning' :
                          'success'
                        }
                        sx={{
                          fontSize: '0.7rem',
                          backgroundColor: order.cancelState === 'IN_PROGRESS' ? '#ffd700' : undefined,
                          color: order.cancelState === 'IN_PROGRESS' ? '#000' : undefined,
                          fontWeight: order.cancelState === 'IN_PROGRESS' ? 'bold' : 'normal'
                        }}
                      />
                    </TableCell>
                    )}
                    {/* --- REPLACEMENT FOR REFUNDS CELL --- */}
                    {visibleColumns.includes('refunds') && (
                    <TableCell>
                      {order.refunds && order.refunds.length > 0 ? (
                        <Stack spacing={0.5}>
                          {order.refunds.map((refund, idx) => {
                            // 1. Get Amount (Handle both data structures safely)
                            const rawValue = refund.amount?.value || refund.refundAmount?.value || 0;
                            const amount = Number(rawValue).toFixed(2);
                            
                            // 2. Determine Label & Color based on Order Status
                            // If order says 'FULLY_REFUNDED', we label it Full. Otherwise Partial.
                            const isFull = order.orderPaymentStatus === 'FULLY_REFUNDED';
                            const typeLabel = isFull ? 'Full' : 'Partial';
                            const color = isFull ? 'error' : 'warning'; // Red for Full, Orange for Partial

                            return (
                              <Chip
                                key={idx}
                                // Result: "Full: $28.17" or "Partial: $15.00"
                                label={`${typeLabel}: $${amount}`}
                                size="small"
                                color={color}
                                variant="outlined"
                                sx={{ 
                                  fontWeight: 'bold', 
                                  fontSize: '0.75rem', 
                                  height: 24 
                                }}
                              />
                            );
                          })}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    )}
                    {visibleColumns.includes('trackingNumber') && (
                    <TableCell sx={{ maxWidth: 150, pr: 1 }}>
                      {order.trackingNumber ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                          <Tooltip title={order.trackingNumber} arrow>
                            <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {order.trackingNumber}
                            </Typography>
                          </Tooltip>
                          <IconButton size="small" onClick={() => handleCopy(order.trackingNumber)} aria-label="copy tracking number">
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    )}

{/* 1. Amazon Account */}
{visibleColumns.includes('amazonAccount') && (
<TableCell>
  <AutoSaveSelect
    value={order.amazonAccount}
    options={amazonAccounts}
    onSave={(val) => updateManualField(order._id, 'amazonAccount', val)}
  />
</TableCell>
)}

{/* 2. Arriving Date */}
{visibleColumns.includes('arriving') && (
<TableCell>
  <AutoSaveTextField 
    
    value={order.arrivingDate} 
    onSave={(val) => updateManualField(order._id, 'arrivingDate', val)} 
  />
</TableCell>
)}

{/* 3. Before Tax */}
{visibleColumns.includes('beforeTax') && (
<TableCell>
  <AutoSaveTextField 
    type="number"
    value={order.beforeTax} 
    onSave={(val) => updateManualField(order._id, 'beforeTax', val)} 
  />
</TableCell>
)}

{/* 4. Estimated Tax */}
{visibleColumns.includes('estimatedTax') && (
<TableCell>
  <AutoSaveTextField 
    type="number"
    value={order.estimatedTax} 
    onSave={(val) => updateManualField(order._id, 'estimatedTax', val)} 
  />
</TableCell>
)}

{/* 5. Amazon Order ID */}
{visibleColumns.includes('azOrderId') && (
<TableCell>
  <AutoSaveTextField 
    value={order.azOrderId} 
    onSave={(val) => updateManualField(order._id, 'azOrderId', val)} 
  />
</TableCell>
)}

                    
{visibleColumns.includes('notes') && (
                    <TableCell>
                        <NotesCell 
                            order={order} 
                            onSave={handleSaveNote} 
                            onNotify={showNotification}
                        />
                    </TableCell>
)}
{visibleColumns.includes('messagingStatus') && (
                      <TableCell align="center">
                      <Tooltip title="Message Buyer">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleOpenMessageDialog(order)}
                        >
                          <ChatIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
)}

                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination Controls - FIXED AT BOTTOM */}
      {!loading && orders.length > 0 && totalPages > 1 && (
        <Box sx={{ 
          py: 1, 
          px: 2,
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          gap: 2,
          flexShrink: 0,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper'
        }}>
          <Typography variant="body2" color="text.secondary" fontSize="0.875rem">
            Showing {orders.length > 0 ? (currentPage - 1) * ordersPerPage + 1 : 0} - {Math.min(currentPage * ordersPerPage, totalOrders)} of {totalOrders} orders
          </Typography>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(e, page) => setCurrentPage(page)}
            color="primary"
            showFirstButton
            showLastButton
            size="small"
          />
        </Box>
      )}


      <ChatDialog 
        open={messageModalOpen} 
        onClose={handleCloseMessageDialog} 
        order={selectedOrderForMessage} 
      />

      {/* Snackbar for polling results */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={10000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{
            width: '100%',
            fontSize: '1.1rem',
            py: 2,
            px: 4,
            minWidth: 400,
            maxWidth: 800,
          }}
          elevation={6}
          variant="filled"
          action={
            snackbarOrderIds.length > 0 ? (
              <IconButton
                size="small"
                aria-label="copy order IDs"
                color="inherit"
                onClick={() => {
                  const orderIdsList = snackbarOrderIds.join(', ');
                  if (navigator?.clipboard?.writeText) {
                    navigator.clipboard.writeText(orderIdsList);
                    // Show temporary feedback
                    const originalMsg = snackbarMsg;
                    setSnackbarMsg('Order IDs copied to clipboard!');
                    setTimeout(() => setSnackbarMsg(originalMsg), 1500);
                  }
                }}
                sx={{ ml: 2 }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            ) : null
          }
        >
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: snackbarOrderIds.length > 0 ? 1 : 0 }}>
              {snackbarMsg}
            </Typography>
            {snackbarOrderIds.length > 0 && (
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.9, fontSize: '0.9rem' }}>
                Order IDs: {snackbarOrderIds.join(', ')}
              </Typography>
            )}
            {updatedOrderDetails.length > 0 && (
              <Box sx={{ mt: 1.5, maxHeight: 200, overflowY: 'auto', fontSize: '0.85rem' }}>
                {updatedOrderDetails.map((detail, idx) => {
                  const hasShippingChange = detail.changedFields.includes('shippingAddress');
                  return (
                    <Box 
                      key={idx} 
                      sx={{ 
                        mb: 0.5, 
                        opacity: 0.95,
                        backgroundColor: hasShippingChange ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                        padding: hasShippingChange ? '4px 8px' : '0',
                        borderRadius: hasShippingChange ? '4px' : '0',
                        border: hasShippingChange ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
                      }}
                    >
                      <Typography variant="caption" component="span" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                        {hasShippingChange && '🏠 '}{detail.orderId}:
                      </Typography>
                      {' '}
                      <Typography variant="caption" component="span" sx={{ fontSize: '0.85rem', fontStyle: 'italic' }}>
                        {detail.changedFields.map(formatFieldName).join(', ')}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </MuiAlert>
      </Snackbar>
    </Box>
  );
}


// --- ADD AT BOTTOM OF FILE ---

function AutoSaveTextField({ value, type = 'text', onSave }) {
  // Format initial value for Date inputs (YYYY-MM-DD)
  const formatVal = (val) => {
    if (type === 'date' && val) return val.split('T')[0];
    return val ?? '';
  };

  const [localValue, setLocalValue] = React.useState(formatVal(value));

  // Sync with DB updates
  React.useEffect(() => {
    setLocalValue(formatVal(value));
  }, [value, type]);

  const handleBlur = () => {
    // Only api call if value actually changed
    if (localValue !== formatVal(value)) {
      onSave(localValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur(); // Triggers save
    }
  };

  return (
    <TextField
      size="small"
      type={type}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="-"
      sx={{ 
        backgroundColor: '#fff', 
        borderRadius: 1,
        minWidth: type === 'date' ? 130 : 80,
        '& .MuiOutlinedInput-root': { paddingRight: 0 },
        '& input': { padding: '6px 8px', fontSize: '0.85rem' }
      }}
    />
  );
}

function AutoSaveSelect({ value, options, onSave }) {
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleChange = (e) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    onSave(newVal); // Auto-save immediately on selection
  };

  return (
    <Select
      value={localValue}
      onChange={handleChange}
      displayEmpty
      size="small"
      sx={{ 
        backgroundColor: '#fff', 
        borderRadius: 1,
        minWidth: 130,
        height: 32,
        fontSize: '0.85rem',
        '& .MuiSelect-select': { py: 0.5, px: 1 }
      }}
    >
      <MenuItem value="">
        <em style={{ color: '#aaa' }}>- Select -</em>
      </MenuItem>
      {options.map((opt) => (
        <MenuItem key={opt._id} value={opt.name}>
          {opt.name}
        </MenuItem>
      ))}
    </Select>
  );
}