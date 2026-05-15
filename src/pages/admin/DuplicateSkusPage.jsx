import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Container, Paper, Alert, CircularProgress,
    FormControl, InputLabel, Select, MenuItem, Chip, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow,
    Tooltip, Button, Collapse, IconButton, LinearProgress,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SearchIcon from '@mui/icons-material/Search';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import api from '../../lib/api';

function ItemRow({ itemId, title }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(itemId);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <Box display="flex" alignItems="center" gap={1} py={0.3}>
            <Tooltip title={copied ? 'Copied!' : 'Copy Item ID'}>
                <IconButton size="small" onClick={handleCopy} sx={{ p: 0.4 }}>
                    <ContentCopyIcon sx={{ fontSize: 14, color: copied ? 'success.main' : 'text.disabled' }} />
                </IconButton>
            </Tooltip>
            <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ minWidth: 120 }}>
                {itemId}
            </Typography>
            {title && (
                <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 420 }}>
                    — {title}
                </Typography>
            )}
        </Box>
    );
}

function DuplicateRow({ row, index }) {
    const [open, setOpen] = useState(false);
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
                            {row.itemIds.map((id, i) => (
                                <ItemRow key={id} itemId={id} title={row.titles?.[i]} />
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
    const [result, setResult] = useState(null); // { duplicates, total }
    const [loadingSellers, setLoadingSellers] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.get('/sellers/all')
            .then(({ data }) => setSellers(data))
            .catch(() => setError('Failed to load sellers.'))
            .finally(() => setLoadingSellers(false));
    }, []);

    const handleSearch = useCallback(async () => {
        if (!sellerId) return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const { data } = await api.get('/sellers/sku-duplicates', { params: { sellerId } });
            setResult(data);
        } catch (err) {
            setError(err?.response?.data?.error || 'Failed to fetch duplicate SKUs.');
        } finally {
            setLoading(false);
        }
    }, [sellerId]);

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
                            onChange={e => { setSellerId(e.target.value); setResult(null); }}
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
                </Box>
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
                                        <DuplicateRow key={row.sku} row={row} index={i} />
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            )}
        </Container>
    );
}
