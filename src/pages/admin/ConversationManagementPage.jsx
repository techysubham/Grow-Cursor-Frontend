import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog, 
  Stack, TextField, Button, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Alert, Grid, InputAdornment
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import api from '../../lib/api';

// --- RESOLUTION MODAL COMPONENT (Unchanged logic, kept for completeness) ---
function ResolutionDialog({ open, onClose, metaItem, onSave }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef(null);
  const [notes, setNotes] = useState(metaItem?.notes || '');
  const [status, setStatus] = useState(metaItem?.status || 'Open');
  const [savingResolution, setSavingResolution] = useState(false);

  useEffect(() => {
    if (open && metaItem) {
      setNotes(metaItem.notes || '');
      setStatus(metaItem.status || 'Open');
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
        status
      });
      onSave();
      onClose();
    } catch (e) {
      alert("Failed to save: " + e.message);
    } finally {
      setSavingResolution(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <Box sx={{ display: 'flex', height: '80vh' }}>
        {/* LEFT: CHAT */}
        <Box sx={{ width: '60%', borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
           <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: '#f5f5f5' }}>
             <Typography variant="h6">Chat History</Typography>
             <Typography variant="caption" color="text.secondary">
               {metaItem?.buyerName} ({metaItem?.buyerUsername})
             </Typography>
           </Box>
           <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f0f2f5' }}>
             <Stack spacing={2}>
               {messages.map((msg, i) => (
                 <Box key={i} sx={{ alignSelf: msg.sender === 'SELLER' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                   <Paper sx={{ p: 1.5, bgcolor: msg.sender === 'SELLER' ? '#1976d2' : '#fff', color: msg.sender === 'SELLER' ? '#fff' : '#000' }}>
                     <Typography variant="body2">{msg.body}</Typography>
                   </Paper>
                   <Typography variant="caption" sx={{ display:'block', mt:0.5, textAlign: msg.sender==='SELLER'?'right':'left' }}>
                     {new Date(msg.messageDate).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} PT
                   </Typography>
                 </Box>
               ))}
               <div ref={messagesEndRef} />
             </Stack>
           </Box>
           <Box sx={{ p: 2, bgcolor: '#fff', borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
             <TextField fullWidth size="small" placeholder="Type message..." value={newMessage} onChange={e=>setNewMessage(e.target.value)} />
             <Button variant="contained" onClick={handleSendMessage} disabled={sendingMsg}>
                {sendingMsg ? <CircularProgress size={20}/> : <SendIcon/>}
             </Button>
           </Box>
        </Box>

        {/* RIGHT: MANAGEMENT */}
        <Box sx={{ width: '40%', display: 'flex', flexDirection: 'column' }}>
           <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
             <Typography variant="h6">Manage Case</Typography>
             <IconButton onClick={onClose}><CloseIcon/></IconButton>
           </Box>
           <Box sx={{ p: 3, flex: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Conversation About</Typography>
                  <Chip label={metaItem?.category} color="primary" variant="outlined" sx={{ mt: 0.5, fontWeight: 'bold' }} />
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
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                      <MenuItem value="Open">Open</MenuItem>
                      <MenuItem value="Resolved">Resolved</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
           </Box>
           <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: '#f9f9f9', textAlign: 'right' }}>
             <Button 
               variant="contained" 
               color="success" 
               size="large"
               startIcon={<CheckCircleIcon/>}
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

export default function ConversationManagementPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  // --- FILTERS STATE ---
  const [searchText, setSearchText] = useState('');
  const [filterSeller, setFilterSeller] = useState('All');
  const [filterAbout, setFilterAbout] = useState('All');
  const [filterCase, setFilterCase] = useState('All');

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const { data } = await api.get('/ebay/conversation-management/list', { params: { status: 'Open' } });
      setItems(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // --- FILTER LOGIC ---
  // Extract unique sellers for the dropdown
  const uniqueSellers = useMemo(() => {
    const sellers = new Set(items.map(i => i.sellerName).filter(Boolean));
    return Array.from(sellers);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Text Search (Matches OrderID, Username, BuyerName)
      const query = searchText.toLowerCase();
      const matchesText = 
        (item.orderId && item.orderId.toLowerCase().includes(query)) ||
        (item.buyerUsername && item.buyerUsername.toLowerCase().includes(query)) ||
        (item.buyerName && item.buyerName.toLowerCase().includes(query));

      // 2. Dropdown Filters
      const matchesSeller = filterSeller === 'All' || item.sellerName === filterSeller;
      const matchesAbout = filterAbout === 'All' || item.category === filterAbout;
      const matchesCase = filterCase === 'All' || item.caseStatus === filterCase;

      return matchesText && matchesSeller && matchesAbout && matchesCase;
    });
  }, [items, searchText, filterSeller, filterAbout, filterCase]);

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
         <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Conversation Management</Typography>
         <Button startIcon={<FilterListIcon/>} onClick={() => {
            setSearchText(''); setFilterSeller('All'); setFilterAbout('All'); setFilterCase('All');
         }}>
            Reset Filters
         </Button>
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
                    onChange={(e) => setSearchText(e.target.value)}
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
                        onChange={(e) => setFilterSeller(e.target.value)}
                    >
                        <MenuItem value="All">All Sellers</MenuItem>
                        {uniqueSellers.map(seller => (
                            <MenuItem key={seller} value={seller}>{seller}</MenuItem>
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
                        onChange={(e) => setFilterAbout(e.target.value)}
                    >
                        <MenuItem value="All">All Categories</MenuItem>
                        <MenuItem value="INR">INR</MenuItem>
                        <MenuItem value="Cancellation">Cancellation</MenuItem>
                        <MenuItem value="Return">Return</MenuItem>
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
                        onChange={(e) => setFilterCase(e.target.value)}
                    >
                        <MenuItem value="All">All Statuses</MenuItem>
                        <MenuItem value="Case Opened">Case Opened</MenuItem>
                        <MenuItem value="Case Not Opened">Case Not Opened</MenuItem>
                    </Select>
                </FormControl>
            </Grid>
        </Grid>
      </Paper>
      
      {/* --- TABLE --- */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
      ) : filteredItems.length === 0 ? (
        <Alert severity="info">No active conversation cases found matching your filters.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ bgcolor: '#eee' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>SL No</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Seller</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Order ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Buyer Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Conversation About</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Case</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((item, index) => (
                <TableRow key={item._id} hover>
                  {/* SERIAL NUMBER */}
                  <TableCell>{index + 1}</TableCell>
                  
                  {/* SELLER NAME (Added) */}
                  <TableCell>
                      <Chip label={item.sellerName || 'Unknown'} size="small" variant="outlined" />
                  </TableCell>

                  <TableCell>
                    {item.orderId ? (
                        <Chip label={item.orderId} size="small" variant="outlined" sx={{ bgcolor: '#fafafa' }} />
                    ) : (
                        <Typography color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>{item.buyerUsername}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{item.buyerName}</TableCell>
                  <TableCell>
                    <Chip label={item.category} color="primary" size="small" sx={{ bgcolor: '#e3f2fd', color: '#1565c0', fontWeight: 'bold' }} />
                  </TableCell>
                  <TableCell>
                    <Chip 
                        label={item.caseStatus} 
                        color={item.caseStatus === 'Case Opened' ? 'error' : 'success'} 
                        size="small" 
                        variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton color="primary" onClick={() => setSelectedItem(item)}>
                      <ChatIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* MODAL */}
      <ResolutionDialog 
        open={Boolean(selectedItem)} 
        metaItem={selectedItem} 
        onClose={() => setSelectedItem(null)} 
        onSave={fetchItems} 
      />
    </Box>
  );
}