import React, { useEffect, useState, useRef } from 'react';
import {
  Dialog, Box, Typography, Stack, TextField, Button, Paper,
  CircularProgress, IconButton, Grid, FormControl, InputLabel, Select, MenuItem, Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from '../lib/api';

/**
 * Reusable Chat Modal Component with Case Management
 * Displays chat history and allows sending messages + managing case status
 */
export default function ChatModal({
  open,
  onClose,
  orderId,
  buyerUsername,
  buyerName,
  itemId,
  title = 'Chat',
  category = 'General',
  caseStatus = 'Open',
  initialNotes = '',
  initialStatus = 'Open',
  onSave = null, // Optional callback to save resolution
  entityId = null, // Optional: ID of the entity (return, case, order) for saving
  entityType = null, // Optional: 'return', 'inr', 'cancellation'
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [status, setStatus] = useState(initialStatus);
  const [savingResolution, setSavingResolution] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open) {
      setNotes(initialNotes);
      setStatus(initialStatus);
      loadMessages();
    }
  }, [open, orderId, buyerUsername, itemId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    setLoading(true);
    try {
      const params = { orderId };
      if (!orderId) {
        params.buyerUsername = buyerUsername;
        params.itemId = itemId;
      }
      const { data } = await api.get('/ebay/chat/messages', { params });
      setMessages(data || []);
    } catch (e) {
      console.error('Failed to load messages', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) return;
    setSendingMsg(true);
    try {
      const { data } = await api.post('/ebay/send-message', {
        orderId,
        buyerUsername,
        itemId,
        body: newMessage
      });
      setMessages([...messages, data.message]);
      setNewMessage('');
    } catch (e) {
      alert('Failed to send: ' + e.message);
    } finally {
      setSendingMsg(false);
    }
  }

  async function handleSaveResolution() {
    if (status === 'Resolved' && !notes.trim()) {
      alert('Notes are required to mark as Resolved.');
      return;
    }
    setSavingResolution(true);
    try {
      if (onSave) {
        await onSave({ notes, status, entityId, entityType });
      }
      onClose();
    } catch (e) {
      alert('Failed to save: ' + e.message);
    } finally {
      setSavingResolution(false);
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <Box sx={{ display: 'flex', height: '80vh' }}>
        {/* LEFT: CHAT */}
        <Box sx={{ width: '60%', borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: '#f5f5f5' }}>
            <Typography variant="h6">Chat History</Typography>
            <Typography variant="caption" color="text.secondary">
              {buyerName} ({buyerUsername})
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f0f2f5' }}>
            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <Stack spacing={2}>
                {messages.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                    No messages yet
                  </Typography>
                ) : (
                  messages.map((msg, i) => (
                    <Box
                      key={i}
                      sx={{
                        alignSelf: msg.sender === 'SELLER' ? 'flex-end' : 'flex-start',
                        maxWidth: '80%'
                      }}
                    >
                      <Paper
                        sx={{
                          p: 1.5,
                          bgcolor: msg.sender === 'SELLER' ? '#1976d2' : '#fff',
                          color: msg.sender === 'SELLER' ? '#fff' : '#000'
                        }}
                      >
                        <Typography variant="body2">{msg.body}</Typography>
                      </Paper>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          mt: 0.5,
                          textAlign: msg.sender === 'SELLER' ? 'right' : 'left'
                        }}
                      >
                        {new Date(msg.messageDate).toLocaleString('en-US', { 
                          timeZone: 'America/Los_Angeles',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })} PT
                      </Typography>
                    </Box>
                  ))
                )}
                <div ref={messagesEndRef} />
              </Stack>
            )}
          </Box>
          <Box sx={{ p: 2, bgcolor: '#fff', borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={sendingMsg || !newMessage.trim()}
            >
              {sendingMsg ? <CircularProgress size={20} /> : <SendIcon />}
            </Button>
          </Box>
        </Box>

        {/* RIGHT: MANAGEMENT */}
        <Box sx={{ width: '40%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">Manage Case</Typography>
            <IconButton onClick={onClose}><CloseIcon /></IconButton>
          </Box>
          <Box sx={{ p: 3, flex: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Conversation About</Typography>
                <Chip label={category || title} color="primary" variant="outlined" sx={{ mt: 0.5, fontWeight: 'bold', display: 'block' }} />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Case Status</Typography>
                <Chip 
                  label={caseStatus} 
                  color={caseStatus === 'Case Opened' ? 'error' : 'success'} 
                  variant="outlined" 
                  sx={{ mt: 0.5, fontWeight: 'bold', display: 'block' }} 
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
                  helperText={status === 'Resolved' ? 'Required for resolution' : 'Optional'}
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
              startIcon={<CheckCircleIcon />}
              onClick={handleSaveResolution}
              disabled={savingResolution}
            >
              {savingResolution ? 'Saving...' : 'SAVE & UPDATE'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
