import React, { useEffect, useState, useRef, memo, useCallback } from 'react';
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
  ListItem,
  useMediaQuery,
  useTheme,
  Collapse,
  Menu,
  ListSubheader,
  Switch
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO, isValid } from 'date-fns';

import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';


import ChatIcon from '@mui/icons-material/Chat';

import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import PersonIcon from '@mui/icons-material/Person'; // <--- Add this
import OpenInNewIcon from '@mui/icons-material/OpenInNew'; // <--- Add this
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';
import SyncIcon from '@mui/icons-material/Sync';


import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import ColumnSelector from '../../components/ColumnSelector';
import { downloadCSV, prepareCSVData } from '../../utils/csvExport';
import api from '../../lib/api';
import TemplateManagementModal from '../../components/TemplateManagementModal';
import { CHAT_TEMPLATES, personalizeTemplate } from '../../constants/chatTemplates';
import RemarkTemplateManagerModal from '../../components/RemarkTemplateManagerModal';
import {
  findRemarkTemplateText,
  loadRemarkTemplates,
  remarkOptionsFromTemplates,
  saveRemarkTemplates
} from '../../constants/remarkTemplates';


// --- IMAGE VIEWER DIALOG ---
function ImageDialog({ open, onClose, images }) {
  const theme = useTheme();
  const isMobileDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
    }
  }, [open]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobileDialog}
    >
      <DialogTitle sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Images ({currentIndex + 1}/{images.length})
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: { xs: 1, sm: 2 } }}>
        {images.length > 0 ? (
          <Box>
            {/* Main Image */}
            <Box
              sx={{
                width: '100%',
                height: { xs: 'calc(100vh - 200px)', sm: 500 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.100',
                borderRadius: 1,
                mb: 2,
                position: 'relative'
              }}
            >
              <img
                src={images[currentIndex]}
                alt={`Item ${currentIndex + 1}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
              />

              {/* Mobile swipe hint overlay (optional arrows) */}
              {images.length > 1 && isMobileDialog && (
                <>
                  <IconButton
                    onClick={handlePrev}
                    sx={{
                      position: 'absolute',
                      left: 4,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      bgcolor: 'rgba(255,255,255,0.8)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                    }}
                  >
                    <NavigateBeforeIcon />
                  </IconButton>
                  <IconButton
                    onClick={handleNext}
                    sx={{
                      position: 'absolute',
                      right: 4,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      bgcolor: 'rgba(255,255,255,0.8)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                    }}
                  >
                    <NavigateNextIcon />
                  </IconButton>
                </>
              )}
            </Box>

            {/* Navigation Buttons - Desktop only */}
            {images.length > 1 && !isMobileDialog && (
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                <Button
                  onClick={handlePrev}
                  startIcon={<NavigateBeforeIcon />}
                  variant="outlined"
                >
                  Previous
                </Button>
                <Button
                  onClick={handleNext}
                  endIcon={<NavigateNextIcon />}
                  variant="outlined"
                >
                  Next
                </Button>
              </Stack>
            )}

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <Stack
                direction="row"
                spacing={0.5}
                sx={{
                  overflowX: 'auto',
                  pb: 1,
                  justifyContent: { xs: 'flex-start', sm: 'center' },
                  flexWrap: { xs: 'nowrap', sm: 'wrap' }
                }}
              >
                {images.map((img, idx) => (
                  <Box
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    sx={{
                      width: { xs: 60, sm: 80 },
                      height: { xs: 60, sm: 80 },
                      cursor: 'pointer',
                      border: idx === currentIndex ? '3px solid' : '1px solid',
                      borderColor: idx === currentIndex ? 'primary.main' : 'grey.300',
                      borderRadius: 1,
                      overflow: 'hidden',
                      flexShrink: 0,
                      '&:hover': {
                        borderColor: 'primary.main',
                        opacity: 0.8
                      }
                    }}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        ) : (
          <Alert severity="info">No images available for this item</Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- NEW COMPONENT: Chat Dialog (Visual Match with BuyerChatPage) ---
function ChatDialog({ open, onClose, order }) {
  const theme = useTheme();
  const isMobileChat = useMediaQuery(theme.breakpoints.down('sm'));

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

  // --- TEMPLATE MENU STATE ---
  const [templateAnchorEl, setTemplateAnchorEl] = useState(null);
  const [chatTemplates, setChatTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [manageTemplatesOpen, setManageTemplatesOpen] = useState(false);

  // Load chat templates on mount
  useEffect(() => {
    loadChatTemplates();
  }, []);

  async function loadChatTemplates() {
    setTemplatesLoading(true);
    try {
      const { data } = await api.get('/chat-templates');
      if (data.templates && data.templates.length > 0) {
        setChatTemplates(data.templates);
      }
    } catch (e) {
      console.error('Failed to load chat templates:', e);
      // Fallback to hardcoded templates
      setChatTemplates(CHAT_TEMPLATES);
    } finally {
      setTemplatesLoading(false);
    }
  }

  const handleTemplateClick = (event) => {
    setTemplateAnchorEl(event.currentTarget);
  };

  const handleTemplateClose = () => {
    setTemplateAnchorEl(null);
  };

  const handleSelectTemplate = (templateText) => {
    const nameToUse = order.shippingFullName || order.buyer?.username || 'Buyer';
    const personalizedText = personalizeTemplate(templateText, nameToUse);

    setNewMessage(personalizedText);
    handleTemplateClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={isMobileChat}
    >

      {/* --- HEADER (MATCHING BUYER CHAT PAGE) --- */}
      <Box sx={{ p: { xs: 1.5, sm: 2 }, borderBottom: 1, borderColor: 'divider', bgcolor: '#fff', position: 'relative' }}>

        {/* Top Right: Seller Chip & Close & Templates */}
        <Stack
          direction="column"
          spacing={1}
          alignItems="flex-end"
          sx={{ position: 'absolute', top: { xs: 8, sm: 12 }, right: { xs: 8, sm: 12 }, zIndex: 10 }}
        >
          <Stack direction="row" spacing={0.5} alignItems="center">
            {!isMobileChat && (
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
            )}
            <IconButton onClick={onClose} size="small" sx={{ color: 'text.disabled' }}>
              <CloseIcon />
            </IconButton>
          </Stack>

          <Tooltip title="Choose a response template">
            <Button
              variant="outlined"
              size="small"
              onClick={handleTemplateClick}
              disabled={sending}
              sx={{
                minWidth: { xs: 'auto', sm: 100 },
                px: { xs: 1, sm: 2 },
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                bgcolor: 'white'
              }}
              endIcon={<ExpandMoreIcon />}
            >
              Templates
            </Button>
          </Tooltip>
        </Stack>

        {/* Main Content: Buyer & Item */}
        <Stack spacing={1} sx={{ pr: { xs: 6, sm: 12 } }}>

          {/* 1. Buyer Info */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={{ xs: 0.5, sm: 3 }}
            sx={{ mt: 0.5 }}
          >
            <Box>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Buyer
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.1, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                {buyerName}
              </Typography>
            </Box>

            {!isMobileChat && (
              <Divider orientation="vertical" flexItem sx={{ height: 20, alignSelf: 'center', opacity: 0.5 }} />
            )}

            <Box>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                Username
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(0,0,0,0.05)', px: 0.5, borderRadius: 0.5, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
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
                  lineHeight: 1.3,
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  display: '-webkit-box',
                  WebkitLineClamp: isMobileChat ? 1 : 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {itemTitle || `Item ID: ${itemId}`}
              </Typography>
              <OpenInNewIcon sx={{ fontSize: 14, color: 'primary.main', mt: 0.3, flexShrink: 0 }} />
            </Link>

            <Chip
              label={`Order: ${order?.orderId || order?.legacyOrderId || 'N/A'}`}
              size="small"
              variant="outlined"
              sx={{
                borderRadius: 1,
                height: 20,
                fontSize: '0.65rem',
                color: 'text.secondary',
                borderColor: 'divider',
                bgcolor: '#fafafa'
              }}
            />
          </Box>
        </Stack>
      </Box>

      {/* --- CHAT AREA (MATCHING BUYER CHAT PAGE) --- */}
      <DialogContent sx={{ p: 0, bgcolor: '#f0f2f5', height: { xs: 'calc(100vh - 180px)', sm: '500px' }, display: 'flex', flexDirection: 'column' }}>
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
                    {new Date(msg.messageDate).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} PT
                    {msg.sender === 'SELLER' && (msg.read ? ' • Read' : ' • Sent')}
                  </Typography>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Stack>
          )}
        </Box>

        {/* --- INPUT AREA --- */}
        <Box sx={{ p: { xs: 1, sm: 2 }, bgcolor: '#fff', borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={3}
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
            size="small"
            sx={{
              '& .MuiInputBase-input': {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }
            }}
          />
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
                      bgcolor: '#f5f5f5',
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
          <Button
            variant="contained"
            sx={{ px: { xs: 2, sm: 3 }, minWidth: { xs: 'auto', sm: 80 } }}
            endIcon={!isMobileChat && (sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />)}
            onClick={handleSendMessage}
            disabled={sending || !newMessage.trim()}
          >
            {isMobileChat ? <SendIcon /> : 'Send'}
          </Button>
        </Box>
      </DialogContent>

      {/* Template Management Modal */}
      <TemplateManagementModal
        open={manageTemplatesOpen}
        onClose={() => {
          setManageTemplatesOpen(false);
          loadChatTemplates();
        }}
      />
    </Dialog>
  );
}

// --- MOBILE ORDER CARD COMPONENT ---
function MobileOrderCard({ order, index, onCopy, onMessage, onViewImages, formatCurrency, thumbnailImages }) {
  const [expanded, setExpanded] = useState(false);

  const productTitle = order.lineItems?.[0]?.title || order.productName || 'Unknown Product';
  const itemId = order.lineItems?.[0]?.legacyItemId || order.itemNumber;
  const buyerName = order.buyer?.buyerRegistrationAddress?.fullName || '-';
  const dateSold = order.dateSold ? new Date(order.dateSold).toLocaleDateString() : '-';

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        borderRadius: 2,
        borderLeft: 4,
        borderLeftColor: order.cancelState === 'CANCELED' ? 'error.main' :
          order.orderPaymentStatus === 'FULLY_REFUNDED' ? 'warning.main' : 'primary.main'
      }}
    >
      <Stack spacing={1.5}>
        {/* Header: Order ID + Seller */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" color="text.secondary">#{index}</Typography>
            <Typography
              variant="subtitle2"
              fontWeight="bold"
              color="primary.main"
              sx={{ cursor: 'pointer' }}
              onClick={() => onCopy(order.orderId)}
            >
              {order.orderId || order.legacyOrderId || '-'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Chip
              label={order.seller?.user?.username || 'N/A'}
              size="small"
              sx={{ fontSize: '0.7rem', height: 22 }}
            />
            {order.cancelState && order.cancelState !== 'NONE_REQUESTED' && (
              <Chip
                label={order.cancelState === 'CANCELED' ? 'Canceled' : 'Cancel Req'}
                size="small"
                color={order.cancelState === 'CANCELED' ? 'error' : 'warning'}
                sx={{ fontSize: '0.65rem', height: 20 }}
              />
            )}
          </Stack>
        </Stack>

        {/* Product with thumbnail */}
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          {thumbnailImages[order._id] && (
            <Box
              onClick={() => onViewImages(order)}
              sx={{
                width: 60,
                height: 60,
                borderRadius: 1,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'grey.300',
                flexShrink: 0,
                cursor: 'pointer'
              }}
            >
              <img
                src={thumbnailImages[order._id]}
                alt="Product"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.3,
                fontSize: '0.85rem'
              }}
            >
              {productTitle}
            </Typography>
            {itemId && (
              <Link
                href={`https://www.ebay.com/itm/${itemId}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontSize: '0.7rem' }}
              >
                ID: {itemId}
              </Link>
            )}
          </Box>
        </Stack>

        {/* Key Info Grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Date Sold
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{dateSold}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Earnings
            </Typography>
            <Typography
              variant="body2"
              fontWeight="bold"
              sx={{
                fontSize: '0.9rem',
                color: order.orderEarnings >= 0 ? 'success.main' : 'error.main'
              }}
            >
              {formatCurrency(order.orderEarnings)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Buyer
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }} noWrap>{buyerName}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Marketplace
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              {order.purchaseMarketplaceId?.replace('EBAY_', '') || '-'}
            </Typography>
          </Box>
        </Box>

        {/* Expandable Details */}
        <Collapse in={expanded}>
          <Divider sx={{ my: 1 }} />
          <Stack spacing={1}>
            {/* Financial Details */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Subtotal</Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{formatCurrency(order.subtotalUSD)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Shipping</Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{formatCurrency(order.shippingUSD)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Transaction Fees</Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'error.main' }}>
                  {formatCurrency(order.transactionFeesUSD)}
                </Typography>
              </Box>
              {order.adFeeGeneral > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>Ad Fees</Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'error.main' }}>
                    {formatCurrency(order.adFeeGeneral)}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Shipping Address */}
            {order.shippingFullName && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ fontSize: '0.7rem' }}>
                  SHIPPING ADDRESS
                </Typography>
                <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.8rem' }}>
                      {order.shippingFullName}
                    </Typography>
                    <IconButton size="small" onClick={() => onCopy(order.shippingFullName)}>
                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Stack>
                  <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>{order.shippingAddressLine1}</Typography>
                  {order.shippingAddressLine2 && (
                    <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>{order.shippingAddressLine2}</Typography>
                  )}
                  <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                    {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>{order.shippingCountry}</Typography>
                </Stack>
              </Box>
            )}

            {/* Tracking */}
            {order.trackingNumber && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="caption" color="text.secondary">Tracking:</Typography>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                  {order.trackingNumber}
                </Typography>
                <IconButton size="small" onClick={() => onCopy(order.trackingNumber)}>
                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
            )}

            {/* Notes */}
            {order.fulfillmentNotes && (
              <Box sx={{ p: 1, bgcolor: 'warning.light', borderRadius: 1, opacity: 0.8 }}>
                <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                  📝 {order.fulfillmentNotes}
                </Typography>
              </Box>
            )}
          </Stack>
        </Collapse>

        {/* Action Row */}
        <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
          <Button
            size="small"
            variant="text"
            onClick={() => setExpanded(!expanded)}
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
          >
            {expanded ? 'Less' : 'More Details'}
          </Button>
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" onClick={() => onCopy(order.orderId)} title="Copy Order ID">
              <ContentCopyIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton size="small" color="primary" onClick={() => onMessage(order)} title="Message Buyer">
              <ChatIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
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

function FulfillmentDashboard() {
  // Mobile responsiveness
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [sellers, setSellers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pollResults, setPollResults] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  // Image viewer state
  const [itemImages, setItemImages] = useState({}); // { orderId: [imageUrls] }
  const [thumbnailImages, setThumbnailImages] = useState({}); // { orderId: imageUrl }
  const [loadingThumbnails, setLoadingThumbnails] = useState({}); // { orderId: boolean }
  const [loadingImages, setLoadingImages] = useState({}); // { orderId: boolean }
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageCount, setImageCount] = useState(0); // Total image count

  // Earnings breakdown modal
  const [earningsDialogOpen, setEarningsDialogOpen] = useState(false);
  const [selectedOrderForEarnings, setSelectedOrderForEarnings] = useState(null);

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
  const [searchItemId, setSearchItemId] = useState(() => getInitialState('searchItemId', ''));
  //const [searchSoldDate, setSearchSoldDate] = useState('');
  const [searchMarketplace, setSearchMarketplace] = useState(() => getInitialState('searchMarketplace', ''));
  const [searchPaymentStatus, setSearchPaymentStatus] = useState(() => getInitialState('searchPaymentStatus', ''));
  const [excludeLowValue, setExcludeLowValue] = useState(() => getInitialState('excludeLowValue', false));
  const [dateFilter, setDateFilter] = useState(() => getInitialState('dateFilter', ''));
  const [filtersExpanded, setFiltersExpanded] = useState(() => getInitialState('filtersExpanded', false));

  // Close filters by default on mobile
  useEffect(() => {
    if (isSmallMobile && filtersExpanded) {
      setFiltersExpanded(false);
    }
  }, []); // Only run on mount

  // Pagination state - restored from sessionStorage
  const [currentPage, setCurrentPage] = useState(() => getInitialState('currentPage', 1));
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [ordersPerPage] = useState(50);

  // Expanded shipping address - only one can be expanded at a time (accordion behavior)
  const [expandedShippingId, setExpandedShippingId] = useState(null);

  // Editing messaging status
  const [editingMessagingStatus, setEditingMessagingStatus] = useState({});

  // Backfill Ad Fees state
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResults, setBackfillResults] = useState(null);

  // Auto-message state
  const [autoMessageLoading, setAutoMessageLoading] = useState(false);
  const [autoMessageStats, setAutoMessageStats] = useState(null);

  // Resync window state
  const [resyncDays, setResyncDays] = useState(10);

  // Editing item status
  const [editingItemStatus, setEditingItemStatus] = useState({});

  // Remark message confirmation state
  const [remarkConfirmOpen, setRemarkConfirmOpen] = useState(false);
  const [pendingRemarkUpdate, setPendingRemarkUpdate] = useState(null);
  const [sendingRemarkMessage, setSendingRemarkMessage] = useState(false);
  const [remarkTemplates, setRemarkTemplates] = useState([]);
  const [manageRemarkTemplatesOpen, setManageRemarkTemplatesOpen] = useState(false);

  // CSV Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  // selectedExportColumns is initialized after ALL_COLUMNS is defined

  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [snackbarOrderIds, setSnackbarOrderIds] = useState([]); // Store order IDs for copying
  const [updatedOrderDetails, setUpdatedOrderDetails] = useState([]); // Store { orderId, changedFields }

  // Editing order earnings for PARTIALLY_REFUNDED orders
  const [editingOrderEarnings, setEditingOrderEarnings] = useState({}); // { orderId: value }

  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedOrderForMessage, setSelectedOrderForMessage] = useState(null);
  const [messageBody, setMessageBody] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const [searchStartDate, setSearchStartDate] = useState('');
  const [searchEndDate, setSearchEndDate] = useState('');

  const [amazonAccounts, setAmazonAccounts] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [selectedRowId, setSelectedRowId] = useState(null);

  // Column visibility state - persisted in sessionStorage
  const DEFAULT_VISIBLE_COLUMNS = [
    'seller', 'orderId', 'dateSold', 'shipBy', 'deliveryDate', 'productName',
    'buyerName', 'shippingAddress', 'marketplace', 'subtotal',
    'shipping', 'salesTax', 'discount', 'transactionFees',
    'adFeeGeneral', 'cancelStatus', 'refunds', 'orderEarnings', 'trackingNumber',
    'amazonAccount', 'arriving', 'beforeTax', 'estimatedTax',
    'azOrderId', 'amazonRefund', 'cardName', 'notes', 'messagingStatus', 'remark'
  ];

  const ALL_COLUMNS = [
    { id: 'seller', label: 'Seller' },
    { id: 'orderId', label: 'Order ID' },
    { id: 'dateSold', label: 'Date Sold' },
    { id: 'shipBy', label: 'Ship By' },
    { id: 'deliveryDate', label: 'Delivery Date' },
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
    { id: 'refundItemAmount', label: 'Refund Item' },
    { id: 'refundTaxAmount', label: 'Refund Tax' },
    { id: 'refundTotalToBuyer', label: 'Refund Total' },
    { id: 'orderTotalAfterRefund', label: 'Order Total (After Refund)' },
    { id: 'orderEarnings', label: 'Order Earnings' },
    { id: 'trackingNumber', label: 'Tracking Number' },
    { id: 'amazonAccount', label: 'Amazon Acc' },
    { id: 'arriving', label: 'Arriving' },
    { id: 'beforeTax', label: 'Before Tax' },
    { id: 'estimatedTax', label: 'Estimated Tax' },
    { id: 'azOrderId', label: 'Az OrderID' },
    { id: 'amazonRefund', label: 'Amazon Refund' },
    { id: 'cardName', label: 'Card Name' },
    { id: 'notes', label: 'Notes' },
    { id: 'messagingStatus', label: 'Messaging' },
    { id: 'remark', label: 'Remark' }
  ];

  // CSV Export column selection - initialized after ALL_COLUMNS is defined
  const [selectedExportColumns, setSelectedExportColumns] = useState(ALL_COLUMNS.map(c => c.id));

  const [visibleColumns, setVisibleColumns] = useState(() =>
    getInitialState('visibleColumns', DEFAULT_VISIBLE_COLUMNS)
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const templates = await loadRemarkTemplates();
      if (mounted) setRemarkTemplates(templates);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);


  // Helper function to replace template variables
  const replaceTemplateVariables = (template, order) => {
    if (!template || !order) return template;

    // Extract buyer first name
    const buyerFullName = order.buyer?.buyerRegistrationAddress?.fullName || order.shippingFullName || 'Buyer';
    const buyerFirstName = buyerFullName.split(' ')[0];

    // Extract tracking info
    const trackingNumber = order.trackingNumber || '[tracking number]';
    const shippingCarrier = order.shippingCarrier || 'the shipping carrier';

    // Replace variables
    return template
      .replace(/\{\{buyer_first_name\}\}/g, buyerFirstName)
      .replace(/\{\{tracking_number\}\}/g, trackingNumber)
      .replace(/\{\{shipping_carrier\}\}/g, shippingCarrier);
  };

  const handleSaveRemarkTemplates = async (nextTemplates) => {
    try {
      const savedTemplates = await saveRemarkTemplates(nextTemplates);
      setRemarkTemplates(savedTemplates);
      setSnackbarMsg('Remark templates saved');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMsg(error?.response?.data?.error || 'Failed to save remark templates');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Function to send auto-message based on remark
  const sendAutoMessageForRemark = async (order, remarkValue) => {
    // Get template for this remark
    const template = findRemarkTemplateText(remarkTemplates, remarkValue);
    if (!template) {
      console.log('No template found for remark:', remarkValue);
      return false;
    }

    // Replace variables in template
    const messageBody = replaceTemplateVariables(template, order);

    try {
      // Send message using the same endpoint as manual messages
      await api.post('/ebay/send-message', {
        orderId: order.orderId,
        buyerUsername: order.buyer?.username,
        itemId: order.itemNumber || order.lineItems?.[0]?.legacyItemId,
        body: messageBody,
        subject: `Regarding Order #${order.orderId}`
      });

      console.log(`Auto-message sent for remark: ${remarkValue}`);
      return true;
    } catch (error) {
      console.error('Failed to send auto-message:', error);
      throw error;
    }
  };

  // Handle remark confirmation - user clicked "Yes, Send Message"
  const handleConfirmRemarkMessage = async () => {
    if (!pendingRemarkUpdate) return;

    const { orderId, remarkValue, order } = pendingRemarkUpdate;
    setSendingRemarkMessage(true);

    try {
      // First update the remark field
      const { data } = await api.patch(`/ebay/orders/${orderId}/manual-fields`, { remark: remarkValue });

      // Update local state
      setOrders(prev => prev.map(o => {
        if (o._id === orderId) {
          return { ...o, remark: remarkValue };
        }
        return o;
      }));

      // Then send the auto-message
      const messageSent = await sendAutoMessageForRemark(order, remarkValue);

      if (messageSent) {
        setSnackbarMsg(`Remark updated to "${remarkValue}" and message sent to buyer`);
        setSnackbarSeverity('success');
      }
      setSnackbarOpen(true);

    } catch (error) {
      console.error('Error in remark update/message:', error);
      setSnackbarMsg('Failed to update remark or send message: ' + (error.response?.data?.error || error.message));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSendingRemarkMessage(false);
      setRemarkConfirmOpen(false);
      setPendingRemarkUpdate(null);
    }
  };

  // Handle remark confirmation - user clicked "No, Skip"
  const handleSkipRemarkMessage = async () => {
    if (!pendingRemarkUpdate) return;

    const { orderId, remarkValue } = pendingRemarkUpdate;

    try {
      // Just update the remark without sending message
      await api.patch(`/ebay/orders/${orderId}/manual-fields`, { remark: remarkValue });

      // Update local state
      setOrders(prev => prev.map(o => {
        if (o._id === orderId) {
          return { ...o, remark: remarkValue };
        }
        return o;
      }));

      setSnackbarMsg(`Remark updated to "${remarkValue}" (message not sent)`);
      setSnackbarSeverity('info');
      setSnackbarOpen(true);

    } catch (error) {
      console.error('Error updating remark:', error);
      setSnackbarMsg('Failed to update remark');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setRemarkConfirmOpen(false);
      setPendingRemarkUpdate(null);
    }
  };

  // Handle remark update - intercept to show confirmation
  const handleRemarkUpdate = (orderId, remarkValue) => {
    if (remarkValue === '__manage_templates__') {
      setManageRemarkTemplatesOpen(true);
      return;
    }
    // Find the order
    const order = orders.find(o => o._id === orderId);
    if (!order) {
      console.error('Order not found:', orderId);
      return;
    }

    // Check if there's a template for this remark
    const hasTemplate = findRemarkTemplateText(remarkTemplates, remarkValue);

    if (hasTemplate) {
      // Show confirmation dialog
      setPendingRemarkUpdate({ orderId, remarkValue, order });
      setRemarkConfirmOpen(true);
    } else {
      // No template, just update normally
      updateManualField(orderId, 'remark', remarkValue);
    }
  };


  const updateManualField = async (orderId, field, value) => {
    try {
      const { data } = await api.patch(`/ebay/orders/${orderId}/manual-fields`, { [field]: value });

      // Update local state with the full order data (includes recalculated Amazon financials)
      setOrders(prev => prev.map(o => {
        if (o._id === orderId) {
          // If beforeTax or estimatedTax was updated, use the full order response which includes recalculated values
          if (field === 'beforeTax' || field === 'estimatedTax') {
            return data.order; // Full order with recalculated amazonTotal, amazonTotalINR, marketplaceFee, igst, totalCC
          }
          // For other fields, just update that field
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
    searchItemId,
    searchMarketplace,
    searchPaymentStatus,
    excludeLowValue,
    dateFilter
  });

  // Fetch amazon accounts once
  useEffect(() => {
    if (!hasFetchedInitialData.current) {
      api.get('/amazon-accounts').then(({ data }) => setAmazonAccounts(data || [])).catch(console.error);
      api.get('/credit-cards').then(({ data }) => setCreditCards(data || [])).catch(console.error);
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
      prevFilters.current.searchItemId !== searchItemId ||
      prevFilters.current.searchMarketplace !== searchMarketplace ||
      prevFilters.current.searchPaymentStatus !== searchPaymentStatus ||
      prevFilters.current.excludeLowValue !== excludeLowValue ||
      JSON.stringify(prevFilters.current.dateFilter) !== JSON.stringify(dateFilter);

    // Update prev filters
    prevFilters.current = {
      selectedSeller,
      searchOrderId,
      searchBuyerName,
      searchItemId,
      searchMarketplace,
      searchPaymentStatus,
      excludeLowValue,
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
  }, [selectedSeller, searchOrderId, searchBuyerName, searchItemId, searchMarketplace, searchPaymentStatus, excludeLowValue, dateFilter]);

  // Handle order earnings change (update local state)
  const handleOrderEarningsChange = (orderId, orderIdStr, value) => {
    setEditingOrderEarnings(prev => ({
      ...prev,
      [orderId]: value
    }));

    // Update orders state immediately for UI feedback
    setOrders(prev => prev.map(order =>
      order._id === orderId
        ? { ...order, orderEarnings: parseFloat(value) || 0 }
        : order
    ));
  };

  // Handle order earnings save (persist to backend)
  const handleOrderEarningsSave = async (orderId, orderIdStr) => {
    const newValue = editingOrderEarnings[orderId];
    if (newValue === undefined) return;

    try {
      const { data } = await api.post(`/ebay/orders/${orderIdStr}/update-earnings`, {
        orderEarnings: parseFloat(newValue)
      });

      // Update orders state with recalculated financial fields
      setOrders(prev => prev.map(order =>
        order._id === orderId
          ? {
            ...order,
            orderEarnings: data.orderEarnings,
            tds: data.tds,
            tid: data.tid,
            net: data.net,
            pBalanceINR: data.pBalanceINR,
            ebayExchangeRate: data.ebayExchangeRate
          }
          : order
      ));

      // Clear editing state
      setEditingOrderEarnings(prev => {
        const newState = { ...prev };
        delete newState[orderId];
        return newState;
      });

      // Show success message
      setSnackbarMsg(`Order earnings updated for ${orderIdStr}`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Error updating order earnings:', err);
      setSnackbarMsg(`Failed to update order earnings: ${err.response?.data?.error || err.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

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
      if (searchItemId.trim()) params.searchItemId = searchItemId.trim();
      if (searchMarketplace) params.searchMarketplace = searchMarketplace;
      if (searchPaymentStatus) params.paymentStatus = searchPaymentStatus;
      params.excludeLowValue = excludeLowValue;

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



  // Function to fetch ONLY thumbnail (first image) for display
  const fetchThumbnail = async (order) => {
    const orderId = order._id;
    const itemId = order.itemNumber || order.lineItems?.[0]?.legacyItemId;
    const sellerId = order.seller?._id || order.seller;

    if (!itemId || !sellerId || thumbnailImages[orderId]) {
      return; // Skip if no item ID, no seller, or already loaded
    }

    setLoadingThumbnails(prev => ({ ...prev, [orderId]: true }));

    try {
      const { data } = await api.get(`/ebay/item-images/${itemId}?sellerId=${sellerId}&thumbnail=true`);
      if (data.images && data.images.length > 0) {
        setThumbnailImages(prev => ({ ...prev, [orderId]: data.images[0] }));
        // Store the total count so we know if there are more images
        if (data.total > 1) {
          setItemImages(prev => ({ ...prev, [orderId]: { count: data.total } }));
        }
      }
    } catch (error) {
      console.error('Error fetching thumbnail:', error);
    } finally {
      setLoadingThumbnails(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Function to fetch ALL images when user clicks (only called on demand)
  const fetchAllImages = async (order) => {
    const orderId = order._id;
    const itemId = order.itemNumber || order.lineItems?.[0]?.legacyItemId;
    const sellerId = order.seller?._id || order.seller;

    // If we already have all images, just use them
    if (itemImages[orderId]?.images) {
      return itemImages[orderId].images;
    }

    setLoadingImages(prev => ({ ...prev, [orderId]: true }));

    try {
      const { data } = await api.get(`/ebay/item-images/${itemId}?sellerId=${sellerId}`);
      const allImages = data.images || [];
      setItemImages(prev => ({ ...prev, [orderId]: { images: allImages, count: allImages.length } }));
      return allImages;
    } catch (error) {
      console.error('Error fetching all images:', error);
      return [];
    } finally {
      setLoadingImages(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Fetch thumbnails for visible orders when they load
  useEffect(() => {
    if (orders.length > 0) {
      orders.forEach(order => {
        fetchThumbnail(order);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  // Function to open image viewer (fetches all images on demand)
  const handleViewImages = async (order) => {
    const allImages = await fetchAllImages(order);

    if (allImages.length > 0) {
      setSelectedImages(allImages);
      setImageCount(allImages.length);
      setImageDialogOpen(true);
    }
  };

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
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 200 }}
        >
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
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
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

  // Resync recent orders (last 10 days) - catches silent eBay changes
  async function resyncRecent() {
    setLoading(true);
    setError('');
    setPollResults(null);
    setSnackbarOrderIds([]);
    setUpdatedOrderDetails([]);
    setUpdatedOrderDetails([]);
    try {
      const { data } = await api.post('/ebay/resync-recent', { days: resyncDays });
      setPollResults(data || null);

      // Reset filters to show all sellers and go to page 1
      setSelectedSeller('');
      setCurrentPage(1);

      // Reload orders with reset filters
      await loadStoredOrders();

      if (data && (data.totalUpdated > 0 || data.totalNew > 0)) {
        // Collect updated order details
        const updatedDetails = data.pollResults
          .filter(r => r.success && r.updatedOrders && r.updatedOrders.length > 0)
          .flatMap(r => r.updatedOrders);

        const newOrderIds = data.pollResults
          .filter(r => r.success && r.newOrders && r.newOrders.length > 0)
          .flatMap(r => r.newOrders);

        const orderIds = [
          ...newOrderIds,
          ...updatedDetails.map(u => u.orderId)
        ];
        setSnackbarOrderIds(orderIds);
        setUpdatedOrderDetails(updatedDetails);

        setSnackbarMsg(
          `Resync Complete! Updated: ${data.totalUpdated}, New: ${data.totalNew}`
        );
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else if (data) {
        setSnackbarMsg('Resync Complete! All orders are up to date.');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to resync orders');
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = useCallback((text) => {
    const val = text || '-';
    if (val === '-') return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(val);
      setCopiedText(val);
      setTimeout(() => setCopiedText(''), 1200);
    }
  }, []);

  // Handle Amazon refund received - zero out Amazon costs
  const handleAmazonRefundReceived = async (order) => {
    const confirmed = window.confirm(`Have you received the refund from Amazon for order ${order.orderId}?\n\nThis will set Before Tax and Estimated Tax to $0 and recalculate all dependent values.`);

    if (!confirmed) return;

    try {
      const { data } = await api.post(`/ebay/orders/${order.orderId}/amazon-refund-received`);

      // Update orders state with zeroed Amazon values
      setOrders(prev => prev.map(o =>
        o._id === order._id
          ? {
            ...o,
            beforeTaxUSD: data.beforeTaxUSD,
            estimatedTaxUSD: data.estimatedTaxUSD,
            amazonTotal: data.amazonTotal,
            amazonTotalINR: data.amazonTotalINR,
            marketplaceFee: data.marketplaceFee,
            igst: data.igst,
            totalCC: data.totalCC,
            amazonExchangeRate: data.amazonExchangeRate
          }
          : o
      ));

      setSnackbarMsg(`Amazon refund marked as received for order ${order.orderId}`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Error marking Amazon refund received:', err);
      setSnackbarMsg(`Failed to update: ${err.response?.data?.error || err.message}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
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

  const toggleShippingExpanded = useCallback((orderId) => {
    // If clicking same order, collapse it; otherwise expand new one
    setExpandedShippingId(prev => prev === orderId ? null : orderId);
  }, []);

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

  // Custom formatter for Delivery Date Range
  const formatDeliveryDate = (order) => {
    // 1. Try to find dates in line items (preferred) or top-level
    // The structure is usually order.lineItems[0].lineItemFulfillmentInstructions.minEstimatedDeliveryDate
    let minDateStr = order.lineItems?.[0]?.lineItemFulfillmentInstructions?.minEstimatedDeliveryDate;
    let maxDateStr = order.lineItems?.[0]?.lineItemFulfillmentInstructions?.maxEstimatedDeliveryDate || order.estimatedDelivery;

    // Fallback if lineItems is missing or structure is different
    if (!maxDateStr) return '-';

    const marketplaceId = order.purchaseMarketplaceId;

    // Helper to get partial date string
    const getFormattedDatePart = (dStr) => {
      if (!dStr) return null;
      try {
        const date = new Date(dStr);
        let timeZone = 'UTC';
        // Determine Timezone
        if (marketplaceId === 'EBAY_US') timeZone = 'America/Los_Angeles';
        else if (['EBAY_CA', 'EBAY_ENCA'].includes(marketplaceId)) timeZone = 'America/New_York';
        else if (marketplaceId === 'EBAY_AU') timeZone = 'Australia/Sydney';

        return date.toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric', timeZone
        });
      } catch { return null; }
    };

    const minPart = getFormattedDatePart(minDateStr);
    const maxPart = getFormattedDatePart(maxDateStr);

    if (minPart && maxPart && minPart !== maxPart) {
      return (
        <Stack spacing={0}>
          <Typography variant="body2" fontWeight="medium">{minPart} -</Typography>
          <Typography variant="body2" fontWeight="medium">{maxPart}</Typography>
        </Stack>
      );
    }

    return (
      <Typography variant="body2">
        {maxPart || '-'}
      </Typography>
    );
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

  // Earnings Breakdown Modal Component
  const EarningsBreakdownModal = ({ open, order, onClose }) => {
    if (!order) return null;

    const formatCurrency = (value) => {
      if (value == null || value === '') return '-';
      const num = parseFloat(value);
      return isNaN(num) ? '-' : `$${num.toFixed(2)}`;
    };

    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ backgroundColor: 'primary.main', color: 'white', pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Order Earnings Breakdown</Typography>
            <IconButton onClick={onClose} sx={{ color: 'white' }} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            Order ID: {order.orderId}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {/* What Your Buyer Paid */}
          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
            What your buyer paid
          </Typography>
          <Stack spacing={1} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Subtotal</Typography>
              <Typography fontWeight="medium">{formatCurrency(order.subtotalUSD || order.subtotal)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Shipping</Typography>
              <Typography fontWeight="medium">{formatCurrency(order.shippingUSD || order.shipping)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Sales tax*</Typography>
              <Typography fontWeight="medium">{formatCurrency(order.salesTaxUSD || order.salesTax)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Discount</Typography>
              <Typography fontWeight="medium" color="success.main">{formatCurrency(order.discountUSD || order.discount)}</Typography>
            </Box>
            {order.refundTotalToBuyerUSD > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Refund</Typography>
                <Typography fontWeight="medium" color="error.main">-{formatCurrency(order.refundTotalToBuyerUSD || order.refundTotalToBuyer)}</Typography>
              </Box>
            )}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography fontWeight="bold">Order total**</Typography>
              <Typography fontWeight="bold">{formatCurrency(order.orderTotalAfterRefund)}</Typography>
            </Box>
          </Stack>

          {/* What You Earned */}
          <Typography variant="h6" sx={{ mb: 2, color: 'success.main' }}>
            What you earned
          </Typography>
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Order total</Typography>
              <Typography fontWeight="medium">{formatCurrency(order.orderTotalAfterRefund)}</Typography>
            </Box>
            {order.ebayPaidTaxRefundUSD > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Refund (eBay paid)</Typography>
                <Typography fontWeight="medium" color="success.main">{formatCurrency(order.ebayPaidTaxRefundUSD || order.ebayPaidTaxRefund)}</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 2 }}>
              <Typography variant="body2" color="text.secondary">eBay collected from buyer</Typography>
              <Box />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 4 }}>
              <Typography variant="body2">Sales tax</Typography>
              <Typography variant="body2" color="error.main">-{formatCurrency(order.salesTaxUSD || order.salesTax)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 2 }}>
              <Typography variant="body2" color="text.secondary">Selling costs</Typography>
              <Box />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 4 }}>
              <Typography variant="body2">Transaction fees</Typography>
              <Typography variant="body2" color="error.main">-{formatCurrency(order.transactionFeesUSD || order.transactionFees)}</Typography>
            </Box>
            {order.adFeeGeneralUSD > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pl: 4 }}>
                <Typography variant="body2">Ad Fee General</Typography>
                <Typography variant="body2" color="error.main">-{formatCurrency(order.adFeeGeneralUSD || order.adFeeGeneral)}</Typography>
              </Box>
            )}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography fontWeight="bold" color="success.main">Order earnings</Typography>
              <Typography fontWeight="bold" color={order.orderEarnings >= 0 ? 'success.main' : 'error.main'}>
                {formatCurrency(order.orderEarnings)}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Open the Export Dialog
  const handleOpenExportDialog = () => {
    // Initialize with ALL columns selected by default
    setSelectedExportColumns(ALL_COLUMNS.map(col => col.id));
    setExportDialogOpen(true);
  };

  // Toggle column selection in Export Dialog
  const handleToggleExportColumn = (columnId) => {
    setSelectedExportColumns(prev => {
      if (prev.includes(columnId)) {
        return prev.filter(id => id !== columnId);
      } else {
        return [...prev, columnId];
      }
    });
  };

  const handleToggleAllExportColumns = () => {
    if (selectedExportColumns.length === ALL_COLUMNS.length) {
      setSelectedExportColumns([]); // Deselect all
    } else {
      setSelectedExportColumns(ALL_COLUMNS.map(col => col.id)); // Select all
    }
  };

  // Execute CSV Export with selected columns
  const handleExecuteExport = async () => {
    if (orders.length === 0) {
      setSnackbarMsg('No orders to export');
      setSnackbarSeverity('warning');
      setSnackbarOpen(true);
      return;
    }

    if (selectedExportColumns.length === 0) {
      alert("Please select at least one column to export.");
      return;
    }

    try {
      // Show loading state
      setLoading(true);
      setExportDialogOpen(false); // Close dialog immediately

      // Build params with all current filters, but without pagination limits
      const params = {};

      if (selectedSeller) params.sellerId = selectedSeller;
      if (searchOrderId.trim()) params.searchOrderId = searchOrderId.trim();
      if (searchBuyerName.trim()) params.searchBuyerName = searchBuyerName.trim();
      if (searchItemId.trim()) params.searchItemId = searchItemId.trim();
      if (searchMarketplace) params.searchMarketplace = searchMarketplace;
      if (searchPaymentStatus) params.paymentStatus = searchPaymentStatus;

      // Apply date filters
      if (dateFilter.mode === 'single' && dateFilter.single) {
        params.startDate = dateFilter.single;
        params.endDate = dateFilter.single;
      } else if (dateFilter.mode === 'range') {
        if (dateFilter.from) params.startDate = dateFilter.from;
        if (dateFilter.to) params.endDate = dateFilter.to;
      }

      // Fetch ALL orders with current filters (no pagination limit)
      params.limit = 999999; // Ensure we get all results
      const { data } = await api.get('/ebay/stored-orders', { params });
      const allOrders = data?.orders || [];

      if (allOrders.length === 0) {
        setSnackbarMsg('No orders found to export');
        setSnackbarSeverity('warning');
        setSnackbarOpen(true);
        setLoading(false);
        return;
      }

      // Define ALL possible column definitions
      const allColumnDefs = {
        'Order ID': 'orderId',
        'Legacy Order ID': 'legacyOrderId',
        'Seller': (o) => o.seller?.user?.username || '',
        'Date Sold': (o) => o.dateSold ? new Date(o.dateSold).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' }) : '',
        'Product Name': 'productName',
        'Item Number': 'itemNumber',
        'Buyer Name': 'shippingFullName',
        'Buyer Username': (o) => o.buyer?.username || '',
        'Marketplace': 'purchaseMarketplaceId',
        'Subtotal (USD)': 'subtotalUSD',
        'Shipping (USD)': 'shippingUSD',
        'Sales Tax (USD)': 'salesTaxUSD',
        'Discount (USD)': 'discountUSD',
        'Transaction Fees (USD)': 'transactionFeesUSD',
        'Ad Fees': 'adFeeGeneral',
        'Cancel Status': 'cancelState',
        'Refunds': (o) => o.refunds?.map(r => `${r.orderPaymentStatus === 'FULLY_REFUNDED' ? 'Full' : 'Partial'}: $${(Number(r.amount?.value || r.refundAmount?.value || 0) * (o.conversionRate || 1)).toFixed(2)}`).join('; ') || '',
        'Refund Item': 'refundItemAmount',
        'Refund Tax': 'refundTaxAmount',
        'Refund Total': 'refundTotalToBuyer',
        'Order Total (After Refund)': 'orderTotalAfterRefund',
        'Order Earnings': 'orderEarnings',
        'Payment Status': 'orderPaymentStatus',
        'Fulfillment Status': 'orderFulfillmentStatus',
        'Tracking Number': 'trackingNumber',
        'Shipping Address': (o) => [o.shippingAddressLine1, o.shippingAddressLine2, o.shippingCity, o.shippingState, o.shippingPostalCode, o.shippingCountry].filter(Boolean).join(', '),
        'Amazon Acc': 'amazonAccount',
        'Arriving': 'arrivingDate',
        'Before Tax': 'beforeTax',
        'Estimated Tax': 'estimatedTax',
        'Az OrderID': 'azOrderId',
        'Amazon Refund': 'amazonRefund',
        'Card Name': 'cardName',
        'Notes': 'fulfillmentNotes',
        'Messaging': 'messagingStatus',
        'Remark': 'remark'
      };

      // Filter Column Defs based on selectedExportColumns
      // We need to map our internal IDs (from ALL_COLUMNS) to the keys in allColumnDefs or construct a new object
      // Let's assume a mapping or just look up by ID.
      // Wait, ALL_COLUMNS has `id` and `label`. `allColumnDefs` keys are Labels (mostly).
      // Let's create a direct mapping object for cleaner lookups.

      const columnIdToCsvKey = {
        'seller': 'Seller',
        'orderId': 'Order ID',
        'dateSold': 'Date Sold',
        // 'shipBy': 'Ship By', // Not in prev CSV but we can add if needed
        // 'deliveryDate': 'Delivery Date', // Not in prev CSV
        'productName': 'Product Name',
        'buyerName': 'Buyer Name',
        'shippingAddress': 'Shipping Address',
        'marketplace': 'Marketplace',
        'subtotal': 'Subtotal (USD)',
        'shipping': 'Shipping (USD)',
        'salesTax': 'Sales Tax (USD)',
        'discount': 'Discount (USD)',
        'transactionFees': 'Transaction Fees (USD)',
        'adFeeGeneral': 'Ad Fees',
        'cancelStatus': 'Cancel Status',
        'refunds': 'Refunds',
        'refundItemAmount': 'Refund Item',
        'refundTaxAmount': 'Refund Tax',
        'refundTotalToBuyer': 'Refund Total',
        'orderTotalAfterRefund': 'Order Total (After Refund)',
        'orderEarnings': 'Order Earnings',
        'trackingNumber': 'Tracking Number',
        'amazonAccount': 'Amazon Acc',
        'arriving': 'Arriving',
        'beforeTax': 'Before Tax',
        'estimatedTax': 'Estimated Tax',
        'azOrderId': 'Az OrderID',
        'amazonRefund': 'Amazon Refund',
        'cardName': 'Card Name',
        'notes': 'Notes',
        'messagingStatus': 'Messaging',
        'remark': 'Remark'
      };

      // Also there are some columns in CSV that were not in ALL_COLUMNS list like 'Legacy Order ID', 'Buyer Username', 'Item Number', 'Payment Status', 'Fulfillment Status'
      // We should probably allow exporting them too. 
      // For now, let's stick to the ones visible in the UI + the standard ones requested. 
      // Actually, let's just use the selected columns from the UI list as the primary driver.

      const dynamicCsvColumns = {};

      // Always include some basics if they are not in the list? Or strictly follow selection?
      // Strict selection is better for "customizable".

      selectedExportColumns.forEach(colId => {
        const csvKey = columnIdToCsvKey[colId];
        if (csvKey && allColumnDefs[csvKey]) {
          dynamicCsvColumns[csvKey] = allColumnDefs[csvKey];
        }
      });

      // Add extra always-useful columns if the user selected the main "Order ID" or similar?
      // Or just add them to the selection list? 
      // Let's just stick to the map.
      // But wait, what about 'Legacy Order ID', 'Buyer Username', 'Item Number', 'Payment Status'?
      // I should add them to ALL_COLUMNS if I want them selectable, or just bundle them?
      // The user said "option to choose the columns and not just everything".
      // I'll add the missing significant ones to the logic:

      // If 'orderId' is selected, maybe include 'Legacy Order ID'? 
      // If 'productName' is selected, include 'Item Number'?
      // If 'buyerName' is selected, include 'Buyer Username'?

      if (selectedExportColumns.includes('orderId')) {
        dynamicCsvColumns['Legacy Order ID'] = allColumnDefs['Legacy Order ID'];
      }
      if (selectedExportColumns.includes('productName')) {
        dynamicCsvColumns['Item Number'] = allColumnDefs['Item Number'];
      }
      if (selectedExportColumns.includes('buyerName')) {
        dynamicCsvColumns['Buyer Username'] = allColumnDefs['Buyer Username'];
      }

      // Payment Status and Fulfillment Status are useful context, maybe add if 'marketplace' or 'orderId' is present?
      // Let's just add them if 'orderId' is there, usually that implies a full record export.
      if (selectedExportColumns.includes('orderId')) {
        dynamicCsvColumns['Payment Status'] = allColumnDefs['Payment Status'];
        dynamicCsvColumns['Fulfillment Status'] = allColumnDefs['Fulfillment Status'];
      }


      const csvData = prepareCSVData(allOrders, dynamicCsvColumns);
      downloadCSV(csvData, 'Fulfillment_Orders');

      setSnackbarMsg(`Exported ${allOrders.length} orders with ${Object.keys(dynamicCsvColumns).length} columns`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('CSV export error:', error);
      setSnackbarMsg('Failed to export orders to CSV');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Auto-message handlers
  const handleSendAutoMessages = async () => {
    setAutoMessageLoading(true);
    try {
      const res = await api.post('/ebay/orders/send-auto-messages');
      const { sent, failed, processed } = res.data;
      setSnackbarMsg(`Auto-messages: ${sent} sent, ${failed} failed (${processed} processed)`);
      setSnackbarSeverity(sent > 0 ? 'success' : 'info');
      setSnackbarOpen(true);
      // Reload orders to reflect updated status
      await fetchOrders();
    } catch (err) {
      console.error('Auto-message error:', err);
      setSnackbarMsg('Failed to send auto-messages: ' + (err.response?.data?.error || err.message));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setAutoMessageLoading(false);
    }
  };

  const handleToggleAutoMessage = async (orderId, disabled) => {
    try {
      await api.patch(`/ebay/orders/${orderId}/auto-message-toggle`, { disabled });
      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(o =>
          o.orderId === orderId ? { ...o, autoMessageDisabled: disabled } : o
        )
      );
      setSnackbarMsg(`Auto-message ${disabled ? 'disabled' : 'enabled'} for order`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Toggle auto-message error:', err);
      setSnackbarMsg('Failed to toggle auto-message');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: { xs: 'calc(100dvh - 56px)', sm: 'calc(100dvh - 64px)', md: 'calc(100vh - 100px)' },
      overflow: 'hidden',
      width: '100%',
      maxWidth: '100%',
      px: { xs: 0.5, sm: 1, md: 0 }
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
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 1, sm: 2 }, flexShrink: 0 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={{ xs: 1, sm: 2 }}
          sx={{ mb: 2 }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <LocalShippingIcon color="primary" sx={{ fontSize: { xs: 20, sm: 24 } }} />
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' } }}
            >
              Fulfillment Dashboard
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            {totalOrders > 0 && (
              <Chip
                label={`${totalOrders} orders`}
                color="primary"
                variant="filled"
                size={isSmallMobile ? 'small' : 'medium'}
              />
            )}
            {orders.length > 0 && totalPages > 1 && (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                (Page {currentPage}/{totalPages})
              </Typography>
            )}
            {orders.length > 0 && (
              <Button
                variant="outlined"
                color="success"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleOpenExportDialog}
                sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}
              >
                {isSmallMobile ? 'CSV' : 'Download CSV'}
              </Button>
            )}
            <Button
              variant="contained"
              color="info"
              size="small"
              startIcon={autoMessageLoading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
              onClick={handleSendAutoMessages}
              disabled={autoMessageLoading}
              sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}
            >
              {isSmallMobile ? 'Auto Msg' : 'Send Auto Messages'}
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* CONTROLS */}
        {isMobile ? (
          /* MOBILE LAYOUT - Compact Vertical Stack */
          <Stack spacing={1}>
            {/* Row 1: Seller Select */}
            <FormControl size="small" fullWidth>
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

            {/* Row 2: Poll Buttons (side by side) */}
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="primary"
                startIcon={!isSmallMobile && (loading ? <CircularProgress size={16} color="inherit" /> : <ShoppingCartIcon />)}
                onClick={pollNewOrders}
                disabled={loading}
                size="small"
                fullWidth
                sx={{
                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                  px: { xs: 0.5, sm: 1 }
                }}
              >
                {loading ? 'Polling...' : isSmallMobile ? 'Poll New' : 'Poll New Orders'}
              </Button>

              <Button
                variant="contained"
                color="secondary"
                startIcon={!isSmallMobile && (loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />)}
                onClick={pollOrderUpdates}
                disabled={loading}
                size="small"
                fullWidth
                sx={{
                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                  px: { xs: 0.5, sm: 1 }
                }}
              >
                {loading ? 'Updating...' : isSmallMobile ? 'Poll Updates' : 'Poll Order Updates'}
              </Button>

              <Select
                value={resyncDays}
                onChange={(e) => setResyncDays(e.target.value)}
                size="small"
                sx={{
                  height: 30,
                  fontSize: '0.75rem',
                  bgcolor: 'background.paper',
                  '& .MuiSelect-select': { py: 0.5, px: 1 }
                }}
              >
                <MenuItem value={3}>3 Days</MenuItem>
                <MenuItem value={7}>7 Days</MenuItem>
                <MenuItem value={10}>10 Days</MenuItem>
                <MenuItem value={15}>15 Days</MenuItem>
                <MenuItem value={30}>30 Days</MenuItem>
              </Select>

              <Button
                variant="outlined"
                color="warning"
                startIcon={!isSmallMobile && (loading ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />)}
                onClick={resyncRecent}
                disabled={loading}
                size="small"
                fullWidth
                sx={{
                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                  px: { xs: 0.5, sm: 1 }
                }}
              >
                {loading ? 'Syncing...' : isSmallMobile ? 'Resync' : `Resync ${resyncDays}D`}
              </Button>
            </Stack>

            {/* Row 3: Filters side by side */}
            <Stack direction="row" spacing={1}>
              <FormControl size="small" fullWidth>
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

              <FormControl size="small" fullWidth>
                <InputLabel id="payment-status-filter-label">Payment Status</InputLabel>
                <Select
                  labelId="payment-status-filter-label"
                  value={searchPaymentStatus}
                  label="Payment Status"
                  onChange={(e) => setSearchPaymentStatus(e.target.value)}
                >
                  <MenuItem value="">
                    <em>All</em>
                  </MenuItem>
                  <MenuItem value="FULLY_REFUNDED">FULLY_REFUNDED</MenuItem>
                  <MenuItem value="PARTIALLY_REFUNDED">PARTIALLY_REFUNDED</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* Row 3.5: Exclude Low Value Toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={excludeLowValue}
                  onChange={(e) => setExcludeLowValue(e.target.checked)}
                  color="primary"
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                  Exclude &lt; $3 Orders
                </Typography>
              }
              sx={{ mx: 1 }}
            />

            {/* Row 4: Backfill & Column Selector */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title={selectedSeller ? "Backfill Ad Fees" : "Select a seller first"}>
                <span style={{ flex: 1 }}>
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    fullWidth
                    startIcon={backfillLoading ? <CircularProgress size={14} color="inherit" /> : <LocalShippingIcon />}
                    onClick={backfillAdFees}
                    disabled={backfillLoading || !selectedSeller}
                    sx={{ fontSize: '0.7rem' }}
                  >
                    {backfillLoading ? 'Fetching...' : 'Backfill Ad Fees'}
                  </Button>
                </span>
              </Tooltip>
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
          </Stack>
        ) : (
          /* DESKTOP LAYOUT - Original Horizontal Layout */
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
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
              sx={{ minWidth: 120, fontSize: '0.85rem', px: 1 }}
            >
              {loading ? 'Polling...' : 'Poll New Orders'}
            </Button>

            <Button
              variant="contained"
              color="secondary"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
              onClick={pollOrderUpdates}
              disabled={loading}
              sx={{ minWidth: 120, fontSize: '0.85rem', px: 1 }}
            >
              {loading ? 'Updating...' : 'Poll Order Updates'}
            </Button>

            <FormControl size="small" sx={{ minWidth: 90 }}>
              <Select
                value={resyncDays}
                onChange={(e) => setResyncDays(e.target.value)}
                sx={{ height: 36, fontSize: '0.85rem' }}
              >
                <MenuItem value={3}>3 Days</MenuItem>
                <MenuItem value={7}>7 Days</MenuItem>
                <MenuItem value={10}>10 Days</MenuItem>
                <MenuItem value={15}>15 Days</MenuItem>
                <MenuItem value={30}>30 Days</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              color="warning"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
              onClick={resyncRecent}
              disabled={loading}
              sx={{ minWidth: 120, fontSize: '0.85rem', px: 1 }}
            >
              {loading ? 'Syncing...' : `Resync ${resyncDays} Days`}
            </Button>

            <Tooltip title={selectedSeller ? "Fetch ad fees from eBay for all orders" : "Select a seller first"}>
              <span>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={backfillLoading ? <CircularProgress size={16} color="inherit" /> : <LocalShippingIcon />}
                  onClick={backfillAdFees}
                  disabled={backfillLoading || !selectedSeller}
                  sx={{ minWidth: 120, fontSize: '0.85rem', px: 1 }}
                >
                  {backfillLoading ? 'Fetching Fees...' : 'Backfill Fees'}
                </Button>
              </span>
            </Tooltip>

            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel id="marketplace-filter-label" sx={{ fontSize: '0.75rem' }}>Marketplace</InputLabel>
              <Select
                labelId="marketplace-filter-label"
                value={searchMarketplace}
                label="Marketplace"
                onChange={(e) => setSearchMarketplace(e.target.value)}
                sx={{ fontSize: '0.8rem', height: 32, '& .MuiSelect-select': { py: 0.5, px: 0.8 } }}
              >
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                <MenuItem value="EBAY_US">EBAY_US</MenuItem>
                <MenuItem value="EBAY_AU">EBAY_AU</MenuItem>
                <MenuItem value="EBAY_ENCA">EBAY_CA</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 125 }}>
              <InputLabel id="payment-status-filter-label" sx={{ fontSize: '0.75rem' }}>Payment Status</InputLabel>
              <Select
                labelId="payment-status-filter-label"
                value={searchPaymentStatus}
                label="Payment Status"
                onChange={(e) => setSearchPaymentStatus(e.target.value)}
                sx={{ fontSize: '0.8rem', height: 32, '& .MuiSelect-select': { py: 0.5, px: 0.8 } }}
              >
                <MenuItem value="">
                  <em>All</em>
                </MenuItem>
                <MenuItem value="FULLY_REFUNDED">FULLY_REFUNDED</MenuItem>
                <MenuItem value="PARTIALLY_REFUNDED">PARTIALLY_REFUNDED</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={excludeLowValue}
                  onChange={(e) => setExcludeLowValue(e.target.checked)}
                  color="primary"
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                  Exclude &lt; $3 Orders
                </Typography>
              }
              sx={{ mx: 1 }}
            />

            {/* Column Selector Button */}
            <ColumnSelector
              allColumns={ALL_COLUMNS}
              visibleColumns={visibleColumns}
              onColumnChange={setVisibleColumns}
              onReset={() => setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)}
              page="dashboard"
            />
          </Stack>
        )}

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
              • Total processed: {backfillResults.total} orders<br />
              • ✅ Updated with ad fees: {backfillResults.success}<br />
              • ⏭️ No ad fee found: {backfillResults.skipped}<br />
              • ❌ Failed: {backfillResults.failed}
              {backfillResults.errors?.length > 0 && (
                <><br />• First errors: {backfillResults.errors.slice(0, 3).map(e => e.orderId).join(', ')}</>
              )}
            </Typography>
          </Alert>
        )}

        {/* SEARCH FILTERS */}

        {/* SEARCH FILTERS - REMOVED THE CONDITIONAL CHECK */}
        <Box sx={{ mt: { xs: 1.5, sm: 2 }, p: { xs: 1.5, sm: 2 }, backgroundColor: 'action.hover', borderRadius: 1 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setFiltersExpanded(!filtersExpanded)}
          >
            <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Search Filters
            </Typography>
            <IconButton size="small">
              {filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          <Collapse in={filtersExpanded}>
            <Stack spacing={{ xs: 1.5, sm: 2 }} sx={{ mt: 1.5 }}>
              {/* Row 1: Text searches */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2 }}>
                <TextField
                  size="small"
                  label="Order ID"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  placeholder="Search by order ID..."
                  sx={{ flex: 1 }}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Buyer Name"
                  value={searchBuyerName}
                  onChange={(e) => setSearchBuyerName(e.target.value)}
                  placeholder="Search by buyer name..."
                  sx={{ flex: 1 }}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="Item ID"
                  value={searchItemId}
                  onChange={(e) => setSearchItemId(e.target.value)}
                  placeholder="Search by item ID..."
                  sx={{ flex: 1 }}
                  fullWidth
                />
              </Stack>

              {/* Row 2: Date filters */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 2 }} alignItems={{ xs: 'stretch', sm: 'center' }}>
                {/* DATE MODE SELECTOR */}
                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 130 } }}>
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

                {/* SINGLE DATE INPUT */}
                {dateFilter.mode === 'single' && (
                  <TextField
                    size="small"
                    label="Date"
                    type="date"
                    value={dateFilter.single}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, single: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: { xs: '100%', sm: 150 } }}
                  />
                )}

                {/* RANGE INPUTS */}
                {dateFilter.mode === 'range' && (
                  <Stack direction="row" spacing={1} sx={{ flex: { xs: 1, sm: 'none' } }}>
                    <TextField
                      size="small"
                      label="From"
                      type="date"
                      value={dateFilter.from}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: { xs: '50%', sm: 150 } }}
                    />
                    <TextField
                      size="small"
                      label="To"
                      type="date"
                      value={dateFilter.to}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: { xs: '50%', sm: 150 } }}
                    />
                  </Stack>
                )}

                {/* CLEAR BUTTON */}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setSearchOrderId('');
                    setSearchBuyerName('');
                    setSearchItemId('');
                    setSearchPaymentStatus('');
                    setDateFilter({ mode: 'none', single: '', from: '', to: '' });
                  }}
                  sx={{ minWidth: { xs: '100%', sm: 80 } }}
                >
                  Clear
                </Button>
              </Stack>
            </Stack>
          </Collapse>
        </Box>



      </Paper>

      {/* TABLE SECTION */}
      {
        orders.length === 0 && !loading ? (
          <Paper sx={{ p: { xs: 2, sm: 4 }, textAlign: 'center' }}>
            <ShoppingCartIcon sx={{ fontSize: { xs: 36, sm: 48 }, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              No orders found. Click "Poll New Orders" to fetch orders from all sellers.
            </Typography>
          </Paper>
        ) : (
          <>
            {/* MOBILE CARD VIEW */}
            <Box
              sx={{
                display: { xs: 'block', md: 'none' },
                flexGrow: 1,
                overflow: 'auto',
                p: 1,
                '&::-webkit-scrollbar': { width: '4px' },
                '&::-webkit-scrollbar-thumb': { backgroundColor: '#888', borderRadius: '4px' }
              }}
            >
              <Stack spacing={1.5}>
                {orders.map((order, idx) => (
                  <MobileOrderCard
                    key={order._id || idx}
                    order={order}
                    index={(currentPage - 1) * ordersPerPage + idx + 1}
                    onCopy={handleCopy}
                    onMessage={handleOpenMessageDialog}
                    onViewImages={handleViewImages}
                    formatCurrency={formatCurrency}
                    thumbnailImages={thumbnailImages}
                  />
                ))}
              </Stack>
            </Box>

            {/* DESKTOP TABLE VIEW */}
            <TableContainer
              component={Paper}
              sx={{
                display: { xs: 'none', md: 'block' },
                flexGrow: 1,
                overflow: 'auto',
                maxHeight: 'calc(100% - 50px)',
                width: '100%',
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
                    {visibleColumns.includes('deliveryDate') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Delivery Date</TableCell>}
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
                    {visibleColumns.includes('refundItemAmount') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }} align="right">Refund Item</TableCell>}
                    {visibleColumns.includes('refundTaxAmount') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }} align="right">Refund Tax</TableCell>}
                    {visibleColumns.includes('refundTotalToBuyer') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }} align="right">Refund Total</TableCell>}
                    {visibleColumns.includes('orderTotalAfterRefund') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }} align="right">Order Total</TableCell>}
                    {visibleColumns.includes('orderEarnings') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }} align="right">Earnings</TableCell>}
                    {visibleColumns.includes('trackingNumber') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Tracking Number</TableCell>}
                    {visibleColumns.includes('amazonAccount') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Amazon Acc</TableCell>}
                    {visibleColumns.includes('arriving') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Arriving</TableCell>}
                    {visibleColumns.includes('beforeTax') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Before Tax</TableCell>}
                    {visibleColumns.includes('estimatedTax') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Estimated Tax</TableCell>}
                    {visibleColumns.includes('azOrderId') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Az OrderID</TableCell>}
                    {visibleColumns.includes('amazonRefund') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Amazon Refund</TableCell>}
                    {visibleColumns.includes('cardName') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Card Name</TableCell>}
                    {visibleColumns.includes('notes') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Notes</TableCell>}
                    {visibleColumns.includes('messagingStatus') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Messaging</TableCell>}
                    {visibleColumns.includes('remark') && <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Remark</TableCell>}
                    <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100, textAlign: 'center' }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.map((order, idx) => {
                    const isSelected = selectedRowId === order._id;
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
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="body2" fontWeight="medium" sx={{ color: 'primary.main' }}>
                                {order.orderId || order.legacyOrderId || '-'}
                              </Typography>

                              {/* Auto-Message Status Indicator */}
                              {order.autoMessageSent ? (
                                <Tooltip title={`Auto-message sent at ${new Date(order.autoMessageSentAt).toLocaleString()}`}>
                                  <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                                </Tooltip>
                              ) : (
                                <Tooltip title={order.autoMessageDisabled ? "Auto-message disabled (click to enable)" : "Auto-message pending (click to disable)"}>
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleAutoMessage(order.orderId, !order.autoMessageDisabled);
                                    }}
                                    sx={{ p: 0.5 }}
                                  >
                                    {order.autoMessageDisabled ? (
                                      <BlockIcon color="action" sx={{ fontSize: 16 }} />
                                    ) : (
                                      <AccessTimeIcon color="primary" sx={{ fontSize: 16 }} />
                                    )}
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        )}
                        {visibleColumns.includes('dateSold') && <TableCell>{formatDate(order.dateSold, order.purchaseMarketplaceId)}</TableCell>}
                        {visibleColumns.includes('shipBy') && <TableCell>{formatDate(order.shipByDate, order.purchaseMarketplaceId)}</TableCell>}
                        {visibleColumns.includes('deliveryDate') && <TableCell>{formatDeliveryDate(order)}</TableCell>}
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

                                    {/* 1.5 THUMBNAIL IMAGE (if available, only for first item) */}
                                    {i === 0 && thumbnailImages[order._id] && (
                                      <Box
                                        onClick={() => handleViewImages(order)}
                                        sx={{
                                          width: 50,
                                          height: 50,
                                          cursor: 'pointer',
                                          border: '1px solid',
                                          borderColor: 'grey.300',
                                          borderRadius: 1,
                                          overflow: 'hidden',
                                          flexShrink: 0,
                                          position: 'relative',
                                          '&:hover': {
                                            borderColor: 'primary.main',
                                            boxShadow: 2
                                          }
                                        }}
                                      >
                                        <img
                                          src={thumbnailImages[order._id]}
                                          alt="Product"
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                          }}
                                        />
                                        {/* Show badge if there are more images */}
                                        {itemImages[order._id]?.count > 1 && (
                                          <Chip
                                            label={`+${itemImages[order._id].count - 1}`}
                                            size="small"
                                            sx={{
                                              position: 'absolute',
                                              bottom: 2,
                                              right: 2,
                                              height: 18,
                                              fontSize: '0.65rem',
                                              bgcolor: 'rgba(0,0,0,0.7)',
                                              color: 'white',
                                              '& .MuiChip-label': { px: 0.5 }
                                            }}
                                          />
                                        )}
                                        {/* Loading overlay */}
                                        {loadingImages[order._id] && (
                                          <Box
                                            sx={{
                                              position: 'absolute',
                                              top: 0,
                                              left: 0,
                                              right: 0,
                                              bottom: 0,
                                              bgcolor: 'rgba(255,255,255,0.8)',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center'
                                            }}
                                          >
                                            <CircularProgress size={20} />
                                          </Box>
                                        )}
                                      </Box>
                                    )}

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
                                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                                        <Link
                                          href={`https://www.ebay.com/itm/${item.legacyItemId}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          underline="hover"
                                          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3 }}
                                        >
                                          <Typography variant="caption" color="primary.main" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                                            ID: {item.legacyItemId}
                                          </Typography>
                                          <OpenInNewIcon sx={{ fontSize: 12, color: 'primary.main' }} />
                                        </Link>
                                        {item.sku && (
                                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                            | SKU: {item.sku}
                                          </Typography>
                                        )}
                                      </Stack>
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
                              <IconButton size="small" onClick={() => handleCopy(order.buyer?.buyerRegistrationAddress?.fullName || '-')} aria-label="copy buyer name">
                                <ContentCopyIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        )}
                        {visibleColumns.includes('shippingAddress') && (
                          <TableCell sx={{ maxWidth: 300 }}>
                            <Collapse in={expandedShippingId === order._id} timeout="auto">
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
                            </Collapse>
                            <Collapse in={expandedShippingId !== order._id} timeout="auto">
                              <Button
                                size="small"
                                onClick={() => toggleShippingExpanded(order._id)}
                                endIcon={<ExpandMoreIcon />}
                                sx={{ textTransform: 'none' }}
                              >
                                {order.shippingFullName || 'View Address'}
                              </Button>
                            </Collapse>
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
                          order.orderPaymentStatus !== 'PARTIALLY_REFUNDED' ? (
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="medium">
                                {formatCurrency(order.subtotalUSD)}
                              </Typography>
                            </TableCell>
                          ) : <TableCell align="center"><Typography variant="body2" color="text.disabled">-</Typography></TableCell>
                        )}
                        {visibleColumns.includes('shipping') && (
                          order.orderPaymentStatus !== 'PARTIALLY_REFUNDED' ? (
                            <TableCell align="right">{formatCurrency(order.shippingUSD)}</TableCell>
                          ) : <TableCell align="center"><Typography variant="body2" color="text.disabled">-</Typography></TableCell>
                        )}
                        {visibleColumns.includes('salesTax') && (
                          order.orderPaymentStatus !== 'PARTIALLY_REFUNDED' ? (
                            <TableCell align="right">{formatCurrency(order.salesTaxUSD)}</TableCell>
                          ) : <TableCell align="center"><Typography variant="body2" color="text.disabled">-</Typography></TableCell>
                        )}
                        {visibleColumns.includes('discount') && (
                          order.orderPaymentStatus !== 'PARTIALLY_REFUNDED' ? (
                            <TableCell align="right">
                              <Typography variant="body2">
                                {formatCurrency(order.discountUSD)}
                              </Typography>
                            </TableCell>
                          ) : <TableCell align="center"><Typography variant="body2" color="text.disabled">-</Typography></TableCell>
                        )}
                        {visibleColumns.includes('transactionFees') && (
                          order.orderPaymentStatus !== 'PARTIALLY_REFUNDED' ? (
                            <TableCell align="right">{formatCurrency(order.transactionFeesUSD)}</TableCell>
                          ) : <TableCell align="center"><Typography variant="body2" color="text.disabled">-</Typography></TableCell>
                        )}
                        {visibleColumns.includes('adFeeGeneral') && (
                          order.orderPaymentStatus !== 'PARTIALLY_REFUNDED' ? (
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
                          ) : <TableCell align="center"><Typography variant="body2" color="text.disabled">-</Typography></TableCell>
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
                                  // 1. Get Amount in USD (convert using order's conversion rate)
                                  const rawValue = refund.amount?.value || refund.refundAmount?.value || 0;
                                  const conversionRate = order.conversionRate || 1;
                                  const amountUSD = (Number(rawValue) * conversionRate).toFixed(2);

                                  // 2. Determine Label & Color based on Order Status
                                  // If order says 'FULLY_REFUNDED', we label it Full. Otherwise Partial.
                                  const isFull = order.orderPaymentStatus === 'FULLY_REFUNDED';
                                  const typeLabel = isFull ? 'Full' : 'Partial';
                                  const color = isFull ? 'error' : 'warning'; // Red for Full, Orange for Partial

                                  return (
                                    <Chip
                                      key={idx}
                                      // Result: "Full: $28.17" or "Partial: $15.00" (in USD)
                                      label={`${typeLabel}: $${amountUSD}`}
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
                        {/* --- NEW: Refund Breakdown Columns --- */}
                        {visibleColumns.includes('refundItemAmount') && (
                          <TableCell align="right">
                            {order.refundItemAmount ? (
                              <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 'medium' }}>
                                {formatCurrency(order.refundItemAmount)}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.includes('refundTaxAmount') && (
                          <TableCell align="right">
                            {order.refundTaxAmount ? (
                              <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 'medium' }}>
                                {formatCurrency(order.refundTaxAmount)}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.includes('refundTotalToBuyer') && (
                          <TableCell align="right">
                            {order.refundTotalToBuyer ? (
                              <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                                {formatCurrency(order.refundTotalToBuyer)}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.includes('orderTotalAfterRefund') && (
                          <TableCell align="right">
                            {order.orderTotalAfterRefund != null ? (
                              <Typography
                                variant="body2"
                                sx={{
                                  color: order.orderTotalAfterRefund >= 0 ? 'text.primary' : 'error.main',
                                  fontWeight: 'medium'
                                }}
                              >
                                {formatCurrency(order.orderTotalAfterRefund)}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.includes('orderEarnings') && (
                          <TableCell align="right">
                            {order.orderPaymentStatus === 'PARTIALLY_REFUNDED' ? (
                              <TextField
                                size="small"
                                type="number"
                                value={order.orderEarnings || ''}
                                onChange={(e) => handleOrderEarningsChange(order._id, order.orderId, e.target.value)}
                                onBlur={() => handleOrderEarningsSave(order._id, order.orderId)}
                                sx={{
                                  width: 100,
                                  '& .MuiInputBase-input': {
                                    textAlign: 'right',
                                    fontSize: '0.875rem',
                                    color: order.orderEarnings >= 0 ? 'success.main' : 'error.main',
                                    fontWeight: 'bold'
                                  }
                                }}
                                inputProps={{ step: '0.01' }}
                              />
                            ) : order.orderEarnings != null ? (
                              <Typography
                                variant="body2"
                                sx={{
                                  color: order.orderEarnings >= 0 ? 'success.main' : 'error.main',
                                  fontWeight: 'bold'
                                }}
                              >
                                {formatCurrency(order.orderEarnings)}
                              </Typography>
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AutoSaveSelect
                                value={order.amazonAccount}
                                options={amazonAccounts}
                                onSave={(val) => updateManualField(order._id, 'amazonAccount', val)}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleCopy(order.amazonAccount || '-')}
                                aria-label="copy amazon account"
                                sx={{ p: 0.5 }}
                              >
                                <ContentCopyIcon sx={{ fontSize: '0.875rem' }} />
                              </IconButton>
                            </Box>
                          </TableCell>
                        )}

                        {/* 2. Arriving Date */}
                        {visibleColumns.includes('arriving') && (
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AutoSaveDatePicker
                                value={order.arrivingDate}
                                onSave={(val) => updateManualField(order._id, 'arrivingDate', val)}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleCopy(order.arrivingDate || '-')}
                                aria-label="copy arriving date"
                                sx={{ p: 0.5 }}
                              >
                                <ContentCopyIcon sx={{ fontSize: '0.875rem' }} />
                              </IconButton>
                            </Box>
                          </TableCell>
                        )}

                        {/* 3. Before Tax */}
                        {visibleColumns.includes('beforeTax') && (
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AutoSaveTextField
                                type="number"
                                value={order.beforeTax}
                                onSave={(val) => updateManualField(order._id, 'beforeTax', val)}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleCopy(order.beforeTax || '-')}
                                aria-label="copy before tax"
                                sx={{ p: 0.5 }}
                              >
                                <ContentCopyIcon sx={{ fontSize: '0.875rem' }} />
                              </IconButton>
                            </Box>
                          </TableCell>
                        )}

                        {/* 4. Estimated Tax */}
                        {visibleColumns.includes('estimatedTax') && (
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AutoSaveTextField
                                type="number"
                                value={order.estimatedTax}
                                onSave={(val) => updateManualField(order._id, 'estimatedTax', val)}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleCopy(order.estimatedTax || '-')}
                                aria-label="copy estimated tax"
                                sx={{ p: 0.5 }}
                              >
                                <ContentCopyIcon sx={{ fontSize: '0.875rem' }} />
                              </IconButton>
                            </Box>
                          </TableCell>
                        )}

                        {/* 5. Amazon Order ID */}
                        {visibleColumns.includes('azOrderId') && (
                          <TableCell sx={{ minWidth: 200 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AutoSaveTextField
                                value={order.azOrderId}
                                onSave={(val) => updateManualField(order._id, 'azOrderId', val)}
                                sx={{ minWidth: 150 }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleCopy(order.azOrderId || '-')}
                                aria-label="copy amazon order id"
                                sx={{ p: 0.5 }}
                              >
                                <ContentCopyIcon sx={{ fontSize: '0.875rem' }} />
                              </IconButton>
                            </Box>
                          </TableCell>
                        )}

                        {/* 6. Amazon Refund */}
                        {visibleColumns.includes('amazonRefund') && (
                          <TableCell sx={{ minWidth: 200 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <AutoSaveTextField
                                value={order.amazonRefund}
                                type="number"
                                onSave={(val) => updateManualField(order._id, 'amazonRefund', val)}
                                sx={{ minWidth: 100 }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleCopy(order.amazonRefund || '-')}
                                aria-label="copy amazon refund"
                                sx={{ p: 0.5 }}
                              >
                                <ContentCopyIcon sx={{ fontSize: '0.875rem' }} />
                              </IconButton>
                              {order.beforeTaxUSD > 0 && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  onClick={() => handleAmazonRefundReceived(order)}
                                  sx={{ minWidth: 90, fontSize: '0.7rem', py: 0.5 }}
                                >
                                  Received
                                </Button>
                              )}
                            </Stack>
                          </TableCell>
                        )}

                        {/* 7. Card Name */}
                        {visibleColumns.includes('cardName') && (
                          <TableCell sx={{ minWidth: 200 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AutoSaveSelect
                                value={order.cardName || ''}
                                options={creditCards}
                                onSave={(val) => updateManualField(order._id, 'cardName', val)}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleCopy(order.cardName || '-')}
                                aria-label="copy card name"
                                sx={{ p: 0.5 }}
                              >
                                <ContentCopyIcon sx={{ fontSize: '0.875rem' }} />
                              </IconButton>
                            </Box>
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
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              <Tooltip title="Message Buyer">
                                <IconButton
                                  color="primary"
                                  size="small"
                                  onClick={() => handleOpenMessageDialog(order)}
                                >
                                  <ChatIcon />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        )}
                        {visibleColumns.includes('remark') && (
                          <TableCell>
                            <AutoSaveSelect
                              value={order.remark || ''}
                              options={remarkOptionsFromTemplates(remarkTemplates)}
                              onSave={(val) => handleRemarkUpdate(order._id, val)}
                              onManage={() => setManageRemarkTemplatesOpen(true)}
                            />
                          </TableCell>
                        )}


                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )
      }

      {/* Pagination Controls - FIXED AT BOTTOM */}
      {
        !loading && orders.length > 0 && totalPages > 1 && (
          <Box sx={{
            py: { xs: 0.75, sm: 1 },
            px: { xs: 1, sm: 2 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'center',
            alignItems: 'center',
            gap: { xs: 0.5, sm: 2 },
            flexShrink: 0,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' } }}
            >
              {isSmallMobile
                ? `${(currentPage - 1) * ordersPerPage + 1}-${Math.min(currentPage * ordersPerPage, totalOrders)} of ${totalOrders}`
                : `Showing ${(currentPage - 1) * ordersPerPage + 1} - ${Math.min(currentPage * ordersPerPage, totalOrders)} of ${totalOrders} orders`
              }
            </Typography>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(e, page) => setCurrentPage(page)}
              color="primary"
              showFirstButton={!isMobile}
              showLastButton={!isMobile}
              size={isSmallMobile ? 'small' : 'medium'}
              siblingCount={isSmallMobile ? 0 : 1}
              boundaryCount={isSmallMobile ? 1 : 1}
            />
          </Box>
        )
      }


      <ChatDialog
        open={messageModalOpen}
        onClose={handleCloseMessageDialog}
        order={selectedOrderForMessage}
      />

      {/* Earnings Breakdown Dialog */}
      <EarningsBreakdownModal
        open={earningsDialogOpen}
        order={selectedOrderForEarnings}
        onClose={() => setEarningsDialogOpen(false)}
      />

      {/* Image Viewer Dialog */}
      <ImageDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        images={selectedImages}
      />

      {/* Remark Message Confirmation Dialog */}
      <Dialog
        open={remarkConfirmOpen}
        onClose={() => {
          if (!sendingRemarkMessage) {
            setRemarkConfirmOpen(false);
            setPendingRemarkUpdate(null);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ChatIcon color="primary" />
            <Typography variant="h6">Send Message to Buyer?</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Alert severity="info" icon={<InfoIcon />}>
              You're updating the remark to <strong>"{pendingRemarkUpdate?.remarkValue}"</strong>
            </Alert>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Would you like to automatically send this message to the buyer?
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  mt: 1.5,
                  p: 2,
                  bgcolor: 'grey.50',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    lineHeight: 1.6
                  }}
                >
                  {pendingRemarkUpdate && findRemarkTemplateText(remarkTemplates, pendingRemarkUpdate.remarkValue)
                    ? replaceTemplateVariables(
                      findRemarkTemplateText(remarkTemplates, pendingRemarkUpdate.remarkValue),
                      pendingRemarkUpdate.order
                    )
                    : ''}
                </Typography>
              </Paper>
            </Box>

            <Typography variant="caption" color="text.secondary">
              💡 Tip: The message will be sent through the eBay messaging system
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleSkipRemarkMessage}
            disabled={sendingRemarkMessage}
            color="inherit"
          >
            No, Skip
          </Button>
          <Button
            onClick={handleConfirmRemarkMessage}
            variant="contained"
            disabled={sendingRemarkMessage}
            startIcon={sendingRemarkMessage ? <CircularProgress size={20} /> : <SendIcon />}
          >
            {sendingRemarkMessage ? 'Sending...' : 'Yes, Send Message'}
          </Button>
        </DialogActions>
      </Dialog>

      <RemarkTemplateManagerModal
        open={manageRemarkTemplatesOpen}
        onClose={() => setManageRemarkTemplatesOpen(false)}
        templates={remarkTemplates}
        onSaveTemplates={handleSaveRemarkTemplates}
      />


      {/* CSV Export Column Selection Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Select Columns to Export</Typography>
            <Box>
              <Button size="small" onClick={handleToggleAllExportColumns}>
                {selectedExportColumns.length === ALL_COLUMNS.length ? "Deselect All" : "Select All"}
              </Button>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, height: 400 }}>
          <Stack spacing={1}>
            {ALL_COLUMNS.map((col) => (
              <Box key={col.id} sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={selectedExportColumns.includes(col.id)}
                  onChange={() => handleToggleExportColumn(col.id)}
                  size="small"
                />
                <Typography variant="body2">{col.label}</Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setExportDialogOpen(false)} color="inherit">Cancel</Button>
          <Button
            onClick={handleExecuteExport}
            variant="contained"
            color="primary"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            disabled={loading || selectedExportColumns.length === 0}
          >
            {loading ? 'Exporting...' : 'Export CSV'}
          </Button>
        </DialogActions>
      </Dialog>


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
    </Box >
  );
}


// --- ADD AT BOTTOM OF FILE ---

function AutoSaveTextField({ value, type = 'text', onSave, sx = {} }) {
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
        '& input': { padding: '6px 8px', fontSize: '0.85rem' },
        ...sx // Merge custom sx prop
      }}
    />
  );
}

function AutoSaveDatePicker({ value, onSave, sx = {} }) {
  // Helper to check if value is a valid ISO format date
  const parseValue = (val) => {
    if (!val) return null;

    // Only accept ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
    // This prevents "Jan 8" from being parsed as 2001-01-08
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}/;

    if (!isoDateRegex.test(val)) {
      // Not ISO format → treat as legacy text
      return null;
    }

    try {
      const date = new Date(val);
      return isValid(date) ? date : null;
    } catch {
      return null;
    }
  };

  const [localValue, setLocalValue] = useState(parseValue(value));
  const [isLegacyText, setIsLegacyText] = useState(false);

  useEffect(() => {
    const parsed = parseValue(value);
    setLocalValue(parsed);
    // Check if it's legacy text (not a valid date)
    setIsLegacyText(value && !parsed);
  }, [value]);

  const handleChange = (newDate) => {
    setLocalValue(newDate);
    if (newDate && isValid(newDate)) {
      // Save as ISO date string (YYYY-MM-DD)
      onSave(format(newDate, 'yyyy-MM-dd'));
    } else {
      onSave(null);
    }
  };

  // If legacy text detected, show text field with option to convert
  if (isLegacyText) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <TextField
          size="small"
          value={value}
          disabled
          sx={{
            backgroundColor: '#f5f5f5',
            borderRadius: 1,
            minWidth: 100,
            '& input': { padding: '6px 8px', fontSize: '0.85rem' },
            ...sx
          }}
        />
        <Tooltip title="Convert to date picker">
          <IconButton
            size="small"
            onClick={() => setIsLegacyText(false)}
            sx={{ p: 0.5 }}
          >
            <RefreshIcon sx={{ fontSize: '1rem' }} />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <DatePicker
        value={localValue}
        onChange={handleChange}
        format="dd/MM/yyyy"
        slotProps={{
          textField: {
            size: 'small',
            placeholder: '-',
            sx: {
              backgroundColor: '#fff',
              borderRadius: 1,
              minWidth: 150,
              '& .MuiOutlinedInput-root': { paddingRight: 0 },
              '& input': { padding: '6px 8px', fontSize: '0.85rem' },
              ...sx
            }
          }
        }}
      />
    </LocalizationProvider>
  );
}

function AutoSaveSelect({ value, options, onSave, onManage }) {
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleChange = (e) => {
    const newVal = e.target.value;
    if (newVal === '__manage_templates__') {
      if (onManage) onManage();
      return;
    }
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
      {onManage ? (
        <MenuItem value="__manage_templates__" sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 0.5 }}>
          Manage Templates
        </MenuItem>
      ) : null}
    </Select>
  );
}

export default memo(FulfillmentDashboard);