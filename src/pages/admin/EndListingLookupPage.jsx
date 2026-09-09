import { useState, useCallback } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Button, Chip, InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import AdminPageShell from '../../components/AdminPageShell';
import api from '../../lib/api';

// Maps the stored EndListingLog source to a human label + chip colour.
const SOURCE_META = {
  duplicate_sku:      { label: 'Duplicate SKU',      color: 'primary' },
  expiry_listing:     { label: 'Expiry Listing',     color: 'warning' },
  amazon_stock_check: { label: 'Amazon Stock Check',  color: 'info' },
  sku_listing_manager: { label: 'SKU Listing Manager', color: 'secondary' },
};

const countryLabel = (country) => {
  if (country === 'US') return 'US';
  if (country === 'UK') return 'UK';
  if (country === 'AU') return 'AU';
  if (country === 'Canada') return 'CA';
  return country || 'Unknown';
};

const dateFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric', month: 'short', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
});

const formatEndedAt = (iso) => {
  if (!iso) return '—';
  try { return `${dateFmt.format(new Date(iso))} PT`; }
  catch { return '—'; }
};

export default function EndListingLookupPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null); // null = no search yet
  const [searchedTerm, setSearchedTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/end-listing-logs/lookup', { params: { query: q } });
      setResults(Array.isArray(data.results) ? data.results : []);
      setSearchedTerm(q);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to look up end-listing history.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <AdminPageShell>
      <Box sx={{ maxWidth: 1100, mx: 'auto', py: 3, px: { xs: 1, sm: 2 } }}>

        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ManageSearchIcon color="error" />
            End-Listing Lookup
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Enter an eBay item ID or a SKU to see who ended it and when. SKU search also matches variants
            (e.g. <b>GRW25N4VFV</b> matches <b>GRW25N4VFV-1</b>).
          </Typography>
        </Box>

        {/* Search bar */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              label="Item ID or SKU"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}
              sx={{ flex: 1, minWidth: 260 }}
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
        {!loading && !error && results !== null && results.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No end-listing record found for <b>{searchedTerm}</b>.
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
              This item/SKU may not have been ended through the app, or was ended before logging was in place.
            </Typography>
          </Paper>
        )}

        {/* Results */}
        {!loading && !error && results !== null && results.length > 0 && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {results.length} record{results.length !== 1 ? 's' : ''} for <b>{searchedTerm}</b>
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'action.hover' } }}>
                    <TableCell>Ended At</TableCell>
                    <TableCell>Item ID</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Seller</TableCell>
                    <TableCell>Ended By</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell align="center">Country</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((row, idx) => {
                    const meta = SOURCE_META[row.source] || { label: row.source || 'Unknown', color: 'default' };
                    return (
                      <TableRow key={`${row.itemId}-${row.endedAt}-${idx}`} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatEndedAt(row.endedAt)}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{row.itemId}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{row.sku || '—'}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{row.sellerName}</TableCell>
                        <TableCell>{row.endedByName}</TableCell>
                        <TableCell>
                          <Chip size="small" label={meta.label} color={meta.color} variant="outlined" />
                        </TableCell>
                        <TableCell align="center">{countryLabel(row.country)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Box>
    </AdminPageShell>
  );
}
