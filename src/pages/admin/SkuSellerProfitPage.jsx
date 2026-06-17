import { useCallback, useEffect, useMemo, useState } from 'react';
import { alpha } from '@mui/material/styles';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Fade,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import api from '../../lib/api';
import AdminPageShell from '../../components/AdminPageShell.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { BRAND_DARK } from '../../constants/brandTheme.js';
import { dashboardSignatureTokens } from '../../theme/appTheme.js';
import {
  tableBodyCellSx,
  tableBodyRowSx,
  tableContainerSx,
  tableHeaderCellSx,
  tableIndexBadgeSx,
  yellowFilledButtonSx,
  yellowOutlinedButtonSx,
} from '../../theme/tableStyles.js';

const T = dashboardSignatureTokens;

function sellerName(seller) {
  return seller?.user?.username || seller?.user?.email || seller?._id || 'Unknown';
}

function money(value, currency = '$') {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return `${currency}${number.toFixed(2)}`;
}

function inr(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return `₹${number.toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function ToneChip({ label, tone = 'neutral' }) {
  const t = T.tones[tone] || T.tones.neutral;
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        height: 24,
        fontSize: '0.72rem',
        fontWeight: 800,
        bgcolor: t.background,
        color: t.color,
        border: `1px solid ${t.border}`,
      }}
    />
  );
}

function DetailTable({ title, icon, columns, emptyLabel, children }) {
  return (
    <Box sx={{ minWidth: 520 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        {icon}
        <Typography variant="subtitle2" fontWeight={900} sx={{ color: BRAND_DARK }}>
          {title}
        </Typography>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map(column => (
              <TableCell key={column} sx={{ ...tableHeaderCellSx, py: 1 }}>
                {column}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {children || (
            <TableRow>
              <TableCell colSpan={columns.length} sx={tableBodyCellSx}>
                <Typography variant="body2" color="text.secondary">{emptyLabel}</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
}

function SkuRow({ row, index }) {
  const [open, setOpen] = useState(false);
  const profitTone = Number(row.totalProfit || 0) >= 0 ? 'success' : 'danger';

  return (
    <>
      <TableRow hover sx={tableBodyRowSx}>
        <TableCell sx={{ ...tableBodyCellSx, width: 56 }}>
          <Box sx={{ ...tableIndexBadgeSx, width: 28, height: 28 }}>{index + 1}</Box>
        </TableCell>
        <TableCell sx={tableBodyCellSx}>
          <Typography fontFamily="'JetBrains Mono', monospace" fontWeight={900} sx={{ color: BRAND_DARK }}>
            {row.sku}
          </Typography>
        </TableCell>
        <TableCell sx={tableBodyCellSx}><ToneChip label={`${row.sellerCount} sellers`} tone="info" /></TableCell>
        <TableCell sx={tableBodyCellSx}><ToneChip label={`${row.listingCount} listings`} tone="warning" /></TableCell>
        <TableCell sx={tableBodyCellSx}>{money(row.minTemplatePrice)} - {money(row.maxTemplatePrice)}</TableCell>
        <TableCell sx={tableBodyCellSx}>{money(row.avgTemplatePrice)}</TableCell>
        <TableCell sx={tableBodyCellSx}>{row.orderCount}</TableCell>
        <TableCell sx={tableBodyCellSx}>{money(row.totalSubtotal)}</TableCell>
        <TableCell sx={tableBodyCellSx}><ToneChip label={inr(row.totalProfit)} tone={profitTone} /></TableCell>
        <TableCell align="right" sx={tableBodyCellSx}>
          <Tooltip title={open ? 'Hide details' : 'View listings and orders'}>
            <IconButton onClick={() => setOpen(value => !value)} size="small">
              {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={10} sx={{ p: 0, borderBottom: open ? `1px solid ${alpha(BRAND_DARK, 0.08)}` : 'none' }}>
          <Collapse in={open} unmountOnExit>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' },
                gap: 2,
                p: 2,
                bgcolor: alpha(BRAND_DARK, 0.018),
                overflowX: 'auto',
              }}
            >
              <DetailTable
                title="Template Listings"
                icon={<StorefrontIcon sx={{ fontSize: 18, color: alpha(BRAND_DARK, 0.55) }} />}
                columns={['Seller', 'Template', 'Price', 'Status', 'Title']}
                emptyLabel="No template listings found."
              >
                {row.listings?.map(listing => (
                  <TableRow key={listing.id}>
                    <TableCell sx={tableBodyCellSx}>{listing.sellerName}</TableCell>
                    <TableCell sx={tableBodyCellSx}>{listing.templateName}</TableCell>
                    <TableCell sx={tableBodyCellSx}>{money(listing.startPrice)}</TableCell>
                    <TableCell sx={tableBodyCellSx}>{listing.status || '-'}</TableCell>
                    <TableCell sx={{ ...tableBodyCellSx, maxWidth: 360 }}>
                      <Typography noWrap variant="body2">{listing.title || '-'}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </DetailTable>
              <DetailTable
                title="Recent Matching Orders"
                icon={<ReceiptLongIcon sx={{ fontSize: 18, color: alpha(BRAND_DARK, 0.55) }} />}
                columns={['Order ID', 'Seller', 'Date', 'Subtotal', 'Profit', 'Product']}
                emptyLabel="No orders found for this SKU."
              >
                {row.orders?.length ? row.orders.map(order => (
                  <TableRow key={order.orderId}>
                    <TableCell sx={tableBodyCellSx}>{order.orderId}</TableCell>
                    <TableCell sx={tableBodyCellSx}>{order.sellerName || '-'}</TableCell>
                    <TableCell sx={tableBodyCellSx}>{formatDate(order.dateSold)}</TableCell>
                    <TableCell sx={tableBodyCellSx}>{money(order.subtotal)}</TableCell>
                    <TableCell sx={tableBodyCellSx}>{inr(order.profit)}</TableCell>
                    <TableCell sx={{ ...tableBodyCellSx, maxWidth: 360 }}>
                      <Typography noWrap variant="body2">{order.productName || '-'}</Typography>
                    </TableCell>
                  </TableRow>
                )) : null}
              </DetailTable>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function SkuSellerProfitPage() {
  const [sellers, setSellers] = useState([]);
  const [sellerId, setSellerId] = useState('all');
  const [search, setSearch] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ rows: [], pagination: { total: 0, pages: 0 } });
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [error, setError] = useState('');

  const sortedSellers = useMemo(() => [...sellers].sort((a, b) => sellerName(a).localeCompare(sellerName(b))), [sellers]);

  useEffect(() => {
    api.get('/sellers/all')
      .then(({ data }) => setSellers(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load sellers.'))
      .finally(() => setLoadingSellers(false));
  }, []);

  const fetchRows = useCallback(async (nextPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/template-listings/sku-seller-order-profit', {
        params: {
          sellerId,
          search: search.trim(),
          orderFrom: createdFrom,
          orderTo: createdTo,
          page: nextPage,
          limit: 25,
          ordersPerSku: 5,
        },
      });
      setResult(data);
      setPage(nextPage);
      setHasSearched(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load SKU seller profit report.');
    } finally {
      setLoading(false);
    }
  }, [createdFrom, createdTo, search, sellerId]);

  const rows = result.rows || [];
  const pagination = result.pagination || { total: null, pages: null, hasNextPage: false };

  return (
    <Fade in timeout={500}>
      <AdminPageShell>
        <SectionCard sx={{ p: { xs: 2, md: 3 }, mb: 3, background: T.surfaces.pageCard }}>
          <Stack direction={{ xs: 'column', xl: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', xl: 'center' }} gap={2}>
            <PageHeader
              title="SKU Seller Profit"
              subtitle="Start from orders in a date range, then check where those SKUs exist in seller template listings."
              sx={{ pt: 0, pb: 0 }}
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 240 }} disabled={loadingSellers || loading}>
                <InputLabel>Seller</InputLabel>
                <Select
                  label="Seller"
                  value={sellerId}
                  onChange={event => {
                    setSellerId(event.target.value);
                    setPage(1);
                  }}
                >
                  <MenuItem value="all">All sellers</MenuItem>
                  {sortedSellers.map(seller => (
                    <MenuItem key={seller._id} value={seller._id}>{sellerName(seller)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small"
                label="Search SKU or title"
                value={search}
                onChange={event => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter') fetchRows(1);
                }}
                sx={{ minWidth: { xs: '100%', md: 260 } }}
              />
              <TextField
                size="small"
                label="Order From"
                type="date"
                value={createdFrom}
                onChange={event => {
                  setCreatedFrom(event.target.value);
                  setPage(1);
                }}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: { xs: '100%', md: 160 } }}
              />
              <TextField
                size="small"
                label="Order To"
                type="date"
                value={createdTo}
                onChange={event => {
                  setCreatedTo(event.target.value);
                  setPage(1);
                }}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: createdFrom || undefined }}
                sx={{ minWidth: { xs: '100%', md: 160 } }}
              />
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={() => fetchRows(1)}
                disabled={loading}
                sx={{ ...yellowFilledButtonSx, minWidth: 110 }}
              >
                Search
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => fetchRows(page)}
                disabled={loading || !hasSearched}
                sx={{ ...yellowOutlinedButtonSx, minWidth: 110 }}
              >
                Refresh
              </Button>
            </Stack>
          </Stack>
        </SectionCard>

        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 99 }} />}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <SectionCard sx={{ overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${alpha(BRAND_DARK, 0.08)}` }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
              <Typography variant="subtitle1" fontWeight={900} sx={{ color: BRAND_DARK }}>
                Ordered SKUs and seller template presence
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <ToneChip label={`Page ${page}`} tone={rows.length > 0 ? 'warning' : 'success'} />
                {pagination.scannedListings ? (
                  <Typography variant="caption" color="text.secondary">
                    scanned {pagination.scannedListings.toLocaleString()} listings
                  </Typography>
                ) : null}
              </Stack>
            </Stack>
          </Box>

          {!hasSearched && !loading ? (
            <Box sx={{ py: 7, textAlign: 'center' }}>
              <Typography fontWeight={800} color="text.secondary">Choose an order date range, then click Search.</Typography>
            </Box>
          ) : rows.length === 0 && !loading ? (
            <Box sx={{ py: 7, textAlign: 'center' }}>
              <Typography fontWeight={800} color="text.secondary">No ordered SKUs found for this date range.</Typography>
            </Box>
          ) : (
            <>
              <TableContainer sx={{ ...tableContainerSx, maxHeight: 'calc(100vh - 350px)', overflow: 'auto' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ ...tableHeaderCellSx, width: 56 }}>#</TableCell>
                      <TableCell sx={tableHeaderCellSx}>SKU</TableCell>
                      <TableCell sx={tableHeaderCellSx}>Sellers</TableCell>
                      <TableCell sx={tableHeaderCellSx}>Listings</TableCell>
                      <TableCell sx={tableHeaderCellSx}>Template Price Range</TableCell>
                      <TableCell sx={tableHeaderCellSx}>Avg Template Price</TableCell>
                      <TableCell sx={tableHeaderCellSx}>Orders</TableCell>
                      <TableCell sx={tableHeaderCellSx}>Order Subtotal</TableCell>
                      <TableCell sx={tableHeaderCellSx}>Profit</TableCell>
                      <TableCell sx={{ ...tableHeaderCellSx, width: 52 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, index) => (
                      <SkuRow key={row.sku} row={row} index={(page - 1) * 25 + index} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {(page > 1 || pagination.hasNextPage) && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, borderTop: `1px solid ${alpha(BRAND_DARK, 0.08)}` }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Button
                      variant="outlined"
                      startIcon={<NavigateBeforeIcon />}
                      onClick={() => fetchRows(Math.max(1, page - 1))}
                      disabled={loading || page <= 1}
                      sx={yellowOutlinedButtonSx}
                    >
                      Previous
                    </Button>
                    <ToneChip label={`Page ${page}`} tone="neutral" />
                    <Button
                      variant="outlined"
                      endIcon={<NavigateNextIcon />}
                      onClick={() => fetchRows(page + 1)}
                      disabled={loading || !pagination.hasNextPage}
                      sx={yellowOutlinedButtonSx}
                    >
                      Next
                    </Button>
                  </Stack>
                </Box>
              )}
            </>
          )}
        </SectionCard>
      </AdminPageShell>
    </Fade>
  );
}
