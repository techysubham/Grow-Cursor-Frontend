import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog,
  Stack, TextField, Button, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Alert, Grid, InputAdornment, Menu, ListSubheader, Tooltip,
  Divider, Link, useMediaQuery, useTheme, List, ListItem, ListItemText,
  ListItemSecondaryAction, Pagination, Checkbox, FormControlLabel
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import api from '../../lib/api';
import { CHAT_TEMPLATES, personalizeTemplate } from '../../constants/chatTemplates';
import ColumnSelector from '../../components/ColumnSelector';
import { downloadCSV } from '../../utils/csvExport';
import {
  tableHeaderCellSx,
  tableBodyRowSx,
  tableBodyCellSx,
  tableContainerSx,
  tableIndexBadgeSx,
  yellowOutlinedButtonSx,
  yellowFilledButtonSx
} from '../../theme/tableStyles.js';
import { BRAND_DARK } from '../../constants/brandTheme.js';
import { dashboardSignatureTokens } from '../../theme/appTheme.js';


// --- RESOLUTION MODAL COMPONENT (Unchanged logic, kept for completeness) ---
function ResolutionDialog({ open, onClose, metaItem, onSave, chatAgents = [] }) {
  const theme = useTheme();
  const isMobileChat = useMediaQuery(theme.breakpoints.down('sm'));
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef(null);
  const [notes, setNotes] = useState(metaItem?.notes || '');
  const [status, setStatus] = useState(metaItem?.status || 'Open');
  const [pickedUpBy, setPickedUpBy] = useState(metaItem?.pickedUpBy || '');
  const [savingResolution, setSavingResolution] = useState(false);
  const [templateAnchorEl, setTemplateAnchorEl] = useState(null);

  useEffect(() => {
    if (open && metaItem) {
      setNotes(metaItem.notes || '');
      setStatus(metaItem.status || 'Open');
      setPickedUpBy(metaItem.pickedUpBy || '');
      loadMessages();
    }
  }, [open, metaItem]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    try {
      const params = { orderId: metaItem.orderId };
      if (!metaItem.orderId) {
        params.buyerUsername = metaItem.buyerUsername;
        params.itemId = metaItem.itemId;
      }
      const { data } = await api.get('/ebay/chat/messages', { params });
      setMessages(data || []);
    } catch (e) {
      console.error("Failed to load messages", e);
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) return;
    setSendingMsg(true);
    try {
      const { data } = await api.post('/ebay/send-message', {
        orderId: metaItem.orderId,
        buyerUsername: metaItem.buyerUsername,
        itemId: metaItem.itemId,
        body: newMessage
      });
      setMessages([...messages, data.message]);
      setNewMessage('');
    } catch (e) {
      alert("Failed to send: " + e.message);
    } finally {
      setSendingMsg(false);
    }
  }

  async function handleSaveResolution() {
    if (status === 'Resolved' && !notes.trim()) {
      alert("Notes are required to mark as Resolved.");
      return;
    }
    setSavingResolution(true);
    try {
      await api.patch(`/ebay/conversation-management/${metaItem._id}/resolve`, {
        notes,
        status,
        pickedUpBy
      });
      onSave();
      onClose();
    } catch (e) {
      alert("Failed to save: " + e.message);
    } finally {
      setSavingResolution(false);
    }
  }

  const handleTemplateClick = (event) => {
    setTemplateAnchorEl(event.currentTarget);
  };

  const handleTemplateClose = () => {
    setTemplateAnchorEl(null);
  };

  const handleSelectTemplate = (templateText) => {
    const nameToUse = metaItem?.buyerName || metaItem?.buyerUsername || 'Buyer';
    const personalizedText = personalizeTemplate(templateText, nameToUse);
    setNewMessage(personalizedText);
    handleTemplateClose();
  };

  const handleMessageKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  function handleEscalateClick() {
    console.info('Escalate action is not implemented yet.');
  }

  // Helper to safely extract data from the metaItem object
  const sellerName = metaItem?.sellerName || 'Seller';
  const buyerName = metaItem?.buyerName || '-';
  const buyerUsername = metaItem?.buyerUsername || '-';
  const itemId = metaItem?.itemId || '';
  const itemTitle = metaItem?.itemTitle || metaItem?.productName || '';
  const orderId = metaItem?.orderId || 'N/A';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      fullScreen={isMobileChat}
    >
      <Box sx={{ display: 'flex', height: { xs: '100vh', sm: '80vh' }, flexDirection: { xs: 'column', sm: 'row' } }}>
        {/* LEFT: CHAT */}
        <Box sx={{ width: { xs: '100%', sm: '60%' }, borderRight: { xs: 0, sm: 1 }, borderBottom: { xs: 1, sm: 0 }, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          {/* --- HEADER (MATCHING FULFILLMENT DASHBOARD) --- */}
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
                  disabled={sendingMsg}
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
                {itemId && (
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
                )}

                <Chip
                  label={`Order: ${orderId}`}
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
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f0f2f5' }}>
            <Stack spacing={2}>
              {messages.map((msg, i) => (
                <Box key={i} sx={{ alignSelf: msg.sender === 'SELLER' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  <Paper sx={{ p: 1.5, bgcolor: msg.sender === 'SELLER' ? '#1976d2' : '#fff', color: msg.sender === 'SELLER' ? '#fff' : '#000' }}>
                    <Typography variant="body2">{msg.body}</Typography>

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
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, textAlign: msg.sender === 'SELLER' ? 'right' : 'left' }}>
                    {new Date(msg.messageDate).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} PT
                  </Typography>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Stack>
          </Box>
          <Box sx={{ p: 2, bgcolor: '#fff', borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              multiline
              maxRows={4}
              placeholder="Type message..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleMessageKeyDown}
            />
            <Button variant="contained" onClick={handleSendMessage} disabled={sendingMsg}>
              {sendingMsg ? <CircularProgress size={20} /> : <SendIcon />}
            </Button>
            <Menu
              anchorEl={templateAnchorEl}
              open={Boolean(templateAnchorEl)}
              onClose={handleTemplateClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ style: { maxHeight: 400, width: 320 } }}
            >
              {CHAT_TEMPLATES.map((group, index) => (
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
                      key={idx}
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
              ))}
            </Menu>
          </Box>
        </Box>

        {/* RIGHT: MANAGEMENT */}
        <Box sx={{ width: { xs: '100%', sm: '40%' }, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">Manage Case</Typography>
            <IconButton onClick={onClose}><CloseIcon /></IconButton>
          </Box>
          <Box sx={{ p: 3, flex: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Conversation About</Typography>
                <Chip label={formatCategory(metaItem?.category)} color="primary" variant="outlined" sx={{ mt: 0.5, fontWeight: 'bold' }} />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Case Status</Typography>
                <Chip
                  label={metaItem?.caseStatus}
                  color={metaItem?.caseStatus === 'Case Opened' ? 'error' : 'success'}
                  variant="outlined"
                  sx={{ mt: 0.5, fontWeight: 'bold' }}
                />
              </Grid>
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Resolution Notes</Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  placeholder="Enter notes about how this was resolved..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  helperText={status === 'Resolved' ? "Required for resolution" : "Optional"}
                  error={status === 'Resolved' && !notes.trim()}
                />
              </Grid>
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Grid container spacing={1.5} alignItems="flex-end">
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel shrink>Picked Up By</InputLabel>
                      <Select
                        value={pickedUpBy}
                        label="Picked Up By"
                        onChange={(e) => setPickedUpBy(e.target.value)}
                        displayEmpty
                        notched
                        renderValue={(selected) => (selected ? selected : <em style={{ color: '#999' }}>— Unassigned —</em>)}
                      >
                        <MenuItem value=""><em>— Unassigned —</em></MenuItem>
                        {chatAgents.map(agent => (
                          <MenuItem key={agent._id} value={agent.name}>{agent.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={7}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                        <MenuItem value="Open">Open</MenuItem>
                        <MenuItem value="In Progress">In Progress</MenuItem>
                        <MenuItem value="Resolved">Resolved</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="warning"
                      onClick={handleEscalateClick}
                    >
                      Escalate
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: '#f9f9f9', textAlign: 'right' }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              startIcon={<CheckCircleIcon />}
              onClick={handleSaveResolution}
              disabled={savingResolution}
            >
              {savingResolution ? 'Saving...' : 'Save & Update'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}

const CATEGORY_DISPLAY_MAP = {
  'Return - Refund': 'Refund',
  'Return - Replace': 'Replace',
  '': 'Not a Case Yet',
};
const formatCategory = (cat) => CATEGORY_DISPLAY_MAP[cat ?? ''] ?? cat ?? 'Not a Case Yet';

function formatCreationDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function ConversationManagementPage() {
  const [items, setItems] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Chat Agents (Picked Up By)
  const [chatAgents, setChatAgents] = useState([]);
  const [manageAgentsOpen, setManageAgentsOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [editingAgent, setEditingAgent] = useState(null); // { _id, name }
  const [editAgentName, setEditAgentName] = useState('');
  const [agentSaving, setAgentSaving] = useState(false);
  const rowsPerPage = 25;

  const ONE_HOUR_MS = 60 * 60 * 1000;
  const ONE_DAY_MS = 24 * ONE_HOUR_MS;

  function parseTimeMs(value) {
    if (!value) return null;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  function formatElapsed(ms) {
    if (ms < ONE_HOUR_MS) return '<1 hr';
    if (ms < ONE_DAY_MS) {
      const hours = Math.floor(ms / ONE_HOUR_MS);
      return `${hours} hr${hours === 1 ? '' : 's'}`;
    }
    const days = Math.floor(ms / ONE_DAY_MS);
    return `${days} day${days === 1 ? '' : 's'}`;
  }

  function getSellerReplyLabel(item) {
    const sellerMs = parseTimeMs(item.lastSellerMessageAt);
    if (!sellerMs) return { label: 'No reply yet', color: 'default' };
    const elapsedMs = Math.max(0, nowMs - sellerMs);
    return { label: `${formatElapsed(elapsedMs)} ago`, color: 'info' };
  }

  function getBuyerSlaLabel(item) {
    const buyerMs = parseTimeMs(item.lastBuyerMessageAt);
    const sellerMs = parseTimeMs(item.lastSellerMessageAt);

    if (!buyerMs) return { label: 'No buyer message', color: 'default' };

    // Seller replied to the latest buyer message.
    if (sellerMs && sellerMs >= buyerMs) {
      const repliedAgoMs = Math.max(0, nowMs - sellerMs);
      return { label: `Replied ${formatElapsed(repliedAgoMs)} ago`, color: 'success' };
    }

    // Waiting for seller reply inside 24h window.
    const elapsedSinceBuyerMs = Math.max(0, nowMs - buyerMs);
    const remainingMs = ONE_DAY_MS - elapsedSinceBuyerMs;
    if (remainingMs > 0) {
      return { label: `${formatElapsed(remainingMs)} left`, color: 'warning' };
    }

    // 24h breached.
    const overdueMs = Math.abs(remainingMs);
    return { label: `Overdue ${formatElapsed(overdueMs)}`, color: 'error' };
  }

  // Column Definitions
  const ALL_COLUMNS = [
    { id: 'sl', label: 'SL No' },
    { id: 'seller', label: 'Seller' },
    { id: 'orderId', label: 'Order ID' },
    { id: 'creationDate', label: 'Creation Date' },
    { id: 'username', label: 'Username' },
    { id: 'buyerName', label: 'Buyer Name' },
    { id: 'buyerSla', label: 'Buyer SLA' },
    { id: 'sellerReply', label: 'Seller Last Reply' },
    { id: 'about', label: 'Conversation About' },
    { id: 'case', label: 'Case' },
    { id: 'pickedUpBy', label: 'Picked Up By' },
    { id: 'action', label: 'Action' },
  ];
  const [visibleColumns, setVisibleColumns] = useState(ALL_COLUMNS.map(c => c.id));
  const exportableColumns = ALL_COLUMNS.filter(column => column.id !== 'action');
  const [selectedExportColumns, setSelectedExportColumns] = useState(exportableColumns.map(column => column.id));

  // --- FILTERS STATE ---
  const [searchText, setSearchText] = useState('');
  const [filterSeller, setFilterSeller] = useState('All');
  const [filterAbout, setFilterAbout] = useState('All');
  const [filterCase, setFilterCase] = useState('All');
  const [filterPickedUpBy, setFilterPickedUpBy] = useState('All');
  const [dateFilterMode, setDateFilterMode] = useState('none');
  const [singleDate, setSingleDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchAgents();
    fetchSellers();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [currentPage, searchText, filterSeller, filterAbout, filterCase, filterPickedUpBy, dateFilterMode, singleDate, dateFrom, dateTo]);

  function buildListParams() {
    const params = {
      status: 'Case Not Opened,Open,In Progress',
      page: currentPage,
      limit: rowsPerPage
    };

    if (searchText.trim()) params.search = searchText.trim();
    if (filterSeller !== 'All') params.sellerId = filterSeller;
    if (filterAbout !== 'All') params.about = filterAbout;
    if (filterCase !== 'All') params.caseStatus = filterCase;
    if (filterPickedUpBy !== 'All') params.pickedUpBy = filterPickedUpBy;
    if (dateFilterMode === 'single' && singleDate) {
      params.creationDate = singleDate;
    }
    if (dateFilterMode === 'range') {
      if (dateFrom) params.creationDateFrom = dateFrom;
      if (dateTo) params.creationDateTo = dateTo;
    }

    return params;
  }

  async function fetchItems() {
    setLoading(true);
    try {
      const { data } = await api.get('/ebay/conversation-management/list', { params: buildListParams() });
      setItems(data?.records || []);
      setTotalItems(data?.total || 0);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (e) {
      console.error(e);
      setItems([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSellers() {
    try {
      const { data } = await api.get('/sellers/all');
      setSellers(data || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchAgents() {
    try {
      const { data } = await api.get('/ebay/chat-agents');
      setChatAgents(data || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDownloadCsv() {
    setExportingCsv(true);
    try {
      const { data } = await api.get('/ebay/conversation-management/export', {
        params: {
          ...buildListParams(),
          page: undefined,
          limit: undefined
        }
      });

      const csvColumnAccessors = {
        sl: {
          label: 'SL No',
          value: (item, index) => index + 1
        },
        seller: {
          label: 'Seller',
          value: (item) => item.sellerName || 'Unknown'
        },
        orderId: {
          label: 'Order ID',
          value: (item) => item.orderId || ''
        },
        creationDate: {
          label: 'Creation Date',
          value: (item) => formatCreationDate(item.creationDate)
        },
        username: {
          label: 'Username',
          value: (item) => item.buyerUsername || ''
        },
        buyerName: {
          label: 'Buyer Name',
          value: (item) => item.buyerName || ''
        },
        buyerSla: {
          label: 'Buyer SLA',
          value: (item) => getBuyerSlaLabel(item).label
        },
        sellerReply: {
          label: 'Seller Last Reply',
          value: (item) => getSellerReplyLabel(item).label
        },
        about: {
          label: 'Conversation About',
          value: (item) => formatCategory(item.category)
        },
        case: {
          label: 'Case',
          value: (item) => item.caseStatus || ''
        },
        pickedUpBy: {
          label: 'Picked Up By',
          value: (item) => item.pickedUpBy || ''
        }
      };

      const csvData = (data || []).map((item, index) => {
        const row = {};
        selectedExportColumns.forEach((columnId) => {
          const config = csvColumnAccessors[columnId];
          if (!config) return;
          row[config.label] = config.value(item, index);
        });
        return row;
      });

      downloadCSV(csvData, 'Conversation_Management');
      setExportDialogOpen(false);
    } catch (e) {
      alert('Failed to download CSV: ' + (e.response?.data?.error || e.message));
    } finally {
      setExportingCsv(false);
    }
  }

  function handleOpenExportDialog() {
    const defaultColumns = visibleColumns.filter(columnId => columnId !== 'action');
    setSelectedExportColumns(defaultColumns.length ? defaultColumns : exportableColumns.map(column => column.id));
    setExportDialogOpen(true);
  }

  function handleToggleExportColumn(columnId) {
    setSelectedExportColumns((prev) => {
      if (prev.includes(columnId)) {
        return prev.filter(id => id !== columnId);
      }

      const next = [...prev, columnId];
      next.sort((left, right) => (
        exportableColumns.findIndex(column => column.id === left) -
        exportableColumns.findIndex(column => column.id === right)
      ));
      return next;
    });
  }

  async function handleAddAgent() {
    if (!newAgentName.trim()) return;
    setAgentSaving(true);
    try {
      const { data } = await api.post('/ebay/chat-agents', { name: newAgentName.trim() });
      setChatAgents(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewAgentName('');
    } catch (e) {
      alert('Failed to add: ' + e.message);
    } finally {
      setAgentSaving(false);
    }
  }

  async function handleUpdateAgent() {
    if (!editAgentName.trim() || !editingAgent) return;
    setAgentSaving(true);
    try {
      const { data } = await api.patch(`/ebay/chat-agents/${editingAgent._id}`, { name: editAgentName.trim() });
      setChatAgents(prev => prev.map(a => a._id === data._id ? data : a).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingAgent(null);
      setEditAgentName('');
    } catch (e) {
      alert('Failed to update: ' + e.message);
    } finally {
      setAgentSaving(false);
    }
  }

  async function handleDeleteAgent(agent) {
    if (!window.confirm(`Delete "${agent.name}"?`)) return;
    try {
      await api.delete(`/ebay/chat-agents/${agent._id}`);
      setChatAgents(prev => prev.filter(a => a._id !== agent._id));
    } catch (e) {
      alert('Failed to delete: ' + e.message);
    }
  }

  async function handlePickedUpByChange(item, agentName) {
    try {
      await api.patch(`/ebay/conversation-management/${item._id}/pick-up`, { pickedUpBy: agentName });
      setItems(prev => prev.map(i => i._id === item._id ? { ...i, pickedUpBy: agentName } : i));
    } catch (e) {
      console.error('Failed to update pickedUpBy', e);
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Conversation Management</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button startIcon={<FilterListIcon />} onClick={() => {
            setSearchText('');
            setFilterSeller('All');
            setFilterAbout('All');
            setFilterCase('All');
            setFilterPickedUpBy('All');
            setDateFilterMode('none');
            setSingleDate('');
            setDateFrom('');
            setDateTo('');
            setCurrentPage(1);
          }} sx={yellowOutlinedButtonSx}>
            Reset Filters
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="success"
            startIcon={<DownloadIcon />}
            onClick={handleOpenExportDialog}
            disabled={exportingCsv || loading || totalItems === 0}
            sx={yellowOutlinedButtonSx}
          >
            Download CSV
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PeopleIcon />}
            onClick={() => setManageAgentsOpen(true)}
            sx={yellowOutlinedButtonSx}
          >
            Manage Agents
          </Button>
          <Box>
            <ColumnSelector
              allColumns={ALL_COLUMNS}
              visibleColumns={visibleColumns}
              onColumnChange={setVisibleColumns}
              onReset={() => setVisibleColumns(ALL_COLUMNS.map(c => c.id))}
              page="conversation-management"
            />
          </Box>
        </Stack>
      </Stack>

      {/* --- FILTER BAR --- */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search Box */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search Order, User, or Buyer Name..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCurrentPage(1);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Seller Filter */}
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter Seller</InputLabel>
              <Select
                value={filterSeller}
                label="Filter Seller"
                onChange={(e) => {
                  setFilterSeller(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <MenuItem value="All">All Sellers</MenuItem>
                {sellers.map(seller => (
                  <MenuItem key={seller._id} value={seller._id}>{seller.user?.username || seller.storeName || seller._id}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* About Filter */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter About</InputLabel>
              <Select
                value={filterAbout}
                label="Filter About"
                onChange={(e) => {
                  setFilterAbout(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <MenuItem value="All">All Categories</MenuItem>
                <MenuItem value="INR">INR</MenuItem>
                <MenuItem value="Cancellation">Cancellation</MenuItem>
                <MenuItem value="Return">Return</MenuItem>
                <MenuItem value="Return - Refund">Refund</MenuItem>
                <MenuItem value="Return - Replace">Replace</MenuItem>
                <MenuItem value="Out of Stock">Out of Stock</MenuItem>
                <MenuItem value="Issue with Product">Issue with Product</MenuItem>
                <MenuItem value="Inquiry">Inquiry</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Case Filter */}
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Filter Case</InputLabel>
              <Select
                value={filterCase}
                label="Filter Case"
                onChange={(e) => {
                  setFilterCase(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <MenuItem value="All">All Statuses</MenuItem>
                <MenuItem value="Case Opened">Case Opened</MenuItem>
                <MenuItem value="Case Not Opened">Case Not Opened</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Picked Up By</InputLabel>
              <Select
                value={filterPickedUpBy}
                label="Picked Up By"
                onChange={(e) => {
                  setFilterPickedUpBy(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <MenuItem value="All">All Agents</MenuItem>
                <MenuItem value="__UNASSIGNED__">Unassigned</MenuItem>
                {chatAgents.map(agent => (
                  <MenuItem key={agent._id} value={agent.name}>{agent.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Date Filter</InputLabel>
              <Select
                value={dateFilterMode}
                label="Date Filter"
                onChange={(e) => {
                  const nextMode = e.target.value;
                  setDateFilterMode(nextMode);
                  if (nextMode !== 'single') setSingleDate('');
                  if (nextMode !== 'range') {
                    setDateFrom('');
                    setDateTo('');
                  }
                  setCurrentPage(1);
                }}
              >
                <MenuItem value="none">No Date Filter</MenuItem>
                <MenuItem value="single">Single Date</MenuItem>
                <MenuItem value="range">Date Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {dateFilterMode === 'single' && (
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Creation Date"
                value={singleDate}
                onChange={(e) => {
                  setSingleDate(e.target.value);
                  setCurrentPage(1);
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          )}

          {dateFilterMode === 'range' && (
            <>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Creation From"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Creation To"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      {/* --- TABLE --- */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Alert severity="info">No active conversation cases found matching your filters.</Alert>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ ...tableContainerSx, overflowX: 'auto', overflowY: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow>
                  {visibleColumns.includes('sl') && <TableCell sx={tableHeaderCellSx}>SL No</TableCell>}
                  {visibleColumns.includes('seller') && <TableCell sx={tableHeaderCellSx}>Seller</TableCell>}
                  {visibleColumns.includes('orderId') && <TableCell sx={tableHeaderCellSx}>Order ID</TableCell>}
                  {visibleColumns.includes('creationDate') && <TableCell sx={tableHeaderCellSx}>Creation Date</TableCell>}
                  {visibleColumns.includes('username') && <TableCell sx={tableHeaderCellSx}>Username</TableCell>}
                  {visibleColumns.includes('buyerName') && <TableCell sx={tableHeaderCellSx}>Buyer Name</TableCell>}
                  {visibleColumns.includes('buyerSla') && <TableCell sx={tableHeaderCellSx}>Buyer SLA</TableCell>}
                  {visibleColumns.includes('sellerReply') && <TableCell sx={tableHeaderCellSx}>Seller Last Reply</TableCell>}
                  {visibleColumns.includes('about') && <TableCell sx={tableHeaderCellSx}>Conversation About</TableCell>}
                  {visibleColumns.includes('case') && <TableCell sx={tableHeaderCellSx}>Case</TableCell>}
                  {visibleColumns.includes('pickedUpBy') && <TableCell sx={tableHeaderCellSx}>Picked Up By</TableCell>}
                  {visibleColumns.includes('action') && <TableCell align="center" sx={tableHeaderCellSx}>Action</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => {
                  const buyerSla = getBuyerSlaLabel(item);
                  const sellerReply = getSellerReplyLabel(item);
                  return (
                    <TableRow key={item._id} hover sx={tableBodyRowSx}>
                      {/* SERIAL NUMBER */}
                      {visibleColumns.includes('sl') && <TableCell sx={tableBodyCellSx}><Box component="span" sx={tableIndexBadgeSx}>{(currentPage - 1) * rowsPerPage + index + 1}</Box></TableCell>}

                      {/* SELLER NAME (Added) */}
                      {visibleColumns.includes('seller') && <TableCell sx={tableBodyCellSx}>
                        <Chip label={item.sellerName || 'Unknown'} size="small" variant="outlined" />
                      </TableCell>}

                      {visibleColumns.includes('orderId') && <TableCell sx={tableBodyCellSx}>
                        {item.orderId ? (
                          <Chip label={item.orderId} size="small" variant="outlined" sx={{ bgcolor: '#fafafa' }} />
                        ) : (
                          <Typography color="text.secondary">-</Typography>
                        )}
                      </TableCell>}
                      {visibleColumns.includes('creationDate') && <TableCell sx={tableBodyCellSx}>{formatCreationDate(item.creationDate)}</TableCell>}
                      {visibleColumns.includes('username') && <TableCell sx={tableBodyCellSx}>{item.buyerUsername}</TableCell>}
                      {visibleColumns.includes('buyerName') && <TableCell sx={{ ...tableBodyCellSx, fontWeight: 'bold' }}>{item.buyerName}</TableCell>}
                      {visibleColumns.includes('buyerSla') && <TableCell sx={tableBodyCellSx}>
                        <Chip
                          label={buyerSla.label}
                          color={buyerSla.color}
                          size="small"
                          variant={buyerSla.color === 'default' ? 'outlined' : 'filled'}
                        />
                      </TableCell>}
                      {visibleColumns.includes('sellerReply') && <TableCell sx={tableBodyCellSx}>
                        <Chip
                          label={sellerReply.label}
                          color={sellerReply.color}
                          size="small"
                          variant={sellerReply.color === 'default' ? 'outlined' : 'filled'}
                        />
                      </TableCell>}
                      {visibleColumns.includes('about') && <TableCell sx={tableBodyCellSx}>
                        <Chip label={formatCategory(item.category)} color="primary" size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 'bold' }} />
                      </TableCell>}
                      {visibleColumns.includes('case') && <TableCell sx={tableBodyCellSx}>
                        <Chip
                          label={item.caseStatus}
                          color={item.caseStatus === 'Case Opened' ? 'error' : 'success'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>}
                      {visibleColumns.includes('pickedUpBy') && (
                        <TableCell sx={{ ...tableBodyCellSx, minWidth: 150 }}>
                          <FormControl fullWidth size="small">
                            <Select
                              value={item.pickedUpBy || ''}
                              onChange={(e) => handlePickedUpByChange(item, e.target.value)}
                              displayEmpty
                              sx={{ fontSize: '0.8rem' }}
                              renderValue={(selected) => (selected ? selected : <em style={{ color: '#999' }}>— Unassigned —</em>)}
                            >
                              <MenuItem value=""><em>— Unassigned —</em></MenuItem>
                              {chatAgents.map(agent => (
                                <MenuItem key={agent._id} value={agent.name}>{agent.name}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                      )}
                      {visibleColumns.includes('action') && <TableCell align="center" sx={tableBodyCellSx}>
                        <IconButton color="primary" onClick={() => setSelectedItem(item)}>
                          <ChatIcon />
                        </IconButton>
                      </TableCell>}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Paper sx={{ mt: 2, py: 1.5, px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Showing {items.length} of {totalItems} conversations
            </Typography>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(event, value) => setCurrentPage(value)}
              color="primary"
              showFirstButton
              showLastButton
              size="small"
            />
          </Paper>
        </>
      )}

      <Dialog
        open={exportDialogOpen}
        onClose={() => !exportingCsv && setExportDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: `${dashboardSignatureTokens.radius.card}px`,
            overflow: 'hidden',
            boxShadow: dashboardSignatureTokens.shadows.card,
            background: dashboardSignatureTokens.surfaces.pageCard,
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
            sx={{
              mx: -3,
              mt: -3,
              mb: 2.5,
              px: 3,
              py: 2,
              bgcolor: BRAND_DARK,
              color: '#fff'
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Export CSV
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                Download all rows matching the current filters. Hidden rows stay excluded.
              </Typography>
            </Box>
            <IconButton onClick={() => setExportDialogOpen(false)} disabled={exportingCsv} sx={{ color: 'rgba(255,255,255,0.8)' }}>
              <CloseIcon />
            </IconButton>
          </Stack>

          <Stack direction="row" spacing={1} mb={2}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSelectedExportColumns(exportableColumns.map(column => column.id))}
              disabled={exportingCsv}
              sx={yellowOutlinedButtonSx}
            >
              Select All
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setSelectedExportColumns([])}
              disabled={exportingCsv}
              sx={yellowOutlinedButtonSx}
            >
              Clear All
            </Button>
          </Stack>

          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              maxHeight: 320,
              overflowY: 'auto',
              borderRadius: 2,
              borderColor: dashboardSignatureTokens.table.rowBorder,
              background: dashboardSignatureTokens.surfaces.metricCard
            }}
          >
            <Stack>
              {exportableColumns.map((column) => (
                <FormControlLabel
                  key={column.id}
                  sx={{
                    mx: 0,
                    px: 1,
                    borderRadius: 1.5,
                    '&:hover': {
                      backgroundColor: dashboardSignatureTokens.table.rowHover,
                    }
                  }}
                  control={
                    <Checkbox
                      checked={selectedExportColumns.includes(column.id)}
                      onChange={() => handleToggleExportColumn(column.id)}
                      disabled={exportingCsv}
                      sx={{
                        color: BRAND_DARK,
                        '&.Mui-checked': {
                          color: BRAND_DARK,
                        }
                      }}
                    />
                  }
                  label={column.label}
                />
              ))}
            </Stack>
          </Paper>

          {selectedExportColumns.length === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Select at least one column to export.
            </Alert>
          )}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Exporting all filtered conversations, not just this page.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button onClick={() => setExportDialogOpen(false)} disabled={exportingCsv} sx={yellowOutlinedButtonSx}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleDownloadCsv}
                disabled={exportingCsv || selectedExportColumns.length === 0}
                sx={yellowFilledButtonSx}
              >
                {exportingCsv ? 'Exporting...' : 'Download'}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Dialog>

      {/* MANAGE AGENTS DIALOG */}
      <Dialog
        open={manageAgentsOpen}
        onClose={() => { setManageAgentsOpen(false); setEditingAgent(null); setEditAgentName(''); setNewAgentName(''); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: `${dashboardSignatureTokens.radius.card}px`,
            overflow: 'hidden',
            boxShadow: dashboardSignatureTokens.shadows.card,
            background: dashboardSignatureTokens.surfaces.pageCard,
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
            sx={{
              mx: -3,
              mt: -3,
              mb: 2.5,
              px: 3,
              py: 2,
              bgcolor: BRAND_DARK,
              color: '#fff'
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Manage Agents</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                Add, rename, or remove assignment owners for conversation handling.
              </Typography>
            </Box>
            <IconButton onClick={() => { setManageAgentsOpen(false); setEditingAgent(null); }} sx={{ color: 'rgba(255,255,255,0.8)' }}>
              <CloseIcon />
            </IconButton>
          </Stack>

          {/* Add new agent */}
          <Stack direction="row" spacing={1} mb={2}>
            <TextField
              size="small"
              fullWidth
              placeholder="New agent name..."
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddAgent(); }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={<PersonAddIcon />}
              onClick={handleAddAgent}
              disabled={agentSaving || !newAgentName.trim()}
              sx={yellowFilledButtonSx}
            >
              Add
            </Button>
          </Stack>

          <Divider sx={{ mb: 1.5 }} />

          {/* Agent list */}
          <Paper
            variant="outlined"
            sx={{
              p: 1,
              borderRadius: 2,
              borderColor: dashboardSignatureTokens.table.rowBorder,
              background: dashboardSignatureTokens.surfaces.metricCard
            }}
          >
            <List dense>
              {chatAgents.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>No agents yet. Add one above.</Typography>
              )}
              {chatAgents.map(agent => (
                <ListItem
                  key={agent._id}
                  disableGutters
                  sx={{
                    px: 1,
                    borderRadius: 1.5,
                    '&:hover': {
                      backgroundColor: dashboardSignatureTokens.table.rowHover,
                    }
                  }}
                >
                  {editingAgent?._id === agent._id ? (
                    <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                      <TextField
                        size="small"
                        fullWidth
                        value={editAgentName}
                        onChange={(e) => setEditAgentName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateAgent(); }}
                        autoFocus
                      />
                      <Button size="small" variant="contained" onClick={handleUpdateAgent} disabled={agentSaving} sx={yellowFilledButtonSx}>Save</Button>
                      <Button size="small" onClick={() => { setEditingAgent(null); setEditAgentName(''); }} sx={yellowOutlinedButtonSx}>Cancel</Button>
                    </Stack>
                  ) : (
                    <>
                      <ListItemText primary={agent.name} />
                      <ListItemSecondaryAction>
                        <IconButton size="small" onClick={() => { setEditingAgent(agent); setEditAgentName(agent.name); }} sx={{ color: BRAND_DARK }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteAgent(agent)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </>
                  )}
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      </Dialog>

      {/* RESOLUTION MODAL */}
      <ResolutionDialog
        open={Boolean(selectedItem)}
        metaItem={selectedItem}
        onClose={() => setSelectedItem(null)}
        onSave={fetchItems}
        chatAgents={chatAgents}
      />
    </Box>
  );
}
