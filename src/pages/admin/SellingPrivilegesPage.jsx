import { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    Container,
    Paper,
    CircularProgress,
    Alert,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    InputAdornment,
    Button,
    Tooltip,
    IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import api from '../../lib/api';

export default function SellingPrivilegesPage() {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // skuSync[sellerId] = { status: 'idle'|'running'|'completed'|'failed', dbCount, error }
    const [skuSync, setSkuSync] = useState({});
    const pollIntervalsRef = useRef({});
    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredData(data);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = data.filter(item =>
                (item.sellerName && item.sellerName.toLowerCase().includes(query)) ||
                (item.sellerId && item.sellerId.toLowerCase().includes(query))
            );
            setFilteredData(filtered);
        }
    }, [searchQuery, data]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/ebay/selling/summary/all');
            if (res.data.success) {
                setData(res.data.data);
                setFilteredData(res.data.data);
            }
        } catch (err) {
            console.error('Error fetching selling limits:', err);
            setError('Failed to fetch selling limits.');
        } finally {
            setLoading(false);
        }
    };

    const pollSkuSyncStatus = (sellerId) => {
        if (pollIntervalsRef.current[sellerId]) return; // already polling
        pollIntervalsRef.current[sellerId] = setInterval(async () => {
            try {
                const res = await api.get(`/ebay/sync-sku-index/status/${sellerId}`);
                const s = res.data;
                setSkuSync(prev => ({ ...prev, [sellerId]: { status: s.status, dbCount: s.dbCount, totalCount: s.totalCount, lastSyncAt: s.lastSyncAt } }));
                if (s.status !== 'running') {
                    clearInterval(pollIntervalsRef.current[sellerId]);
                    delete pollIntervalsRef.current[sellerId];
                }
            } catch {
                clearInterval(pollIntervalsRef.current[sellerId]);
                delete pollIntervalsRef.current[sellerId];
            }
        }, 3000);
    };

    const handleSyncSkuIndex = async (sellerId) => {
        setSkuSync(prev => ({ ...prev, [sellerId]: { status: 'running', dbCount: prev[sellerId]?.dbCount ?? 0 } }));
        try {
            await api.post('/ebay/sync-sku-index', { sellerId });
            pollSkuSyncStatus(sellerId);
        } catch (err) {
            setSkuSync(prev => ({ ...prev, [sellerId]: { status: 'failed', dbCount: prev[sellerId]?.dbCount ?? 0 } }));
        }
    };

    const formatCurrency = (amount, currency) => {
        // If amount is missing or null, return '-'
        if (amount === undefined || amount === null || amount === '') return '-';
        const num = parseFloat(amount);
        if (isNaN(num)) return '-';

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD'
        }).format(num);
    };

    const formatNumber = (num) => {
        if (num === undefined || num === null || num === '') return '-';
        // If it's a string, try to parse it
        const n = parseInt(num, 10);
        if (isNaN(n)) return '-';
        return n.toLocaleString();
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" gutterBottom>
                    Selling Privileges Overview
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<RefreshIcon />}
                    onClick={fetchData}
                    disabled={loading}
                >
                    Refresh
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ width: '100%', mb: 2, p: 2 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search by Seller Name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ mb: 2 }}
                />

                <TableContainer>
                    <Table stickyHeader aria-label="selling privileges table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Seller Name</TableCell>
                                <TableCell align="right">Qty Limit Remaining</TableCell>
                                <TableCell align="right">Amt Limit Remaining</TableCell>
                                <TableCell align="center">Status</TableCell>
                                <TableCell align="center">SKU Index</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                        <CircularProgress />
                                        <Typography variant="body2" sx={{ mt: 1 }}>Loading selling privileges...</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                        No data available
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((row) => {
                                    const sync = skuSync[row.sellerId] || { status: 'idle', dbCount: 0 };
                                    const isSyncing = sync.status === 'running';
                                    return (
                                        <TableRow
                                            key={row.sellerId || Math.random()}
                                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                        >
                                            <TableCell component="th" scope="row">
                                                {row.sellerName}
                                            </TableCell>
                                            <TableCell align="right">
                                                {formatNumber(row.quantityLimitRemaining)}
                                            </TableCell>
                                            <TableCell align="right">
                                                {formatCurrency(row.amountLimitRemaining, row.amountLimitCurrency)}
                                            </TableCell>
                                            <TableCell align="center">
                                                {row.error ? (
                                                    <Chip label="Error" color="error" size="small" title={row.error} />
                                                ) : (
                                                    <Chip label="Active" color="success" size="small" />
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                                    {sync.dbCount > 0 && !isSyncing && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {sync.dbCount.toLocaleString()} listings
                                                        </Typography>
                                                    )}
                                                    {isSyncing && sync.totalCount > 0 && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {sync.totalCount.toLocaleString()}…
                                                        </Typography>
                                                    )}
                                                    <Tooltip title={isSyncing ? 'Syncing…' : 'Sync active listings index'}>
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleSyncSkuIndex(row.sellerId)}
                                                                disabled={isSyncing || !row.sellerId}
                                                            >
                                                                {isSyncing
                                                                    ? <CircularProgress size={18} />
                                                                    : <SyncIcon fontSize="small" />}
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </Box>
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
