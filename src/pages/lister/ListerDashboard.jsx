// src/pages/lister/ListerDashboard.jsx
import { useEffect, useState } from 'react';
import {
  AppBar, Box, Button, Card, CardActions, CardContent, Grid,
  Toolbar, Typography, Divider, TextField, FormControl, InputLabel,
  Select, MenuItem, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Stack, Alert, IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../lib/api.js';

export default function ListerDashboard({ user, onLogout }) {
  const [today, setToday] = useState([]);
  const [pending, setPending] = useState([]);
  const [completed, setCompleted] = useState([]);

  // Per-assignment UI state
  const [selectedRanges, setSelectedRanges] = useState({}); // { [assignmentId]: rangeId }
  const [rangeQtys, setRangeQtys] = useState({});          // { [assignmentId]: quantity }
  const [ranges, setRanges] = useState({});                // { [assignmentId]: ranges[] }
  const [saving, setSaving] = useState({});                // { [assignmentId]: true/false }

  // Prefetch ranges for each assignment’s subcategory
  const prefetchRanges = (arrays) => {
    arrays.flat().forEach(a => {
      if (a?.task?.subcategory?._id) {
        loadRangesForAssignment(a._id, a.task.subcategory._id);
      }
    });
  };

  const loadRangesForAssignment = async (assignmentId, subcategoryId) => {
    try {
      const { data } = await api.get('/ranges', { params: { subcategoryId } });
      setRanges(prev => ({ ...prev, [assignmentId]: data }));
    } catch (e) {
      console.error('Failed to load ranges', e);
    }
  };

  const load = async () => {
    const { data } = await api.get('/assignments/mine/with-status');
    const t = data?.todaysTasks ?? [];
    const p = data?.pendingTasks ?? [];
    const c = data?.completedTasks ?? [];
    setToday(t);
    setPending(p);
    setCompleted(c);
    prefetchRanges([t, p, c]);
  };

  useEffect(() => { load(); }, []);

  const addRangeQuantity = async (assignmentId) => {
    const rangeId = selectedRanges[assignmentId];
    const qty = Number(rangeQtys[assignmentId] || 0);
    if (!rangeId || qty <= 0) return;

    setSaving(s => ({ ...s, [assignmentId]: true }));
    try {
      await api.post(`/assignments/${assignmentId}/complete-range`, { rangeId, quantity: qty });
      // clear inputs for this assignment
      setRangeQtys(prev => ({ ...prev, [assignmentId]: '' }));
      setSelectedRanges(prev => ({ ...prev, [assignmentId]: '' }));
      await load();
    } catch (e) {
      console.error('Failed to save range quantity', e);
      alert('Failed to save range quantity. Please try again.');
    } finally {
      setSaving(s => ({ ...s, [assignmentId]: false }));
    }
  };

  const removeRangeQuantity = async (assignmentId, rangeId) => {
    setSaving(s => ({ ...s, [assignmentId]: true }));
    try {
      // Remove by setting quantity to 0
      await api.post(`/assignments/${assignmentId}/complete-range`, { rangeId, quantity: 0 });
      await load();
    } catch (e) {
      console.error('Failed to remove range quantity', e);
      alert('Failed to remove range quantity. Please try again.');
    } finally {
      setSaving(s => ({ ...s, [assignmentId]: false }));
    }
  };

  const submitAssignment = async (assignmentId) => {
    setSaving(s => ({ ...s, [assignmentId]: true }));
    try {
      await api.post(`/assignments/${assignmentId}/submit`);
      await load();
    } catch (e) {
      console.error('Failed to submit assignment', e);
      alert('Failed to submit assignment. Please try again.');
    } finally {
      setSaving(s => ({ ...s, [assignmentId]: false }));
    }
  };

  const renderCard = (a) => {
    const t = a.task || {};
    const availableRanges = ranges[a._id] || [];
    const selectedRangeId = selectedRanges[a._id] || '';
    const rangeQty = rangeQtys[a._id] || '';
    const isSaving = !!saving[a._id];

    // Always trust server copy for saved breakdown
    const savedRqList = (a.rangeQuantities || []).map(rq => ({
      rangeId: rq.range?._id || rq.range,
      rangeName: rq.range?.name || '',
      quantity: rq.quantity || 0
    }));
    const savedTotal = savedRqList.reduce((sum, rq) => sum + (rq.quantity || 0), 0);
    const remaining = Math.max(0, a.quantity - savedTotal);
    const canSubmit = savedTotal >= a.quantity && !a.completedAt;

    // Lazy load ranges if not ready
    if (t.subcategory?._id && !ranges[a._id]) {
      loadRangesForAssignment(a._id, t.subcategory._id);
    }

    return (
      <Card key={a._id} sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>{t.productTitle}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {new Date(a.createdAt).toLocaleDateString()}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Category: {t.category?.name || '-'} | Subcategory: {t.subcategory?.name || '-'}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Total Qty: {a.quantity} | Distributed: {savedTotal} | Remaining: {remaining}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Listing: {a.listingPlatform?.name} / {a.store?.name}
          </Typography>
          {t.supplierLink ? (
            <Typography variant="body2" sx={{ mb: 2 }}>
              <a href={t.supplierLink} target="_blank" rel="noreferrer">Supplier Link</a>
            </Typography>
          ) : null}

          {a.completedAt ? (
            <Alert severity="success" sx={{ mb: 2 }}>Assignment Submitted!</Alert>
          ) : null}

          <Stack spacing={2} sx={{ mb: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Range</InputLabel>
              <Select
                label="Select Range"
                value={selectedRangeId}
                onChange={(e) => setSelectedRanges(prev => ({ ...prev, [a._id]: e.target.value }))}
                disabled={isSaving || !!a.completedAt}
              >
                {availableRanges.map((r) => (
                  <MenuItem key={r._id} value={r._id}>{r.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                type="number"
                label="Quantity"
                value={rangeQty}
                onChange={(e) => setRangeQtys(prev => ({ ...prev, [a._id]: e.target.value }))}
                inputProps={{ min: 0, max: remaining }}
                disabled={isSaving || !!a.completedAt || !selectedRangeId}
                sx={{ flex: 1 }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => addRangeQuantity(a._id)}
                disabled={
                  isSaving ||
                  !!a.completedAt ||
                  !selectedRangeId ||
                  !rangeQty ||
                  Number(rangeQty) <= 0 ||
                  Number(rangeQty) > remaining
                }
              >
                {isSaving ? 'Saving...' : 'Add'}
              </Button>
            </Stack>
          </Stack>

          {savedRqList.length > 0 && (
            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Range</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {savedRqList.map((rq, idx) => {
                    const rangeName =
                      ranges[a._id]?.find(r => r._id === rq.rangeId)?.name ||
                      rq.rangeName ||
                      'Unknown';
                    return (
                      <TableRow key={idx}>
                        <TableCell>{rangeName}</TableCell>
                        <TableCell>{rq.quantity}</TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => removeRangeQuantity(a._id, rq.rangeId)}
                            disabled={isSaving || !!a.completedAt}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {savedRqList.length > 0 && (
            <Typography variant="body2" sx={{ mb: 1, mt: 2 }}>
              Total Distributed: {savedTotal} / {a.quantity}
            </Typography>
          )}
        </CardContent>

        <CardActions>
          {canSubmit ? (
            <Button
              size="small"
              variant="contained"
              color="success"
              onClick={() => submitAssignment(a._id)}
              disabled={isSaving}
            >
              {isSaving ? 'Submitting…' : 'Submit Assignment'}
            </Button>
          ) : null}
        </CardActions>
      </Card>
    );
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>My Assignments</Typography>
          {user ? <Typography variant="body2" sx={{ mr: 2 }}>{user.username} (lister)</Typography> : null}
          <Button color="inherit" onClick={onLogout}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Today's Tasks</Typography>
        <Grid container spacing={2}>
          {today.map(a => (
            <Grid item xs={12} md={6} lg={4} key={a._id}>{renderCard(a)}</Grid>
          ))}
          {today.length === 0 && (
            <Grid item xs={12}><Typography variant="body2" color="text.secondary">No tasks assigned today.</Typography></Grid>
          )}
        </Grid>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Pending</Typography>
        <Grid container spacing={2}>
          {pending.map(a => (
            <Grid item xs={12} md={6} lg={4} key={a._id}>{renderCard(a)}</Grid>
          ))}
          {pending.length === 0 && (
            <Grid item xs={12}><Typography variant="body2" color="text.secondary">No pending assignments.</Typography></Grid>
          )}
        </Grid>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Completed</Typography>
        <Grid container spacing={2}>
          {completed.map(a => (
            <Grid item xs={12} md={6} lg={4} key={a._id}>{renderCard(a)}</Grid>
          ))}
          {completed.length === 0 && (
            <Grid item xs={12}><Typography variant="body2" color="text.secondary">No completed assignments yet.</Typography></Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
}
