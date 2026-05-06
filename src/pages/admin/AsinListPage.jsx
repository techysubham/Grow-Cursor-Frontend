import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Alert,
  Checkbox,
  TextField,
  InputAdornment,
  TablePagination,
  Toolbar,
  Tooltip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Chip,
  Autocomplete
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Search as SearchIcon,
  BrokenImage as BrokenImageIcon,
  AddCircle as AddCircleIcon,
  ListAlt as ListAltIcon
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { alpha, ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import api, { getAuthToken } from '../../lib/api.js';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';
import { tableHeaderCellSx, tableBodyRowSx, yellowFilledButtonSx } from '../../theme/tableStyles.js';
import AsinReviewModal from '../../components/AsinReviewModal.jsx';
import { useNavigate } from 'react-router-dom';
import AsinListCreateDialog from '../../components/AsinListCreateDialog.jsx';

export default function AsinListPage() {
  const navigate = useNavigate();
  const theme = useTheme();

  // ── Style tokens ──────────────────────────────────────────────────────────
  const inputFocusSx = {
    '& label.Mui-focused': { color: BRAND_YELLOW_DARK },
    '& .MuiOutlinedInput-root': {
      borderRadius: 1.5,
      '& .MuiOutlinedInput-notchedOutline': { transition: 'border-color 0.2s ease' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(BRAND_DARK, 0.35) },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: BRAND_YELLOW_DARK, borderWidth: 2 },
    },
    '& input': { accentColor: BRAND_YELLOW_DARK }
  };
  const selectFocusSx = {
    '& label.Mui-focused': { color: BRAND_YELLOW_DARK },
    '& .MuiOutlinedInput-root': { 
      borderRadius: 1.5,
      '&.Mui-focused fieldset': { borderColor: BRAND_YELLOW_DARK } 
    },
  };
  const datePickerTheme = useMemo(() => createTheme(theme, {
      palette: {
          primary: { main: BRAND_YELLOW_DARK }
      }
  }), [theme]);

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

  // ── Taxonomy dropdowns ──────────────────────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [ranges, setRanges] = useState([]);
  const [products, setProducts] = useState([]);

  const [categoryId, setCategoryId] = useState('');
  const [rangeId, setRangeId] = useState('');
  const [productId, setProductId] = useState('');

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingRanges, setLoadingRanges] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // ── Table data ──────────────────────────────────────────────────────────────
  const [asins, setAsins] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading] = useState(false);

  // ── Selection ───────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState([]);

  // ── Filters ──────────────────────────────────────────────────────
  const [keyword, setKeyword] = useState('');
  const [searchActive, setSearchActive] = useState('');  // committed on button press

  // placeholder — no logic wired yet
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [priceMinActive, setPriceMinActive] = useState('');
  const [priceMaxActive, setPriceMaxActive] = useState('');
  const [ordersComparator, setOrdersComparator] = useState('more than');
  const [ordersValue, setOrdersValue] = useState('');

  // Moved-to-list date filter
  const [movedAfter, setMovedAfter] = useState('');
  const [movedBefore, setMovedBefore] = useState('');

  // ── Feedback ────────────────────────────────────────────────────────────────
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Create Listing flow ──────────────────────────────────────────────────────
  const [createDialog, setCreateDialog] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [previewItems, setPreviewItems] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [activeSellerId, setActiveSellerId] = useState('');

  // ── Taxonomy fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    setRanges([]);
    setRangeId('');
    setProducts([]);
    setProductId('');
    if (categoryId) fetchRanges(categoryId);
  }, [categoryId]);

  useEffect(() => {
    setProducts([]);
    setProductId('');
    if (rangeId) fetchProducts(rangeId);
  }, [rangeId]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const { data } = await api.get('/asin-list-categories');
      setCategories(data);
    } catch {
      // silent
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchRanges = async (catId) => {
    try {
      setLoadingRanges(true);
      const { data } = await api.get('/asin-list-ranges', { params: { categoryId: catId } });
      setRanges(data);
    } catch {
      // silent
    } finally {
      setLoadingRanges(false);
    }
  };

  const fetchProducts = async (rngId) => {
    try {
      setLoadingProducts(true);
      const { data } = await api.get('/asin-list-products', { params: { rangeId: rngId } });
      setProducts(data);
    } catch {
      // silent
    } finally {
      setLoadingProducts(false);
    }
  };

  // ── Table fetch ─────────────────────────────────────────────────────────────
  const fetchAsins = useCallback(async () => {
    if (!rangeId) return;
    try {
      setLoading(true);
      const { data } = await api.get('/asin-directory', {
        params: {
          listProductId: productId || undefined,
          rangeId: !productId && rangeId ? rangeId : undefined,
          page: page + 1,
          limit: rowsPerPage,
          search: searchActive || undefined,
          priceMin: priceMinActive || undefined,
          priceMax: priceMaxActive || undefined,
          movedAfter: movedAfter || undefined,
          movedBefore: movedBefore || undefined,
        }
      });
      setAsins(data.asins || []);
      setTotal(data.total || 0);
      setSelected([]);
    } catch {
      setError('Failed to load ASINs');
    } finally {
      setLoading(false);
    }
  }, [productId, rangeId, page, rowsPerPage, searchActive, priceMinActive, priceMaxActive, movedAfter, movedBefore]);

  useEffect(() => {
    if (rangeId) {
      fetchAsins();
    } else {
      setAsins([]);
      setTotal(0);
      setSelected([]);
    }
  }, [fetchAsins, rangeId]);

  // ── Selection helpers ───────────────────────────────────────────────────────
  const isAllSelected = asins.length > 0 && selected.length === asins.length;
  const isIndeterminate = selected.length > 0 && selected.length < asins.length;

  const handleSelectAll = (e) => {
    setSelected(e.target.checked ? asins.map(a => a._id) : []);
  };

  const handleSelectRow = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await api.delete(`/asin-directory/${id}`);
      setSuccess('ASIN removed');
      fetchAsins();
    } catch {
      setError('Failed to delete ASIN');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await api.post('/asin-directory/bulk-delete', { ids: selected });
      setSuccess(`${selected.length} ASINs deleted`);
      fetchAsins();
    } catch {
      setError('Failed to delete selected ASINs');
    }
  };

  // ── Pagination ───────────────────────────────────────────────────────────────
  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  // ── Search (button-triggered) ────────────────────────────────────────────────
  const handleSearchSubmit = (e) => {
    if (e.key && e.key !== 'Enter') return;
    setPage(0);
    setSearchActive(keyword);
  };
  // ── Price filter (apply on Enter or blur) ───────────────────────────────
  const commitPriceFilter = (e) => {
    if (e.key && e.key !== 'Enter') return;
    setPage(0);
    setPriceMinActive(priceMin);
    setPriceMaxActive(priceMax);
  };
  // ── Create Listing handlers ──────────────────────────────────────────────────
  const handleCreateConfirmed = ({ sellerId, templateId, template }) => {
    setActiveSellerId(sellerId);
    setActiveTemplate(template);
    setCreateDialog(false);

    // Build loading placeholders so the modal opens immediately
    const selectedAsins = asins.filter(a => selected.includes(a._id));
    const placeholders = selectedAsins.map(a => ({
      id: `preview-${a.asin}`,
      asin: a.asin,
      sku: '',
      status: 'loading',
      progressStage: null,
      generatedListing: null,
      warnings: [],
      errors: []
    }));
    setPreviewItems(placeholders);
    setReviewModal(true);

    // Connect SSE stream
    const asinParam = selectedAsins.map(a => a.asin).join(',');
    const authToken = getAuthToken();
    const sseUrl =
      `/template-listings/bulk-preview-from-directory-stream` +
      `?templateId=${templateId}&sellerId=${sellerId}` +
      `&asins=${encodeURIComponent(asinParam)}&token=${encodeURIComponent(authToken)}`;

    const eventSource = new EventSource(api.defaults.baseURL + sseUrl);
    window._directoryEventSource = eventSource;

    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        eventSource.close();
        window._directoryEventSource = null;
        return;
      }
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'progress') {
          setPreviewItems(prev =>
            prev.map(p => p.id === payload.id ? { ...p, progressStage: payload.stage } : p)
          );
        } else if (payload.type === 'item') {
          setPreviewItems(prev =>
            prev.map(p => p.id === payload.item.id ? payload.item : p)
          );
        }
      } catch { /* ignore parse errors */ }
    };

    eventSource.onerror = () => {
      eventSource.close();
      window._directoryEventSource = null;
    };
  };

  const handleSaveFromReview = async (listings) => {
    try {
      const { data } = await api.post('/template-listings/bulk-save', {
        templateId: activeTemplate._id,
        sellerId: activeSellerId,
        listings,
        options: { skipDuplicates: true }
      });
      setReviewModal(false);
      setPreviewItems([]);
      setSelected([]);
      navigate(`/admin/template-listings?templateId=${activeTemplate._id}&sellerId=${activeSellerId}&fromAsinList=true`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save listings');
    }
  };

  // ── Image helper ─────────────────────────────────────────────────────────────
  const [imgErrors, setImgErrors] = useState({});
  const handleImgError = (id) => setImgErrors(prev => ({ ...prev, [id]: true }));

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>

      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', p: 1, borderRadius: 2, backgroundColor: alpha(BRAND_YELLOW, 0.2) }}>
          <ListAltIcon sx={{ color: BRAND_YELLOW_DARK, fontSize: 28 }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND_DARK, letterSpacing: -0.5 }}>
          ASIN Lists
        </Typography>
      </Stack>

      {/* Feedback */}
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* ── Filter bar ────────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${alpha(BRAND_DARK, 0.12)}`, borderRadius: 3 }}>
        <Stack spacing={2.5}>

          {/* Row 1: Dropdowns + Keyword + Create Listing */}
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">

            {/* Category */}
            <FormControl size="small" sx={{ minWidth: 150, ...selectFocusSx }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryId}
                label="Category"
                onChange={e => { setCategoryId(e.target.value); setPage(0); }}
                disabled={loadingCategories}
                endAdornment={loadingCategories ? <CircularProgress size={14} sx={{ mr: 2 }} /> : null}
              >
                <MenuItem value=""><em>All</em></MenuItem>
                {categories.map(c => (
                  <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Range */}
            <Autocomplete
              size="small"
              sx={{ minWidth: 200, ...inputFocusSx }}
              disabled={!categoryId || loadingRanges}
              options={[{ _id: '', name: 'All' }, ...ranges]}
              getOptionLabel={opt => opt.name}
              value={ranges.find(r => r._id === rangeId) || { _id: '', name: 'All' }}
              onChange={(_, newVal) => { setRangeId(newVal?._id || ''); setPage(0); }}
              isOptionEqualToValue={(opt, val) => opt._id === val._id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Range"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: loadingRanges
                      ? <CircularProgress size={14} />
                      : params.InputProps.endAdornment
                  }}
                />
              )}
            />

            {/* Product */}
            <FormControl size="small" sx={{ minWidth: 150, ...selectFocusSx }} disabled={!rangeId}>
              <InputLabel>Product</InputLabel>
              <Select
                value={productId}
                label="Product"
                onChange={e => { setProductId(e.target.value); setPage(0); }}
                disabled={!rangeId || loadingProducts}
                endAdornment={loadingProducts ? <CircularProgress size={14} sx={{ mr: 2 }} /> : null}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {products.map(p => (
                  <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ flex: 1 }} />

            {/* Keyword search */}
            <TextField
              size="small"
              placeholder="Keyword"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={handleSearchSubmit}
              sx={{ minWidth: 200, ...inputFocusSx }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleSearchSubmit}>
                      <SearchIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            {/* Create Listing */}
            <Button
              variant="contained"
              startIcon={<AddCircleIcon />}
              disabled={selected.length === 0 || !rangeId}
              onClick={() => setCreateDialog(true)}
              sx={{ whiteSpace: 'nowrap', ...yellowFilledButtonSx }}
            >
              Create Listing ({selected.length})
            </Button>
          </Stack>

          <Divider />

          {/* Row 2: Price Range + Orders Received + Moved to List date filter */}
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Price Range
            </Typography>
            <TextField
              size="small"
              label="Min"
              value={priceMin}
              onChange={e => setPriceMin(e.target.value)}
              onKeyDown={commitPriceFilter}
              onBlur={commitPriceFilter}
              sx={{ width: 90, ...inputFocusSx }}
              type="number"
            />
            <Typography variant="body2">–</Typography>
            <TextField
              size="small"
              label="Max"
              value={priceMax}
              onChange={e => setPriceMax(e.target.value)}
              onKeyDown={commitPriceFilter}
              onBlur={commitPriceFilter}
              sx={{ width: 90, ...inputFocusSx }}
              type="number"
            />

            <Box sx={{ width: 24 }} />

            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Orders Received
            </Typography>
            <FormControl size="small" sx={{ minWidth: 130, ...selectFocusSx }}>
              <Select
                value={ordersComparator}
                onChange={e => setOrdersComparator(e.target.value)}
              >
                <MenuItem value="more than">more than</MenuItem>
                <MenuItem value="less than">less than</MenuItem>
                <MenuItem value="equal to">equal to</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              value={ordersValue}
              onChange={e => setOrdersValue(e.target.value)}
              sx={{ width: 80, ...inputFocusSx }}
              type="number"
              placeholder="0"
            />

            <Box sx={{ width: 24 }} />

            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Moved to List
            </Typography>
            <ThemeProvider theme={datePickerTheme}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="From"
                  value={movedAfter ? new Date(movedAfter) : null}
                  onChange={date => {
                    setMovedAfter(date ? date.toISOString() : '');
                    setPage(0);
                  }}
                  slotProps={{ textField: { size: 'small', sx: { width: 165, ...inputFocusSx } } }}
                />
                <Typography variant="body2">–</Typography>
                <DatePicker
                  label="To"
                  value={movedBefore ? new Date(movedBefore) : null}
                  onChange={date => {
                    setMovedBefore(date ? date.toISOString() : '');
                    setPage(0);
                  }}
                  slotProps={{ textField: { size: 'small', sx: { width: 165, ...inputFocusSx } } }}
                />
              </LocalizationProvider>
            </ThemeProvider>
            {(movedAfter || movedBefore) && (
              <Button
                size="small"
                onClick={() => { setMovedAfter(''); setMovedBefore(''); setPage(0); }}
                sx={outlinedButtonSx}
              >
                Clear
              </Button>
            )}
          </Stack>

        </Stack>
      </Paper>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ border: `1px solid ${alpha(BRAND_DARK, 0.12)}`, borderRadius: 3, overflow: 'hidden' }}>
        {!rangeId ? (
          <Box sx={{ py: 8, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ListAltIcon sx={{ fontSize: 48, color: alpha(BRAND_DARK, 0.12), mb: 1 }} />
            <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.4) }}>
              Select a Category and Range to view ASINs
            </Typography>
          </Box>
        ) : (
          <TableContainer
            sx={{
              maxHeight: 'calc(100vh - 400px)',
              overflow: 'auto',
              '&::-webkit-scrollbar': { width: '8px', height: '8px' },
              '&::-webkit-scrollbar-track': { backgroundColor: alpha(BRAND_DARK, 0.04), borderRadius: '10px' },
              '&::-webkit-scrollbar-thumb': { backgroundColor: alpha(BRAND_DARK, 0.2), borderRadius: '10px', '&:hover': { backgroundColor: alpha(BRAND_DARK, 0.4) } }
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead sx={{ backgroundColor: BRAND_DARK }}>
                <TableRow>
                  <TableCell padding="checkbox" sx={{ ...tableHeaderCellSx, backgroundColor: BRAND_DARK }}>
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onChange={handleSelectAll}
                      size="small"
                      sx={{ color: alpha('#fff', 0.6), '&.Mui-checked': { color: BRAND_YELLOW }, '&.MuiCheckbox-indeterminate': { color: BRAND_YELLOW } }}
                    />
                  </TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, backgroundColor: BRAND_DARK, width: 64 }}>Image</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, backgroundColor: BRAND_DARK }}>Title</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, backgroundColor: BRAND_DARK, width: 90 }}>Price</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, backgroundColor: BRAND_DARK, width: 130 }}>ASIN</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, backgroundColor: BRAND_DARK, width: 70 }} align="center">Count</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, backgroundColor: BRAND_DARK, width: 80 }} align="center">Orders</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, backgroundColor: BRAND_DARK, width: 60 }} align="right">Delete</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <Stack direction="row" spacing={1.5} justifyContent="center" alignItems="center">
                        <CircularProgress size={24} sx={{ color: BRAND_YELLOW_DARK }} />
                        <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.5), fontWeight: 500 }}>Loading ASINs...</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : asins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                      <ListAltIcon sx={{ fontSize: 48, color: alpha(BRAND_DARK, 0.12), mb: 1 }} />
                      <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.4) }}>
                        No ASINs assigned to this product
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  asins.map((asin, idx) => {
                    const isSelected = selected.includes(asin._id);
                    const imgSrc = asin.images?.[0];
                    const imgBroken = imgErrors[asin._id];
                    return (
                      <TableRow
                        key={asin._id}
                        hover
                        selected={isSelected}
                        sx={{ ...tableBodyRowSx, cursor: 'pointer' }}
                        onClick={() => handleSelectRow(asin._id)}
                      >
                        <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelectRow(asin._id)}
                            size="small"
                            sx={{ '&.Mui-checked': { color: BRAND_YELLOW_DARK } }}
                          />
                        </TableCell>

                        {/* Image */}
                        <TableCell>
                          {imgSrc && !imgBroken ? (
                            <Box
                              component="img"
                              src={imgSrc}
                              alt={asin.asin}
                              onError={() => handleImgError(asin._id)}
                              sx={{
                                width: 48,
                                height: 48,
                                objectFit: 'contain',
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider'
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'grey.100',
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider'
                              }}
                            >
                              <BrokenImageIcon sx={{ color: 'grey.400', fontSize: 24 }} />
                            </Box>
                          )}
                        </TableCell>

                        {/* Title */}
                        <TableCell>
                          <Tooltip title={asin.title || ''} placement="top">
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 300,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block'
                              }}
                            >
                              {asin.title || '—'}
                            </Typography>
                          </Tooltip>
                          {asin.brand && (
                            <Typography variant="caption" color="text.secondary">
                              {asin.brand}
                            </Typography>
                          )}
                        </TableCell>

                        {/* Price */}
                        <TableCell>
                          <Typography variant="body2">
                            {asin.price ? `$${asin.price}` : '—'}
                          </Typography>
                        </TableCell>

                        {/* ASIN */}
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: 'monospace', fontWeight: 500 }}
                          >
                            {asin.asin}
                          </Typography>
                        </TableCell>

                        {/* Count — total times this ASIN has been listed */}
                        <TableCell align="center">
                          <Chip
                            label={asin.listingCount || 0}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              ...(asin.listingCount > 0 
                                ? { backgroundColor: alpha(BRAND_YELLOW, 0.2), color: BRAND_YELLOW_DARK, border: `1px solid ${alpha(BRAND_YELLOW_DARK, 0.3)}` }
                                : { backgroundColor: alpha(BRAND_DARK, 0.05), color: alpha(BRAND_DARK, 0.4), border: `1px solid ${alpha(BRAND_DARK, 0.1)}` }
                              )
                            }}
                          />
                        </TableCell>

                        {/* Orders — placeholder */}
                        <TableCell align="center">
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        </TableCell>

                        {/* Delete */}
                        <TableCell align="right" onClick={e => e.stopPropagation()}>
                          <Tooltip title="Remove from list">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(asin._id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Bulk action bar */}
        {selected.length > 0 && (
          <Toolbar sx={{ backgroundColor: alpha(BRAND_YELLOW, 0.15), borderTop: `1px solid ${alpha(BRAND_YELLOW_DARK, 0.2)}` }}>
            <Typography variant="subtitle2" sx={{ flex: 1, color: BRAND_DARK, fontWeight: 700 }}>
              {selected.length} items selected
            </Typography>
            <Button
              startIcon={<DeleteIcon />}
              onClick={handleBulkDelete}
              sx={darkButtonSx}
            >
              Delete Selected
            </Button>
          </Toolbar>
        )}

        {/* Pagination */}
        {rangeId && (
          <Box sx={{ borderTop: `1px solid ${alpha(BRAND_DARK, 0.08)}`, backgroundColor: alpha(BRAND_DARK, 0.02) }}>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[25, 50, 100]}
              sx={{ 
                '& .MuiTablePagination-select': { ...selectFocusSx },
                '& .MuiTablePagination-menuItem': { fontSize: '0.875rem' }
              }}
            />
          </Box>
        )}
      </Paper>

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      <AsinListCreateDialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        asinCount={selected.length}
        onConfirm={handleCreateConfirmed}
      />

      <AsinReviewModal
        open={reviewModal}
        onClose={() => {
          if (window._directoryEventSource) {
            window._directoryEventSource.close();
            window._directoryEventSource = null;
          }
          setReviewModal(false);
          setPreviewItems([]);
        }}
        previewItems={previewItems}
        onSave={handleSaveFromReview}
        templateColumns={[
          ...(activeTemplate?.customColumns?.map(c => ({ ...c, type: 'custom' })) || []),
          { name: 'title', label: 'Title', type: 'core' },
          { name: 'description', label: 'Description', type: 'core' },
          { name: 'startPrice', label: 'Start Price', type: 'core' },
          { name: 'quantity', label: 'Quantity', type: 'core' }
        ]}
      />
    </Box>
  );
}
