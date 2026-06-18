import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Button, Chip, CircularProgress, FormControl, InputAdornment,
  InputLabel, MenuItem, OutlinedInput, Pagination, Paper, Select, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography, Checkbox, Alert, IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  FileDownload as DownloadIcon,
  Settings as SettingsIcon,
  RuleOutlined as ProofReadIcon,
  CalendarToday as CalendarIcon,
  PlayArrow as ApplyIcon,
} from '@mui/icons-material';
import {
  Dialog as MuiDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import api from '../../lib/api.js';
import ListDirectlyDialog from '../../components/ListDirectlyDialog.jsx';
import TemplateCustomizationDialog from '../../components/TemplateCustomizationDialog.jsx';
import AsinReviewModal from '../../components/AsinReviewModal.jsx';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';
import { dashboardSignatureTokens } from '../../theme/appTheme.js';
import AdminPageShell from '../../components/AdminPageShell.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { tableHeaderCellSx, tableBodyRowSx, yellowFilledButtonSx } from '../../theme/tableStyles.js';

// Core columns to display (same as ListingDirectoryPage)
const CORE_COLUMNS = [
  { key: 'action',              label: '*Action',            width: 80  },
  { key: 'customLabel',         label: 'Custom Label (SKU)', width: 150 },
  { key: 'categoryId',          label: 'Category ID',        width: 100 },
  { key: 'categoryName',        label: 'Category Name',      width: 200 },
  { key: 'title',               label: 'Title',              width: 300 },
  { key: 'relationship',        label: 'Relationship',       width: 120 },
  { key: 'relationshipDetails', label: 'Rel. Details',       width: 150 },
  { key: 'scheduleTime',        label: 'Schedule Time',      width: 130 },
  { key: 'startPrice',          label: 'Start Price',        width: 100 },
];

function renderCellValue(col, listing) {
  const v = listing[col.key];
  if (col.key === 'startPrice') return v != null ? `$${v}` : '-';
  if (col.key === 'scheduleTime') return v || '-';
  return v || '-';
}

export default function TemplateDirectoryPage() {
  const theme = useTheme();
  const dt = theme.customTokens?.dashboardSignature || dashboardSignatureTokens;

  // ── Sellers (all except Testing) ─────────────────────────────────────────
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [sellersLoading, setSellersLoading] = useState(true);

  // ── Template selection ───────────────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState(null);

  // ── Listings + pagination ────────────────────────────────────────────────
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Row selection ────────────────────────────────────────────────────────
  const [selectedListings, setSelectedListings] = useState(new Set());

  // ── Filters ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTimeFrom, setScheduleTimeFrom] = useState('');
  const [scheduleStep, setScheduleStep] = useState(3);
  const [scheduleConfirmOpen, setScheduleConfirmOpen] = useState(false);

  // ── Dialogs ───────────────────────────────────────────────────────────────
  const [customizationDialog, setCustomizationDialog] = useState(false);
  const [listDirectlyDialog, setListDirectlyDialog] = useState(false);
  const [pendingInlineListings, setPendingInlineListings] = useState(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [previewItems, setPreviewItems] = useState([]);

  // Search debounce ref
  const searchTimeout = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Boot: load all sellers (excluding Testing) + all templates
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const boot = async () => {
      try {
        const [sellersRes, templatesRes] = await Promise.all([
          api.get('/sellers/all'),
          api.get('/listing-templates'),
        ]);
        const realSellers = (sellersRes.data || []).filter(
          s => s.user?.username?.toLowerCase() !== 'growmentality'
        );
        setSellers(realSellers);
        setSelectedSeller(realSellers[0] || null);
        const tmps = templatesRes.data || [];
        setTemplates(tmps);
        setTemplate(tmps[0] || null);
      } catch (e) {
        setError('Failed to load initial data');
      } finally {
        setSellersLoading(false);
      }
    };
    boot();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch listings whenever template, seller, page, or price changes
  // ─────────────────────────────────────────────────────────────────────────
  const fetchListings = useCallback(async (pageOverride) => {
    if (!template?._id || !selectedSeller?._id) {
      setListings([]);
      return;
    }
    setLoading(true);
    try {
      const params = {
        templateId: template._id,
        sellerId: selectedSeller._id,
        page: pageOverride ?? pagination.page,
        limit: pagination.limit,
        batchFilter: 'all',
      };
      if (priceMin) params.minPrice = priceMin;
      if (priceMax) params.maxPrice = priceMax;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const { data } = await api.get('/template-listings', { params });
      setListings(data.listings || []);
      setPagination(p => ({ ...p, ...data.pagination }));
      setSelectedListings(new Set());
    } catch (e) {
      setError('Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [template, selectedSeller, pagination.page, pagination.limit, priceMin, priceMax, searchQuery]);

  useEffect(() => {
    fetchListings(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, selectedSeller, priceMin, priceMax]);

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      if (template && selectedSeller) fetchListings(1);
    }, 400);
    return () => clearTimeout(searchTimeout.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // ─────────────────────────────────────────────────────────────────────────
  // Selection helpers
  // ─────────────────────────────────────────────────────────────────────────
  const handleToggleSelect = id => {
    setSelectedListings(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const handleToggleAll = () => {
    if (selectedListings.size === listings.length) setSelectedListings(new Set());
    else setSelectedListings(new Set(listings.map(l => l._id)));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Schedule Time helpers
  // ─────────────────────────────────────────────────────────────────────────
  const scheduleReady = !!(scheduleDate && scheduleTimeFrom && scheduleStep >= 1 && template && selectedSeller);

  // Compute the preview of the last listing's timestamp given current inputs + total loaded
  const computeSchedulePreview = () => {
    if (!scheduleReady || listings.length === 0) return null;
    const [h, m] = scheduleTimeFrom.split(':').map(Number);
    const totalMin = h * 60 + m + (pagination.total - 1) * scheduleStep;
    const lh = Math.floor((totalMin % 1440) / 60);
    const lm = totalMin % 60;
    const extraDays = Math.floor(totalMin / 1440);
    const [y, mo, d2] = scheduleDate.split('-').map(Number);
    const daysIn = (yy, mm) => new Date(yy, mm, 0).getDate();
    let ny = y, nm = mo, nd = d2 + extraDays;
    while (nd > daysIn(ny, nm)) { nd -= daysIn(ny, nm); nm++; if (nm > 12) { nm = 1; ny++; } }
    const pad = n => String(n).padStart(2, '0');
    return `${ny}-${pad(nm)}-${pad(nd)} ${pad(lh)}:${pad(lm)}:00`;
  };

  const schedulePreviewLast = computeSchedulePreview();

  const handleApplySchedule = async () => {
    if (!scheduleReady) return;
    setScheduleConfirmOpen(false);
    setLoading(true);
    try {
      const startDateTime = `${scheduleDate} ${scheduleTimeFrom}:00`;
      const { data } = await api.post('/template-listings/bulk-apply-schedule', {
        templateId: template._id,
        sellerId: selectedSeller._id,
        startDateTime,
        stepMinutes: scheduleStep,
        batchFilter: 'all',
      });
      if (data.updated === 0) {
        setSuccess('No listings found for this template and seller.');
      } else {
        setSuccess(`Schedule applied to ${data.updated} listings (${data.firstTime} → ${data.lastTime})`);
      }
      fetchListings(1);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to apply schedule times');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Proof Read
  // ─────────────────────────────────────────────────────────────────────────
  const handleProofRead = async () => {
    const selected = listings.filter(l => selectedListings.has(l._id));

    const items = selected.map(l => ({
      id: l._id,
      asin: l._asinReference || '',
      sku: l.customLabel || '',
      status: 'loading',
      sourceData: l._amazonSourcePrice ? { price: l._amazonSourcePrice, title: '', brand: '', images: [], description: '', color: '', compatibility: '' } : null,
      generatedListing: {
        _existingListingId: l._id,
        action: l.action,
        customLabel: l.customLabel,
        title: l.title,
        startPrice: l.startPrice,
        categoryId: l.categoryId,
        categoryName: l.categoryName,
        relationship: l.relationship,
        relationshipDetails: l.relationshipDetails,
        scheduleTime: l.scheduleTime,
        description: l.description,
        condition: l.condition,
        conditionDescription: l.conditionDescription,
        quantity: l.quantity,
        customFields: l.customFields,
      },
      warnings: [],
      errors: []
    }));
    setPreviewItems(items);
    setReviewModal(true);

    const asinList = selected.map(l => l._asinReference).filter(Boolean);
    if (asinList.length === 0) {
      setPreviewItems(items.map(i => ({ ...i, status: 'ready' })));
      return;
    }
    try {
      const { data } = await api.get('/asin-directory/by-asins', {
        params: { asins: asinList.join(',') },
      });
      const byAsin = {};
      (data || []).forEach(d => { byAsin[d.asin] = d; });
      setPreviewItems(prev => prev.map(item => {
        const src = byAsin[item.asin?.toUpperCase()];
        return {
          ...item,
          status: 'ready',
          sourceData: src
            ? {
                title: src.title,
                brand: src.brand,
                price: src.price,
                images: src.images || [],
                description: src.description,
                color: src.color,
                compatibility: src.compatibility,
              }
            : null,
        };
      }));
    } catch {
      setPreviewItems(prev => prev.map(i => ({ ...i, status: 'ready' })));
    }
  };

  const handleSaveFromReview = async (listings) => {
    try {
      await api.put('/template-listings/bulk-update', { listings });
      setReviewModal(false);
      setPreviewItems([]);
      setSuccess('Listings updated successfully!');
      fetchListings(1);
    } catch (e) {
      setError('Failed to save changes');
    }
  };

  const handleListDirectlyFromReview = (listings) => {
    setPendingInlineListings(listings);
    setReviewModal(false);
    setPreviewItems([]);
    setListDirectlyDialog(true);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CSV Download
  // ─────────────────────────────────────────────────────────────────────────
  const handleDownloadCsv = async () => {
    if (!template?._id || !selectedSeller?._id) return;
    try {
      setLoading(true);
      const ids = selectedListings.size > 0 ? [...selectedListings].join(',') : undefined;
      let url = `/template-listings/export-csv/${template._id}?sellerId=${selectedSeller._id}`;
      if (ids) url += `&listingIds=${ids}`;

      const response = await api.get(url, { responseType: 'blob' });
      const contentDisposition = response.headers['content-disposition'];
      let filename = `listings_${Date.now()}.csv`;
      if (contentDisposition) {
        const m = contentDisposition.match(/filename="?(.+)"?/i);
        if (m?.[1]) filename = m[1].replace(/"/g, '');
      }
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSuccess('CSV downloaded successfully!');
      fetchListings(1);
    } catch (e) {
      setError('Failed to download CSV');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  const totalCols = CORE_COLUMNS.length + (template?.customColumns?.length || 0) + 2;

  const stickyFirstSx = {
    position: 'sticky', left: 0, zIndex: 2,
    backgroundColor: theme.palette.background.paper,
    '&:after': { content: '""', position: 'absolute', right: 0, top: 0, bottom: 0, width: 1, backgroundColor: alpha(BRAND_DARK, 0.08) },
  };
  const stickyLastSx = {
    position: 'sticky', right: 0,
    backgroundColor: theme.palette.background.paper,
    '&:before': { content: '""', position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, backgroundColor: alpha(BRAND_DARK, 0.08) },
  };
  const darkButtonSx = {
    minHeight: 36, px: 2, borderRadius: 1.5,
    color: '#fff', backgroundColor: BRAND_DARK, fontWeight: 700,
    '&:hover': { backgroundColor: alpha(BRAND_DARK, 0.82) },
    '&.Mui-disabled': { color: alpha('#fff', 0.35), backgroundColor: alpha(BRAND_DARK, 0.38) },
  };
  const outlinedButtonSx = {
    minHeight: 36, px: 2, borderRadius: 1.5,
    color: BRAND_DARK, borderColor: alpha(BRAND_DARK, 0.3), fontWeight: 600,
    '&:hover': { borderColor: BRAND_YELLOW_DARK, backgroundColor: alpha(BRAND_YELLOW, 0.08) },
    '&.Mui-disabled': { borderColor: alpha(BRAND_DARK, 0.15), color: alpha(BRAND_DARK, 0.3) },
  };
  const inputFocusSx = {
    '& .MuiOutlinedInput-root': {
      '& .MuiOutlinedInput-notchedOutline': { transition: 'border-color 0.2s ease' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(BRAND_DARK, 0.35) },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: BRAND_YELLOW_DARK, borderWidth: 2 },
    },
  };
  const selectFocusSx = {
    '& label.Mui-focused': { color: BRAND_YELLOW_DARK },
    '& .MuiOutlinedInput-root': { '&.Mui-focused fieldset': { borderColor: BRAND_YELLOW_DARK } },
  };

  return (
    <AdminPageShell>
      <PageHeader title="Template Directory" />

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* ── Top filter bar ── */}
      <Paper sx={{
        p: 2, mb: 2,
        borderRadius: `${dt.radius.card}px`,
        border: `1px solid ${alpha(BRAND_DARK, 0.08)}`,
        boxShadow: dt.shadows.card,
      }}>
        <Stack spacing={2}>
          {/* Row 1: Template selector + Seller selector + Search */}
          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
            {/* Template */}
            <FormControl size="small" sx={{ minWidth: 220, ...selectFocusSx }}>
              <InputLabel>Template</InputLabel>
              <Select
                label="Template"
                value={template?._id || ''}
                onChange={e => setTemplate(templates.find(t => t._id === e.target.value) || null)}
              >
                {templates.length === 0 && <MenuItem value="" disabled><em>No templates found</em></MenuItem>}
                {templates.map(t => <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>)}
              </Select>
            </FormControl>

            {/* Seller */}
            <FormControl size="small" sx={{ minWidth: 200, ...selectFocusSx }}>
              <InputLabel>Seller</InputLabel>
              <Select
                label="Seller"
                value={selectedSeller?._id || ''}
                onChange={e => setSelectedSeller(sellers.find(s => s._id === e.target.value) || null)}
                disabled={sellersLoading}
                endAdornment={sellersLoading ? <CircularProgress size={16} sx={{ mr: 2 }} /> : null}
              >
                {sellers.length === 0 && <MenuItem value="" disabled><em>No sellers found</em></MenuItem>}
                {sellers.map(s => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.storeName || s.user?.username || s._id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ flex: 1, minWidth: 200, maxWidth: 380 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search keywords and ASIN"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                sx={inputFocusSx}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: alpha(BRAND_DARK, 0.35) }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Stack>

          {/* Row 2: Price range + Schedule + Action buttons */}
          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>

            {/* ── Price Range pill ── */}
            <Paper variant="outlined" sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0,
              borderColor: alpha(BRAND_DARK, 0.15), borderRadius: 2, overflow: 'hidden',
              backgroundColor: theme.palette.background.paper,
            }}>
              <Box sx={{
                px: 1.5, height: 38, display: 'flex', alignItems: 'center',
                borderRight: `1px solid ${alpha(BRAND_DARK, 0.1)}`,
                backgroundColor: alpha(BRAND_DARK, 0.03),
              }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem', color: alpha(BRAND_DARK, 0.5), whiteSpace: 'nowrap', letterSpacing: 0.3 }}>
                  Price Range
                </Typography>
              </Box>
              <OutlinedInput size="small" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                onBlur={() => fetchListings(1)} onKeyDown={e => e.key === 'Enter' && fetchListings(1)}
                placeholder="Min"
                sx={{
                  width: 78, borderRadius: 0,
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  '&.Mui-focused': { backgroundColor: alpha(BRAND_YELLOW, 0.05) },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  '& input': { textAlign: 'center' },
                }} />
              <Typography variant="body2" sx={{ px: 0.5, color: alpha(BRAND_DARK, 0.25), fontWeight: 600 }}>–</Typography>
              <OutlinedInput size="small" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                onBlur={() => fetchListings(1)} onKeyDown={e => e.key === 'Enter' && fetchListings(1)}
                placeholder="Max"
                sx={{
                  width: 78, borderRadius: 0,
                  borderLeft: `1px solid ${alpha(BRAND_DARK, 0.07)}`,
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  '&.Mui-focused': { backgroundColor: alpha(BRAND_YELLOW, 0.05) },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  '& input': { textAlign: 'center' },
                }} />
            </Paper>

            {/* ── Schedule pill ── */}
            <Paper variant="outlined" sx={{
              display: 'inline-flex', alignItems: 'stretch', gap: 0,
              borderColor: alpha(BRAND_DARK, 0.15), borderRadius: 2, overflow: 'hidden',
              borderLeft: `3px solid ${BRAND_YELLOW_DARK}`,
              backgroundColor: theme.palette.background.paper,
            }}>
              <Box sx={{
                px: 1.5, display: 'flex', alignItems: 'center', gap: 0.5,
                borderRight: `1px solid ${alpha(BRAND_DARK, 0.1)}`,
                backgroundColor: alpha(BRAND_DARK, 0.03),
              }}>
                <CalendarIcon sx={{ fontSize: 13, color: BRAND_YELLOW_DARK }} />
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem', color: alpha(BRAND_DARK, 0.5), letterSpacing: 0.3 }}>
                  Schedule
                </Typography>
              </Box>
              {[
                { label: 'Date', content: (
                  <OutlinedInput size="small" type="date" value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    sx={{ width: 148, borderRadius: 0, '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, '&.Mui-focused': { backgroundColor: alpha(BRAND_YELLOW, 0.05) }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' }, '& input': { fontSize: '0.84rem', py: 0.6 } }} />
                )},
                { label: 'Start (24h)', content: (
                  <OutlinedInput size="small" placeholder="HH:MM" value={scheduleTimeFrom}
                    onChange={e => { const v = e.target.value.replace(/[^0-9:]/g, ''); if (v.length <= 5) setScheduleTimeFrom(v); }}
                    sx={{ width: 96, borderRadius: 0, '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, '&.Mui-focused': { backgroundColor: alpha(BRAND_YELLOW, 0.05) }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' }, '& input': { fontSize: '0.84rem', py: 0.6 } }} />
                )},
                { label: 'Interval (min)', content: (
                  <OutlinedInput size="small" type="number" value={scheduleStep}
                    onChange={e => setScheduleStep(Math.max(1, parseInt(e.target.value) || 1))}
                    inputProps={{ min: 1 }}
                    sx={{ width: 84, borderRadius: 0, '& .MuiOutlinedInput-notchedOutline': { border: 'none' }, '&.Mui-focused': { backgroundColor: alpha(BRAND_YELLOW, 0.05) }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' }, '& input': { fontSize: '0.84rem', py: 0.6 } }} />
                )},
              ].map(({ label, content }) => (
                <Box key={label} sx={{ borderRight: `1px solid ${alpha(BRAND_DARK, 0.08)}`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography variant="caption" sx={{ display: 'block', px: 1.25, pt: 0.5, fontSize: '0.6rem', fontWeight: 700, letterSpacing: 0.4, color: alpha(BRAND_DARK, 0.35), textTransform: 'uppercase', lineHeight: 1.2 }}>
                    {label}
                  </Typography>
                  {content}
                </Box>
              ))}
              {/* Apply — flush inside pill */}
              <Tooltip title={!scheduleReady ? 'Fill date, start time and interval first' : `Apply to all ${pagination.total} listings`}>
                <span style={{ display: 'flex' }}>
                  <Button variant="contained" size="small" startIcon={<ApplyIcon sx={{ fontSize: '1rem !important' }} />}
                    disabled={!scheduleReady || loading}
                    onClick={() => setScheduleConfirmOpen(true)}
                    sx={{
                      height: '100%', borderRadius: 0, fontWeight: 700, px: 2, boxShadow: 'none',
                      color: '#fff', backgroundColor: '#2e7d32',
                      '&:hover': { backgroundColor: '#1b5e20', boxShadow: 'none' },
                      '&.Mui-disabled': { color: alpha('#fff', 0.45), backgroundColor: alpha('#2e7d32', 0.35), boxShadow: 'none' },
                    }}>
                    Apply
                  </Button>
                </span>
              </Tooltip>
            </Paper>

            {schedulePreviewLast && (
              <Typography variant="caption" sx={{ fontSize: '0.72rem', color: alpha(BRAND_DARK, 0.4), whiteSpace: 'nowrap' }}>
                Last: {schedulePreviewLast}
              </Typography>
            )}

            <Box sx={{ flex: 1 }} />

            {/* ── Action buttons ── */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Button variant="contained" startIcon={<SettingsIcon />} disabled={!template}
                onClick={() => setCustomizationDialog(true)} sx={darkButtonSx}>
                Customize
              </Button>
              <Button variant="contained" disabled={!template || !selectedSeller || selectedListings.size === 0}
                onClick={() => setListDirectlyDialog(true)} sx={darkButtonSx}>
                List Directly
              </Button>
              <Button variant="outlined" startIcon={<ProofReadIcon />}
                disabled={!template || selectedListings.size === 0}
                onClick={handleProofRead} sx={outlinedButtonSx}>
                Proof Read
              </Button>
              <Button variant="contained" startIcon={<DownloadIcon />}
                disabled={!template || !selectedSeller || loading}
                onClick={handleDownloadCsv} sx={yellowFilledButtonSx}>
                Download CSV
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      {/* ── Listings panel ── */}
      <Paper sx={{
        borderRadius: `${dt.radius.card}px`,
        border: `1px solid ${alpha(BRAND_DARK, 0.1)}`,
        boxShadow: dt.shadows.table,
        overflow: 'hidden',
      }}>
        {/* Panel header bar */}
        <Box sx={{
          px: 2.5, py: 1.25,
          backgroundColor: BRAND_DARK,
          borderBottom: `2px solid ${BRAND_YELLOW}`,
          display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.4, color: alpha('#fff', 0.95), flex: 1 }}>
            {template ? `${template.name} — Listings` : 'Select a template to load listings'}
          </Typography>

          {sellersLoading && <CircularProgress size={14} sx={{ color: alpha('#fff', 0.6) }} />}
          {!sellersLoading && sellers.length === 0 && (
            <Chip label="No sellers found" size="small"
              sx={{ backgroundColor: 'rgba(220,38,38,0.2)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.3)', fontWeight: 600 }} />
          )}
          {selectedSeller && (
            <Chip
              label={`Seller: ${selectedSeller.storeName || selectedSeller.user?.username}`}
              size="small"
              sx={{ backgroundColor: alpha('#fff', 0.1), color: alpha('#fff', 0.8), border: `1px solid ${alpha('#fff', 0.2)}`, fontWeight: 600 }}
            />
          )}
          {template && selectedListings.size > 0 && (
            <Chip
              label={`${selectedListings.size} selected`}
              size="small"
              onDelete={() => setSelectedListings(new Set())}
              sx={{
                backgroundColor: BRAND_YELLOW, color: BRAND_DARK, fontWeight: 700,
                border: `1px solid ${BRAND_YELLOW_DARK}`,
                '& .MuiChip-deleteIcon': { color: BRAND_DARK, '&:hover': { color: alpha(BRAND_DARK, 0.7) } },
              }}
            />
          )}
        </Box>

        {/* Table */}
        {loading ? (
          <Box sx={{ py: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={28} sx={{ color: BRAND_YELLOW_DARK }} />
            <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.4), fontWeight: 500 }}>
              Loading listings…
            </Typography>
          </Box>
        ) : !template ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.4) }}>
              Select a template above to load listings.
            </Typography>
          </Box>
        ) : !selectedSeller ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.4) }}>
              No seller accounts found. Use "List Directly" from Listing Directory first.
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={{
                    ...tableHeaderCellSx,
                    ...stickyFirstSx,
                    backgroundColor: BRAND_DARK,
                    zIndex: 4,
                    minWidth: 48,
                  }}>
                    <Checkbox
                      size="small"
                      indeterminate={selectedListings.size > 0 && selectedListings.size < listings.length}
                      checked={listings.length > 0 && selectedListings.size === listings.length}
                      onChange={handleToggleAll}
                      sx={{
                        color: alpha('#fff', 0.6),
                        '&.Mui-checked': { color: BRAND_YELLOW },
                        '&.MuiCheckbox-indeterminate': { color: BRAND_YELLOW },
                      }}
                    />
                  </TableCell>
                  {CORE_COLUMNS.map(col => (
                    <TableCell key={col.key} sx={{ ...tableHeaderCellSx, minWidth: col.width }}>
                      {col.label}
                    </TableCell>
                  ))}
                  {template.customColumns?.map(col => (
                    <TableCell key={col.name} sx={{ ...tableHeaderCellSx, minWidth: 150 }}>
                      C:{col.displayName}
                    </TableCell>
                  ))}
                  <TableCell sx={{ ...tableHeaderCellSx, ...stickyLastSx, zIndex: 3, backgroundColor: BRAND_DARK }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {listings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={totalCols} align="center" sx={{ py: 5, color: alpha(BRAND_DARK, 0.4), backgroundColor: alpha(BRAND_DARK, 0.02) }}>
                      No listings found for this seller. Use "List Directly" from Listing Directory first.
                    </TableCell>
                  </TableRow>
                ) : (
                  listings.map(listing => (
                    <TableRow
                      key={listing._id}
                      hover
                      selected={selectedListings.has(listing._id)}
                      sx={tableBodyRowSx}
                    >
                      <TableCell padding="checkbox" sx={{ ...stickyFirstSx }}>
                        <Checkbox
                          size="small"
                          checked={selectedListings.has(listing._id)}
                          onChange={() => handleToggleSelect(listing._id)}
                          sx={{ '&.Mui-checked': { color: BRAND_YELLOW_DARK } }}
                        />
                      </TableCell>
                      {CORE_COLUMNS.map(col => (
                        <TableCell key={col.key} sx={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: BRAND_DARK }}>
                          {renderCellValue(col, listing)}
                        </TableCell>
                      ))}
                      {template.customColumns?.map(col => (
                        <TableCell key={col.name} sx={{ fontSize: '0.82rem', color: BRAND_DARK }}>
                          {listing.customFields?.[col.name] || '-'}
                        </TableCell>
                      ))}
                      <TableCell sx={{ ...stickyLastSx }} />
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {pagination.pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, borderTop: `1px solid ${alpha(BRAND_DARK, 0.07)}` }}>
            <Pagination
              count={pagination.pages}
              page={pagination.page}
              onChange={(_, page) => { setPagination(p => ({ ...p, page })); fetchListings(page); }}
              sx={{
                '& .MuiPaginationItem-root.Mui-selected': {
                  backgroundColor: BRAND_YELLOW, color: BRAND_DARK, fontWeight: 700,
                  '&:hover': { backgroundColor: BRAND_YELLOW_DARK },
                },
              }}
            />
          </Box>
        )}
      </Paper>

      {/* ── Dialogs ── */}
      <TemplateCustomizationDialog
        open={customizationDialog}
        onClose={() => setCustomizationDialog(false)}
        templateId={template?._id}
        sellerId={selectedSeller?._id}
        templateName={template?.name}
        readOnly
      />

      <ListDirectlyDialog
        open={listDirectlyDialog}
        onClose={() => { setListDirectlyDialog(false); setPendingInlineListings(null); }}
        selectedListings={selectedListings}
        templateId={template?._id}
        sellerId={selectedSeller?._id}
        inlineListings={pendingInlineListings}
      />

      <AsinReviewModal
        open={reviewModal}
        templateName={template?.name}
        onClose={() => { setReviewModal(false); setPreviewItems([]); }}
        previewItems={previewItems}
        onSave={handleSaveFromReview}
        onListDirectly={handleListDirectlyFromReview}
        templateColumns={[
          { name: 'title', label: 'Title', type: 'core' },
          { name: 'description', label: 'Description', type: 'core' },
          { name: 'startPrice', label: 'Start Price', type: 'core' },
          { name: 'quantity', label: 'Quantity', type: 'core' },
          ...(template?.customColumns?.map(col => ({ ...col, type: 'custom' })) || []),
        ]}
      />

      {/* Schedule confirmation dialog */}
      <MuiDialog open={scheduleConfirmOpen} onClose={() => setScheduleConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1, borderBottom: `2px solid ${BRAND_YELLOW}`, backgroundColor: BRAND_DARK }}>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>Apply Schedule Times</Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography variant="body2" gutterBottom>
            Schedule times will be assigned to <strong>{pagination.total} listings</strong> in <strong>{template?.name}</strong>:
          </Typography>
          <Typography variant="body2" gutterBottom>• Starting: <strong>{scheduleDate} {scheduleTimeFrom}:00</strong></Typography>
          <Typography variant="body2" gutterBottom>• Interval: <strong>{scheduleStep} minute{scheduleStep !== 1 ? 's' : ''}</strong> between each listing</Typography>
          {schedulePreviewLast && (
            <Typography variant="body2" gutterBottom>• Last listing: <strong>{schedulePreviewLast}</strong></Typography>
          )}
          <Typography variant="body2" sx={{ mt: 1.5, color: '#b45309', fontWeight: 500, backgroundColor: 'rgba(251,191,36,0.12)', p: 1, borderRadius: 1.5, border: '1px solid rgba(251,191,36,0.3)' }}>
            ⚠ Existing Schedule Time values will be overwritten.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setScheduleConfirmOpen(false)} sx={{ color: alpha(BRAND_DARK, 0.6) }}>Cancel</Button>
          <Button variant="contained" onClick={handleApplySchedule}
            sx={{ borderRadius: 1.5, fontWeight: 700, color: '#fff', backgroundColor: '#2e7d32', '&:hover': { backgroundColor: '#1b5e20' } }}>
            Confirm
          </Button>
        </DialogActions>
      </MuiDialog>
    </AdminPageShell>
  );
}
