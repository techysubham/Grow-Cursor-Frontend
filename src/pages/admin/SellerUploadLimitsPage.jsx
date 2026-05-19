import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Stack, Alert, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Select, MenuItem, FormControl, InputLabel,
  IconButton, CircularProgress, LinearProgress, Tooltip
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { alpha, useTheme } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TuneIcon from '@mui/icons-material/Tune';
import api from '../../lib/api';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';
import { tableHeaderCellSx, tableBodyRowSx, yellowFilledButtonSx } from '../../theme/tableStyles.js';

const COUNTRIES = ['US', 'UK', 'AU', 'Canada'];

const EMPTY_FORM = { seller: null, country: 'US', limit: '' };

export default function SellerUploadLimitsPage() {
  const theme = useTheme();

  const inputFocusSx = {
    '& label.Mui-focused': { color: `${BRAND_YELLOW} !important` },
    '& .MuiOutlinedInput-root': {
      borderRadius: 1.5,
      '& fieldset': { transition: 'border-color 0.2s ease' },
      '&:hover fieldset': { borderColor: `${alpha(BRAND_DARK, 0.35)} !important` },
      '&.Mui-focused fieldset': { borderColor: `${BRAND_YELLOW} !important`, borderWidth: '2px !important' },
    },
  };
  const selectFocusSx = {
    borderRadius: 1.5,
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: `${BRAND_YELLOW} !important`, borderWidth: '2px !important' },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: `${alpha(BRAND_DARK, 0.35)} !important` },
  };


  // ── State ───────────────────────────────────────────────────────────────────
  const [sellers, setSellers] = useState([]);
  const [limits, setLimits] = useState([]);
  const [loadingLimits, setLoadingLimits] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null); // id being deleted
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [editingId, setEditingId] = useState(null); // id of record being edited
  const [form, setForm] = useState(EMPTY_FORM);

  // ── Load sellers + limits ───────────────────────────────────────────────────
  useEffect(() => {
    api.get('/sellers/all').then(({ data }) => setSellers(data || [])).catch(() => {});
    fetchLimits();
  }, []);

  const fetchLimits = async () => {
    setLoadingLimits(true);
    try {
      const { data } = await api.get('/seller-upload-limits');
      setLimits(data || []);
    } catch {
      setLimits([]);
    } finally {
      setLoadingLimits(false);
    }
  };

  const getSellerLabel = (s) => s?.user?.username || s?.user?.email || 'Unknown';

  // ── Form actions ────────────────────────────────────────────────────────────
  const handleEdit = (record) => {
    setEditingId(record._id);
    setForm({
      seller: sellers.find(s => s._id === (record.seller?._id || record.seller)) || null,
      country: record.country,
      limit: String(record.limit),
    });
    setFormError('');
    setFormSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormSuccess('');
  };

  const handleSave = async () => {
    setFormError('');
    setFormSuccess('');

    if (!form.seller) return setFormError('Please select a seller.');
    if (!form.country) return setFormError('Please select a country.');
    if (!form.limit || isNaN(Number(form.limit)) || Number(form.limit) < 1) {
      return setFormError('Limit must be a positive number.');
    }

    setSaving(true);
    try {
      await api.post('/seller-upload-limits', {
        sellerId: form.seller._id,
        country: form.country,
        limit: Number(form.limit),
      });
      setFormSuccess(editingId ? 'Limit updated.' : 'Limit saved.');
      setEditingId(null);
      setForm(EMPTY_FORM);
      await fetchLimits();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save limit.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteId(id);
    try {
      await api.delete(`/seller-upload-limits/${id}`);
      setLimits(prev => prev.filter(l => l._id !== id));
    } catch {
      // ignore
    } finally {
      setDeleteId(null);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const usagePct = (record) =>
    record.limit > 0 ? Math.min(Math.round((record.currentCount / record.limit) * 100), 100) : 0;

  const progressColor = (pct, isBlocked) => {
    if (isBlocked) return 'error';
    if (pct >= 80) return 'warning';
    return 'success';
  };

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, pb: 5, backgroundColor: theme.palette.background.paper, minHeight: '100vh' }}>

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ pt: 2.5, mb: 3 }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: 2, flexShrink: 0,
          background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${alpha(BRAND_DARK, 0.75)} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 12px ${alpha(BRAND_DARK, 0.25)}`
        }}>
          <TuneIcon sx={{ color: BRAND_YELLOW, fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ color: BRAND_DARK, letterSpacing: -0.5 }}>
            Seller Upload Limits
          </Typography>
          <Typography variant="caption" sx={{ color: alpha(BRAND_DARK, 0.45), fontWeight: 500 }}>
            Configure per-seller, per-country daily upload caps — resets at 12:00 AM IST
          </Typography>
        </Box>
      </Stack>

      {/* ── Set Limit Form ──────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{
        p: 3, mb: 3, borderRadius: 2.5,
        border: `1px solid ${alpha(BRAND_DARK, 0.1)}`,
        background: alpha(BRAND_YELLOW, 0.03),
      }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: BRAND_DARK, mb: 2 }}>
          {editingId ? 'Edit Daily Limit' : 'Set a New Daily Limit'}
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} flexWrap="wrap">
          {/* Country */}
          <FormControl sx={{ minWidth: 140 }}>
            <InputLabel sx={{ '&.Mui-focused': { color: BRAND_YELLOW } }}>Country</InputLabel>
            <Select
              value={form.country}
              label="Country"
              onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              sx={selectFocusSx}
            >
              {COUNTRIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>

          {/* Seller */}
          <Autocomplete
            options={sellers}
            getOptionLabel={getSellerLabel}
            value={form.seller}
            onChange={(_, v) => setForm(f => ({ ...f, seller: v }))}
            isOptionEqualToValue={(opt, val) => opt._id === val._id}
            sx={{ minWidth: 240, flexGrow: 1 }}
            renderInput={params => (
              <TextField {...params} label="Seller" sx={inputFocusSx} />
            )}
          />

          {/* Limit */}
          <TextField
            label="Daily Upload Limit"
            type="number"
            value={form.limit}
            onChange={e => setForm(f => ({ ...f, limit: e.target.value }))}
            inputProps={{ min: 1, step: 1 }}
            sx={{ minWidth: 220, ...inputFocusSx }}
            helperText="Max successful uploads per day (resets 12 AM IST)"
          />
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2.5 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={yellowFilledButtonSx}
          >
            {saving ? 'Saving…' : editingId ? 'Update Limit' : 'Save Limit'}
          </Button>
          {editingId && (
            <Button variant="outlined" onClick={handleCancelEdit} sx={{ borderRadius: 1.5, color: BRAND_DARK, borderColor: alpha(BRAND_DARK, 0.3) }}>
              Cancel
            </Button>
          )}
          {formError && <Alert severity="error" sx={{ py: 0, flexGrow: 1 }}>{formError}</Alert>}
          {formSuccess && <Alert severity="success" sx={{ py: 0, flexGrow: 1 }}>{formSuccess}</Alert>}
        </Stack>
      </Paper>

      {/* ── Configured Limits Table ─────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${alpha(BRAND_DARK, 0.1)}`, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${alpha(BRAND_DARK, 0.07)}` }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ color: BRAND_DARK }}>
            Configured Limits
            {!loadingLimits && (
              <Typography component="span" variant="caption" sx={{ ml: 1, color: alpha(BRAND_DARK, 0.45), fontWeight: 500 }}>
                ({limits.length} record{limits.length !== 1 ? 's' : ''})
              </Typography>
            )}
          </Typography>
        </Box>

        {loadingLimits ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={28} sx={{ color: BRAND_YELLOW_DARK }} />
          </Box>
        ) : limits.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.4) }}>
              No limits configured yet. Use the form above to add one.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderCellSx}>Seller</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Country</TableCell>
                  <TableCell sx={tableHeaderCellSx} align="right">Daily Limit</TableCell>
                  <TableCell sx={tableHeaderCellSx} align="right">Today's Count</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, minWidth: 180 }}>Today's Usage</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Resets At</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Status</TableCell>
                  <TableCell sx={tableHeaderCellSx} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {limits.map(record => {
                  const pct = usagePct(record);
                  const color = progressColor(pct, record.isBlocked);
                  const isEditing = editingId === record._id;
                  return (
                    <TableRow key={record._id} sx={{ ...tableBodyRowSx, ...(isEditing ? { backgroundColor: alpha(BRAND_YELLOW, 0.07) } : {}) }}>
                      <TableCell sx={{ fontWeight: 600 }}>{record.sellerName}</TableCell>
                      <TableCell>
                        <Chip label={record.country} size="small" sx={{ fontWeight: 700, height: 22, fontSize: '0.72rem', backgroundColor: alpha(BRAND_DARK, 0.07) }} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {record.limit.toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: record.isBlocked ? '#c0392b' : BRAND_DARK }}>
                        {(record.currentCount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        <Stack spacing={0.4}>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            color={color}
                            sx={{ height: 7, borderRadius: 4, backgroundColor: alpha(BRAND_DARK, 0.1) }}
                          />
                          <Typography variant="caption" sx={{ color: alpha(BRAND_DARK, 0.5), fontWeight: 600 }}>
                            {pct}%
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', color: alpha(BRAND_DARK, 0.65), fontSize: '0.82rem' }}>
                        12:00 AM IST
                      </TableCell>
                      <TableCell>
                        {record.isBlocked ? (
                          <Chip
                            icon={<BlockIcon sx={{ fontSize: '0.85rem !important' }} />}
                            label="Blocked"
                            size="small"
                            sx={{ height: 22, fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#fde8e8', color: '#c0392b', border: '1px solid #f5c6c6' }}
                          />
                        ) : pct >= 80 ? (
                          <Chip
                            icon={<WarningAmberIcon sx={{ fontSize: '0.85rem !important' }} />}
                            label="Near Limit"
                            size="small"
                            sx={{ height: 22, fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#fff8e1', color: '#856404', border: '1px solid #ffe082' }}
                          />
                        ) : (
                          <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: '0.85rem !important' }} />}
                            label="Active"
                            size="small"
                            sx={{ height: 22, fontSize: '0.72rem', fontWeight: 700, backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9' }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Edit">
                            <span>
                              <IconButton size="small" onClick={() => handleEdit(record)} sx={{ color: BRAND_DARK, '&:hover': { backgroundColor: alpha(BRAND_YELLOW, 0.15) } }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(record._id)}
                                disabled={deleteId === record._id}
                                sx={{ color: '#c0392b', '&:hover': { backgroundColor: '#fde8e8' } }}
                              >
                                {deleteId === record._id ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
