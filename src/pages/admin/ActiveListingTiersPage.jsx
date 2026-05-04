import { useState, useEffect } from 'react';
import {
    Box, Typography, Container, Paper, CircularProgress, Alert,
    Chip, Button, Divider, Grid, FormControl, InputLabel,
    Select, MenuItem
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StorefrontIcon from '@mui/icons-material/Storefront';
import api from '../../lib/api';

const TIERS = [
    { key: 'low',  label: 'Low Ticket',  range: '$0 – <$20',  color: '#2e7d32', bg: '#e8f5e9', icon: TrendingDownIcon },
    { key: 'mid',  label: 'Mid Ticket',  range: '$20 – <$70', color: '#ed6c02', bg: '#fff3e0', icon: TrendingFlatIcon },
    { key: 'high', label: 'High Ticket', range: '$70+',        color: '#1565c0', bg: '#e3f2fd', icon: TrendingUpIcon  },
];

function TierCard({ tier, value, total }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    const { label, range, color, bg, icon: Icon } = tier;
    return (
        <Paper
            elevation={2}
            sx={{
                p: 3, borderRadius: 3, textAlign: 'center',
                border: `2px solid ${color}33`,
                background: `linear-gradient(135deg, ${bg} 0%, #fff 100%)`,
            }}
        >
            <Box display="flex" justifyContent="center" mb={1}>
                <Box sx={{ bgcolor: bg, borderRadius: '50%', p: 1.2, border: `2px solid ${color}55` }}>
                    <Icon sx={{ fontSize: 28, color }} />
                </Box>
            </Box>
            <Typography variant="h3" fontWeight={800} sx={{ color }}>{value.toLocaleString()}</Typography>
            <Typography variant="subtitle1" fontWeight={700} mt={0.5}>{label}</Typography>
            <Typography variant="caption" color="textSecondary">{range} USD</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Chip
                label={`${pct}% of total`}
                size="small"
                sx={{ bgcolor: bg, color, fontWeight: 700, border: `1px solid ${color}44` }}
            />
        </Paper>
    );
}

export default function ActiveListingTiersPage() {
    const [sellers, setSellers]               = useState([]);
    const [sellersLoading, setSellersLoading] = useState(true);
    const [selectedSellerId, setSelectedSellerId] = useState('');

    const [result, setResult]   = useState(null);   // { tiers, sellerName, pagesFetched }
    const [fetching, setFetching] = useState(false);
    const [error, setError]     = useState(null);

    // Load seller list on mount
    useEffect(() => {
        const loadSellers = async () => {
            setSellersLoading(true);
            try {
                const { data } = await api.get('/sellers/all');
                setSellers(data);
                if (data.length > 0) setSelectedSellerId(data[0]._id);
            } catch {
                try {
                    const { data } = await api.get('/sellers/me');
                    setSellers([data]);
                    setSelectedSellerId(data._id);
                } catch {
                    setError('Failed to load sellers.');
                }
            } finally {
                setSellersLoading(false);
            }
        };
        loadSellers();
    }, []);

    const handleFetch = async () => {
        if (!selectedSellerId) return;
        setFetching(true);
        setError(null);
        setResult(null);
        try {
            const res = await api.get('/ebay/active-listings/live-tiers', {
                params: { sellerId: selectedSellerId },
            });
            if (res.data.success) {
                setResult(res.data);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch listing data from eBay.');
        } finally {
            setFetching(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 2, mb: 6 }}>
            {/* Header */}
            <Box mb={3}>
                <Typography variant="h4" fontWeight={700}>Active Listings by Price Tier</Typography>
                <Typography variant="body2" color="textSecondary">
                    Select a seller and fetch live counts from eBay, broken down by USD price range.
                </Typography>
            </Box>

            {/* Info banner */}
            <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mb: 3, borderRadius: 2 }}>
                <Typography variant="body2">
                    Prices are pulled in real-time from eBay&apos;s <strong>ConvertedCurrentPrice</strong> field (always in USD).
                    &nbsp;Low ticket: <strong>$0 – &lt;$20</strong>&nbsp; · &nbsp;
                    Mid ticket: <strong>$20 – &lt;$70</strong>&nbsp; · &nbsp;
                    High ticket: <strong>$70+</strong>
                </Typography>
            </Alert>

            {/* Seller selector + Fetch button */}
            <Paper elevation={1} sx={{ p: 2.5, mb: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                    <FormControl size="small" sx={{ minWidth: 260 }} disabled={sellersLoading}>
                        <InputLabel>Select Seller</InputLabel>
                        <Select
                            value={selectedSellerId}
                            label="Select Seller"
                            onChange={e => {
                                setSelectedSellerId(e.target.value);
                                setResult(null);
                                setError(null);
                            }}
                        >
                            {sellers.map(s => (
                                <MenuItem key={s._id} value={s._id}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <StorefrontIcon sx={{ fontSize: 16, color: '#666' }} />
                                        {s.user?.username || s._id}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Button
                        variant="contained"
                        size="medium"
                        startIcon={fetching ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                        onClick={handleFetch}
                        disabled={fetching || !selectedSellerId}
                        sx={{ minWidth: 170 }}
                    >
                        {fetching ? 'Fetching from eBay…' : 'Fetch Live Data'}
                    </Button>
                </Box>

                {fetching && (
                    <Box mt={2}>
                        <Typography variant="caption" color="textSecondary">
                            Paging through all active listings — this may take a moment for large accounts…
                        </Typography>
                    </Box>
                )}
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* Results */}
            {result && (
                <>
                    <Box display="flex" alignItems="center" gap={1.5} mb={2} flexWrap="wrap">
                        <StorefrontIcon sx={{ color: '#555' }} />
                        <Typography variant="h6" fontWeight={700}>{result.sellerName}</Typography>
                        <Chip label={`${result.tiers.total.toLocaleString()} active listings`} color="primary" />
                        <Typography variant="caption" color="textSecondary">
                            ({result.pagesFetched} page{result.pagesFetched !== 1 ? 's' : ''} fetched from eBay)
                        </Typography>
                    </Box>

                    <Grid container spacing={3}>
                        {TIERS.map(tier => (
                            <Grid item xs={12} sm={4} key={tier.key}>
                                <TierCard
                                    tier={tier}
                                    value={result.tiers[tier.key]}
                                    total={result.tiers.total}
                                />
                            </Grid>
                        ))}
                    </Grid>
                </>
            )}

            {/* Empty state */}
            {!result && !fetching && !error && (
                <Box
                    display="flex" flexDirection="column"
                    alignItems="center" justifyContent="center"
                    py={10} color="text.secondary"
                >
                    <SearchIcon sx={{ fontSize: 56, mb: 2, opacity: 0.25 }} />
                    <Typography variant="body1">
                        Select a seller and click <strong>Fetch Live Data</strong>
                    </Typography>
                </Box>
            )}
        </Container>
    );
}
