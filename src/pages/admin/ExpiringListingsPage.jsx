import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Button, Checkbox, Chip, CircularProgress,
  Alert, FormControl, InputLabel, Select, MenuItem, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Tooltip, Avatar, IconButton, Divider, Stack
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import SearchIcon from '@mui/icons-material/Search';
import StopIcon from '@mui/icons-material/Stop';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import api, { getAuthToken } from '../../lib/api';

export default function ExpiringListingsPage() {
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [fetching, setFetching] = useState(false);
  const [listings, setListings] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [fetchError, setFetchError] = useState('');
  const [progress, setProgress] = useState(null); // { page, totalPages, count }
  const [endingProgress, setEndingProgress] = useState(null);
  const [endingResults, setEndingResults] = useState(null);

  // Used to abort the SSE stream when user clicks Stop
  const readerRef = useRef(null);

  // Load sellers on mount
  useEffect(() => {
    api.get('/sellers/all')
      .then(res => setSellers(Array.isArray(res.data) ? res.data : []))
      .catch(() =>
        api.get('/sellers/me')
          .then(res => setSellers(res.data ? [res.data] : []))
          .catch(() => {})
      );
  }, []);

  const stopFetch = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.cancel().catch(() => {});
      readerRef.current = null;
    }
    setFetching(false);
  }, []);

  const fetchListings = useCallback(async () => {
    if (!selectedSeller) return;
    setFetching(true);
    setFetchError('');
    setListings([]);
    setProgress(null);
    setSelectedItems(new Set());
    setEndingResults(null);

    try {
      const baseURL = import.meta.env.VITE_API_URL;
      const token = getAuthToken();
      const response = await fetch(
        `${baseURL}/ebay/expiring-low-activity-listings?sellerId=${selectedSeller}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      readerRef.current = reader;
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
            setProgress({ page: evt.page, totalPages: evt.totalPages, count: evt.count });
          } else if (evt.type === 'done') {
            setListings(evt.listings || []);
          } else if (evt.type === 'error') {
            throw new Error(evt.error);
          }
        }
      }
    } catch (err) {
      // An AbortError or cancel just means user clicked Stop — not a real error
      if (err.name !== 'AbortError' && !err.message?.includes('cancel')) {
        setFetchError(err.message || 'Failed to fetch from eBay');
      }
    } finally {
      readerRef.current = null;
      setFetching(false);
    }
  }, [selectedSeller]);

  const toggleSelect = (itemId) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };

  const allSelected = listings.length > 0 && selectedItems.size === listings.length;
  const someSelected = selectedItems.size > 0 && !allSelected;

  const toggleSelectAll = () => {
    setSelectedItems(allSelected ? new Set() : new Set(listings.map(l => l.itemId)));
  };

  const endSelectedListings = async () => {
    const itemsToEnd = listings.filter(l => selectedItems.has(l.itemId));
    if (itemsToEnd.length === 0) return;

    setEndingProgress({ total: itemsToEnd.length, done: 0, success: 0, failed: 0 });
    setEndingResults(null);
    const results = { success: [], failed: [] };

    for (const item of itemsToEnd) {
      try {
        await api.post('/ebay/end-item', {
          sellerId: selectedSeller,
          itemId: item.itemId,
          endingReason: 'NotAvailable',
        });
        results.success.push(item.itemId);
      } catch (err) {
        results.failed.push({
          itemId: item.itemId,
          title: item.title,
          error: err.response?.data?.error || err.message,
        });
      }
      setEndingProgress(prev => ({
        ...prev,
        done: prev.done + 1,
        success: results.success.length,
        failed: results.failed.length,
      }));
    }

    setListings(prev => prev.filter(l => !results.success.includes(l.itemId)));
    setSelectedItems(new Set());
    setEndingProgress(null);
    setEndingResults(results);
  };

  const sellerName = sellers.find(s => s._id === selectedSeller)?.user?.username || '';

  const formatTimeLeft = (h, m) => {
    if (h === 0 && m === 0) return '< 1 min';
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const timeLeftColor = (h) => {
    if (h < 1) return '#d32f2f';
    if (h < 6) return '#ed6c02';
    return '#1976d2';
  };

  const pct = progress && progress.totalPages > 0
    ? Math.round((progress.page / progress.totalPages) * 100)
    : 0;

  return (
    <Box sx={{ p: 3, maxWidth: 1300, mx: 'auto' }}>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Expiring Low-Activity Listings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Active listings expiring within 24 hours, with fewer than 5 watchers, fewer than 5 views (30-day), and 0 sold.
        </Typography>
      </Box>

      {/* Controls + Progress */}
      <Paper elevation={1} sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>Select Seller</InputLabel>
            <Select
              value={selectedSeller}
              label="Select Seller"
              disabled={fetching}
              onChange={e => {
                setSelectedSeller(e.target.value);
                setListings([]);
                setEndingResults(null);
                setFetchError('');
                setProgress(null);
              }}
            >
              {sellers.map(s => (
                <MenuItem key={s._id} value={s._id}>
                  {s.user?.username || s._id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!fetching ? (
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={fetchListings}
              disabled={!selectedSeller}
              sx={{ height: 40 }}
            >
              Fetch Expiring Listings
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="error"
              startIcon={<StopIcon />}
              onClick={stopFetch}
              sx={{ height: 40 }}
            >
              Stop
            </Button>
          )}
        </Stack>

        {/* Progress bar */}
        {fetching && (
          <Box mt={2.5}>
            {progress ? (
              <>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Page <strong>{progress.page}</strong> of <strong>{progress.totalPages}</strong>
                    &nbsp;·&nbsp;
                    <strong>{progress.count}</strong> match{progress.count !== 1 ? 'es' : ''} found so far
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {pct}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{ borderRadius: 2, height: 6 }}
                />
              </>
            ) : (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Connecting to eBay…
                </Typography>
                <LinearProgress sx={{ borderRadius: 2, height: 6 }} />
              </>
            )}
          </Box>
        )}
      </Paper>

      {/* Error */}
      {fetchError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFetchError('')}>
          {fetchError}
        </Alert>
      )}

      {/* End Listing Progress */}
      {endingProgress && (
        <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Typography variant="body2" fontWeight={600} mb={1}>
            Ending listings… {endingProgress.done}/{endingProgress.total}
            &nbsp;({endingProgress.success} succeeded, {endingProgress.failed} failed)
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(endingProgress.done / endingProgress.total) * 100}
            sx={{ borderRadius: 2, height: 8 }}
          />
        </Paper>
      )}

      {/* End Results */}
      {endingResults && (
        <Stack spacing={1} mb={2}>
          {endingResults.success.length > 0 && (
            <Alert severity="success">
              Successfully ended {endingResults.success.length} listing{endingResults.success.length !== 1 ? 's' : ''}.
            </Alert>
          )}
          {endingResults.failed.length > 0 && (
            <Alert severity="error">
              Failed to end {endingResults.failed.length} listing{endingResults.failed.length !== 1 ? 's' : ''}:
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                {endingResults.failed.map(f => (
                  <li key={f.itemId}>
                    <strong>{f.itemId}</strong> — {f.error}
                  </li>
                ))}
              </ul>
            </Alert>
          )}
        </Stack>
      )}

      {/* Listings Table */}
      {listings.length > 0 && (
        <>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={1.5}
            flexWrap="wrap"
            gap={1}
          >
            <Typography variant="body2" color="text.secondary">
              <strong>{listings.length}</strong> listing{listings.length !== 1 ? 's' : ''} found
              {sellerName ? ` for ${sellerName}` : ''}
              {selectedItems.size > 0 && ` · ${selectedItems.size} selected`}
            </Typography>
            <Button
              variant="contained"
              color="error"
              size="small"
              startIcon={<StopCircleOutlinedIcon />}
              onClick={endSelectedListings}
              disabled={selectedItems.size === 0 || !!endingProgress}
            >
              End {selectedItems.size > 0 ? `${selectedItems.size} ` : ''}Selected
            </Button>
          </Box>

          <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f5f5f5' } }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      indeterminate={someSelected}
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                      checkedIcon={<CheckBoxIcon fontSize="small" />}
                    />
                  </TableCell>
                  <TableCell>Image</TableCell>
                  <TableCell>Title / SKU</TableCell>
                  <TableCell>Item ID</TableCell>
                  <TableCell align="center">Price</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Time remaining before listing ends">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        <AccessTimeIcon fontSize="small" /> Time Left
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Watchers">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        <BookmarkBorderIcon fontSize="small" /> Watchers
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Views in last 30 days">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                        <VisibilityIcon fontSize="small" /> Views (30d)
                      </Box>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">Qty Sold</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {listings.map(listing => {
                  const isSelected = selectedItems.has(listing.itemId);
                  return (
                    <TableRow
                      key={listing.itemId}
                      hover
                      selected={isSelected}
                      sx={{ cursor: 'pointer', '&.Mui-selected': { bgcolor: '#fff8e1' } }}
                      onClick={() => toggleSelect(listing.itemId)}
                    >
                      <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          onChange={() => toggleSelect(listing.itemId)}
                        />
                      </TableCell>

                      <TableCell>
                        <Avatar src={listing.mainImageUrl} variant="rounded" sx={{ width: 48, height: 48 }}>?</Avatar>
                      </TableCell>

                      <TableCell sx={{ maxWidth: 320 }}>
                        <Typography variant="body2" fontWeight={600} noWrap title={listing.title}>
                          {listing.title}
                        </Typography>
                        {listing.sku && (
                          <Typography variant="caption" color="text.secondary">SKU: {listing.sku}</Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{listing.itemId}</Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600}>
                          {listing.currency !== 'USD'
                            ? `${listing.currency} ${listing.currentPrice?.toFixed(2)}`
                            : `$${listing.currentPriceUSD?.toFixed(2)}`}
                        </Typography>
                        {listing.currency !== 'USD' && (
                          <Typography variant="caption" color="text.secondary">
                            ≈ ${listing.currentPriceUSD?.toFixed(2)} USD
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="center">
                        <Chip
                          icon={<AccessTimeIcon />}
                          label={formatTimeLeft(listing.hoursLeft, listing.minutesLeft)}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            color: '#fff',
                            bgcolor: timeLeftColor(listing.hoursLeft),
                            '& .MuiChip-icon': { color: '#fff' },
                          }}
                        />
                      </TableCell>

                      <TableCell align="center">
                        <Chip
                          label={listing.watchCount}
                          size="small"
                          color={listing.watchCount === 0 ? 'default' : 'warning'}
                          variant={listing.watchCount === 0 ? 'outlined' : 'filled'}
                        />
                      </TableCell>

                      <TableCell align="center">
                        <Chip
                          label={listing.hitCount}
                          size="small"
                          color={listing.hitCount === 0 ? 'default' : 'info'}
                          variant={listing.hitCount === 0 ? 'outlined' : 'filled'}
                        />
                      </TableCell>

                      <TableCell align="center">
                        <Typography variant="body2">{listing.quantitySold}</Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {listing.categoryName || '—'}
                        </Typography>
                      </TableCell>

                      <TableCell onClick={e => e.stopPropagation()}>
                        <Tooltip title="View on eBay">
                          <IconButton
                            size="small"
                            href={`https://www.ebay.com/itm/${listing.itemId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Divider sx={{ my: 2 }} />

          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              color="error"
              startIcon={<StopCircleOutlinedIcon />}
              onClick={endSelectedListings}
              disabled={selectedItems.size === 0 || !!endingProgress}
            >
              End {selectedItems.size > 0 ? `${selectedItems.size} Selected` : 'Selected'} Listing{selectedItems.size !== 1 ? 's' : ''}
            </Button>
          </Box>
        </>
      )}

      {/* Empty state */}
      {!fetching && !fetchError && listings.length === 0 && selectedSeller && !progress && (
        <Paper
          elevation={0}
          sx={{ p: 4, textAlign: 'center', borderRadius: 2, border: '1px dashed #ddd' }}
        >
          <Typography color="text.secondary">
            No listings match the criteria (expiring in &lt;24h, watchers &lt;5, views &lt;5, sold = 0).
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

