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
import api from '../../lib/api';


// --- NEW COMPONENT: Chat Dialog (Replicates BuyerChatPage) ---
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
      // Poll for new messages silently
      if (order) {
        const itemId = order.itemNumber || order.lineItems?.[0]?.legacyItemId;
        api.post('/ebay/sync-thread', {
          sellerId: order.seller?._id || order.seller,
          buyerUsername: order.buyer?.username,
          itemId: itemId
        }).then(res => {
          if (res.data.newMessagesFound) {
            loadMessages(false); // Reload without loading spinner
          }
        }).catch(err => console.error("Polling error", err));
      }
    }, 4000); // Poll every 4 seconds
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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      {/* Header */}
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            {order?.buyer?.buyerRegistrationAddress?.fullName || order?.buyer?.username || 'Buyer Chat'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Order #{order?.orderId}
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Chat Area */}
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
                    maxWidth: '75%'
                  }}
                >
                  <Paper 
                    elevation={1}
                    sx={{ 
                      p: 1.5, 
                      bgcolor: msg.sender === 'SELLER' ? '#1976d2' : '#ffffff',
                      color: msg.sender === 'SELLER' ? '#fff' : 'text.primary',
                      borderRadius: 2,
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
                                sx={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 1, cursor: 'pointer', border: '1px solid #ccc' }}
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

        {/* Input Area */}
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

export default function FulfillmentDashboard() {
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingAdFee, setEditingAdFee] = useState({});
  const [pollResults, setPollResults] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  // Search filters
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchBuyerName, setSearchBuyerName] = useState('');
  //const [searchSoldDate, setSearchSoldDate] = useState('');
  const [searchMarketplace, setSearchMarketplace] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [ordersPerPage] = useState(50);

  // Expanded shipping addresses
  const [expandedShipping, setExpandedShipping] = useState({});

  // Editing messaging status
  const [editingMessagingStatus, setEditingMessagingStatus] = useState({});

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
  

const [dateFilter, setDateFilter] = useState({
    mode: 'none', // 'none' | 'single' | 'range'
    single: '',
    from: '',
    to: ''
  });






  useEffect(() => {
    fetchSellers();
    loadStoredOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when seller changes
    loadStoredOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeller]);

  // Reload orders when page or filters change
  useEffect(() => {
    loadStoredOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchOrderId, searchBuyerName, searchMarketplace, dateFilter]);

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

  // Update ad fee general in database
  const updateAdFeeGeneral = async (orderId, value) => {
    try {
      await api.patch(`/ebay/orders/${orderId}/ad-fee-general`, { adFeeGeneral: value });
      setOrders(prev =>
        prev.map(order => (order._id === orderId ? { ...order, adFeeGeneral: value } : order)),
      );
    } catch (err) {
      // keep previous value in UI; just notify
      // eslint-disable-next-line no-alert
      alert('Failed to update ad fee general');
    }
  };

  const handleAdFeeChange = (orderId, value) => {
    setEditingAdFee(prev => ({ ...prev, [orderId]: value }));
  };

  const handleAdFeeBlur = (orderId) => {
    const value = editingAdFee[orderId];
    if (value !== undefined && value !== '') {
      const numValue = parseFloat(value);
      if (!Number.isNaN(numValue)) {
        updateAdFeeGeneral(orderId, numValue);
      }
    }
    setEditingAdFee(prev => {
      const n = { ...prev };
      delete n[orderId];
      return n;
    });
  };

  const handleCopy = (text) => {
    const val = text || '-';
    if (val === '-') return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(val);
      setCopiedText(val);
      setTimeout(() => setCopiedText(''), 1200);
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
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC',
      });
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
    <Box>
      {/* HEADER SECTION */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LocalShippingIcon color="primary" />
            <Typography variant="h5" fontWeight="bold">Fulfillment Dashboard</Typography>
          </Stack>
          {orders.length > 0 && (
            <Chip
              icon={<ShoppingCartIcon />}
              label={`${orders.length} orders`}
              color="primary"
              variant="outlined"
            />
          )}
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

          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={fetchOrders}
            disabled={loading}
            sx={{ minWidth: 160 }}
          >
            {loading ? 'Polling...' : 'Poll All (New + Updates)'}
          </Button>

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
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
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
      {loading && !orders.length ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>Loading orders...</Typography>
        </Paper>
      ) : orders.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ShoppingCartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No orders found. Click "Poll New Orders" to fetch orders from all sellers.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>SL No</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Seller</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Order ID</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date Sold</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Ship By</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Product Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Buyer Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Shipping Address</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Marketplace</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Subtotal</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Shipping</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Sales Tax</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Discount</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Transaction Fees</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Ad Fee General</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cancel Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Refunds</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tracking Number</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Messaging Status</TableCell>
                
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Notes</TableCell>
           
                <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order, idx) => {
                const currentAdFeeValue =
                  editingAdFee[order._id] !== undefined
                    ? editingAdFee[order._id]
                    : (order.adFeeGeneral ?? '');

                return (
                  <TableRow
                    key={order._id || idx}
                    sx={{
                      '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                      '&:hover': { backgroundColor: 'action.selected' },
                    }}
                  >
                    <TableCell>{(currentPage - 1) * ordersPerPage + idx + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {order.seller?.user?.username ||
                          order.seller?.user?.email ||
                          order.sellerId ||
                          '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium" sx={{ color: 'primary.main' }}>
                        {order.orderId || order.legacyOrderId || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(order.dateSold)}</TableCell>
                    <TableCell>{formatDate(order.shipByDate)}</TableCell>
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
                    <TableCell>
                      <Typography variant="body2">
                        {order.purchaseMarketplaceId || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(order.subtotal)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{formatCurrency(order.shipping)}</TableCell>
                    <TableCell align="right">{formatCurrency(order.salesTax)}</TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        
                      >
                        {formatCurrency(order.discount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{formatCurrency(order.transactionFees)}</TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={currentAdFeeValue}
                        onChange={(e) => handleAdFeeChange(order._id, e.target.value)}
                        onBlur={() => handleAdFeeBlur(order._id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        inputProps={{
                          step: '0.01',
                          min: '0',
                          style: { textAlign: 'right' },
                        }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
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
                    {/* --- REPLACEMENT FOR REFUNDS CELL --- */}
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
                    <TableCell sx={{ minWidth: 180 }}>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={order.messagingStatus || 'Not Yet Started'}
                          onChange={(e) => handleMessagingStatusChange(order._id, e.target.value)}
                          sx={{ fontSize: '0.875rem' }}
                        >
                          <MenuItem value="Not Yet Started">Not Yet Started</MenuItem>
                          <MenuItem value="Ongoing Conversation">Ongoing Conversation</MenuItem>
                          <MenuItem value="Resolved">Resolved</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>

                    {/* Item Status Column */}
                    <TableCell sx={{ minWidth: 160 }}>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={order.itemStatus || 'None'}
                            onChange={(e) => handleItemStatusChange(order._id, e.target.value)}
                            sx={{ fontSize: '0.875rem' }}
                          >
                            <MenuItem value="None" sx={{ color: 'text.secondary' }}>None</MenuItem>
                            <MenuItem value="Out of Stock" sx={{ color: 'error.main', fontWeight: 'bold' }}>Out of Stock</MenuItem>
                            <MenuItem value="Delayed Delivery" sx={{ color: 'warning.main', fontWeight: 'bold' }}>Delayed Delivery</MenuItem>
                            <MenuItem value="Label Created" sx={{ color: 'info.main', fontWeight: 'bold' }}>Label Created</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                          </Select>
                        </FormControl>
                    </TableCell>

                    <TableCell>
                        <NotesCell 
                            order={order} 
                            onSave={handleSaveNote} 
                            onNotify={showNotification}
                        />
                    </TableCell>
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

                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination Controls */}
      {!loading && orders.length > 0 && totalPages > 1 && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {orders.length > 0 ? (currentPage - 1) * ordersPerPage + 1 : 0} - {Math.min(currentPage * ordersPerPage, totalOrders)} of {totalOrders} orders
          </Typography>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(e, page) => setCurrentPage(page)}
            color="primary"
            showFirstButton
            showLastButton
            size="large"
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
