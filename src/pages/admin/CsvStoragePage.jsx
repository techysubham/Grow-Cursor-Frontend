import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Stack,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    CircularProgress,
    Alert,
    Checkbox,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Pagination,
    IconButton,
    Tooltip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { alpha, ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import api from '../../lib/api';
import ScheduleUploadDialog from '../../components/ScheduleUploadDialog';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';
import { tableHeaderCellSx, tableBodyRowSx } from '../../theme/tableStyles.js';

const statusColor = (status) => {
    switch (status) {
        case 'COMPLETED': return 'success';
        case 'COMPLETED_WITH_ERROR': return 'warning';
        case 'FAILURE': return 'error';
        default: return 'default';
    }
};

export default function CsvStoragePage() {
    const navigate = useNavigate();
    const theme = useTheme();

    // ── Style tokens ──────────────────────────────────────────────────────────
    const inputFocusSx = {
        '& label.Mui-focused': { color: `${BRAND_YELLOW} !important` },
        '& .MuiOutlinedInput-root': {
            borderRadius: 1.5,
            '& fieldset': { transition: 'border-color 0.2s ease' },
            '&:hover fieldset': { borderColor: `${alpha(BRAND_DARK, 0.35)} !important` },
            '&.Mui-focused fieldset': { borderColor: `${BRAND_YELLOW} !important`, borderWidth: '2px !important' },
        },
        '& input': { accentColor: BRAND_YELLOW }
    };
    const selectFocusSx = {
        '& .MuiOutlinedInput-root': {
            borderRadius: 1.5,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: `${BRAND_YELLOW} !important`, borderWidth: '2px !important' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: `${alpha(BRAND_DARK, 0.35)} !important` },
        },
        '& label.Mui-focused': { color: `${BRAND_YELLOW} !important` },
    };

    const menuProps = {
        PaperProps: {
            sx: {
                '& .MuiMenuItem-root.Mui-selected': {
                    backgroundColor: alpha(BRAND_YELLOW, 0.2),
                    '&:hover': { backgroundColor: alpha(BRAND_YELLOW, 0.3) }
                }
            }
        }
    };

    const datePickerTheme = useMemo(() => createTheme({
        palette: {
            primary: { 
                main: BRAND_YELLOW,
                light: BRAND_YELLOW,
                dark: BRAND_YELLOW,
                contrastText: BRAND_DARK
            },
        },
        components: {
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        borderRadius: 12, // 1.5 * 8
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: BRAND_YELLOW,
                        }
                    }
                }
            }
        }
    }), []);

    const darkButtonSx = {
        minHeight: 36, px: 2, borderRadius: 1.5,
        color: '#fff', backgroundColor: BRAND_DARK, fontWeight: 700,
        '&:hover': { backgroundColor: alpha(BRAND_DARK, 0.82) },
        '&.Mui-disabled': { color: alpha('#fff', 0.35), backgroundColor: alpha(BRAND_DARK, 0.38) },
    };
    const outlinedButtonSx = {
        minHeight: 36, px: 2, borderRadius: 1.5,
        color: BRAND_DARK, borderColor: alpha(BRAND_DARK, 0.3), fontWeight: 600,
        '&:hover': { borderColor: BRAND_YELLOW, backgroundColor: alpha(BRAND_YELLOW, 0.08) },
        '&.Mui-disabled': { borderColor: alpha(BRAND_DARK, 0.15), color: alpha(BRAND_DARK, 0.3) },
    };

    // Filters
    const [sellers, setSellers] = useState([]);
    const [selectedSeller, setSelectedSeller] = useState('');
    const [keyword, setKeyword] = useState('');
    const [dateFrom, setDateFrom] = useState(null);
    const [dateTo, setDateTo] = useState(null);

    // CRP cascade filters
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [ranges, setRanges] = useState([]);
    const [selectedRange, setSelectedRange] = useState('');
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');

    const [loadingCategories, setLoadingCategories] = useState(false);
    const [loadingRanges, setLoadingRanges] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // Table data
    const [records, setRecords] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Selection
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Pagination
    const [page, setPage] = useState(1);
    const rowsPerPage = 10;

    // Action states
    const [downloadingId, setDownloadingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [uploadingId, setUploadingId] = useState(null);
    const [scheduleDialog, setScheduleDialog] = useState({ open: false, record: null });

    // ── Initial data loads ──────────────────────────────────────────
    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const [sellersRes, categoriesRes] = await Promise.all([
                    api.get('/sellers/all'),
                    api.get('/asin-list-categories'),
                ]);
                setSellers(sellersRes.data);
                setCategories(categoriesRes.data);
            } catch {
                setError('Failed to load initial data.');
            }
        };
        fetchInitial();
    }, []);

    // ── CRP cascade ─────────────────────────────────────────────────
    useEffect(() => {
        setRanges([]);
        setSelectedRange('');
        setProducts([]);
        setSelectedProduct('');
        if (!selectedCategory) return;

        setLoadingRanges(true);
        api.get('/asin-list-ranges', { params: { categoryId: selectedCategory } })
            .then(({ data }) => setRanges(data))
            .catch(() => {})
            .finally(() => setLoadingRanges(false));
    }, [selectedCategory]);

    useEffect(() => {
        setProducts([]);
        setSelectedProduct('');
        if (!selectedRange) return;

        setLoadingProducts(true);
        api.get('/asin-list-products', { params: { rangeId: selectedRange } })
            .then(({ data }) => setProducts(data))
            .catch(() => {})
            .finally(() => setLoadingProducts(false));
    }, [selectedRange]);

    // ── Fetch records ────────────────────────────────────────────────
    const fetchRecords = useCallback(async (pg = page) => {
        setLoading(true);
        setError('');
        try {
            const params = {
                limit: rowsPerPage,
                offset: (pg - 1) * rowsPerPage,
            };
            if (selectedSeller) params.sellerId = selectedSeller;
            if (keyword.trim()) params.keyword = keyword.trim();
            if (dateFrom) params.dateFrom = dateFrom.toISOString();
            if (dateTo) params.dateTo = dateTo.toISOString();
            if (selectedCategory) params.categoryId = selectedCategory;
            if (selectedRange) params.rangeId = selectedRange;
            if (selectedProduct) params.productId = selectedProduct;

            const { data } = await api.get('/csv-storage', { params });
            setRecords(data.records || []);
            setTotal(data.total || 0);
        } catch {
            setError('Failed to fetch CSV records.');
        } finally {
            setLoading(false);
        }
    }, [page, selectedSeller, keyword, dateFrom, dateTo, selectedCategory, selectedRange, selectedProduct]);

    // Fetch on page change or filter deps
    useEffect(() => {
        setSelectedIds(new Set());
        fetchRecords(page);
    }, [page]);

    const handleSearch = () => {
        setPage(1);
        setSelectedIds(new Set());
        fetchRecords(1);
    };

    const handleClearFilters = () => {
        setSelectedSeller('');
        setKeyword('');
        setDateFrom(null);
        setDateTo(null);
        setSelectedCategory('');
        setSelectedRange('');
        setSelectedProduct('');
        setPage(1);
        setSelectedIds(new Set());
    };

    // ── Selection ────────────────────────────────────────────────────
    const isAllSelected = records.length > 0 && records.every(r => selectedIds.has(r._id));
    const isIndeterminate = records.some(r => selectedIds.has(r._id)) && !isAllSelected;

    const handleToggleAll = () => {
        if (isAllSelected) {
            const next = new Set(selectedIds);
            records.forEach(r => next.delete(r._id));
            setSelectedIds(next);
        } else {
            const next = new Set(selectedIds);
            records.forEach(r => next.add(r._id));
            setSelectedIds(next);
        }
    };

    const handleToggleOne = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    // ── Download single ──────────────────────────────────────────────
    const handleDownload = async (record) => {
        setDownloadingId(record._id);
        try {
            const response = await api.get(`/csv-storage/${record._id}/download`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = record.fileName || `${record.name}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            setError(`Failed to download "${record.name}".`);
        } finally {
            setDownloadingId(null);
        }
    };

    // ── Download selected ────────────────────────────────────────────
    const handleDownloadSelected = async () => {
        const toDownload = records.filter(r => selectedIds.has(r._id));
        for (const record of toDownload) {
            await handleDownload(record);
        }
    };

    // ── Upload selected (single) ─────────────────────────────────────
    const handleUploadSelected = async () => {
        const toUpload = records.find(r => selectedIds.has(r._id));
        if (!toUpload) return;

        setUploadingId(toUpload._id);
        try {
            const response = await api.get(`/csv-storage/${toUpload._id}/download`, {
                responseType: 'blob',
            });
            const csvFile = new File([response.data], toUpload.fileName || `${toUpload.name}.csv`, {
                type: 'text/csv',
            });
            navigate('/admin/feed-upload', {
                state: {
                    sellerId: toUpload.seller?._id,
                    csvFile,
                    csvStorageId: toUpload._id,
                },
            });
        } catch {
            setError(`Failed to prepare "${toUpload.name}" for upload.`);
        } finally {
            setUploadingId(null);
        }
    };

    // ── Delete ───────────────────────────────────────────────────────
    const handleDelete = async (record) => {
        if (!window.confirm(`Delete "${record.name}"?`)) return;
        setDeletingId(record._id);
        try {
            await api.delete(`/csv-storage/${record._id}`);
            fetchRecords(page);
        } catch {
            setError(`Failed to delete "${record.name}".`);
        } finally {
            setDeletingId(null);
        }
    };

    // ── Helpers ──────────────────────────────────────────────────────
    const buildTaxonomyLabel = (record) => {
        const parts = [record.categoryName, record.rangeName, record.productName].filter(Boolean);
        return parts.length ? parts.join(' › ') : '—';
    };

    const selectedCount = selectedIds.size;
    const totalPages = Math.ceil(total / rowsPerPage) || 1;

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
                CSV Storage
            </Typography>

            {error && (
                <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ p: 2, mb: 2 }}>
                <ThemeProvider theme={datePickerTheme}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <Stack spacing={2}>
                            {/* Row 1 */}
                            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                                <DatePicker
                                    label="From"
                                    value={dateFrom}
                                    onChange={(date) => {
                                        if (!date) { setDateFrom(null); return; }
                                        const y = date.getFullYear();
                                        const m = String(date.getMonth() + 1).padStart(2, '0');
                                        const d = String(date.getDate()).padStart(2, '0');
                                        setDateFrom(new Date(`${y}-${m}-${d}T00:00:00`));
                                    }}
                                    slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
                                />
                                <DatePicker
                                    label="To"
                                    value={dateTo}
                                    onChange={(date) => {
                                        if (!date) { setDateTo(null); return; }
                                        const y = date.getFullYear();
                                        const m = String(date.getMonth() + 1).padStart(2, '0');
                                        const d = String(date.getDate()).padStart(2, '0');
                                        setDateTo(new Date(`${y}-${m}-${d}T23:59:59`));
                                    }}
                                    slotProps={{ textField: { size: 'small', sx: { width: 160 } } }}
                                />
                                <FormControl size="small" sx={{ minWidth: 180, ...selectFocusSx }}>
                                    <InputLabel>Store</InputLabel>
                                    <Select
                                        value={selectedSeller}
                                        label="Store"
                                        onChange={(e) => setSelectedSeller(e.target.value)}
                                        MenuProps={menuProps}
                                    >
                                        <MenuItem value=""><em>All</em></MenuItem>
                                        {sellers.map((s) => (
                                            <MenuItem key={s._id} value={s._id}>
                                                {s.storeName || s.user?.username || s._id}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <TextField
                                    size="small"
                                    label="Keyword"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    sx={{ minWidth: 200, ...inputFocusSx }}
                                />
                            </Stack>

                            {/* Row 2 */}
                            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
                                <FormControl size="small" sx={{ minWidth: 160, ...selectFocusSx }}>
                                    <InputLabel>Category</InputLabel>
                                    <Select
                                        value={selectedCategory}
                                        label="Category"
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        disabled={loadingCategories}
                                        MenuProps={menuProps}
                                    >
                                        <MenuItem value=""><em>All</em></MenuItem>
                                        {categories.map((c) => (
                                            <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormControl size="small" sx={{ minWidth: 160, ...selectFocusSx }}>
                                    <InputLabel>Range</InputLabel>
                                    <Select
                                        value={selectedRange}
                                        label="Range"
                                        onChange={(e) => setSelectedRange(e.target.value)}
                                        disabled={!selectedCategory || loadingRanges}
                                        MenuProps={menuProps}
                                    >
                                        <MenuItem value=""><em>All</em></MenuItem>
                                        {ranges.map((r) => (
                                            <MenuItem key={r._id} value={r._id}>{r.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormControl size="small" sx={{ minWidth: 160, ...selectFocusSx }}>
                                    <InputLabel>Product</InputLabel>
                                    <Select
                                        value={selectedProduct}
                                        label="Product"
                                        onChange={(e) => setSelectedProduct(e.target.value)}
                                        disabled={!selectedRange || loadingProducts}
                                        MenuProps={menuProps}
                                    >
                                        <MenuItem value=""><em>All</em></MenuItem>
                                        {products.map((p) => (
                                            <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <Box sx={{ ml: 'auto' }}>
                                    <Stack direction="row" spacing={1}>
                                        <Button variant="outlined" size="small" onClick={handleClearFilters} sx={outlinedButtonSx}>
                                            Clear
                                        </Button>
                                        <Button variant="contained" size="small" onClick={handleSearch} sx={darkButtonSx}>
                                            Search
                                        </Button>
                                        <Tooltip title="Refresh">
                                            <IconButton size="small" onClick={() => fetchRecords(page)} disabled={loading}>
                                                <RefreshIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Box>
                            </Stack>
                        </Stack>
                    </LocalizationProvider>
                </ThemeProvider>
            </Paper>

            {/* ── Action bar ── */}
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    disabled={selectedCount === 0 || !!downloadingId}
                    onClick={handleDownloadSelected}
                    sx={outlinedButtonSx}
                >
                    Download{selectedCount > 0 ? ` (${selectedCount})` : ''}
                </Button>
                <Button
                    variant="contained"
                    size="small"
                    startIcon={uploadingId ? <CircularProgress size={14} color="inherit" /> : <CloudUploadIcon />}
                    disabled={selectedCount === 0 || !!uploadingId}
                    onClick={handleUploadSelected}
                    sx={darkButtonSx}
                >
                    Upload to eBay{selectedCount > 0 ? ` (${selectedCount})` : ''}
                </Button>
            </Stack>

            {/* ── Table ── */}
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox" sx={{ ...tableHeaderCellSx, width: 48 }}>
                                <Checkbox
                                    size="small"
                                    checked={isAllSelected}
                                    indeterminate={isIndeterminate}
                                    onChange={handleToggleAll}
                                    disabled={records.length === 0}
                                />
                            </TableCell>
                            <TableCell sx={{ ...tableHeaderCellSx, width: 200, maxWidth: 200 }}>Name</TableCell>
                            <TableCell sx={{ ...tableHeaderCellSx, width: 130, whiteSpace: 'nowrap' }}>Source</TableCell>
                            <TableCell sx={{ ...tableHeaderCellSx, width: 120, whiteSpace: 'nowrap' }}>Store</TableCell>
                            <TableCell sx={tableHeaderCellSx}>Date</TableCell>
                            <TableCell sx={tableHeaderCellSx} align="center">Listings</TableCell>
                            <TableCell sx={tableHeaderCellSx}>Category › Range › Product</TableCell>
                            <TableCell sx={tableHeaderCellSx} align="center">Listed / Failed</TableCell>
                            <TableCell sx={tableHeaderCellSx} align="center">Scheduled Upload</TableCell>
                            <TableCell sx={tableHeaderCellSx} align="center">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                                    <CircularProgress size={28} />
                                </TableCell>
                            </TableRow>
                        ) : records.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No CSV records found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            records.map((record) => {
                                const feedUpload = record.feedUploadId;
                                const isCompleted =
                                    feedUpload?.status === 'COMPLETED' ||
                                    feedUpload?.status === 'COMPLETED_WITH_ERROR';

                                return (
                                    <TableRow
                                        key={record._id}
                                        hover
                                        selected={selectedIds.has(record._id)}
                                        sx={tableBodyRowSx}
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                size="small"
                                                checked={selectedIds.has(record._id)}
                                                onChange={() => handleToggleOne(record._id)}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 500, width: 200, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <Tooltip title={record.name} placement="top-start" arrow>
                                                <span>{record.name}</span>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            {record.source === 'manual' ? (
                                                <Chip
                                                    label="Manual Upload"
                                                    size="small"
                                                    sx={{ fontWeight: 600, backgroundColor: alpha(BRAND_YELLOW, 0.15), color: BRAND_YELLOW_DARK, border: `1px solid ${alpha(BRAND_YELLOW_DARK, 0.4)}` }}
                                                />
                                            ) : record.source === 'asin_list' ? (
                                                <Chip
                                                    label="ASIN List"
                                                    size="small"
                                                    sx={{ fontWeight: 600, backgroundColor: alpha(BRAND_DARK, 0.08), color: BRAND_DARK, border: `1px solid ${alpha(BRAND_DARK, 0.2)}` }}
                                                />
                                            ) : (
                                                <Typography variant="caption" color="text.disabled">—</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {record.seller?.storeName || record.seller?.user?.username || '—'}
                                        </TableCell>
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            {record.createdAt
                                                ? new Date(record.createdAt).toLocaleDateString()
                                                : '—'}
                                        </TableCell>
                                        <TableCell align="center">
                                            {record.listingCount ?? '—'}
                                        </TableCell>
                                        <TableCell sx={{ maxWidth: 200 }}>
                                            {buildTaxonomyLabel(record)}
                                        </TableCell>
                                        <TableCell align="center">
                                            {!feedUpload ? (
                                                <Typography variant="caption" color="text.secondary">
                                                    Not uploaded
                                                </Typography>
                                            ) : isCompleted ? (
                                                <Stack direction="row" spacing={0.5} justifyContent="center">
                                                    <Chip
                                                        label={`${feedUpload.uploadSummary?.successCount ?? 0} listed`}
                                                        size="small"
                                                        sx={{ fontWeight: 600, backgroundColor: alpha('#2e7d32', 0.1), color: '#2e7d32', border: `1px solid ${alpha('#2e7d32', 0.3)}` }}
                                                    />
                                                    {(feedUpload.uploadSummary?.failureCount ?? 0) > 0 && (
                                                        <Chip
                                                            label={`${feedUpload.uploadSummary.failureCount} failed`}
                                                            size="small"
                                                            sx={{ fontWeight: 600, backgroundColor: alpha('#d32f2f', 0.1), color: '#d32f2f', border: `1px solid ${alpha('#d32f2f', 0.3)}` }}
                                                        />
                                                    )}
                                                </Stack>
                                            ) : (
                                                <Chip
                                                    label={feedUpload.status}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 600,
                                                        ...(feedUpload.status === 'COMPLETED' ? { backgroundColor: alpha('#2e7d32', 0.1), color: '#2e7d32', border: `1px solid ${alpha('#2e7d32', 0.3)}` }
                                                        : feedUpload.status === 'FAILURE' ? { backgroundColor: alpha('#d32f2f', 0.1), color: '#d32f2f', border: `1px solid ${alpha('#d32f2f', 0.3)}` }
                                                        : { backgroundColor: alpha(BRAND_YELLOW, 0.15), color: BRAND_YELLOW_DARK, border: `1px solid ${alpha(BRAND_YELLOW_DARK, 0.4)}` })
                                                    }}
                                                />
                                            )}
                                        </TableCell>
                                        {/* ── Scheduled Upload column ── */}
                                        <TableCell align="center">
                                            {record.scheduledUploadStatus === 'pending' && record.scheduledUploadAt ? (
                                                <Chip
                                                    icon={<ScheduleIcon sx={{ color: `${BRAND_YELLOW_DARK} !important` }} />}
                                                    label={new Date(record.scheduledUploadAt).toLocaleString()}
                                                    size="small"
                                                    onClick={() => setScheduleDialog({ open: true, record })}
                                                    sx={{ cursor: 'pointer', fontWeight: 600, backgroundColor: alpha(BRAND_YELLOW, 0.15), color: BRAND_YELLOW_DARK, border: `1px solid ${alpha(BRAND_YELLOW_DARK, 0.4)}` }}
                                                />
                                            ) : record.scheduledUploadStatus === 'processing' ? (
                                                <Chip icon={<CircularProgress size={12} />} label="Processing" size="small"
                                                    sx={{ fontWeight: 600, backgroundColor: alpha('#0288d1', 0.1), color: '#0288d1', border: `1px solid ${alpha('#0288d1', 0.3)}` }}
                                                />
                                            ) : record.scheduledUploadStatus === 'done' ? (
                                                <Chip label="Auto-uploaded" size="small"
                                                    sx={{ fontWeight: 600, backgroundColor: alpha('#2e7d32', 0.1), color: '#2e7d32', border: `1px solid ${alpha('#2e7d32', 0.3)}` }}
                                                />
                                            ) : record.scheduledUploadStatus === 'failed' ? (
                                                <Chip label="Auto-upload failed" size="small"
                                                    sx={{ fontWeight: 600, backgroundColor: alpha('#d32f2f', 0.1), color: '#d32f2f', border: `1px solid ${alpha('#d32f2f', 0.3)}` }}
                                                />
                                            ) : (
                                                <Typography variant="caption" color="text.disabled">—</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                <Tooltip title="Schedule Auto-Upload">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            color={record.scheduledUploadStatus === 'pending' ? 'warning' : 'default'}
                                                            onClick={() => setScheduleDialog({ open: true, record })}
                                                            disabled={record.scheduledUploadStatus === 'processing'}
                                                        >
                                                            <ScheduleIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Download CSV">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDownload(record)}
                                                            disabled={downloadingId === record._id}
                                                        >
                                                            {downloadingId === record._id
                                                                ? <CircularProgress size={14} />
                                                                : <DownloadIcon fontSize="small" />}
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Upload to eBay">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={async () => {
                                                                setUploadingId(record._id);
                                                                try {
                                                                    const resp = await api.get(
                                                                        `/csv-storage/${record._id}/download`,
                                                                        { responseType: 'blob' }
                                                                    );
                                                                    const csvFile = new File(
                                                                        [resp.data],
                                                                        record.fileName || `${record.name}.csv`,
                                                                        { type: 'text/csv' }
                                                                    );
                                                                    navigate('/admin/feed-upload', {
                                                                        state: {
                                                                            sellerId: record.seller?._id,
                                                                            csvFile,
                                                                            csvStorageId: record._id,
                                                                        },
                                                                    });
                                                                } catch {
                                                                    setError(`Failed to prepare "${record.name}" for upload.`);
                                                                    setUploadingId(null);
                                                                }
                                                            }}
                                                            disabled={uploadingId === record._id}
                                                        >
                                                            {uploadingId === record._id
                                                                ? <CircularProgress size={14} />
                                                                : <CloudUploadIcon fontSize="small" />}
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => handleDelete(record)}
                                                            disabled={deletingId === record._id}
                                                        >
                                                            {deletingId === record._id
                                                                ? <CircularProgress size={14} />
                                                                : <DeleteIcon fontSize="small" />}
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
                <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(_, val) => setPage(val)}
                        size="small"
                        sx={{
                            '& .MuiPaginationItem-root.Mui-selected': {
                                backgroundColor: `${BRAND_YELLOW} !important`,
                                color: `${BRAND_DARK} !important`,
                                fontWeight: 'bold',
                                '&:hover': {
                                    backgroundColor: `${alpha(BRAND_YELLOW, 0.8)} !important`,
                                }
                            }
                        }}
                    />
                </Stack>
            )}
            {total > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                    {total} record{total !== 1 ? 's' : ''} total
                </Typography>
            )}

            <ScheduleUploadDialog
                open={scheduleDialog.open}
                onClose={() => setScheduleDialog({ open: false, record: null })}
                record={scheduleDialog.record}
                sellers={sellers}
                onUpdated={(updatedRecord) => {
                    setRecords(prev => prev.map(r => r._id === updatedRecord._id ? updatedRecord : r));
                    setScheduleDialog({ open: false, record: null });
                }}
            />
        </Box>
    );
}
