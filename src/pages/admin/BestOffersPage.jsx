import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Tooltip,
  Pagination,
  Tabs,
  Tab,
  Badge,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { alpha } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ReplyIcon from '@mui/icons-material/Reply';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import api from '../../lib/api';
import AdminPageShell from '../../components/AdminPageShell';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatMetricCard from '../../components/StatMetricCard';
import StatusChip from '../../components/StatusChip';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme';
import { dashboardSignatureTokens } from '../../theme/appTheme';
import {
  tableHeaderCellSx,
  tableBodyRowSx,
  tableBodyCellSx,
  tableContainerSx,
} from '../../theme/tableStyles';

// ─── Status chip tones (maps to StatusChip / dashboardSignatureTokens) ────────
const STATUS_TONES = {
  Active: 'warning',
  Accepted: 'success',
  Declined: 'danger',
  Expired: 'neutral',
  AdminEnded: 'neutral',
  Countered: 'info',
};

// ─── Per-action styling for the Respond dialog (header, toggle, CTA button) ──
const ACTION_META = {
  Accept: { icon: CheckCircleOutlineIcon, color: '#2e7d32', darkColor: '#1b5e20', textColor: '#fff', title: 'Accept Offer', cta: 'Confirm Accept' },
  Decline: { icon: CancelOutlinedIcon, color: '#c62828', darkColor: '#b71c1c', textColor: '#fff', title: 'Decline Offer', cta: 'Confirm Decline' },
  Counter: { icon: ReplyIcon, color: BRAND_YELLOW, darkColor: BRAND_YELLOW_DARK, textColor: BRAND_DARK, title: 'Counter Offer', cta: 'Send Counter Offer' },
};

function RespondDialog({ open, offer, onClose, onSubmit, loading }) {
  const [action, setAction] = useState('Accept');
  const [counterPrice, setCounterPrice] = useState('');
  const [counterQuantity, setCounterQuantity] = useState('1');
  const [sellerResponse, setSellerResponse] = useState('');

  useEffect(() => {
    if (open) {
      // Pre-select whichever action the row's button the user actually clicked.
      setAction(offer?._defaultAction || 'Accept');
      setCounterPrice(offer?.offerPrice ? String(offer.offerPrice) : '');
      setCounterQuantity(String(offer?.quantity || 1));
      setSellerResponse('');
    }
  }, [open, offer]);

  const handleSubmit = () => {
    onSubmit({ action, counterPrice, counterQuantity: parseInt(counterQuantity) || 1, sellerResponse });
  };

  const isValid = action !== 'Counter' || (counterPrice && parseFloat(counterPrice) > 0);
  const meta = ACTION_META[action];

  const listPrice = parseFloat(offer?.listingPrice || 0);
  const offerPrice = parseFloat(offer?.offerPrice || 0);
  const discountPct = listPrice > 0 && offerPrice > 0 ? Math.round((1 - offerPrice / listPrice) * 100) : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, bgcolor: meta.color, color: meta.textColor, display: 'flex', alignItems: 'center', gap: 1 }}>
        <meta.icon sx={{ fontSize: 22 }} />
        <Box>
          {meta.title}
          {offer && (
            <Typography variant="body2" sx={{ color: alpha(meta.textColor, 0.75), mt: 0.25, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {offer.title}
            </Typography>
          )}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {offer && (
          <Stack spacing={1.5} sx={{ mb: 2.5 }}>
            {/* Price comparison */}
            <Box sx={{ p: 1.5, bgcolor: alpha(BRAND_YELLOW, 0.08), borderRadius: 1.5, border: '1px solid', borderColor: alpha(BRAND_DARK, 0.08) }}>
              <Stack direction="row" alignItems="flex-end" spacing={3} flexWrap="wrap">
                {offer.imageUrl && (
                  <Box
                    component="img"
                    src={offer.imageUrl}
                    alt=""
                    sx={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 1, bgcolor: '#fff', border: '1px solid', borderColor: alpha(BRAND_DARK, 0.1), flexShrink: 0, alignSelf: 'center' }}
                  />
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, letterSpacing: 0.4 }}>
                    BUYER OFFER
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND_DARK }}>
                    {offer.offerCurrency} {offerPrice.toFixed(2)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, letterSpacing: 0.4 }}>
                    LISTING PRICE
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {offer.listingCurrency} {listPrice.toFixed(2)}
                  </Typography>
                </Box>
                {discountPct != null && discountPct > 0 && (
                  <Chip label={`${discountPct}% below listing`} size="small" sx={{ bgcolor: alpha('#2e7d32', 0.12), color: '#2e7d32', fontWeight: 700, mb: 0.5 }} />
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Offer for {offer.quantity || 1} item{(offer.quantity || 1) === 1 ? '' : 's'} · expires {offer.expirationTime ? new Date(offer.expirationTime).toLocaleString() : 'unknown'}
              </Typography>
            </Box>

            {/* Buyer / SKU / ASIN */}
            <Stack spacing={0.5}>
              <Typography variant="body2">
                <b>Buyer:</b> {offer.buyerId || '—'}{offer.buyerFeedbackScore > 0 ? ` (★ ${offer.buyerFeedbackScore})` : ''}
              </Typography>
              {offer.sku && (
                <Typography variant="body2">
                  <b>SKU:</b> {offer.sku}
                </Typography>
              )}
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <b>ASIN:</b>
                {offer.asin ? (
                  <>
                    {offer.asin}
                    <Tooltip title="Open on Amazon" arrow>
                      <IconButton size="small" onClick={() => window.open(offer.amazonLink, '_blank', 'noopener')} sx={{ p: 0.3 }}>
                        <OpenInNewIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </>
                ) : (
                  <Typography component="span" variant="body2" color="text.secondary">Not found</Typography>
                )}
              </Typography>
            </Stack>

            {offer.buyerMessage && (
              <Box sx={{ pl: 1.5, borderLeft: '3px solid', borderColor: BRAND_YELLOW, py: 0.25 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, letterSpacing: 0.4 }}>
                  BUYER SAYS
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>“{offer.buyerMessage}”</Typography>
              </Box>
            )}
          </Stack>
        )}

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>What would you like to do?</Typography>
        <ToggleButtonGroup value={action} exclusive onChange={(e, val) => val && setAction(val)} fullWidth sx={{ mb: 2.5 }}>
          <ToggleButton value="Accept" sx={{ fontWeight: 700, textTransform: 'none', '&.Mui-selected': { bgcolor: alpha('#2e7d32', 0.15), color: '#2e7d32', '&:hover': { bgcolor: alpha('#2e7d32', 0.22) } } }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 18, mr: 0.75 }} /> Accept
          </ToggleButton>
          <ToggleButton value="Decline" sx={{ fontWeight: 700, textTransform: 'none', '&.Mui-selected': { bgcolor: alpha('#c62828', 0.15), color: '#c62828', '&:hover': { bgcolor: alpha('#c62828', 0.22) } } }}>
            <CancelOutlinedIcon sx={{ fontSize: 18, mr: 0.75 }} /> Decline
          </ToggleButton>
          <ToggleButton value="Counter" sx={{ fontWeight: 700, textTransform: 'none', '&.Mui-selected': { bgcolor: alpha(BRAND_YELLOW_DARK, 0.18), color: BRAND_DARK, '&:hover': { bgcolor: alpha(BRAND_YELLOW_DARK, 0.26) } } }}>
            <ReplyIcon sx={{ fontSize: 18, mr: 0.75 }} /> Counter
          </ToggleButton>
        </ToggleButtonGroup>

        {action === 'Counter' && (
          <Stack spacing={2} sx={{ mb: 2.5, p: 1.5, bgcolor: alpha(BRAND_YELLOW, 0.06), borderRadius: 1.5 }}>
            <TextField
              label="Your Counter Price"
              type="number"
              value={counterPrice}
              onChange={e => setCounterPrice(e.target.value)}
              inputProps={{ min: 0.01, step: 0.01 }}
              required
              fullWidth
              helperText={offer ? `Buyer offered ${offer.offerCurrency} ${offerPrice.toFixed(2)} · listing price is ${offer.listingCurrency} ${listPrice.toFixed(2)}` : ' '}
            />
            <TextField
              label="Counter Quantity"
              type="number"
              value={counterQuantity}
              onChange={e => setCounterQuantity(e.target.value)}
              inputProps={{ min: 1, step: 1 }}
              fullWidth
            />
          </Stack>
        )}

        <TextField
          label={
            action === 'Decline'
              ? 'Reason for declining (optional)'
              : action === 'Counter'
              ? 'Message with your counter offer (optional)'
              : 'Message to buyer (optional)'
          }
          multiline
          rows={3}
          value={sellerResponse}
          onChange={e => setSellerResponse(e.target.value)}
          fullWidth
          inputProps={{ maxLength: 1000 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: BRAND_DARK }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!isValid || loading}
          startIcon={loading ? <CircularProgress size={16} sx={{ color: meta.textColor }} /> : null}
          sx={{
            bgcolor: meta.color,
            color: meta.textColor,
            fontWeight: 700,
            '&:hover': { bgcolor: meta.darkColor },
          }}
        >
          {loading ? 'Sending…' : meta.cta}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function BestOffersPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState(0);
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);

  // Buyer offers tab
  const OFFERS_PAGE_SIZE = 20;
  const [offers, setOffers] = useState([]); // full result set from the server
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const totalPages = Math.max(1, Math.ceil(offers.length / OFFERS_PAGE_SIZE));
  const pagedOffers = useMemo(
    () => offers.slice((currentPage - 1) * OFFERS_PAGE_SIZE, currentPage * OFFERS_PAGE_SIZE),
    [offers, currentPage]
  );
  const [loading, setLoading] = useState(false);
  const [respondTarget, setRespondTarget] = useState(null);
  const [respondLoading, setRespondLoading] = useState(false);

  // Eligible to send tab
  const [eligibleItems, setEligibleItems] = useState([]);
  const [eligibleTotal, setEligibleTotal] = useState(0);
  const [eligibleLoading, setEligibleLoading] = useState(false);

  // Shared alerts
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Fetch Sellers ─────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/sellers/all')
      .then(res => {
        setSellers(res.data);
        if (res.data.length > 0) setSelectedSeller(res.data[0]);
      })
      .catch(() => setError('Failed to load sellers.'));
  }, []);

  // ── Fetch Buyer Offers ────────────────────────────────────────────────────
  // The server walks every eBay result page internally and returns the full
  // set of active offers in one response, so pagination here is purely a
  // client-side slice of that list (see pagedOffers above).
  const fetchOffers = useCallback(async (page = 1) => {
    if (!selectedSeller) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const { data } = await api.get('/ebay/best-offers', {
        params: { sellerId: selectedSeller._id },
      });
      const fetched = data.offers || [];
      setOffers(fetched);
      setTotalEntries(data.totalEntries || fetched.length);
      const maxPage = Math.max(1, Math.ceil(fetched.length / OFFERS_PAGE_SIZE));
      setCurrentPage(Math.min(page, maxPage));
    } catch (err) {
      const msg = err.response?.data?.details || err.response?.data?.error || err.message;
      setError(`Failed to load offers: ${msg}`);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSeller]);

  // ── Fetch Eligible Items ──────────────────────────────────────────────────
  const fetchEligible = useCallback(async () => {
    if (!selectedSeller) return;
    setEligibleLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const { data } = await api.get('/ebay/eligible-offers', {
        params: { sellerId: selectedSeller._id },
      });
      setEligibleItems(data.items || []);
      setEligibleTotal(data.total || 0);
    } catch (err) {
      const msg = err.response?.data?.details || err.response?.data?.error || err.message;
      setError(`Failed to load eligible items: ${msg}`);
      setEligibleItems([]);
    } finally {
      setEligibleLoading(false);
    }
  }, [selectedSeller]);

  useEffect(() => {
    if (selectedSeller) {
      fetchOffers(1);
      fetchEligible();
    }
  }, [selectedSeller]);

  // ── Respond to Buyer Offer ─────────────────────────────────────────────────
  const handleRespond = async ({ action, counterPrice, counterQuantity, sellerResponse }) => {
    setRespondLoading(true);
    try {
      await api.post('/ebay/best-offers/respond', {
        sellerId: selectedSeller._id,
        itemId: respondTarget.itemId,
        bestOfferId: respondTarget.bestOfferId,
        action,
        counterPrice: action === 'Counter' ? counterPrice : undefined,
        counterQuantity: action === 'Counter' ? counterQuantity : undefined,
        sellerResponse: sellerResponse || undefined,
      });
      setSuccessMsg(`Offer ${action.toLowerCase()}ed successfully.`);
      setRespondTarget(null);
      fetchOffers(currentPage);
    } catch (err) {
      const msg = err.response?.data?.details || err.response?.data?.error || err.message;
      setError(`Action failed: ${msg}`);
    } finally {
      setRespondLoading(false);
    }
  };

  // ── Stat cards derived from current tab data ─────────────────────────────
  const statCards = useMemo(() => {
    if (tab === 0) {
      const uniqueItems = new Set(offers.map(o => o.itemId)).size;
      return [
        { label: 'Active Offers', value: totalEntries || offers.length, tone: (totalEntries || offers.length) > 0 ? 'warning' : 'neutral' },
        { label: 'Items with Offers', value: uniqueItems, tone: uniqueItems > 0 ? 'info' : 'neutral' },
      ];
    }
    const totalBuyers = eligibleItems.reduce((sum, i) => sum + (i.interestedBuyers || 0), 0);
    return [
      { label: 'Eligible Listings', value: eligibleTotal || eligibleItems.length, tone: (eligibleTotal || eligibleItems.length) > 0 ? 'info' : 'neutral' },
      { label: 'Interested Buyers', value: totalBuyers, tone: totalBuyers > 0 ? 'success' : 'neutral' },
    ];
  }, [tab, offers, totalEntries, eligibleItems, eligibleTotal]);

  const actionBtnSx = (color) => ({
    minWidth: 0,
    px: 1,
    py: 0.4,
    fontSize: '0.72rem',
    fontWeight: 700,
    borderRadius: 1,
    ...(color === 'accept' && { color: '#fff', bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }),
    ...(color === 'decline' && { color: '#fff', bgcolor: '#c62828', '&:hover': { bgcolor: '#b71c1c' } }),
    ...(color === 'counter' && { color: BRAND_DARK, bgcolor: BRAND_YELLOW, '&:hover': { bgcolor: BRAND_YELLOW_DARK } }),
  });

  const isRefreshing = tab === 0 ? loading : eligibleLoading;

  const indexBadgeSx = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: dashboardSignatureTokens.table.indexBadgeBackground,
    color: dashboardSignatureTokens.table.indexBadgeForeground,
    fontWeight: 700,
    fontSize: '0.875rem',
  };

  return (
    <AdminPageShell>
      {/* ── Header Card ── */}
      <SectionCard sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', lg: 'center' }} gap={2.5}>
          <Box>
            <PageHeader
              title="Best Offers"
              subtitle="View and respond to buyer offers, or send proactive offers to interested buyers."
              sx={{ pt: 0, pb: 0 }}
            />
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap" sx={{ width: { xs: '100%', lg: 'auto' } }}>
            <Autocomplete
              options={sellers}
              getOptionLabel={s => s.user?.username || s._id}
              value={selectedSeller}
              onChange={(_, v) => setSelectedSeller(v)}
              isOptionEqualToValue={(a, b) => a._id === b._id}
              renderInput={params => <TextField {...params} label="Seller" size="small" />}
              size="small"
              sx={{ minWidth: 200 }}
            />
            <Button
              variant="contained"
              startIcon={isRefreshing ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <RefreshIcon />}
              onClick={() => tab === 0 ? fetchOffers(1) : fetchEligible()}
              disabled={isRefreshing || !selectedSeller}
              sx={{
                bgcolor: BRAND_DARK, color: '#fff', fontWeight: 700, minHeight: 40,
                '&:hover': { bgcolor: alpha(BRAND_DARK, 0.82) },
                '&.Mui-disabled': { color: alpha('#fff', 0.35), bgcolor: alpha(BRAND_DARK, 0.38) },
              }}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>

        {/* ── Stat cards ── */}
        {((tab === 0 && !loading) || (tab === 1 && !eligibleLoading)) && (
          <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1.5 }}>
            {statCards.map(card => (
              <StatMetricCard key={card.label} label={card.label} value={card.value} tone={card.tone} />
            ))}
          </Box>
        )}
      </SectionCard>

      {/* ── Tabs ── */}
      <Tabs
        value={tab}
        onChange={(_, v) => { setTab(v); setError(''); setSuccessMsg(''); }}
        sx={{
          mb: 2.5,
          borderBottom: 1,
          borderColor: 'divider',
          '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 44 },
          '& .Mui-selected': { color: `${BRAND_DARK} !important` },
          '& .MuiTabs-indicator': { bgcolor: BRAND_YELLOW_DARK },
        }}
      >
        <Tab
          label={
            <Badge badgeContent={totalEntries || offers.length} color="warning" max={999} showZero={false}>
              <Box sx={{ pr: (totalEntries || offers.length) > 0 ? 1.5 : 0 }}>Buyer Offers</Box>
            </Badge>
          }
        />
        <Tab
          label={
            <Badge badgeContent={eligibleTotal || eligibleItems.length} color="info" max={999} showZero={false}>
              <Box sx={{ pr: (eligibleTotal || eligibleItems.length) > 0 ? 1.5 : 0 }}>Eligible to Send</Box>
            </Badge>
          }
        />
      </Tabs>

      {/* ── Alerts ── */}
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {successMsg && <Alert severity="success" onClose={() => setSuccessMsg('')} sx={{ mb: 2 }}>{successMsg}</Alert>}

      {/* ═══════════════════════════════════════════════════════════════════
           TAB 0 — Buyer Offers table
      ═══════════════════════════════════════════════════════════════════ */}
      {tab === 0 && (
        <>
          <TableContainer component={Paper} sx={tableContainerSx}>
            <Table size="small" sx={{ minWidth: 1100 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderCellSx} align="center">#</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Item</TableCell>
                  <TableCell sx={tableHeaderCellSx}>SKU</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, textAlign: 'right' }}>List Price</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, textAlign: 'right' }}>Offer Price</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, textAlign: 'right' }}>Qty</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Buyer</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Status</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Message</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Expires</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, textAlign: 'center' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 7 }}>
                      <CircularProgress size={36} sx={{ color: BRAND_YELLOW_DARK }} />
                    </TableCell>
                  </TableRow>
                ) : offers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      {selectedSeller ? 'No active buyer offers found.' : 'Select a seller to view offers.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedOffers.map((offer, idx) => (
                    <TableRow key={offer.bestOfferId} sx={tableBodyRowSx}>
                      <TableCell sx={tableBodyCellSx} align="center">
                        <Box component="span" sx={indexBadgeSx}>
                          {(currentPage - 1) * OFFERS_PAGE_SIZE + idx + 1}
                        </Box>
                      </TableCell>

                      {/* Item */}
                      <TableCell sx={{ ...tableBodyCellSx, maxWidth: 260 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {offer.imageUrl ? (
                            <Box
                              component="img"
                              src={offer.imageUrl}
                              alt=""
                              sx={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 1, bgcolor: '#fff', border: '1px solid', borderColor: alpha(BRAND_DARK, 0.1), flexShrink: 0 }}
                            />
                          ) : (
                            <Box sx={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1, bgcolor: alpha(BRAND_DARK, 0.05), flexShrink: 0 }}>
                              <ImageOutlinedIcon sx={{ fontSize: 24, color: alpha(BRAND_DARK, 0.3) }} />
                            </Box>
                          )}
                          <Box sx={{ minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Tooltip title={offer.title || ''} placement="top" arrow>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180, display: 'block' }}>
                                  {offer.title || offer.itemId}
                                </Typography>
                              </Tooltip>
                              <Tooltip title="View on eBay" arrow>
                                <IconButton size="small" onClick={() => window.open(`https://www.ebay.com/itm/${offer.itemId}`, '_blank', 'noopener')} sx={{ p: 0.3 }}>
                                  <OpenInNewIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                            <Typography variant="caption" color="text.secondary">ID: {offer.itemId}</Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* SKU */}
                      <TableCell sx={{ ...tableBodyCellSx, maxWidth: 120 }}>
                        {offer.sku ? (
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                            {offer.sku}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>

                      {/* List Price */}
                      <TableCell sx={{ ...tableBodyCellSx, textAlign: 'right' }}>
                        {offer.listingPrice ? `${offer.listingCurrency} ${parseFloat(offer.listingPrice).toFixed(2)}` : '—'}
                      </TableCell>

                      {/* Offer Price */}
                      <TableCell sx={{ ...tableBodyCellSx, textAlign: 'right', fontWeight: 700 }}>
                        {offer.offerPrice ? `${offer.offerCurrency} ${parseFloat(offer.offerPrice).toFixed(2)}` : '—'}
                      </TableCell>

                      {/* Qty */}
                      <TableCell sx={{ ...tableBodyCellSx, textAlign: 'right' }}>{offer.quantity || 1}</TableCell>

                      {/* Buyer */}
                      <TableCell sx={{ ...tableBodyCellSx, maxWidth: 140 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{offer.buyerId || '—'}</Typography>
                        {offer.buyerFeedbackScore > 0 && (
                          <Typography variant="caption" color="text.secondary">★ {offer.buyerFeedbackScore}</Typography>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell sx={tableBodyCellSx}>
                        <StatusChip label={offer.status} tone={STATUS_TONES[offer.status] || 'neutral'} />
                      </TableCell>

                      {/* Message */}
                      <TableCell sx={{ ...tableBodyCellSx, maxWidth: 180 }}>
                        {offer.buyerMessage ? (
                          <Tooltip title={offer.buyerMessage} placement="top" arrow>
                            <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160, display: 'block', cursor: 'default' }}>
                              {offer.buyerMessage}
                            </Typography>
                          </Tooltip>
                        ) : <Typography variant="body2" color="text.secondary">—</Typography>}
                      </TableCell>

                      {/* Expires */}
                      <TableCell sx={{ ...tableBodyCellSx, whiteSpace: 'nowrap' }}>
                        {offer.expirationTime ? new Date(offer.expirationTime).toLocaleString() : '—'}
                      </TableCell>

                      {/* Actions */}
                      <TableCell sx={{ ...tableBodyCellSx, textAlign: 'center' }}>
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Accept offer" arrow>
                            <Button variant="contained" size="small" startIcon={<CheckCircleOutlineIcon sx={{ fontSize: '14px !important' }} />} sx={actionBtnSx('accept')} onClick={() => setRespondTarget({ ...offer, _defaultAction: 'Accept' })}>
                              Accept
                            </Button>
                          </Tooltip>
                          <Tooltip title="Decline offer" arrow>
                            <Button variant="contained" size="small" startIcon={<CancelOutlinedIcon sx={{ fontSize: '14px !important' }} />} sx={actionBtnSx('decline')} onClick={() => setRespondTarget({ ...offer, _defaultAction: 'Decline' })}>
                              Decline
                            </Button>
                          </Tooltip>
                          <Tooltip title="Make counter offer" arrow>
                            <Button variant="contained" size="small" startIcon={<ReplyIcon sx={{ fontSize: '14px !important' }} />} sx={actionBtnSx('counter')} onClick={() => setRespondTarget({ ...offer, _defaultAction: 'Counter' })}>
                              Counter
                            </Button>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2.5 }}>
              <Pagination count={totalPages} page={currentPage} onChange={(_, p) => setCurrentPage(p)} color="primary" shape="rounded" />
            </Box>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
           TAB 1 — Eligible to Send Offers
      ═══════════════════════════════════════════════════════════════════ */}
      {tab === 1 && (
        <TableContainer component={Paper} sx={tableContainerSx}>
          <Table size="small" sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeaderCellSx} align="center">#</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Listing</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, textAlign: 'right' }}>Current Price</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, textAlign: 'right' }}>Min Offer Price</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, textAlign: 'center' }}>Interested Buyers</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, textAlign: 'center' }}>Status</TableCell>
                </TableRow>
              </TableHead>
            <TableBody>
              {eligibleLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 7 }}>
                    <CircularProgress size={36} sx={{ color: BRAND_YELLOW_DARK }} />
                  </TableCell>
                </TableRow>
              ) : eligibleItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    {selectedSeller ? 'No listings currently eligible for sending offers.' : 'Select a seller to view eligible listings.'}
                  </TableCell>
                </TableRow>
              ) : (
                eligibleItems.map((item, idx) => (
                  <TableRow key={item.listingId} sx={tableBodyRowSx}>
                    <TableCell sx={tableBodyCellSx} align="center">
                      <Box component="span" sx={indexBadgeSx}>{idx + 1}</Box>
                    </TableCell>

                    {/* Listing */}
                    <TableCell sx={{ ...tableBodyCellSx, maxWidth: 320 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {item.imageUrl ? (
                          <Box
                            component="img"
                            src={item.imageUrl}
                            alt=""
                            sx={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 1, bgcolor: '#fff', border: '1px solid', borderColor: alpha(BRAND_DARK, 0.1), flexShrink: 0 }}
                          />
                        ) : (
                          <Box sx={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1, bgcolor: alpha(BRAND_DARK, 0.05), flexShrink: 0 }}>
                            <ImageOutlinedIcon sx={{ fontSize: 24, color: alpha(BRAND_DARK, 0.3) }} />
                          </Box>
                        )}
                        <Box sx={{ minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={item.title || ''} placement="top" arrow>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220, display: 'block' }}>
                                {item.title || item.listingId}
                              </Typography>
                            </Tooltip>
                            <Tooltip title="View on eBay" arrow>
                              <IconButton size="small" onClick={() => window.open(`https://www.ebay.com/itm/${item.itemId || item.listingId}`, '_blank', 'noopener')} sx={{ p: 0.3 }}>
                                <OpenInNewIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Typography variant="caption" color="text.secondary">Listing ID: {item.listingId}</Typography>
                          {item.bestOfferEnabled === false && (
                            <Tooltip title="Counteroffers can't be sent for this listing until Best Offer is turned on in eBay Seller Hub." arrow>
                              <Typography variant="caption" sx={{ display: 'block', color: 'error.main', fontWeight: 600 }}>
                                Best Offer not enabled
                              </Typography>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>
                    </TableCell>

                    {/* Current Price */}
                    <TableCell sx={{ ...tableBodyCellSx, textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.currentPrice != null
                          ? `${item.currentPriceCurrency} ${parseFloat(item.currentPrice).toFixed(2)}`
                          : '—'}
                      </Typography>
                    </TableCell>

                    {/* Min Offer Price */}
                    <TableCell sx={{ ...tableBodyCellSx, textAlign: 'right' }}>
                      <Typography variant="body2">
                        {item.minimumOfferPrice
                          ? `${item.minimumOfferCurrency} ${parseFloat(item.minimumOfferPrice).toFixed(2)}`
                          : '—'}
                      </Typography>
                    </TableCell>

                    {/* Interested Buyers */}
                    <TableCell sx={{ ...tableBodyCellSx, textAlign: 'center' }}>
                      <StatusChip label={item.interestedBuyers} tone={item.interestedBuyers > 0 ? 'info' : 'neutral'} />
                    </TableCell>

                    {/* Status */}
                    <TableCell sx={{ ...tableBodyCellSx, textAlign: 'center' }}>
                      <StatusChip label={item.listingStatus} tone={item.listingStatus === 'ACTIVE' ? 'success' : 'neutral'} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Respond Dialog (Buyer Offers tab) ── */}
      <RespondDialog
        open={Boolean(respondTarget)}
        offer={respondTarget}
        onClose={() => setRespondTarget(null)}
        onSubmit={handleRespond}
        loading={respondLoading}
      />
    </AdminPageShell>
  );
}
