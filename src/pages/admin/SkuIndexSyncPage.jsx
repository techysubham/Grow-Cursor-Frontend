import { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Container, Paper, CircularProgress, Alert,
    Chip, Button, LinearProgress, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Tooltip,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import api, { getAuthToken } from '../../lib/api';

// seller state shape: { status: 'idle'|'running'|'completed'|'failed', dbCount, syncedAt, progress }
// progress shape: { page, totalPages, totalEntries, count }

export default function SkuIndexSyncPage() {
    const [sellers, setSellers] = useState([]);
    const [sellerState, setSellerState] = useState({}); // sellerId → state
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [error, setError] = useState(null);

    const readerRefs = useRef({}); // sellerId → ReadableStreamDefaultReader (for cleanup)

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await api.get('/sellers/all');
                setSellers(data);
                // Load initial status for all sellers in parallel
                await Promise.all(data.map(s => fetchInitialStatus(s._id)));
            } catch {
                setError('Failed to load sellers.');
            } finally {
                setLoadingInitial(false);
            }
        };
        load();
        return () => {
            // Cancel any in-flight SSE readers on unmount
            Object.values(readerRefs.current).forEach(r => { try { r.cancel(); } catch {} });
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchInitialStatus = async (sellerId) => {
        try {
            const { data } = await api.get(`/ebay/sync-sku-index/status/${sellerId}`);
            setSellerState(prev => ({
                ...prev,
                [sellerId]: {
                    status: data.status === 'running' ? 'running' : (data.dbCount > 0 ? 'completed' : 'idle'),
                    dbCount: data.dbCount,
                    syncedAt: data.syncedAt || null,
                    progress: null,
                },
            }));
        } catch {
            // non-fatal: leave as idle
        }
    };

    const handleSync = async (sellerId) => {
        setSellerState(prev => ({
            ...prev,
            [sellerId]: { status: 'running', dbCount: prev[sellerId]?.dbCount ?? 0, syncedAt: prev[sellerId]?.syncedAt ?? null, progress: null },
        }));

        try {
            const baseURL = import.meta.env.VITE_API_URL;
            const token = getAuthToken();
            const response = await fetch(
                `${baseURL}/ebay/sync-sku-index/stream?sellerId=${sellerId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `Request failed (${response.status})`);
            }

            const reader = response.body.getReader();
            readerRefs.current[sellerId] = reader;
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const evt = JSON.parse(line.slice(6));
                    if (evt.type === 'progress') {
                        setSellerState(prev => ({
                            ...prev,
                            [sellerId]: {
                                ...prev[sellerId],
                                status: 'running',
                                progress: { page: evt.page, totalPages: evt.totalPages, totalEntries: evt.totalEntries, count: evt.count },
                            },
                        }));
                    } else if (evt.type === 'done') {
                        setSellerState(prev => ({
                            ...prev,
                            [sellerId]: {
                                status: 'completed',
                                dbCount: evt.totalCount,
                                syncedAt: evt.syncedAt,
                                progress: null,
                            },
                        }));
                    } else if (evt.type === 'error') {
                        throw new Error(evt.error);
                    }
                }
            }
        } catch (err) {
            setSellerState(prev => ({
                ...prev,
                [sellerId]: { ...prev[sellerId], status: 'failed', errorMsg: err.message, progress: null },
            }));
        } finally {
            delete readerRefs.current[sellerId];
        }
    };

    const formatDate = (d) => {
        if (!d) return '—';
        return new Date(d).toLocaleString(undefined, {
            dateStyle: 'medium', timeStyle: 'short',
        });
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
            <Box mb={3}>
                <Typography variant="h4" fontWeight={700}>SKU Index Sync</Typography>
                <Typography variant="body2" color="textSecondary">
                    Sync each seller's active listings into the local DB so SKU checks are instant.
                    Press the sync button to refresh a seller's index.
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Paper elevation={1} sx={{ borderRadius: 2, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                <TableCell sx={{ fontWeight: 700 }}>Seller</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Indexed Listings</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Last Synced</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loadingInitial ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                                        <CircularProgress size={28} />
                                        <Typography variant="body2" sx={{ mt: 1 }}>Loading sellers…</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : sellers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 5 }}>No sellers found</TableCell>
                                </TableRow>
                            ) : (
                                sellers.map(seller => {
                                    const sid = seller._id;
                                    const s = sellerState[sid] || { status: 'idle', dbCount: 0, syncedAt: null };
                                    const isRunning = s.status === 'running';
                                    const prog = s.progress;
                                    const pct = prog?.totalPages > 0
                                        ? Math.round((prog.page / prog.totalPages) * 100)
                                        : 0;

                                    return (
                                        <TableRow key={sid} sx={{ '&:last-child td': { border: 0 } }}>
                                            <TableCell>
                                                <Typography fontWeight={600}>
                                                    {seller.user?.username || seller._id}
                                                </Typography>
                                            </TableCell>

                                            <TableCell align="right">
                                                <Typography variant="body2">
                                                    {s.dbCount > 0 ? s.dbCount.toLocaleString() : '—'}
                                                </Typography>
                                            </TableCell>

                                            <TableCell align="center">
                                                <Typography variant="body2" color={s.syncedAt ? 'text.primary' : 'text.disabled'}>
                                                    {formatDate(s.syncedAt)}
                                                </Typography>
                                            </TableCell>

                                            <TableCell align="center" sx={{ minWidth: 200 }}>
                                                {isRunning ? (
                                                    <Box>
                                                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {prog
                                                                    ? `Page ${prog.page} / ${prog.totalPages} · ${prog.count.toLocaleString()} listings`
                                                                    : 'Connecting…'}
                                                            </Typography>
                                                            {prog && (
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {pct}%
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                        <LinearProgress
                                                            variant={prog ? 'determinate' : 'indeterminate'}
                                                            value={pct}
                                                            sx={{ height: 6, borderRadius: 3 }}
                                                        />
                                                    </Box>
                                                ) : s.status === 'completed' ? (
                                                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                                        <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                                        <Chip label="Synced" color="success" size="small" variant="outlined" />
                                                    </Box>
                                                ) : s.status === 'failed' ? (
                                                    <Tooltip title={s.errorMsg || 'Unknown error'}>
                                                        <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                                                            <ErrorOutlineIcon sx={{ fontSize: 16, color: 'error.main' }} />
                                                            <Chip label="Failed" color="error" size="small" variant="outlined" />
                                                        </Box>
                                                    </Tooltip>
                                                ) : (
                                                    <Chip label="Not synced" size="small" variant="outlined" sx={{ color: 'text.disabled' }} />
                                                )}
                                            </TableCell>

                                            <TableCell align="center">
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    startIcon={isRunning ? <CircularProgress size={14} color="inherit" /> : <SyncIcon />}
                                                    onClick={() => handleSync(sid)}
                                                    disabled={isRunning}
                                                    sx={{ minWidth: 100 }}
                                                >
                                                    {isRunning ? 'Syncing…' : 'Sync'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Container>
    );
}
