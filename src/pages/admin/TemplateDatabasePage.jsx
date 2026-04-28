import { useState, useEffect } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import { 
  Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, Chip, Stack, IconButton, Link as MuiLink, FormControl,
  InputLabel, Select, MenuItem, TextField, Collapse, Pagination, Alert,
  useMediaQuery, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, Grid, Skeleton, CircularProgress
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SearchIcon from '@mui/icons-material/Search';
import StorageIcon from '@mui/icons-material/Storage';
import VisibilityIcon from '@mui/icons-material/Visibility';
import api from '../../lib/api';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';
import { dashboardSignatureTokens } from '../../theme/appTheme.js';

// ── Skeleton loader for grouped seller blocks ────────────────────────────────
function SellerGroupSkeleton() {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{
        p: 2, mb: 1, borderRadius: 2,
        backgroundColor: alpha(BRAND_DARK, 0.08),
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <Skeleton variant="text" width={180} height={28} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: 3 }} />
      </Box>
      <Box sx={{ border: `1px solid ${alpha(BRAND_DARK, 0.08)}`, borderRadius: 2, overflow: 'hidden' }}>
        {[1, 2, 3, 4].map(i => (
          <Box key={i} sx={{
            px: 2, py: 1.5,
            borderBottom: i < 4 ? `1px solid ${alpha(BRAND_DARK, 0.06)}` : 'none',
            display: 'flex', gap: 2, alignItems: 'center',
            backgroundColor: i % 2 === 0 ? alpha(BRAND_DARK, 0.02) : 'transparent'
          }}>
            <Skeleton variant="text" width={30} height={20} />
            <Skeleton variant="rounded" width={100} height={20} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rounded" width={120} height={20} sx={{ borderRadius: 1 }} />
            <Skeleton variant="text" sx={{ flex: 1 }} height={20} />
            <Skeleton variant="rounded" width={70} height={22} sx={{ borderRadius: 3 }} />
            <Skeleton variant="rounded" width={50} height={20} />
            <Skeleton variant="circular" width={28} height={28} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function TemplateDatabasePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dashboardTheme = theme.customTokens?.dashboardSignature || dashboardSignatureTokens;

  // ── Style tokens ─────────────────────────────────────────────────────────────
  const surfaceCardSx = {
    borderRadius: `${dashboardTheme.radius.card}px`,
    border: '1px solid',
    borderColor: alpha(BRAND_DARK, 0.08),
    backgroundColor: theme.palette.background.paper,
    boxShadow: dashboardTheme.shadows.card
  };

  const tableContainerSx = {
    borderRadius: `${dashboardTheme.radius.card}px`,
    border: '1px solid',
    borderColor: alpha(BRAND_DARK, 0.1),
    boxShadow: dashboardTheme.shadows.table,
    overflow: 'hidden'
  };

  const tableHeaderCellSx = {
    fontWeight: 700,
    fontSize: '0.72rem',
    letterSpacing: 0.55,
    textTransform: 'uppercase',
    color: alpha(theme.palette.common.white, 0.96),
    backgroundColor: BRAND_DARK,
    borderBottom: 'none',
    py: 1.5
  };

  const tableBodyRowSx = {
    '& td': { borderBottomColor: alpha(BRAND_DARK, 0.07) },
    '&:nth-of-type(even) td': { backgroundColor: dashboardTheme.table.rowStripe },
    '&:hover td': { backgroundColor: `${dashboardTheme.table.rowHover} !important` }
  };

  const yellowFilledButtonSx = {
    minHeight: 38, px: 2, borderRadius: 1.5,
    color: BRAND_DARK, backgroundColor: BRAND_YELLOW, fontWeight: 700,
    boxShadow: `0 6px 16px ${alpha(BRAND_YELLOW_DARK, 0.2)}`,
    '&:hover': { backgroundColor: BRAND_YELLOW_DARK },
    '&.Mui-disabled': { color: alpha(BRAND_DARK, 0.35), backgroundColor: alpha(BRAND_YELLOW, 0.38), boxShadow: 'none' }
  };

  const activeFilterChipSx = {
    fontWeight: 600,
    backgroundColor: alpha(BRAND_YELLOW, 0.2),
    color: BRAND_DARK,
    border: `1px solid ${BRAND_YELLOW_DARK}`,
    '& .MuiChip-deleteIcon': { color: alpha(BRAND_DARK, 0.5), '&:hover': { color: BRAND_DARK } }
  };
  const selectSx = {
    '& label.Mui-focused': { color: '#b8860b' },
    '& .MuiOutlinedInput-root': { '&.Mui-focused fieldset': { borderColor: '#b8860b' } }
  };

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [selectedSeller, setSelectedSeller] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Data state ───────────────────────────────────────────────────────────────
  const [listings, setListings] = useState([]);
  const [groupedListings, setGroupedListings] = useState({});
  const [sellers, setSellers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState({});

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSellers, setExpandedSellers] = useState(new Set());

  // ── Details dialog state ─────────────────────────────────────────────────────
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);

  useEffect(() => {
    Promise.all([fetchSellers(), fetchTemplates(), fetchStats()])
      .finally(() => setInitialLoading(false));
  }, []);

  useEffect(() => {
    fetchListings();
  }, [selectedSeller, selectedTemplate, statusFilter, searchQuery, pagination.page]);

  useEffect(() => {
    const grouped = {};
    listings.forEach(listing => {
      const sellerName = listing.sellerId?.user?.username || listing.sellerId?.user?.email || 'Unassigned';
      if (!grouped[sellerName]) grouped[sellerName] = [];
      grouped[sellerName].push(listing);
    });
    setGroupedListings(grouped);
    setExpandedSellers(new Set(Object.keys(grouped)));
  }, [listings]);

  const fetchSellers = async () => {
    try {
      const { data } = await api.get('/sellers/all');
      setSellers(data || []);
    } catch (err) { console.error('Error fetching sellers:', err); }
  };

  const fetchTemplates = async () => {
    try {
      const { data } = await api.get('/listing-templates');
      setTemplates(data || []);
    } catch (err) { console.error('Error fetching templates:', err); }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/template-listings/database-stats');
      setStats(data || {});
    } catch (err) { console.error('Error fetching stats:', err); }
  };

  const fetchListings = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (selectedSeller) params.sellerId = selectedSeller;
      if (selectedTemplate) params.templateId = selectedTemplate;
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const { data } = await api.get('/template-listings/database-view', { params });
      setListings(data.listings || []);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => navigator.clipboard.writeText(text);

  const handleViewDetails = (listing) => {
    setSelectedListing(listing);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsDialogOpen(false);
    setSelectedListing(null);
  };

  const toggleSeller = (sellerName) => {
    setExpandedSellers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sellerName)) newSet.delete(sellerName);
      else newSet.add(sellerName);
      return newSet;
    });
  };

  const clearAllFilters = () => {
    setSelectedSeller('');
    setSelectedTemplate('');
    setStatusFilter('');
    setSearchQuery('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = selectedSeller || selectedTemplate || statusFilter || searchQuery;

  const filteredTemplates = selectedSeller
    ? templates.filter(t => listings.some(l => l.templateId?._id === t._id && l.sellerId?._id === selectedSeller))
    : templates;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, pb: 4, backgroundColor: theme.palette.background.paper, minHeight: '100vh' }}>

      {/* Page Header */}
      <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between"
        alignItems={{ xs: 'stretch', lg: 'center' }} spacing={2} sx={{ mb: 3, pt: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{
            width: 40, height: 40, borderRadius: 2,
            background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${alpha(BRAND_DARK, 0.8)} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 12px ${alpha(BRAND_DARK, 0.25)}`
          }}>
            <StorageIcon sx={{ color: BRAND_YELLOW, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ color: BRAND_DARK, letterSpacing: -0.5 }}>
              Template Listings Database
            </Typography>
          </Box>
        </Stack>

        {/* Stat Chips */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {[
            { label: `Total: ${stats.total || 0}`, accent: BRAND_YELLOW },
            { label: `Sellers: ${stats.sellers || 0}`, accent: alpha(BRAND_DARK, 0.12) },
            { label: `Templates: ${stats.templates || 0}`, accent: alpha(BRAND_DARK, 0.12) },
          ].map(({ label, accent }) => (
            <Chip key={label} label={label} size="small" sx={{
              fontWeight: 700,
              backgroundColor: accent,
              color: BRAND_DARK,
              border: `1px solid ${alpha(BRAND_DARK, 0.15)}`
            }} />
          ))}
          {stats.draft > 0 && (
            <Chip label={`Draft: ${stats.draft}`} size="small" sx={{
              fontWeight: 600, backgroundColor: alpha(BRAND_DARK, 0.07), color: BRAND_DARK,
              border: `1px solid ${alpha(BRAND_DARK, 0.12)}`
            }} />
          )}
          {stats.active > 0 && (
            <Chip label={`Active: ${stats.active}`} size="small" sx={{
              fontWeight: 600, backgroundColor: 'rgba(22,163,74,0.12)', color: '#166534',
              border: '1px solid rgba(22,163,74,0.25)'
            }} />
          )}
        </Stack>
      </Stack>

      {/* Filter Bar */}
      <Paper sx={{ ...surfaceCardSx, p: 2.5, mb: 3 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: alpha(BRAND_DARK, 0.45), display: 'block', mb: 1.5 }}>
          Filters
        </Typography>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormControl sx={{ minWidth: 200, ...selectSx }} size="small">
              <InputLabel>Seller</InputLabel>
              <Select value={selectedSeller} onChange={(e) => { setSelectedSeller(e.target.value); setSelectedTemplate(''); setPagination(prev => ({ ...prev, page: 1 })); }} label="Seller">
                <MenuItem value="">All Sellers</MenuItem>
                {sellers.map(seller => (
                  <MenuItem key={seller._id} value={seller._id}>{seller.user?.username || seller.user?.email || 'Unknown'}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200, ...selectSx }} size="small">
              <InputLabel>Template</InputLabel>
              <Select value={selectedTemplate} onChange={(e) => { setSelectedTemplate(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }} label="Template">
                <MenuItem value="">All Templates</MenuItem>
                {filteredTemplates.map(template => (
                  <MenuItem key={template._id} value={template._id}>{template.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150, ...selectSx }} size="small">
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }} label="Status">
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <TextField
            fullWidth
            size="small"
            placeholder="Search by ASIN, SKU, or Title..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
            sx={{
              '& label.Mui-focused': { color: '#b8860b' },
              '& .MuiOutlinedInput-root': { '&.Mui-focused fieldset': { borderColor: '#b8860b' } }
            }}
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: alpha(BRAND_DARK, 0.4), fontSize: 18 }} /> }}
          />

          {hasActiveFilters && (
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap>
              <Typography variant="caption" sx={{ fontWeight: 600, color: alpha(BRAND_DARK, 0.5) }}>Active filters:</Typography>
              {selectedSeller && (
                <Chip label={`Seller: ${sellers.find(s => s._id === selectedSeller)?.user?.username || 'Unknown'}`}
                  onDelete={() => setSelectedSeller('')} size="small" sx={activeFilterChipSx} />
              )}
              {selectedTemplate && (
                <Chip label={`Template: ${templates.find(t => t._id === selectedTemplate)?.name || 'Unknown'}`}
                  onDelete={() => setSelectedTemplate('')} size="small" sx={activeFilterChipSx} />
              )}
              {statusFilter && (
                <Chip label={`Status: ${statusFilter}`} onDelete={() => setStatusFilter('')} size="small" sx={activeFilterChipSx} />
              )}
              {searchQuery && (
                <Chip label={`Search: "${searchQuery}"`} onDelete={() => setSearchQuery('')} size="small" sx={activeFilterChipSx} />
              )}
              <Button size="small" onClick={clearAllFilters}
                sx={{ color: BRAND_DARK, fontWeight: 600, textDecoration: 'underline', p: 0, minWidth: 0, '&:hover': { textDecoration: 'underline', backgroundColor: 'transparent' } }}>
                Clear All
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* ── Loading State ── */}
      {(initialLoading || (loading && listings.length === 0)) ? (
        <Box>
          {[1, 2].map(i => <SellerGroupSkeleton key={i} />)}
        </Box>

      ) : loading && listings.length > 0 ? (
        /* Overlay spinner during filter/search refetch */
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 3, gap: 1.5 }}>
            <CircularProgress size={22} sx={{ color: BRAND_YELLOW_DARK }} />
            <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.5), fontWeight: 500 }}>
              Updating listings…
            </Typography>
          </Box>
          {/* Dim the old content */}
          <Box sx={{ opacity: 0.35, pointerEvents: 'none' }}>
            {Object.keys(groupedListings).slice(0, 1).map(n => <SellerGroupSkeleton key={n} />)}
          </Box>
        </Box>

      ) : Object.keys(groupedListings).length === 0 ? (
        <Paper sx={{ ...surfaceCardSx, p: 5, textAlign: 'center', background: dashboardTheme.surfaces.emptyState }}>
          <StorageIcon sx={{ fontSize: 48, color: alpha(BRAND_DARK, 0.15), mb: 1 }} />
          <Typography color="text.secondary" fontWeight={500}>
            {hasActiveFilters ? 'No listings found matching your filters.' : 'No listings found. Add listings from the Add Template Listings page.'}
          </Typography>
          {hasActiveFilters && (
            <Button onClick={clearAllFilters} sx={{ mt: 2, ...yellowFilledButtonSx }}>Clear Filters</Button>
          )}
        </Paper>

      ) : (
        <Stack spacing={3}>
          {Object.entries(groupedListings).map(([sellerName, sellerListings]) => {
            const isExpanded = expandedSellers.has(sellerName);
            return (
              <Box key={sellerName}>
                {/* Seller Header */}
                <Box
                  onClick={() => toggleSeller(sellerName)}
                  sx={{
                    px: 2.5, py: 1.5, mb: 0,
                    background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${alpha(BRAND_DARK, 0.88)} 100%)`,
                    borderRadius: isExpanded ? '12px 12px 0 0' : '12px',
                    cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    boxShadow: `0 4px 16px ${alpha(BRAND_DARK, 0.2)}`,
                    borderBottom: isExpanded ? `2px solid ${BRAND_YELLOW}` : 'none',
                    transition: 'border-radius 0.2s ease',
                    '&:hover': { background: `linear-gradient(135deg, ${alpha(BRAND_DARK, 0.92)} 0%, ${alpha(BRAND_DARK, 0.78)} 100%)` }
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#fff', letterSpacing: 0.2 }}>
                    {sellerName}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={`${sellerListings.length} listing${sellerListings.length !== 1 ? 's' : ''}`}
                      size="small"
                      sx={{ backgroundColor: BRAND_YELLOW, color: BRAND_DARK, fontWeight: 700, border: `1px solid ${BRAND_YELLOW_DARK}` }}
                    />
                    <IconButton size="small" sx={{ color: BRAND_YELLOW }}>
                      {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  </Stack>
                </Box>

                {/* Listings Content */}
                <Collapse in={isExpanded}>
                  {/* MOBILE: Card view */}
                  <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' }, mt: 1, mb: 2 }}>
                    {sellerListings.map((listing, index) => (
                      <Paper key={listing._id} sx={{ ...surfaceCardSx, p: 2 }}>
                        <Stack spacing={1.5}>
                          <Typography variant="caption" sx={{ color: alpha(BRAND_DARK, 0.4), fontWeight: 600 }}>#{index + 1}</Typography>

                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography variant="caption" sx={{ minWidth: 50, color: alpha(BRAND_DARK, 0.45), fontWeight: 600 }}>ASIN:</Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: BRAND_DARK }}>
                              {listing._asinReference || 'N/A'}
                            </Typography>
                            {listing._asinReference && (
                              <IconButton size="small" onClick={() => handleCopy(listing._asinReference)} sx={{ '&:hover': { color: BRAND_DARK, backgroundColor: alpha(BRAND_YELLOW, 0.2) } }}>
                                <ContentCopyIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            )}
                          </Stack>

                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography variant="caption" sx={{ minWidth: 50, color: alpha(BRAND_DARK, 0.45), fontWeight: 600 }}>SKU:</Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: alpha(BRAND_DARK, 0.05), px: 1, py: 0.25, borderRadius: 1, fontWeight: 600, color: BRAND_DARK }}>
                              {listing.customLabel}
                            </Typography>
                            <IconButton size="small" onClick={() => handleCopy(listing.customLabel)} sx={{ '&:hover': { color: BRAND_DARK, backgroundColor: alpha(BRAND_YELLOW, 0.2) } }}>
                              <ContentCopyIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Stack>

                          {listing.amazonLink && (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Typography variant="caption" sx={{ minWidth: 50, color: alpha(BRAND_DARK, 0.45), fontWeight: 600 }}>Link:</Typography>
                              <MuiLink href={listing.amazonLink} target="_blank" rel="noopener noreferrer" underline="hover"
                                sx={{ fontSize: '0.78rem', fontFamily: 'monospace', display: 'inline-flex', alignItems: 'center', gap: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', color: BRAND_DARK }}>
                                {listing.amazonLink}
                                <OpenInNewIcon sx={{ fontSize: 13, flexShrink: 0 }} />
                              </MuiLink>
                            </Stack>
                          )}

                          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3, fontSize: '0.85rem', color: BRAND_DARK }}>
                            {listing.title}
                          </Typography>

                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip label={listing.templateId?.name || 'N/A'} size="small" sx={{ fontWeight: 600, backgroundColor: alpha(BRAND_DARK, 0.07), color: BRAND_DARK, border: `1px solid ${alpha(BRAND_DARK, 0.15)}` }} />
                            <Chip label={listing.status || 'draft'} size="small"
                              sx={listing.status === 'active'
                                ? { fontWeight: 600, backgroundColor: 'rgba(22,163,74,0.12)', color: '#166534', border: '1px solid rgba(22,163,74,0.25)' }
                                : { fontWeight: 600, backgroundColor: alpha(BRAND_DARK, 0.07), color: BRAND_DARK, border: `1px solid ${alpha(BRAND_DARK, 0.12)}` }} />
                          </Stack>

                          <Stack direction="row" spacing={2}>
                            <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.5) }}>Price: <strong style={{ color: BRAND_DARK }}>${listing.startPrice?.toFixed(2) || '0.00'}</strong></Typography>
                            <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.5) }}>Qty: <strong style={{ color: BRAND_DARK }}>{listing.quantity || 0}</strong></Typography>
                          </Stack>

                          <Button variant="outlined" size="small" startIcon={<VisibilityIcon />} onClick={() => handleViewDetails(listing)} fullWidth
                            sx={{ color: BRAND_DARK, borderColor: BRAND_YELLOW_DARK, backgroundColor: alpha(BRAND_YELLOW, 0.08), fontWeight: 600, '&:hover': { backgroundColor: alpha(BRAND_YELLOW, 0.2), borderColor: BRAND_YELLOW_DARK } }}>
                            View Details
                          </Button>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>

                  {/* DESKTOP: Table */}
                  <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' }, ...tableContainerSx, borderRadius: '0 0 12px 12px', overflowX: 'auto' }}>
                    <Table size="small" sx={{ '& .MuiTableCell-root': { py: 1.25 } }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ ...tableHeaderCellSx, width: 40 }}>#</TableCell>
                          <TableCell sx={{ ...tableHeaderCellSx, width: 110 }}>ASIN</TableCell>
                          <TableCell sx={{ ...tableHeaderCellSx, width: 140 }}>SKU</TableCell>
                          <TableCell sx={{ ...tableHeaderCellSx, minWidth: 260 }}>Link</TableCell>
                          <TableCell sx={{ ...tableHeaderCellSx, minWidth: 180 }}>Title</TableCell>
                          <TableCell sx={{ ...tableHeaderCellSx, width: 120 }}>Template</TableCell>
                          <TableCell sx={{ ...tableHeaderCellSx, width: 90 }}>Price</TableCell>
                          <TableCell sx={{ ...tableHeaderCellSx, width: 60 }}>Qty</TableCell>
                          <TableCell sx={{ ...tableHeaderCellSx, width: 90 }}>Status</TableCell>
                          <TableCell align="right" sx={{ ...tableHeaderCellSx, width: 90 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sellerListings.map((listing, index) => (
                          <TableRow key={listing._id} hover sx={tableBodyRowSx}>
                            <TableCell>
                              <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.4), fontWeight: 600 }}>{index + 1}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: BRAND_DARK, fontSize: '0.82rem' }}>
                                {listing._asinReference || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.82rem', bgcolor: alpha(BRAND_DARK, 0.05), px: 0.75, py: 0.25, borderRadius: 1, fontWeight: 600, color: BRAND_DARK }}>
                                  {listing.customLabel}
                                </Typography>
                                <IconButton size="small" onClick={() => handleCopy(listing.customLabel)} title="Copy SKU"
                                  sx={{ '&:hover': { color: BRAND_DARK, backgroundColor: alpha(BRAND_YELLOW, 0.2) } }}>
                                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              {listing.amazonLink ? (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <MuiLink href={listing.amazonLink} target="_blank" rel="noopener noreferrer" underline="hover"
                                    sx={{ fontSize: '0.78rem', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 0.5, color: BRAND_DARK, '&:hover': { color: BRAND_YELLOW_DARK } }}>
                                    {listing.amazonLink}
                                    <OpenInNewIcon sx={{ fontSize: 13 }} />
                                  </MuiLink>
                                  <IconButton size="small" onClick={() => handleCopy(listing.amazonLink)} title="Copy Link"
                                    sx={{ '&:hover': { color: BRAND_DARK, backgroundColor: alpha(BRAND_YELLOW, 0.2) } }}>
                                    <ContentCopyIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Stack>
                              ) : (
                                <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.3) }}>—</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3, fontSize: '0.82rem', color: BRAND_DARK }}>
                                {listing.title}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={listing.templateId?.name || 'N/A'} size="small"
                                sx={{ fontWeight: 600, fontSize: '0.72rem', backgroundColor: alpha(BRAND_DARK, 0.07), color: BRAND_DARK, border: `1px solid ${alpha(BRAND_DARK, 0.15)}` }} />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={700} sx={{ color: BRAND_DARK }}>
                                ${listing.startPrice?.toFixed(2) || '0.00'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.65) }}>{listing.quantity || 0}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={listing.status || 'draft'} size="small"
                                sx={listing.status === 'active'
                                  ? { fontWeight: 700, fontSize: '0.7rem', backgroundColor: 'rgba(22,163,74,0.12)', color: '#166534', border: '1px solid rgba(22,163,74,0.25)' }
                                  : { fontWeight: 600, fontSize: '0.7rem', backgroundColor: alpha(BRAND_DARK, 0.07), color: BRAND_DARK, border: `1px solid ${alpha(BRAND_DARK, 0.12)}` }} />
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                <IconButton size="small" onClick={() => handleViewDetails(listing)} title="View Details"
                                  sx={{ '&:hover': { color: BRAND_DARK, backgroundColor: alpha(BRAND_YELLOW, 0.2) } }}>
                                  <VisibilityIcon sx={{ fontSize: 17 }} />
                                </IconButton>
                                {listing._asinReference && (
                                  <IconButton size="small" onClick={() => handleCopy(listing._asinReference)} title="Copy ASIN"
                                    sx={{ '&:hover': { color: BRAND_DARK, backgroundColor: alpha(BRAND_YELLOW, 0.2) } }}>
                                    <ContentCopyIcon sx={{ fontSize: 15 }} />
                                  </IconButton>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Collapse>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={pagination.pages}
            page={pagination.page}
            onChange={(e, page) => setPagination(prev => ({ ...prev, page }))}
            sx={{
              '& .MuiPaginationItem-root.Mui-selected': {
                backgroundColor: BRAND_YELLOW,
                color: BRAND_DARK,
                fontWeight: 700,
                '&:hover': { backgroundColor: BRAND_YELLOW_DARK }
              }
            }}
          />
        </Box>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={handleCloseDetails} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ pb: 1, borderBottom: `2px solid ${BRAND_YELLOW}`, backgroundColor: BRAND_DARK }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>Listing Details</Typography>
            <Chip
              label={selectedListing?.status || 'draft'}
              size="small"
              sx={selectedListing?.status === 'active'
                ? { fontWeight: 700, backgroundColor: 'rgba(22,163,74,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }
                : { fontWeight: 600, backgroundColor: alpha('#fff', 0.1), color: alpha('#fff', 0.8), border: `1px solid ${alpha('#fff', 0.2)}` }}
            />
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedListing && (
            <Stack spacing={3} sx={{ mt: 2 }}>

              {/* Basic Info */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: BRAND_YELLOW_DARK, display: 'block', mb: 1.5 }}>
                  Basic Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">ASIN</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: BRAND_DARK }}>{selectedListing._asinReference || 'N/A'}</Typography>
                      {selectedListing._asinReference && (
                        <IconButton size="small" onClick={() => handleCopy(selectedListing._asinReference)}><ContentCopyIcon sx={{ fontSize: 14 }} /></IconButton>
                      )}
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">SKU (Custom Label)</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: BRAND_DARK }}>{selectedListing.customLabel}</Typography>
                      <IconButton size="small" onClick={() => handleCopy(selectedListing.customLabel)}><ContentCopyIcon sx={{ fontSize: 14 }} /></IconButton>
                    </Stack>
                  </Grid>
                  {selectedListing.amazonLink && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">Amazon Link</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <MuiLink href={selectedListing.amazonLink} target="_blank" rel="noopener" variant="body2" sx={{ wordBreak: 'break-all', color: BRAND_DARK }}>
                          {selectedListing.amazonLink}
                        </MuiLink>
                        <IconButton size="small" onClick={() => handleCopy(selectedListing.amazonLink)}><ContentCopyIcon sx={{ fontSize: 14 }} /></IconButton>
                      </Stack>
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Title</Typography>
                    <Typography variant="body2" sx={{ color: BRAND_DARK }}>{selectedListing.title}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Template</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ color: BRAND_DARK }}>{selectedListing.templateId?.name || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">Seller</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ color: BRAND_DARK }}>
                      {selectedListing.sellerId?.user?.username || selectedListing.sellerId?.user?.email || 'N/A'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Product Details */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: BRAND_YELLOW_DARK, display: 'block', mb: 1.5 }}>
                  Product Details
                </Typography>
                <Grid container spacing={2}>
                  {selectedListing.conditionId && (<Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Condition</Typography><Typography variant="body2">{selectedListing.conditionId}</Typography></Grid>)}
                  {selectedListing.upc && (<Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">UPC</Typography><Typography variant="body2">{selectedListing.upc}</Typography></Grid>)}
                  {selectedListing.epid && (<Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">EPID</Typography><Typography variant="body2">{selectedListing.epid}</Typography></Grid>)}
                  {selectedListing.categoryName && (<Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Category</Typography><Typography variant="body2">{selectedListing.categoryName}</Typography></Grid>)}
                  {selectedListing.description && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">Description</Typography>
                      <Typography variant="body2" sx={{ maxHeight: 150, overflowY: 'auto', p: 1.5, bgcolor: alpha(BRAND_DARK, 0.03), borderRadius: 2, fontSize: '0.82rem', border: `1px solid ${alpha(BRAND_DARK, 0.07)}` }}>
                        {selectedListing.description.replace(/<[^>]*>/g, '')}
                      </Typography>
                    </Grid>
                  )}
                  {selectedListing.itemPhotoUrl && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">Product Image</Typography>
                      <Box sx={{ mt: 1 }}>
                        <img src={selectedListing.itemPhotoUrl} alt="Product" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Box>

              <Divider />

              {/* Pricing */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: BRAND_YELLOW_DARK, display: 'block', mb: 1.5 }}>
                  Pricing & Offers
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Start Price</Typography>
                    <Typography variant="body2" fontWeight={800} sx={{ color: BRAND_DARK, fontSize: '1rem' }}>
                      ${selectedListing.startPrice?.toFixed(2) || '0.00'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Quantity</Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ color: BRAND_DARK }}>{selectedListing.quantity || 0}</Typography>
                  </Grid>
                  {selectedListing.buyItNowPrice && (<Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Buy It Now</Typography><Typography variant="body2">${selectedListing.buyItNowPrice.toFixed(2)}</Typography></Grid>)}
                  <Grid item xs={6} sm={3}><Typography variant="caption" color="text.secondary">Format</Typography><Typography variant="body2">{selectedListing.format || 'FixedPrice'}</Typography></Grid>
                  {selectedListing.bestOfferEnabled && (
                    <>
                      <Grid item xs={12}><Chip label="Best Offer Enabled" size="small" sx={{ backgroundColor: alpha('#0284c7', 0.12), color: '#075985', border: '1px solid rgba(2,132,199,0.2)', fontWeight: 600 }} /></Grid>
                      {selectedListing.bestOfferAutoAcceptPrice && (<Grid item xs={6}><Typography variant="caption" color="text.secondary">Auto Accept Price</Typography><Typography variant="body2">${selectedListing.bestOfferAutoAcceptPrice.toFixed(2)}</Typography></Grid>)}
                      {selectedListing.minimumBestOfferPrice && (<Grid item xs={6}><Typography variant="caption" color="text.secondary">Minimum Offer</Typography><Typography variant="body2">${selectedListing.minimumBestOfferPrice.toFixed(2)}</Typography></Grid>)}
                    </>
                  )}
                </Grid>
              </Box>

              <Divider />

              {/* Shipping & Returns */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: BRAND_YELLOW_DARK, display: 'block', mb: 1.5 }}>
                  Shipping & Returns
                </Typography>
                <Grid container spacing={2}>
                  {selectedListing.location && (<Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Location</Typography><Typography variant="body2">{selectedListing.location}</Typography></Grid>)}
                  {selectedListing.maxDispatchTime && (<Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Dispatch Time</Typography><Typography variant="body2">{selectedListing.maxDispatchTime} days</Typography></Grid>)}
                  {selectedListing.shippingProfileName && (<Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Shipping Profile</Typography><Typography variant="body2">{selectedListing.shippingProfileName}</Typography></Grid>)}
                  {selectedListing.returnProfileName && (<Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Return Profile</Typography><Typography variant="body2">{selectedListing.returnProfileName}</Typography></Grid>)}
                  {selectedListing.returnsAcceptedOption && (<Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Returns Accepted</Typography><Typography variant="body2">{selectedListing.returnsAcceptedOption}</Typography></Grid>)}
                  {selectedListing.returnsWithinOption && (<Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Return Within</Typography><Typography variant="body2">{selectedListing.returnsWithinOption}</Typography></Grid>)}
                </Grid>
              </Box>

              {/* Custom Fields */}
              {selectedListing.customFields && selectedListing.customFields.size > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: BRAND_YELLOW_DARK, display: 'block', mb: 1.5 }}>
                      Custom Fields
                    </Typography>
                    <Grid container spacing={2}>
                      {Array.from(selectedListing.customFields.entries()).map(([key, value]) => (
                        <Grid item xs={12} sm={6} key={key}>
                          <Typography variant="caption" color="text.secondary">{key.replace('C:', '')}</Typography>
                          <Typography variant="body2">{value}</Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </>
              )}

              {/* eBay Integration */}
              {(selectedListing.ebayItemId || selectedListing.ebayListingUrl) && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: BRAND_YELLOW_DARK, display: 'block', mb: 1.5 }}>
                      eBay Integration
                    </Typography>
                    <Grid container spacing={2}>
                      {selectedListing.ebayItemId && (<Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">eBay Item ID</Typography><Typography variant="body2">{selectedListing.ebayItemId}</Typography></Grid>)}
                      {selectedListing.ebayListingUrl && (<Grid item xs={12}><Typography variant="caption" color="text.secondary">eBay Listing URL</Typography><MuiLink href={selectedListing.ebayListingUrl} target="_blank" rel="noopener" variant="body2" sx={{ color: BRAND_DARK }}>{selectedListing.ebayListingUrl}</MuiLink></Grid>)}
                      {selectedListing.ebayPublishedAt && (<Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Published At</Typography><Typography variant="body2">{new Date(selectedListing.ebayPublishedAt).toLocaleString()}</Typography></Grid>)}
                    </Grid>
                  </Box>
                </>
              )}

              {/* Metadata */}
              <Divider />
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: alpha(BRAND_DARK, 0.4), display: 'block', mb: 1.5 }}>
                  Metadata
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Created At</Typography><Typography variant="body2" fontSize="0.85rem">{new Date(selectedListing.createdAt).toLocaleString()}</Typography></Grid>
                  <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary">Updated At</Typography><Typography variant="body2" fontSize="0.85rem">{new Date(selectedListing.updatedAt).toLocaleString()}</Typography></Grid>
                </Grid>
              </Box>

            </Stack>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDetails} sx={yellowFilledButtonSx}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
