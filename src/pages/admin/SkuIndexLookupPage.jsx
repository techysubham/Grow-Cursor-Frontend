import { useState, useCallback } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Alert, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Button, Chip, InputAdornment, Link, Stack, Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import StorefrontIcon from '@mui/icons-material/Storefront';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AdminPageShell from '../../components/AdminPageShell';
import api from '../../lib/api';

const formatSyncedAt = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '—';
  }
};

const formatPrice = (price, currency) => {
  if (price === null || price === undefined || price === '') return '—';
  const value = Number(price);
  if (Number.isNaN(value)) return '—';
  return `${currency ? `${currency} ` : ''}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Deeper than MUI's default elevation so each card lifts clearly off the
// white page instead of blending into it.
const cardShadow = '0 2px 6px rgba(15, 23, 42, 0.10), 0 10px 28px rgba(15, 23, 42, 0.16)';

/**
 * Search any SKU or ASIN and see which sellers carry it, straight from the
 * SellerSkuIndex collection the daily SKU Index Sync populates.
 */
export default function SkuIndexLookupPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null); // null = no search yet
  const [searchedTerm, setSearchedTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/ebay/sku-index/lookup', { params: { query: q } });
      setResult(data);
      setSearchedTerm(q);
    } catch (err) {
      setError(err.response?.data?.details || err.response?.data?.error || 'Failed to look up the SKU index.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const sellers = result?.sellers || [];

  return (
    <AdminPageShell>
      <Box sx={{ maxWidth: 1200, mx: 'auto', py: 3, px: { xs: 1, sm: 2 } }}>

        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TravelExploreIcon color="primary" />
            SKU / ASIN Lookup
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Enter a SKU or an Amazon ASIN to see which sellers carry it, based on the SKU index synced
            from eBay each morning. SKU search matches variants (<b>GRW25N4VFV</b> finds <b>GRW25N4VFV-1</b>),
            and an ASIN is resolved to the SKUs listed for it.
          </Typography>
        </Box>

        {/* Search bar */}
        <Paper sx={{ p: 2, mb: 3, boxShadow: cardShadow }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              label="SKU or ASIN"
              placeholder="e.g. GRW25N4VFV or B0CFXYZ123"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
              sx={{ flex: 1, minWidth: 280 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              onClick={runSearch}
              disabled={loading || !query.trim()}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
            >
              Search
            </Button>
          </Box>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {/* No results */}
        {!loading && !error && result && sellers.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center', boxShadow: cardShadow }}>
            <Typography color="text.secondary">
              No seller has <b>{searchedTerm}</b> in their synced SKU index.
            </Typography>
            {result.knownSkusForAsin?.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  This ASIN is listed in the database under {result.knownSkusForAsin.length} SKU
                  {result.knownSkusForAsin.length !== 1 ? 's' : ''} — none of them are currently in the index:
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap justifyContent="center" sx={{ mt: 1 }}>
                  {result.knownSkusForAsin.map((sku) => (
                    <Chip key={sku} label={sku} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
                  ))}
                </Stack>
              </Box>
            )}
            <Typography variant="caption" color="text.disabled" sx={{ mt: 2, display: 'block' }}>
              The index holds each seller's active listings as of their last SKU Index Sync, so an item
              listed after this morning's run will not appear until tomorrow.
            </Typography>
          </Paper>
        )}

        {/* Results */}
        {!loading && !error && sellers.length > 0 && (
          <>
            {/* Summary */}
            <Paper sx={{ p: 2, mb: 4, boxShadow: cardShadow }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                {result.totalListings} listing{result.totalListings !== 1 ? 's' : ''} across{' '}
                {result.sellerCount} seller{result.sellerCount !== 1 ? 's' : ''} for <b>{searchedTerm}</b>
              </Typography>

              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
                <Chip
                  size="small"
                  label={result.queryType === 'asin' ? 'Searched as ASIN' : 'Searched as SKU'}
                  color={result.queryType === 'asin' ? 'warning' : 'primary'}
                  variant="outlined"
                />
                {result.asins?.map((asin) => (
                  <Chip
                    key={asin}
                    size="small"
                    variant="outlined"
                    color="warning"
                    sx={{ fontFamily: 'monospace' }}
                    label={(
                      <Link
                        href={`https://www.amazon.com/dp/${asin}`}
                        target="_blank"
                        rel="noopener"
                        underline="hover"
                        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: 'inherit' }}
                      >
                        {asin}<OpenInNewIcon sx={{ fontSize: 12 }} />
                      </Link>
                    )}
                  />
                ))}
                {result.matchedSkus?.slice(0, 12).map((sku) => (
                  <Chip key={sku} size="small" label={sku} variant="outlined" sx={{ fontFamily: 'monospace' }} />
                ))}
                {result.matchedSkus?.length > 12 && (
                  <Chip size="small" label={`+${result.matchedSkus.length - 12} more SKUs`} variant="outlined" />
                )}
              </Stack>

              {result.truncated && (
                <Alert severity="info" sx={{ mt: 1.5 }}>
                  Showing the 500 most recently synced matches — narrow the search for a complete list.
                </Alert>
              )}
            </Paper>

            {/* One block per seller */}
            {sellers.map((seller) => (
              <Paper key={seller.sellerId} sx={{ mb: 4, overflow: 'hidden', boxShadow: cardShadow }}>
                <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <StorefrontIcon fontSize="small" color="action" />
                  <Typography variant="subtitle1" fontWeight={700} sx={{ flexGrow: 1 }}>
                    {seller.sellerName}
                  </Typography>
                  <Chip
                    size="small"
                    color="success"
                    variant="outlined"
                    label={`${seller.listingCount} listing${seller.listingCount !== 1 ? 's' : ''}`}
                  />
                  <Tooltip title="Most recent SKU Index Sync covering these listings" arrow>
                    <Typography variant="caption" color="text.secondary">
                      synced {formatSyncedAt(seller.lastSyncedAt)}
                    </Typography>
                  </Tooltip>
                </Box>
                <Divider />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
                        <TableCell>Item ID</TableCell>
                        <TableCell>SKU</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell>ASIN</TableCell>
                        <TableCell>Last Synced</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {seller.listings.map((row) => (
                        <TableRow key={`${seller.sellerId}-${row.itemId}`} hover>
                          <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                            <Link
                              href={`https://www.ebay.com/itm/${row.itemId}`}
                              target="_blank"
                              rel="noopener"
                              underline="hover"
                              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4 }}
                            >
                              {row.itemId}<OpenInNewIcon sx={{ fontSize: 12 }} />
                            </Link>
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{row.sku || '—'}</TableCell>
                          <TableCell sx={{ maxWidth: 420 }}>
                            <Typography variant="body2" noWrap title={row.title}>
                              {row.title || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            {formatPrice(row.price, row.currency)}
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                            {row.asin ? (
                              <Link href={`https://www.amazon.com/dp/${row.asin}`} target="_blank" rel="noopener" underline="hover">
                                {row.asin}
                              </Link>
                            ) : '—'}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatSyncedAt(row.syncedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            ))}
          </>
        )}
      </Box>
    </AdminPageShell>
  );
}
