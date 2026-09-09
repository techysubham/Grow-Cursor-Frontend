import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse, Divider, IconButton,
  InputAdornment, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import AdminPageShell from '../../components/AdminPageShell';
import PageHeader from '../../components/PageHeader';
import api from '../../lib/api';

/**
 * Every ASIN swap applied from the Amazon Stock Check page.
 *
 * A revision is the only place the two listing rows are tied together —
 * templatelistings stores no eBay item id — so this is where "which listing was
 * this SKU built on top of, and what did it replace" gets answered.
 */

const STATUS_META = {
  success: { label: 'Success', color: 'success' },
  pending: { label: 'Pending', color: 'warning' },
  failed: { label: 'Failed', color: 'error' }
};

const dateFmt = new Intl.DateTimeFormat('en-US', {
  year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
});

function formatDateTime(iso) {
  if (!iso) return '—';
  try { return dateFmt.format(new Date(iso)); } catch { return '—'; }
}

function formatPrice(value, currency) {
  if (value == null) return '—';
  return `${Number(value).toFixed(2)}${currency ? ` ${currency}` : ''}`;
}

// Before and after sit side by side everywhere on this page, so the pairing is
// one component rather than repeated markup per field.
function BeforeAfter({ label, before, after, mono = false }) {
  const changed = String(before ?? '') !== String(after ?? '');
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="flex-start">
        <Typography
          variant="body2"
          sx={{
            flex: 1, p: 1, borderRadius: 1, bgcolor: 'action.hover', width: '100%',
            fontFamily: mono ? 'monospace' : undefined,
            textDecoration: changed ? 'line-through' : 'none',
            color: changed ? 'text.secondary' : 'text.primary', wordBreak: 'break-word'
          }}
        >
          {before || '—'}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            flex: 1, p: 1, borderRadius: 1, width: '100%',
            bgcolor: changed ? 'success.light' : 'action.hover',
            fontFamily: mono ? 'monospace' : undefined,
            fontWeight: changed ? 600 : 400, wordBreak: 'break-word'
          }}
        >
          {after || '—'}
        </Typography>
      </Stack>
    </Box>
  );
}

function ImageStrip({ title, images = [] }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">{title} ({images.length})</Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 0.5, overflowX: 'auto', pb: 1 }}>
        {images.length === 0 && <Typography variant="body2" color="text.secondary">—</Typography>}
        {images.map((url) => (
          <Box
            key={url}
            component="img"
            src={url}
            alt=""
            loading="lazy"
            sx={{ width: 64, height: 64, objectFit: 'contain', border: '1px solid', borderColor: 'divider', borderRadius: 1, flexShrink: 0, bgcolor: 'background.paper' }}
          />
        ))}
      </Stack>
    </Box>
  );
}

function RevisionDetail({ revisionId }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get(`/amazon-stock-checks/revisions/${revisionId}`)
      .then(({ data }) => { if (!cancelled) setDetail(data); })
      .catch((err) => { if (!cancelled) setError(err.response?.data?.error || 'Failed to load the revision.'); });
    return () => { cancelled = true; };
  }, [revisionId]);

  if (error) return <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>;
  if (!detail) return <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress size={22} /></Box>;

  const { before = {}, after = {} } = detail;

  return (
    <Box sx={{ py: 2, px: 1 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Chip size="small" label={`Item ${detail.itemId}`} />
        {detail.templateName && <Chip size="small" variant="outlined" label={`Template: ${detail.templateName}`} />}
        {detail.sellerName && <Chip size="small" variant="outlined" label={detail.sellerName} />}
        <Chip size="small" variant="outlined" label={`Category ${before.categoryId || '—'}${before.categoryName ? ` · ${before.categoryName}` : ''}`} />
      </Stack>

      {detail.bookkeepingError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          eBay accepted the revise, but the new listing row was not saved: {detail.bookkeepingError}
        </Alert>
      )}
      {detail.error && <Alert severity="error" sx={{ mb: 2 }}>{detail.error}</Alert>}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Left is what was live before the revise (read from eBay, not from the database). Right is what replaced it.
      </Typography>

      <BeforeAfter label="ASIN" before={detail.previousAsin} after={detail.newAsin} mono />
      <BeforeAfter label="SKU" before={detail.previousSku} after={detail.newSku} mono />
      <BeforeAfter label="Title" before={before.title} after={after.title} />
      <BeforeAfter
        label="Price"
        before={formatPrice(before.price, before.currency)}
        after={formatPrice(after.price, after.currency || before.currency)}
      />

      <Divider sx={{ my: 2 }} />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <ImageStrip title="Images before" images={before.images || []} />
        <ImageStrip title="Images after" images={after.images || []} />
      </Stack>

      {(after.itemSpecifics?.length > 0 || before.itemSpecifics?.length > 0) && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" color="text.secondary">Item specifics</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 0.5 }}>
            {[['Before', before.itemSpecifics], ['After', after.itemSpecifics]].map(([label, specifics]) => (
              <Box key={label} sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1, mt: 0.5 }}>
                  {(specifics || []).length === 0 && <Typography variant="body2" color="text.secondary">—</Typography>}
                  {(specifics || []).map((s) => (
                    <Typography key={s.name} variant="body2" sx={{ fontSize: 12 }}>
                      <strong>{s.name}:</strong> {s.value}
                    </Typography>
                  ))}
                </Box>
              </Box>
            ))}
          </Stack>
        </>
      )}

      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary">Description after</Typography>
      <Box
        sx={{
          mt: 0.5, p: 1, maxHeight: 260, overflow: 'auto', border: '1px solid',
          borderColor: 'divider', borderRadius: 1, fontSize: 12,
          '& img': { maxWidth: '100%', height: 'auto' }
        }}
        dangerouslySetInnerHTML={{ __html: after.description || '<em>None</em>' }}
      />
    </Box>
  );
}

export default function ListingRevisionsPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/amazon-stock-checks/revisions', {
        params: { page: page + 1, limit: rowsPerPage, status: status || undefined, search: search || undefined }
      });
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load listing revisions.');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, status, search]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const submitSearch = () => {
    setPage(0);
    setSearch(searchInput.trim());
  };

  return (
    <AdminPageShell>
      <PageHeader
        title="Listing Revisions"
        subtitle="eBay listings repointed at a new ASIN from the Amazon Stock Check page. The item ID stays; the SKU, title, description, price and pictures are replaced."
      />

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small"
            label="Search"
            placeholder="Item ID, SKU or ASIN"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') submitSearch(); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ flex: 1, minWidth: 240 }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(event) => { setPage(0); setStatus(event.target.value); }}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="success">Success</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
          </TextField>
          <Button variant="contained" onClick={submitSearch}>Search</Button>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchRows}><RefreshIcon /></IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={40} />
              <TableCell>Item ID</TableCell>
              <TableCell>ASIN</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Title</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell>Seller</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>By</TableCell>
              <TableCell>When</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell>
              </TableRow>
            )}

            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {search || status ? 'No revisions match this filter.' : 'No listings have been revised to a new ASIN yet.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {!loading && rows.map((row) => {
              const expanded = expandedId === row._id;
              const meta = STATUS_META[row.status] || { label: row.status, color: 'default' };
              return (
                <Fragment key={row._id}>
                  <TableRow hover sx={{ '& > *': { borderBottom: expanded ? 'unset' : undefined } }}>
                    <TableCell>
                      <IconButton size="small" onClick={() => setExpandedId(expanded ? null : row._id)}>
                        {expanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{row.itemId}</Typography>
                        <IconButton
                          size="small"
                          href={`https://www.ebay.com/itm/${row.itemId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <OpenInNewIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', textDecoration: 'line-through' }}>
                        {row.previousAsin || '—'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{row.newAsin}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', textDecoration: 'line-through' }}>
                        {row.previousSku || '—'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{row.newSku}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography variant="body2" noWrap title={row.newTitle}>{row.newTitle || '—'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                        {formatPrice(row.previousPrice, row.currency)}
                      </Typography>
                      <Typography variant="body2">{formatPrice(row.newPrice, row.currency)}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2">{row.sellerName || '—'}</Typography></TableCell>
                    <TableCell>
                      <Chip size="small" label={meta.label} color={meta.color} />
                      {row.bookkeepingError && (
                        <Tooltip title={row.bookkeepingError}>
                          <Chip size="small" color="warning" variant="outlined" label="Row not saved" sx={{ ml: 0.5 }} />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell><Typography variant="body2">{row.requestedBy || '—'}</Typography></TableCell>
                    <TableCell><Typography variant="body2">{formatDateTime(row.appliedAt || row.createdAt)}</Typography></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={10} sx={{ py: 0, borderBottom: expanded ? undefined : 'none' }}>
                      <Collapse in={expanded} unmountOnExit>
                        {expanded && <RevisionDetail revisionId={row._id} />}
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(event, next) => setPage(next)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[25, 50, 100, 200]}
        />
      </TableContainer>
    </AdminPageShell>
  );
}
