// src/pages/lister/ListerDashboard.jsx
import { useEffect, useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AppBar, Box, Button, Card, CardContent, Grid,
  Toolbar, Typography, Divider, TextField,
  Stack, Alert, IconButton, Autocomplete,
  Chip, LinearProgress, CardHeader, Avatar,
  CircularProgress
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import LinkIcon from '@mui/icons-material/Link';
import SendIcon from '@mui/icons-material/Send';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import ChatIcon from '@mui/icons-material/Chat';
import api from '../../lib/api.js';

// Simple helper to calculate completion percentage
const getProgress = (total, remaining) => {
  if (!total || total === 0) return 0;
  const completed = total - remaining;
  return Math.min(100, Math.max(0, (completed / total) * 100));
};

export default function ListerDashboard({ user, onLogout }) {
  const [today, setToday] = useState([]);
  const [pending, setPending] = useState([]);
  const [completed, setCompleted] = useState([]);

  // Per-assignment UI state
  const [selectedRanges, setSelectedRanges] = useState({});
  const [rangeQtys, setRangeQtys] = useState({});

  // Data Cache
  const [categoryRanges, setCategoryRanges] = useState({});
  const fetchingCategories = useRef(new Set());
  const [saving, setSaving] = useState({});

  // Combine for fetching logic
  const allAssignments = useMemo(() => [...today, ...pending, ...completed], [today, pending, completed]);

  // 1. Load Assignments
  const load = async () => {
    try {
      const { data } = await api.get('/assignments/mine/with-status');
      setToday(data?.todaysTasks ?? []);
      setPending(data?.pendingTasks ?? []);
      setCompleted(data?.completedTasks ?? []);
    } catch (e) {
      console.error("Failed to load dashboard", e);
    }
  };

  useEffect(() => { load(); }, []);

  // 2. Safe Range Fetching
  useEffect(() => {
    const fetchMissing = async () => {
      const neededCategoryIds = new Set();
      allAssignments.forEach(a => {
        const catId = a.task?.category?._id;
        if (catId && !categoryRanges[String(catId)] && !fetchingCategories.current.has(String(catId))) {
          neededCategoryIds.add(String(catId));
        }
      });

      if (neededCategoryIds.size === 0) return;

      neededCategoryIds.forEach(id => fetchingCategories.current.add(id));

      await Promise.all([...neededCategoryIds].map(async (catId) => {
        try {
          const { data } = await api.get('/ranges', { params: { categoryId: catId } });
          setCategoryRanges(prev => ({ ...prev, [String(catId)]: data }));
        } catch (e) {
          console.error(`Failed to load ranges for category ${catId}`, e);
        } finally {
          fetchingCategories.current.delete(catId);
        }
      }));
    };
    if (allAssignments.length > 0) fetchMissing();
  }, [allAssignments, categoryRanges]);

  // Manual add range
  const addRangeQuantity = async (assignmentId) => {
    const rangeId = selectedRanges[assignmentId];
    const qty = Number(rangeQtys[assignmentId] || 0);
    if (!rangeId || qty <= 0) return;

    setSaving(s => ({ ...s, [assignmentId]: true }));
    try {
      await api.post(`/assignments/${assignmentId}/complete-range`, { rangeId, quantity: qty });
      setRangeQtys(prev => ({ ...prev, [assignmentId]: '' }));
      setSelectedRanges(prev => ({ ...prev, [assignmentId]: '' }));
      await load();
    } catch (e) {
      alert('Error saving range.');
    } finally {
      setSaving(s => ({ ...s, [assignmentId]: false }));
    }
  };

  const removeRangeQuantity = async (assignmentId, rangeId) => {
    setSaving(s => ({ ...s, [assignmentId]: true }));
    try {
      await api.post(`/assignments/${assignmentId}/complete-range`, { rangeId, quantity: 0 });
      await load();
    } catch (e) {
      console.error('Failed to remove range', e);
    } finally {
      setSaving(s => ({ ...s, [assignmentId]: false }));
    }
  };

  // Submit assignment
  const handleSubmitAssignment = async (assignmentId) => {
    setSaving(s => ({ ...s, [assignmentId]: true }));
    try {
      await api.post(`/assignments/${assignmentId}/submit`);
      await load();
    } catch (e) {
      alert('Failed to submit: ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(s => ({ ...s, [assignmentId]: false }));
    }
  };

  // --- CARD RENDERER ---
  const renderCard = (a) => {
    const t = a.task || {};
    const catId = t.category?._id ? String(t.category._id) : null;
    const availableRanges = (catId && categoryRanges[catId]) ? categoryRanges[catId] : [];
    
    const selectedRangeId = selectedRanges[a._id] || '';
    const selectedRangeObj = availableRanges.find(r => r._id === selectedRangeId) || null;
    const rangeQty = rangeQtys[a._id] || '';
    const isSaving = !!saving[a._id];

    const savedRqList = (a.rangeQuantities || []).map(rq => ({
      rangeId: rq.range?._id || rq.range,
      rangeName: rq.range?.name || '',
      quantity: rq.quantity || 0
    }));
    
    const savedTotal = savedRqList.reduce((sum, rq) => sum + (rq.quantity || 0), 0);
    const remaining = Math.max(0, a.quantity - savedTotal);
    const progress = getProgress(a.quantity, remaining);

    return (
      <Card key={a._id} elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          avatar={<Avatar sx={{ bgcolor: remaining === 0 ? 'success.light' : 'primary.main' }}><AssignmentIcon /></Avatar>}
          subheader={new Date(a.createdAt).toLocaleDateString()}
          subheaderTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }}
          action={
             t.supplierLink && (
               <IconButton size="small" href={t.supplierLink} target="_blank" color="primary" title="Supplier Link">
                 <LinkIcon />
               </IconButton>
             )
          }
          sx={{ pb: 0 }}
        />
        
        <Divider />

        <CardContent sx={{ flexGrow: 1, pt: 2 }}>
          
          <Stack spacing={1.5} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
              Category: {t.category?.name || '-'} | Subcategory: {t.subcategory?.name || '-'}
            </Typography>

            <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }}>
              Total Qty: {a.quantity} | Remaining: <span style={{ color: remaining > 0 ? '#d32f2f' : 'green', fontWeight: 'bold' }}>{remaining}</span>
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
              Listing: {a.listingPlatform?.name} / {a.store?.name}
            </Typography>

            <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }}>
              Marketplace: {a.marketplace?.replace('EBAY_', 'eBay ').replace('_', ' ') || '-'}
            </Typography>
          </Stack>

          {/* Progress Bar */}
          <Box sx={{ mb: 2 }}>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              color={remaining === 0 ? "success" : "primary"}
              sx={{ height: 8, borderRadius: 4, mb: 1 }}
            />
          </Box>

          {a.notes && (
            <Alert severity="info" sx={{ py: 0, px: 1, mb: 2, fontSize: '0.85rem' }}>
              <b>Note:</b> {a.notes}
            </Alert>
          )}

          {/* Manual Input Area */}
          {!a.completedAt && (
            <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1, mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Or add manually:
              </Typography>
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={7}>
                  <Autocomplete
                    size="small"
                    options={availableRanges || []} 
                    getOptionLabel={(option) => option?.name || ''}
                    value={selectedRangeObj}
                    onChange={(e, n) => setSelectedRanges(prev => ({ ...prev, [a._id]: n?._id || '' }))}
                    disabled={isSaving}
                    renderInput={(params) => <TextField {...params} label="Range" variant="outlined" />}
                    isOptionEqualToValue={(o, v) => o._id === v._id}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    size="small"
                    type="number"
                    label="Qty"
                    value={rangeQty}
                    onChange={(e) => setRangeQtys(prev => ({ ...prev, [a._id]: e.target.value }))}
                    inputProps={{ min: 0, max: remaining }}
                    disabled={isSaving || !selectedRangeId}
                  />
                </Grid>
                <Grid item xs={2}>
                  <IconButton 
                    color="primary" 
                    onClick={() => addRangeQuantity(a._id)}
                    disabled={isSaving || !selectedRangeId || !rangeQty || Number(rangeQty) <= 0 || Number(rangeQty) > remaining}
                    sx={{ border: '1px solid', borderRadius: 1 }}
                  >
                    <AddCircleOutlineIcon />
                  </IconButton>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Saved Chips Area */}
          {savedRqList.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
              {savedRqList.map((rq, idx) => {
                const rName = (catId && categoryRanges[catId]?.find(r => r._id === rq.rangeId)?.name) || rq.rangeName || '?';
                return (
                  <Chip
                    key={idx}
                    label={`${rName}: ${rq.quantity}`}
                    onDelete={!a.completedAt ? () => removeRangeQuantity(a._id, rq.rangeId) : undefined}
                    size="small"
                    color={rName === 'Unknown' ? 'warning' : 'default'}
                    variant="filled"
                  />
                );
              })}
            </Box>
          )}

          {/* Submit Button */}
          {!a.completedAt && savedTotal > 0 && (
            <Button
              variant="contained"
              color="success"
              fullWidth
              startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
              onClick={() => handleSubmitAssignment(a._id)}
              disabled={isSaving}
            >
              Submit Assignment
            </Button>
          )}
          
          {a.completedAt && (
             <Typography variant="body2" color="success.main" align="center" sx={{ mt: 2, fontWeight: 'bold' }}>
               ✓ Completed
             </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ pb: 4 }}>
      <AppBar position="static" color="default" elevation={1} sx={{ bgcolor: 'white' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, color: 'primary.main', fontWeight: 'bold' }}>
            Lister Dashboard
          </Typography>
          {user && <Chip icon={<PersonIcon />} label={user.username} size="small" sx={{ mr: 1 }} />}
          <Button component={Link} to="/admin/select-seller" size="small" sx={{ mr: 1 }} startIcon={<AddCircleOutlineIcon />} variant="contained" color="primary">Template Listings</Button>
          <Button component={Link} to="/ideas" size="small" sx={{ mr: 1 }} startIcon={<LightbulbIcon />}>Ideas & Issues</Button>
          <Button component={Link} to="/about-me" size="small" sx={{ mr: 1 }} startIcon={<ChatIcon />}>Team Chat</Button>
          <Button component={Link} to="/about-me" size="small" sx={{ mr: 1 }}>About</Button>
          <Button onClick={onLogout} variant="outlined" size="small" color="error">Logout</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: { xs: 1, md: 3 } }}>
        {/* Today Section */}
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
           Today's Tasks <Chip label={today.length} color="primary" size="small" />
        </Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {today.map(a => (
            <Grid item xs={12} sm={6} lg={4} xl={3} key={a._id}>{renderCard(a)}</Grid>
          ))}
          {today.length === 0 && <Grid item xs={12}><Typography color="text.secondary">No tasks for today.</Typography></Grid>}
        </Grid>

        <Divider sx={{ mb: 4 }} />

        {/* Pending Section */}
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
           Pending <Chip label={pending.length} color="warning" size="small" />
        </Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {pending.map(a => (
            <Grid item xs={12} sm={6} lg={4} xl={3} key={a._id}>{renderCard(a)}</Grid>
          ))}
          {pending.length === 0 && <Grid item xs={12}><Typography color="text.secondary">No pending tasks.</Typography></Grid>}
        </Grid>

        <Divider sx={{ mb: 4 }} />

        {/* Completed Section */}
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
           Completed <Chip label={completed.length} color="success" size="small" />
        </Typography>
        <Grid container spacing={2}>
          {completed.map(a => (
            <Grid item xs={12} sm={6} lg={4} xl={3} key={a._id}>{renderCard(a)}</Grid>
          ))}
          {completed.length === 0 && <Grid item xs={12}><Typography color="text.secondary">No completed tasks yet.</Typography></Grid>}
        </Grid>
      </Box>
    </Box>
  );
}