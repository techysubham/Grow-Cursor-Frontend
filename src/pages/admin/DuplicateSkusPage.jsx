import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Container, Paper, Alert,
    FormControl, InputLabel, Select, MenuItem, Chip, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    Tooltip, Button, Collapse, IconButton, LinearProgress,
    Checkbox, Dialog, DialogTitle, DialogContent, DialogActions,
    Snackbar, Pagination,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SearchIcon from '@mui/icons-material/Search';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import BlockIcon from '@mui/icons-material/Block';
import api from '../../lib/api';

function ItemRow({ itemId, title, orderCount, selected, onToggle }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(itemId);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    const hasOrders = orderCount > 0;
    return (
        <Box
            display="flex"
            alignItems="center"
            gap={1}
            py={0.3}
            px={0.5}
            borderRadius={1}
            sx={{
                cursor: 'pointer',
                bgcolor: selected ? '#fff3e0' : 'transparent',
                '&:hover': { bgcolor: selected ? '#ffe0b2' : '#f5f5f5' },
            }}
            onClick={() => onToggle(itemId)}
        >
            <Checkbox
                size="small"
                checked={selected}
                onChange={() => onToggle(itemId)}
                onClick={e => e.stopPropagation()}
                sx={{ p: 0.3 }}
            />
            <Tooltip title={copied ? 'Copied!' : 'Copy Item ID'}>
                <IconButton size="small" onClick={handleCopy} sx={{ p: 0.4 }}>
                    <ContentCopyIcon sx={{ fontSize: 14, color: copied ? 'success.main' : 'text.disabled' }} />
                </IconButton>
            </Tooltip>
            <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ minWidth: 120 }}>
                {itemId}
            </Typography>
            <Chip
                label={hasOrders ? `${orderCount} order${orderCount !== 1 ? 's' : ''}` : 'No orders'}
                size="small"
                sx={{
                    height: 18,
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    bgcolor: hasOrders ? '#e8f5e9' : '#f5f5f5',
                    color: hasOrders ? '#2e7d32' : '#9e9e9e',
                    border: `1px solid ${hasOrders ? '#a5d6a7' : '#e0e0e0'}`,
                    '& .MuiChip-label': { px: 0.8 },
                }}
            />
            {title && (
                <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 340 }}>
                    — {title}
                </Typography>
            )}
        </Box>
    );
}

function DuplicateRow({ row, index, selectedIds, onToggle }) {
    const [open, setOpen] = useState(false);
    const withOrders = (row.orderCounts || []).filter(c => c > 0).length;
    const withoutOrders = (row.orderCounts || []).length - withOrders;

    const allSelected = row.itemIds.length > 0 && row.itemIds.every(id => selectedIds.has(id));
    const someSelected = row.itemIds.some(id => selectedIds.has(id));

    const handleSelectAll = (e) => {
        e.stopPropagation();
        if (allSelected) {
            row.itemIds.forEach(id => onToggle(id, false));
        } else {
            row.itemIds.forEach(id => onToggle(id, true));
        }
    };

    return (
        <>
            <TableRow hover sx={{ '& td': { borderBottom: open ? 'none' : undefined } }}>
                <TableCell sx={{ width: 50, color: 'text.disabled', fontWeight: 500 }}>{index + 1}</TableCell>
                <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                        {row.sku}
                    </Typography>
                </TableCell>
                <TableCell align="center">
                    <Chip
                        label={row.count}
                        size="small"
                        sx={{
                            fontWeight: 700,
                            bgcolor: row.count >= 5 ? '#fdecea' : row.count >= 3 ? '#fff3e0' : '#e8f5e9',
                            color: row.count >= 5 ? '#c62828' : row.count >= 3 ? '#e65100' : '#2e7d32',
                            border: `1px solid ${row.count >= 5 ? '#ef9a9a' : row.count >= 3 ? '#ffcc80' : '#a5d6a7'}`,
                        }}
                    />
                </TableCell>
                <TableCell align="right">
                    <IconButton size="small" onClick={() => setOpen(o => !o)}>
                        {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={4} sx={{ py: 0, px: 3, bgcolor: '#fafafa' }}>
                    <Collapse in={open} unmountOnExit>
                        <Box py={1.5}>
                            {/* Summary chips + select-all row */}
                            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                <Box display="flex" gap={1} alignItems="center">
                                    <Chip
                                        label={`${withOrders} with order${withOrders !== 1 ? 's' : ''}`}
                                        size="small"
                                        sx={{
                                            fontWeight: 700,
                                            bgcolor: withOrders > 0 ? '#e8f5e9' : '#f5f5f5',
                                            color: withOrders > 0 ? '#2e7d32' : '#9e9e9e',
                                            border: `1px solid ${withOrders > 0 ? '#a5d6a7' : '#e0e0e0'}`,
                                        }}
                                    />
                                    <Chip
                                        label={`${withoutOrders} without order${withoutOrders !== 1 ? 's' : ''}`}
                                        size="small"
                                        sx={{
                                            fontWeight: 700,
                                            bgcolor: withoutOrders > 0 ? '#fdecea' : '#f5f5f5',
                                            color: withoutOrders > 0 ? '#c62828' : '#9e9e9e',
                                            border: `1px solid ${withoutOrders > 0 ? '#ef9a9a' : '#e0e0e0'}`,
                                        }}
                                    />
                                </Box>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <Checkbox
                                        size="small"
                                        checked={allSelected}
                                        indeterminate={someSelected && !allSelected}
                                        onChange={handleSelectAll}
                                        sx={{ p: 0.3 }}
                                    />
                                    <Typography variant="caption" color="text.secondary">Select all</Typography>
                                </Box>
                            </Box>
                            {row.itemIds.map((id, i) => (
                                <ItemRow
                                    key={id}
                                    itemId={id}
                                    title={row.titles?.[i]}
                                    orderCount={row.orderCounts?.[i] ?? 0}
                                    selected={selectedIds.has(id)}
                                    onToggle={(itemId) => onToggle(itemId)}
                                />
                            ))}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
}

export default function DuplicateSkusPage() {
    const [sellers, setSellers] = useState([]);
    const [sellerId, setSellerId] = useState('');
    const [result, setResult] = useState(null);
    const [loadingSellers, setLoadingSellers] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Selection state (persists across page changes)
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Pagination
    const [page, setPage] = useState(1);

    // End-listing state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [ending, setEnding] = useState(false);
    const [endProgress, setEndProgress] = useState({ done: 0, total: 0, errors: [] });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        api.get('/sellers/all')
            .then(({ data }) => setSellers(data))
            .catch(() => setError('Failed to load sellers.'))
            .finally(() => setLoadingSellers(false));
    }, []);

    const fetchPage = useCallback(async (p, sid) => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get('/sellers/sku-duplicates', {
                params: { sellerId: sid, page: p, limit: 25 },
            });
            setResult(data);
            setPage(p);
        } catch (err) {
            setError(err?.response?.data?.error || 'Failed to fetch duplicate SKUs.');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSearch = useCallback(() => {
        if (!sellerId) return;
        setResult(null);
        setSelectedIds(new Set());
        setPage(1);
        fetchPage(1, sellerId);
    }, [sellerId, fetchPage]);

    const handlePageChange = useCallback((_, value) => {
        fetchPage(value, sellerId);
    }, [sellerId, fetchPage]);

    const handleToggle = useCallback((itemId, forceValue) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            const shouldSelect = forceValue !== undefined ? forceValue : !next.has(itemId);
            if (shouldSelect) next.add(itemId);
            else next.delete(itemId);
            return next;
        });
    }, []);

    const handleEndSelected = () => {
        if (selectedIds.size === 0) return;
        setConfirmOpen(true);
    };

    const confirmEndListing = async () => {
        setConfirmOpen(false);
        const ids = Array.from(selectedIds);
        setEnding(true);
        setEndProgress({ done: 0, total: ids.length, errors: [] });

        const errors = [];
        for (let i = 0; i < ids.length; i++) {
            try {
                await api.post('/ebay/end-item', {
                    sellerId,
                    itemId: ids[i],
                    endingReason: 'NotAvailable',
                });
            } catch (e) {
                errors.push({ itemId: ids[i], msg: e?.response?.data?.error || e.message });
            }
            setEndProgress({ done: i + 1, total: ids.length, errors });
        }

        setEnding(false);
        // Remove successfully ended IDs from result
        const failedIds = new Set(errors.map(e => e.itemId));
        const succeeded = ids.filter(id => !failedIds.has(id));
        setSelectedIds(new Set());
        if (result) {
            setResult(prev => ({
                ...prev,
                duplicates: prev.duplicates
                    .map(row => {
                        const kept = row.itemIds.reduce((acc, id, i) => {
                            if (!succeeded.includes(id)) acc.push(i);
                            return acc;
                        }, []);
                        return {
                            ...row,
                            count: kept.length,
                            itemIds: kept.map(i => row.itemIds[i]),
                            titles: kept.map(i => row.titles?.[i]),
                            orderCounts: kept.map(i => row.orderCounts?.[i] ?? 0),
                        };
                    })
                    .filter(row => row.count > 1),
                total: prev.duplicates
                    .map(row => row.itemIds.filter(id => !succeeded.includes(id)).length)
                    .filter(c => c > 1).length,
            }));
        }

        if (errors.length === 0) {
            setSnackbar({ open: true, message: `Successfully ended ${succeeded.length} listing${succeeded.length !== 1 ? 's' : ''}.`, severity: 'success' });
        } else {
            setSnackbar({ open: true, message: `${succeeded.length} ended, ${errors.length} failed.`, severity: errors.length === ids.length ? 'error' : 'warning' });
        }
    };

    const selectedSeller = sellers.find(s => s._id === sellerId);
    const sellerLabel = selectedSeller
        ? (selectedSeller.user?.username || selectedSeller.user?.email || selectedSeller._id)
        : '';

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                <ReportProblemOutlinedIcon sx={{ color: '#e65100', fontSize: 30 }} />
                <Box>
                    <Typography variant="h5" fontWeight={700}>Duplicate SKUs</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Find SKUs appearing on more than one listing for a given seller.
                    </Typography>
                </Box>
            </Box>

            <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
                <Box display="flex" alignItems="flex-end" gap={2} flexWrap="wrap">
                    <FormControl size="small" sx={{ minWidth: 260 }} disabled={loadingSellers}>
                        <InputLabel>Select Seller</InputLabel>
                        <Select
                            value={sellerId}
                            label="Select Seller"
                            onChange={e => { setSellerId(e.target.value); setResult(null); setSelectedIds(new Set()); setPage(1); }}
                        >
                            {sellers.map(s => (
                                <MenuItem key={s._id} value={s._id}>
                                    {s.user?.username || s.user?.email || s._id}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant="contained"
                        startIcon={<SearchIcon />}
                        onClick={handleSearch}
                        disabled={!sellerId || loading}
                        sx={{ height: 40, textTransform: 'none', fontWeight: 600 }}
                    >
                        Check Duplicates
                    </Button>
                    {selectedIds.size > 0 && (
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<BlockIcon />}
                            onClick={handleEndSelected}
                            disabled={ending}
                            sx={{ height: 40, textTransform: 'none', fontWeight: 600, ml: 'auto' }}
                        >
                            End {selectedIds.size} Selected
                        </Button>
                    )}
                    {selectedIds.size > 0 && result?.totalPages > 1 && (
                        <Chip
                            label={`${selectedIds.size} selected across pages`}
                            size="small"
                            color="warning"
                            sx={{ fontWeight: 600 }}
                        />
                    )}
                </Box>
                {ending && (
                    <Box mt={2}>
                        <Typography variant="caption" color="text.secondary">
                            Ending listings… {endProgress.done} / {endProgress.total}
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={(endProgress.done / endProgress.total) * 100}
                            sx={{ mt: 0.5, borderRadius: 2 }}
                        />
                    </Box>
                )}
            </Paper>

            {loading && <LinearProgress sx={{ borderRadius: 2, mb: 2 }} />}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {result && (
                <Paper elevation={2} sx={{ borderRadius: 3 }}>
                    <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        px={3}
                        py={2}
                        borderBottom="1px solid #e0e0e0"
                    >
                        <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1" fontWeight={700}>
                                Results for&nbsp;
                                <Box component="span" sx={{ color: 'primary.main' }}>{sellerLabel}</Box>
                            </Typography>
                        </Box>
                        <Chip
                            label={result.total === 0 ? 'No duplicates found' : `${result.total} duplicate SKU${result.total !== 1 ? 's' : ''}`}
                            size="small"
                            color={result.total === 0 ? 'success' : 'warning'}
                            sx={{ fontWeight: 700 }}
                        />
                    </Box>

                    {result.total === 0 ? (
                        <Box py={6} textAlign="center">
                            <Typography color="success.main" fontWeight={600} variant="body1">
                                ✓ No duplicate SKUs found for this seller.
                            </Typography>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                        <TableCell sx={{ width: 50, fontWeight: 700 }}>#</TableCell>
                                        <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 700, width: 100 }}>Count</TableCell>
                                        <TableCell sx={{ width: 60 }} />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {result.duplicates.map((row, i) => (
                                        <DuplicateRow
                                            key={row.sku}
                                            row={row}
                                            index={(page - 1) * 25 + i}
                                            selectedIds={selectedIds}
                                            onToggle={handleToggle}
                                        />
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {result.totalPages > 1 && (
                        <Box display="flex" justifyContent="center" py={2} borderTop="1px solid #e0e0e0">
                            <Pagination
                                count={result.totalPages}
                                page={page}
                                onChange={handlePageChange}
                                color="primary"
                                shape="rounded"
                                disabled={loading}
                            />
                        </Box>
                    )}
                </Paper>
            )}

            {/* Confirm dialog */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>End {selectedIds.size} Listing{selectedIds.size !== 1 ? 's' : ''}?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        This will permanently end <strong>{selectedIds.size}</strong> listing{selectedIds.size !== 1 ? 's' : ''} on eBay with reason <em>NotAvailable</em>. This cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={confirmEndListing} sx={{ textTransform: 'none', fontWeight: 600 }}>
                        Yes, End Listings
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={() => setSnackbar(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))} sx={{ fontWeight: 600 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}
