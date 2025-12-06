import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Chip,
  Tooltip,
  IconButton,
  Stack,
  Divider,
  Button,
  Snackbar,
  Alert,
  Pagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Popover,
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import api from '../../lib/api';

// ... (Rest of the file remains unchanged until ManualTrackingCell)

function ManualTrackingCell({ order, onSaved, onCopy, onNotify }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [value, setValue] = useState(order.manualTrackingNumber || '');
  const [carrier, setCarrier] = useState('USPS');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sync state when order changes, but only if not currently editing
  useEffect(() => {
    if (!anchorEl) {
      setValue(order.manualTrackingNumber || '');
    }
  }, [order.manualTrackingNumber, anchorEl]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    setError('');
  };

  const handleClose = () => {
    setAnchorEl(null);
    setError('');
    // Reset value on close if not saved
    setValue(order.manualTrackingNumber || '');
    setCarrier('USPS');
  };

  const open = Boolean(anchorEl);
  const id = open ? `manual-tracking-popover-${order._id}` : undefined;

  const save = async () => {
    if (!value.trim()) {
      setError('Tracking number is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Upload tracking to eBay (this will also update the database)
      const { data } = await api.post(`/ebay/orders/${order._id}/upload-tracking`, {
        trackingNumber: value.trim(),
        shippingCarrier: carrier
      });

      if (data?.success) {
        onSaved(value.trim());
        handleClose();
        onNotify?.('success', `✅ Tracking uploaded via ${carrier}!`);
      } else {
        setError('Failed to upload');
        onNotify?.('error', 'Failed to upload tracking to eBay');
      }
    } catch (e) {
      const errorMsg = e?.response?.data?.error || 'Upload failed';
      // Check for error types to give better feedback
      if (e?.response?.data?.errorType === 'TRACKING_NOT_APPLIED') {
        setError('Verification Failed: Tracking not found on order.');
      } else {
        setError(errorMsg);
      }
      onNotify?.('error', `Failed: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* VIEW MODE */}
      <Stack direction="row" alignItems="center" spacing={1}>
        {order.manualTrackingNumber ? (
          <>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {order.manualTrackingNumber}
            </Typography>
            <IconButton
              size="small"
              onClick={() => onCopy?.(order.manualTrackingNumber)}
              aria-label="copy tracking"
            >
              <ContentCopyIcon fontSize="small" sx={{ fontSize: 14 }} />
            </IconButton>
            <IconButton size="small" onClick={handleClick} aria-label="edit tracking">
              <EditIcon fontSize="small" sx={{ fontSize: 16 }} />
            </IconButton>
          </>
        ) : (
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={handleClick}
            sx={{ textTransform: 'none', color: 'text.secondary', fontWeight: 400 }}
          >
            Add Tracking
          </Button>
        )}
      </Stack>

      {/* EDIT POPOVER */}
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: { p: 2, width: 320, mt: 1 }
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Upload Tracking to eBay
        </Typography>

        <Stack spacing={2}>
          <TextField
            label="Tracking Number"
            variant="outlined"
            size="small"
            fullWidth
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            placeholder="e.g. 9400..."
          />

          <FormControl size="small" fullWidth>
            <InputLabel>Carrier</InputLabel>
            <Select
              value={carrier}
              label="Carrier"
              onChange={(e) => setCarrier(e.target.value)}
            >
              <MenuItem value="USPS">USPS</MenuItem>
              <MenuItem value="UPS">UPS</MenuItem>
              <MenuItem value="FEDEX">FedEx</MenuItem>
              <MenuItem value="DHL">DHL</MenuItem>
              <MenuItem value="AUSTRALIA_POST">Australia Post</MenuItem>
              <MenuItem value="OTHER">Other</MenuItem>
            </Select>
          </FormControl>

          {error && (
            <Alert severity="error" sx={{ fontSize: '0.75rem', py: 0 }}>
              {error}
            </Alert>
          )}

          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ pt: 1 }}>
            <Button onClick={handleClose} disabled={saving} size="small" color="inherit">
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving || !value.trim()}
              variant="contained"
              size="small"
              disableElevation
            >
              {saving ? 'Uploading...' : 'Upload'}
            </Button>
          </Stack>
        </Stack>
      </Popover>
    </div>
  );
}

export default function AwaitingShipmentPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedShipping, setExpandedShipping] = useState({});
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Filter State
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchBuyerName, setSearchBuyerName] = useState('');
  const [searchMarketplace, setSearchMarketplace] = useState('');

  // Debounced Values
  const [debouncedOrderId, setDebouncedOrderId] = useState('');
  const [debouncedBuyerName, setDebouncedBuyerName] = useState('');

  // REF: To prevent unnecessary re-fetches
  const lastFetchedParams = useRef('');

  // 1. Fetch Sellers on Mount
  useEffect(() => {
    const loadSellers = async () => {
      try {
        const { data } = await api.get('/sellers/all');
        setSellers(data || []);
      } catch (e) {
        console.error("Failed to load sellers", e);
      }
    };
    loadSellers();
  }, []);

  // 2. Debounce Logic
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedOrderId(searchOrderId);
      if (searchOrderId !== debouncedOrderId) setPage(1);
    }, 500);
    return () => clearTimeout(handler);
    // eslint-disable-next-line
  }, [searchOrderId]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedBuyerName(searchBuyerName);
      if (searchBuyerName !== debouncedBuyerName) setPage(1);
    }, 500);
    return () => clearTimeout(handler);
    // eslint-disable-next-line
  }, [searchBuyerName]);

  // 3. Main Fetch Effect
  useEffect(() => {
    fetchAwaitingOrders();
    // eslint-disable-next-line
  }, [page, debouncedOrderId, debouncedBuyerName, selectedSeller, searchMarketplace]);

  // Handlers
  const handleSellerChange = (e) => {
    setSelectedSeller(e.target.value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchOrderId('');
    setSearchBuyerName('');
    setDebouncedOrderId('');
    setDebouncedBuyerName('');
    setSelectedSeller('');
    setSearchMarketplace('');
    setPage(1);
  };

  async function fetchAwaitingOrders() {
    setError('');

    try {
      // Build Params Object
      const params = {
        awaitingShipment: true,
        page: page,
        limit: 50
      };

      if (debouncedOrderId) params.searchOrderId = debouncedOrderId;
      if (debouncedBuyerName) params.searchBuyerName = debouncedBuyerName;
      if (selectedSeller) params.sellerId = selectedSeller;
      if (searchMarketplace) params.searchMarketplace = searchMarketplace;

      // SMART CHECK: If params haven't changed since last fetch, STOP.
      const paramsString = JSON.stringify(params);
      if (paramsString === lastFetchedParams.current) {
        return; // Skip fetch, prevent loading spinner
      }

      // Update ref and proceed
      lastFetchedParams.current = paramsString;
      setLoading(true);

      const { data } = await api.get('/ebay/stored-orders', { params });

      setOrders(data?.orders || []);

      if (data?.pagination) {
        setTotalPages(data.pagination.totalPages);
        setTotalOrders(data.pagination.totalOrders);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load awaiting shipment orders');
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = (text) => {
    if (!text || text === '-') return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
  };

  const showSnack = (severity, message) => {
    setSnack({ open: true, severity, message });
    setTimeout(() => setSnack(prev => ({ ...prev, open: false })), 2500);
  };

  const toggleShippingExpanded = (orderId) => {
    setExpandedShipping(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const formatDate = (dateStr, marketplaceId) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      let timeZone = 'UTC';
      let timeZoneLabel = 'UTC';

      if (marketplaceId === 'EBAY_US') {
        timeZone = 'America/Los_Angeles';
        timeZoneLabel = 'PT';
      } else if (marketplaceId === 'EBAY_CA' || marketplaceId === 'EBAY_ENCA') {
        timeZone = 'America/New_York';
        timeZoneLabel = 'ET';
      } else if (marketplaceId === 'EBAY_AU') {
        timeZone = 'Australia/Sydney';
        timeZoneLabel = 'AET';
      }

      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: timeZone,
      });

      const formattedTime = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timeZone,
      });

      return (
        <Stack spacing={0}>
          <Typography variant="body2">{formattedDate}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            {formattedTime} ({timeZoneLabel})
          </Typography>
        </Stack>
      );
    } catch {
      return '-';
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 100px)',
      overflow: 'hidden',
      width: '100%',
      maxWidth: '100%',
      p: 3
    }}>
      <Paper sx={{ p: 2, mb: 2, flexShrink: 0 }}>
        {/* HEADER - Refresh button removed as requested */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h5" fontWeight="bold">Awaiting Shipment</Typography>
          </Stack>
          <Chip label={`${totalOrders} awaiting`} color="warning" variant="outlined" />
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* --- FILTERS SECTION --- */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>

            {/* 1. SELLER FILTER */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="seller-select-label">Select Seller</InputLabel>
              <Select
                labelId="seller-select-label"
                value={selectedSeller}
                label="Select Seller"
                onChange={handleSellerChange}
              >
                <MenuItem value=""><em>All Sellers</em></MenuItem>
                {sellers.map((s) => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.user?.username || s.user?.email || s._id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 2. ORDER ID (Auto-debounced) */}
            <TextField
              size="small"
              label="Order ID"
              value={searchOrderId}
              onChange={(e) => setSearchOrderId(e.target.value)}
              placeholder="Search ID..."
            />

            {/* 3. BUYER NAME (Auto-debounced) */}
            <TextField
              size="small"
              label="Buyer Name"
              value={searchBuyerName}
              onChange={(e) => setSearchBuyerName(e.target.value)}
              placeholder="Search Buyer..."
            />

            {/* 4. MARKETPLACE FILTER */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="marketplace-select-label">Marketplace</InputLabel>
              <Select
                labelId="marketplace-select-label"
                value={searchMarketplace}
                label="Marketplace"
                onChange={(e) => {
                  setSearchMarketplace(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value=""><em>All</em></MenuItem>
                <MenuItem value="EBAY_US">EBAY_US</MenuItem>
                <MenuItem value="EBAY_AU">EBAY_AU</MenuItem>
                <MenuItem value="EBAY_ENCA">EBAY_CA</MenuItem>
              </Select>
            </FormControl>

            <Button variant="outlined" onClick={handleClearFilters} size="small">Clear</Button>
          </Stack>
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        )}
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress />
        </Box>
      ) : orders.length === 0 ? (
        <Box sx={{ textAlign: 'center', p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <LocalShippingIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
          <Typography variant="body1" color="text.secondary">
            No orders found matching criteria.
          </Typography>
        </Box>
      ) : (
        <>
          <TableContainer
            component={Paper}
            sx={{
              flexGrow: 1,
              overflow: 'auto',
              width: '100%',
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
                borderRadius: '10px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#888',
                borderRadius: '10px',
                '&:hover': {
                  backgroundColor: '#555',
                },
              },
            }}
          >
            <Table
              size="small"
              stickyHeader
              sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Seller</TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Order ID</TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Marketplace</TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Date Sold</TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Ship By</TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Product Name</TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Buyer Name</TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Zipcode</TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Shipping Address</TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Manual Tracking</TableCell>
                  <TableCell sx={{ backgroundColor: 'primary.main', color: 'white', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 100 }}>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order, idx) => (
                  <TableRow key={order._id || idx}>
                    <TableCell>
                      {order.seller?.user?.username || order.seller?.user?.email || order.sellerId || '-'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium" sx={{ color: 'primary.main' }}>
                        {order.orderId || order.legacyOrderId || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.purchaseMarketplaceId || 'Unknown'}
                        size="small"
                        variant="outlined"
                        color={
                          order.purchaseMarketplaceId === 'EBAY_US' ? 'primary' :
                            order.purchaseMarketplaceId === 'EBAY_CA' || order.purchaseMarketplaceId === 'EBAY_ENCA' ? 'secondary' :
                              order.purchaseMarketplaceId === 'EBAY_AU' ? 'success' :
                                'default'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {formatDate(order.dateSold, order.purchaseMarketplaceId)}
                    </TableCell>
                    <TableCell>
                      {formatDate(order.shipByDate || order.lineItems?.[0]?.lineItemFulfillmentInstructions?.shipByDate, order.purchaseMarketplaceId)}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={order.productName || order.lineItems?.[0]?.title || '-'} arrow>
                        <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                          {order.productName || order.lineItems?.[0]?.title || '-'}
                        </Typography>
                      </Tooltip>
                      <IconButton size="small" onClick={() => handleCopy(order.productName || order.lineItems?.[0]?.title || '-')} aria-label="copy product name">
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={order.buyer?.buyerRegistrationAddress?.fullName || '-'} arrow>
                        <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                          {order.buyer?.buyerRegistrationAddress?.fullName || '-'}
                        </Typography>
                      </Tooltip>
                      <IconButton size="small" onClick={() => handleCopy(order.buyer?.buyerRegistrationAddress?.fullName || '-')} aria-label="copy buyer name">
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Typography variant="body2">{order.shippingPostalCode || order.buyer?.buyerRegistrationAddress?.postalCode || '-'}</Typography>
                        <IconButton size="small" onClick={() => handleCopy(order.shippingPostalCode || order.buyer?.buyerRegistrationAddress?.postalCode || '-')} aria-label="copy postal code">
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300 }}>
                      {expandedShipping[order._id] ? (
                        <Stack spacing={0.5}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingFullName || '-'} arrow>
                              <Typography variant="body2" fontWeight="medium" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingFullName || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingFullName)}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingAddressLine1 || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingAddressLine1 || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingAddressLine1)}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingCity || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingCity || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingCity)}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingState || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingState || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingState)}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingPostalCode || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingPostalCode || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingPostalCode)}>
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          <Button
                            size="small"
                            onClick={() => toggleShippingExpanded(order._id)}
                            startIcon={<ExpandLessIcon />}
                            sx={{ mt: 0.5 }}
                          >
                            Collapse
                          </Button>
                        </Stack>
                      ) : (
                        <Button
                          size="small"
                          onClick={() => toggleShippingExpanded(order._id)}
                          endIcon={<ExpandMoreIcon />}
                          sx={{ textTransform: 'none' }}
                        >
                          {order.shippingFullName || 'View Address'}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <ManualTrackingCell
                        order={order}
                        onSaved={(newVal) => {
                          setOrders(prev => prev.map(o => (o._id === order._id ? { ...o, manualTrackingNumber: newVal } : o)));
                        }}
                        onCopy={handleCopy}
                        onNotify={showSnack}
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      <NotesCell
                        order={order}
                        onSaved={(newNotes) => {
                          setOrders(prev => prev.map(o => (o._id === order._id ? { ...o, notes: newNotes } : o)));
                        }}
                        onNotify={showSnack}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Paper sx={{
            py: 1,
            px: 2,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
            flexShrink: 0,
            mt: 2
          }}>
            <Typography variant="body2" color="text.secondary" fontSize="0.875rem">
              Showing {orders.length} orders (Page {page} of {totalPages})
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, value) => setPage(value)}
              color="primary"
              showFirstButton
              showLastButton
              size="small"
            />
          </Paper>
        </>
      )}

      <Snackbar open={snack.open} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.severity} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// ... Helper Components ...
// ManualTrackingCell has been moved up


function NotesCell({ order, onSaved, onNotify }) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(order.notes || '');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  useEffect(() => {
    setValue(order.notes || '');
  }, [order.notes]);

  const startEdit = () => {
    setError('');
    setEditing(true);
  };

  const cancel = () => {
    setValue(order.notes || '');
    setEditing(false);
    setError('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.patch(`/ebay/orders/${order._id}/notes`, { notes: value });
      if (data?.success) {
        onSaved(value);
        setEditing(false);
        onNotify?.('success', 'Notes saved');
      } else {
        setError('Failed to save');
        onNotify?.('error', 'Failed to save notes');
      }
    } catch (e) {
      const msg = e?.response?.data?.error || 'Save failed';
      setError(msg);
      onNotify?.('error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            style={{ padding: 6, minWidth: 180, minHeight: 60, resize: 'vertical' }}
            placeholder="Enter notes..."
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="small" variant="contained" onClick={save} disabled={saving}>Save</Button>
            <Button size="small" onClick={cancel} disabled={saving}>Cancel</Button>
          </div>
          {error && <Typography variant="caption" color="error">{error}</Typography>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Typography variant="body2" sx={{ fontSize: '0.85rem', maxWidth: 200, wordWrap: 'break-word' }}>
            {order.notes || '-'}
          </Typography>
          <Button size="small" onClick={startEdit} sx={{ alignSelf: 'flex-start' }}>
            {order.notes ? 'Edit' : 'Add Notes'}
          </Button>
        </div>
      )}
    </div>
  );
}