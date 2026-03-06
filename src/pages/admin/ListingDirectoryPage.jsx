import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  OutlinedInput,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  Checkbox,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  FileDownload as DownloadIcon,
  Settings as SettingsIcon,
  ArrowDropDown as ArrowDropDownIcon,
  RuleOutlined as ProofReadIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import api from '../../lib/api.js';
import ListDirectlyDialog from '../../components/ListDirectlyDialog.jsx';
import TemplateCustomizationDialog from '../../components/TemplateCustomizationDialog.jsx';

// Core columns to display in the directory table (same as TemplateListingsPage)
const CORE_COLUMNS = [
  { key: 'action',              label: '*Action',            width: 80  },
  { key: 'customLabel',         label: 'Custom Label (SKU)', width: 150 },
  { key: 'categoryId',          label: 'Category ID',        width: 100 },
  { key: 'categoryName',        label: 'Category Name',      width: 200 },
  { key: 'title',               label: 'Title',              width: 300 },
  { key: 'relationship',        label: 'Relationship',       width: 120 },
  { key: 'relationshipDetails', label: 'Rel. Details',       width: 150 },
  { key: 'scheduleTime',        label: 'Schedule Time',      width: 130 },
  { key: 'startPrice',          label: 'Start Price',        width: 100 },
];

function renderCellValue(col, listing) {
  const v = listing[col.key];
  if (col.key === 'startPrice') return v != null ? `$${v}` : '-';
  if (col.key === 'scheduleTime') return v ? new Date(v).toLocaleString() : '-';
  return v || '-';
}

export default function ListingDirectoryPage() {
  // ── Seller (fixed: "Testing") ────────────────────────────────────────────
  const [seller, setSeller] = useState(null);
  const [sellerLoading, setSellerLoading] = useState(true);

  // ── Template selection ───────────────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState(null);

  // ── Listings + pagination ────────────────────────────────────────────────
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Row selection ────────────────────────────────────────────────────────
  const [selectedListings, setSelectedListings] = useState(new Set());

  // ── Filters ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  // Schedule slug — UI only, no logic yet
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTimeFrom, setScheduleTimeFrom] = useState('');
  const [scheduleTimeTo, setScheduleTimeTo] = useState('');

  // ── Dialogs ───────────────────────────────────────────────────────────────
  const [customizationDialog, setCustomizationDialog] = useState(false);
  const [listDirectlyDialog, setListDirectlyDialog] = useState(false);
  const [proofReadAnchor, setProofReadAnchor] = useState(null);

  // Search debounce ref
  const searchTimeout = useRef(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Boot: find "Testing" seller + load all templates
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const boot = async () => {
      try {
        const [sellersRes, templatesRes] = await Promise.all([
          api.get('/sellers/all'),
          api.get('/listing-templates'),
        ]);
        const testingSeller = sellersRes.data.find(
          s => s.user?.username?.toLowerCase() === 'testing'
        );
        setSeller(testingSeller || null);
        const tmps = templatesRes.data || [];
        setTemplates(tmps);
        setTemplate(tmps[0] || null);
      } catch (e) {
        setError('Failed to load initial data');
      } finally {
        setSellerLoading(false);
      }
    };
    boot();
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch listings whenever template, seller, page, or price changes
  // ─────────────────────────────────────────────────────────────────────────
  const fetchListings = useCallback(async (pageOverride) => {
    if (!template?._id || !seller?._id) {
      setListings([]);
      return;
    }
    setLoading(true);
    try {
      const params = {
        templateId: template._id,
        sellerId: seller._id,
        page: pageOverride ?? pagination.page,
        limit: pagination.limit,
        batchFilter: 'all',
      };
      if (priceMin) params.minPrice = priceMin;
      if (priceMax) params.maxPrice = priceMax;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const { data } = await api.get('/template-listings', { params });
      setListings(data.listings || []);
      setPagination(p => ({ ...p, ...data.pagination }));
      setSelectedListings(new Set());
    } catch (e) {
      setError('Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [template, seller, pagination.page, pagination.limit, priceMin, priceMax, searchQuery]);

  useEffect(() => {
    fetchListings(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, seller, priceMin, priceMax]);

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      if (template && seller) fetchListings(1);
    }, 400);
    return () => clearTimeout(searchTimeout.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // ─────────────────────────────────────────────────────────────────────────
  // Selection helpers
  // ─────────────────────────────────────────────────────────────────────────
  const handleToggleSelect = id => {
    setSelectedListings(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const handleToggleAll = () => {
    if (selectedListings.size === listings.length) setSelectedListings(new Set());
    else setSelectedListings(new Set(listings.map(l => l._id)));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CSV Download
  // ─────────────────────────────────────────────────────────────────────────
  const handleDownloadCsv = async () => {
    if (!template?._id || !seller?._id) return;
    try {
      setLoading(true);
      const ids = selectedListings.size > 0 ? [...selectedListings].join(',') : undefined;
      let url = `/template-listings/export-csv/${template._id}?sellerId=${seller._id}`;
      if (ids) url += `&listingIds=${ids}`;

      const response = await api.get(url, { responseType: 'blob' });
      const contentDisposition = response.headers['content-disposition'];
      let filename = `listings_${Date.now()}.csv`;
      if (contentDisposition) {
        const m = contentDisposition.match(/filename="?(.+)"?/i);
        if (m?.[1]) filename = m[1].replace(/"/g, '');
      }
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSuccess('CSV downloaded successfully!');
      fetchListings(1);
    } catch (e) {
      setError('Failed to download CSV');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  const totalCols = CORE_COLUMNS.length + (template?.customColumns?.length || 0) + 2; // +checkbox +actions

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Listing Directory
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* ── Top filter bar ── */}
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        {/* Row 1: Template selector + Search */}
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          {/* Template */}
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Template</InputLabel>
            <Select
              label="Template"
              value={template?._id || ''}
              onChange={e => setTemplate(templates.find(t => t._id === e.target.value) || null)}
            >
              {templates.length === 0 && (
                <MenuItem value="" disabled><em>No templates found</em></MenuItem>
              )}
              {templates.map(t => (
                <MenuItem key={t._id} value={t._id}>{t.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flex: 1, minWidth: 200, maxWidth: 380 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search keywords and ASIN"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Stack>

        {/* Row 2: Price range + Schedule + Action buttons */}
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          {/* Price Range */}
          <Paper variant="outlined" sx={{ px: 1.5, py: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              Price Range
            </Typography>
            <OutlinedInput
              size="small"
              value={priceMin}
              onChange={e => setPriceMin(e.target.value)}
              onBlur={() => fetchListings(1)}
              onKeyDown={e => e.key === 'Enter' && fetchListings(1)}
              sx={{ width: 70, '& input': { py: 0.5, px: 1 } }}
              placeholder="Min"
            />
            <Typography variant="caption">–</Typography>
            <OutlinedInput
              size="small"
              value={priceMax}
              onChange={e => setPriceMax(e.target.value)}
              onBlur={() => fetchListings(1)}
              onKeyDown={e => e.key === 'Enter' && fetchListings(1)}
              sx={{ width: 70, '& input': { py: 0.5, px: 1 } }}
              placeholder="Max"
            />
          </Paper>

          {/* Schedule slug */}
          <Tooltip title="Schedule logic coming soon">
            <Paper
              variant="outlined"
              sx={{ px: 2, py: 1, cursor: 'default', borderRadius: 2 }}
            >
              {/* Header */}
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
                <CalendarIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                <Typography variant="caption" fontWeight={700} letterSpacing={0.8} color="text.secondary">
                  SCHEDULE
                </Typography>
              </Stack>

              {/* Fields row */}
              <Stack direction="row" alignItems="flex-end" spacing={2}>
                {/* Date */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.4, fontSize: 11 }}>
                    Date
                  </Typography>
                  <OutlinedInput
                    size="small"
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    sx={{ width: 148, '& input': { py: 0.6, px: 1, fontSize: 13 } }}
                  />
                </Box>

                {/* Time range */}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.4, fontSize: 11 }}>
                    Time range
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <OutlinedInput
                      size="small"
                      type="time"
                      value={scheduleTimeFrom}
                      onChange={e => setScheduleTimeFrom(e.target.value)}
                      sx={{ width: 118, '& input': { py: 0.6, px: 1, fontSize: 13 } }}
                    />
                    <Typography variant="body2" color="text.secondary">—</Typography>
                    <OutlinedInput
                      size="small"
                      type="time"
                      value={scheduleTimeTo}
                      onChange={e => setScheduleTimeTo(e.target.value)}
                      sx={{ width: 118, '& input': { py: 0.6, px: 1, fontSize: 13 } }}
                    />
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          </Tooltip>

          <Box sx={{ flex: 1 }} />

          {/* Customize (view only) */}
          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            disabled={!template}
            onClick={() => setCustomizationDialog(true)}
            sx={{ bgcolor: '#222', '&:hover': { bgcolor: '#444' } }}
          >
            Customize
          </Button>

          {/* List Directly */}
          <Button
            variant="contained"
            disabled={!template || !seller || selectedListings.size === 0}
            onClick={() => setListDirectlyDialog(true)}
            sx={{ bgcolor: '#222', '&:hover': { bgcolor: '#444' } }}
          >
            List Directly
          </Button>

          {/* Proof Read dropdown */}
          <ButtonGroup variant="outlined" disableElevation>
            <Button
              startIcon={<ProofReadIcon />}
              disabled={!template}
              onClick={() => setSuccess('Proof Read — logic coming soon')}
            >
              Proof Read
            </Button>
            <Button
              size="small"
              disabled={!template}
              onClick={e => setProofReadAnchor(e.currentTarget)}
              sx={{ px: 0.5 }}
            >
              <ArrowDropDownIcon fontSize="small" />
            </Button>
          </ButtonGroup>
          <Menu
            anchorEl={proofReadAnchor}
            open={Boolean(proofReadAnchor)}
            onClose={() => setProofReadAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem disabled>
              <Typography variant="caption" color="text.secondary">
                Proof Read options — coming soon
              </Typography>
            </MenuItem>
          </Menu>

          {/* Download CSV */}
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={!template || !seller || loading}
            onClick={handleDownloadCsv}
          >
            Download CSV
          </Button>
        </Stack>
      </Stack>

      {/* ── Listings panel ── */}
      <Paper variant="outlined">
        {/* Template header + batch filter toolbar */}
        <Toolbar
          variant="dense"
          sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 48, gap: 1, flexWrap: 'wrap' }}
        >
          <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>
            {template ? `${template.name} — Listings` : 'Select a product to load listings'}
          </Typography>

          {sellerLoading && <CircularProgress size={16} />}
          {!sellerLoading && !seller && (
            <Chip label="Seller 'Testing' not found" color="error" size="small" />
          )}
          {seller && (
            <Chip
              label={`Seller: ${seller.user?.username || 'Testing'}`}
              size="small"
              color="default"
              variant="outlined"
            />
          )}

          {template && selectedListings.size > 0 && (
            <Chip
              label={`${selectedListings.size} selected`}
              color="primary"
              size="small"
              onDelete={() => setSelectedListings(new Set())}
            />
          )}
        </Toolbar>

        {/* Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : !template ? (
          <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">
              Select a template above to load listings.
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    padding="checkbox"
                    sx={{ fontWeight: 700, position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 2 }}
                  >
                    <Checkbox
                      size="small"
                      indeterminate={selectedListings.size > 0 && selectedListings.size < listings.length}
                      checked={listings.length > 0 && selectedListings.size === listings.length}
                      onChange={handleToggleAll}
                    />
                  </TableCell>
                  {CORE_COLUMNS.map(col => (
                    <TableCell key={col.key} sx={{ fontWeight: 700, minWidth: col.width, whiteSpace: 'nowrap' }}>
                      {col.label}
                    </TableCell>
                  ))}
                  {template.customColumns?.map(col => (
                    <TableCell key={col.name} sx={{ fontWeight: 700, minWidth: 150, whiteSpace: 'nowrap' }}>
                      {col.displayName}
                    </TableCell>
                  ))}
                  <TableCell
                    sx={{ fontWeight: 700, position: 'sticky', right: 0, bgcolor: 'background.paper', zIndex: 1 }}
                  />
                </TableRow>
              </TableHead>
              <TableBody>
                {listings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={totalCols} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No listings found
                    </TableCell>
                  </TableRow>
                ) : (
                  listings.map(listing => (
                    <TableRow
                      key={listing._id}
                      hover
                      selected={selectedListings.has(listing._id)}
                    >
                      <TableCell
                        padding="checkbox"
                        sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper' }}
                      >
                        <Checkbox
                          size="small"
                          checked={selectedListings.has(listing._id)}
                          onChange={() => handleToggleSelect(listing._id)}
                        />
                      </TableCell>
                      {CORE_COLUMNS.map(col => (
                        <TableCell key={col.key} sx={{ whiteSpace: 'nowrap' }}>
                          {renderCellValue(col, listing)}
                        </TableCell>
                      ))}
                      {template.customColumns?.map(col => (
                        <TableCell key={col.name}>
                          {listing.customFields?.[col.name] || '-'}
                        </TableCell>
                      ))}
                      <TableCell
                        sx={{ position: 'sticky', right: 0, bgcolor: 'background.paper' }}
                      />
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {pagination.pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Pagination
              count={pagination.pages}
              page={pagination.page}
              onChange={(_, page) => {
                setPagination(p => ({ ...p, page }));
                fetchListings(page);
              }}
              color="primary"
            />
          </Box>
        )}
      </Paper>

      {/* ── Dialogs ── */}
      <TemplateCustomizationDialog
        open={customizationDialog}
        onClose={() => setCustomizationDialog(false)}
        templateId={template?._id}
        sellerId={seller?._id}
        templateName={template?.name}
        readOnly
      />

      <ListDirectlyDialog
        open={listDirectlyDialog}
        onClose={() => setListDirectlyDialog(false)}
        selectedListings={selectedListings}
        templateId={template?._id}
        sellerId={seller?._id}
      />
    </Box>
  );
}
