import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Alert, Breadcrumbs, Link as MuiLink,
  Chip, Stack, TextField, InputAdornment, Skeleton, CircularProgress, Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Search as SearchIcon,
  ViewList as ViewListIcon,
  Upload as UploadIcon,
  CheckCircle as ReactivateIcon,
  Cancel as DeactivateIcon,
  Block as BlockIcon
} from '@mui/icons-material';
import api from '../../lib/api';
import BulkImportASINsDialog from '../../components/BulkImportASINsDialog.jsx';
import BulkImportSKUsDialog from '../../components/BulkImportSKUsDialog.jsx';
import BulkReactivateDialog from '../../components/BulkReactivateDialog.jsx';
import BulkDeactivateDialog from '../../components/BulkDeactivateDialog.jsx';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';
import { dashboardSignatureTokens } from '../../theme/appTheme.js';
import AdminPageShell from '../../components/AdminPageShell.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { tableHeaderCellSx, tableBodyRowSx, yellowFilledButtonSx, yellowOutlinedButtonSx } from '../../theme/tableStyles.js';

// Derive eBay marketplace key from template's customActionField
function extractMarketplace(customActionField) {
  if (!customActionField) return 'US';
  if (customActionField.includes('SiteID=eBayMotors')) return 'Motors';
  if (customActionField.includes('SiteID=Australia'))  return 'Australia';
  if (customActionField.includes('SiteID=Canada'))     return 'Canada';
  if (customActionField.includes('SiteID=UK'))         return 'UK';
  return 'US';
}
const MARKETPLACE_TO_COUNTRY = { Australia: 'AU', US: 'US', UK: 'UK', Canada: 'Canada', Motors: 'US' };

// ── Skeleton rows ────────────────────────────────────────────────────────────
function TableRowSkeleton({ cols = 5 }) {
  return (
    <TableRow>
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i} sx={{ py: 1.5 }}>
          <Skeleton variant="rounded" height={22} width={i === 0 ? '70%' : i === cols - 1 ? 90 : 60} sx={{ borderRadius: 1.5 }} />
        </TableCell>
      ))}
    </TableRow>
  );
}

export default function SellerTemplatesPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const sellerId = searchParams.get('sellerId');
  const dashboardTheme = theme.customTokens?.dashboardSignature || dashboardSignatureTokens;

  // ── Style tokens ─────────────────────────────────────────────────────────
  const surfaceCardSx = {
    borderRadius: `${dashboardTheme.radius.card}px`,
    border: '1px solid',
    borderColor: alpha(BRAND_DARK, 0.08),
    backgroundColor: theme.palette.background.paper,
    boxShadow: dashboardTheme.shadows.card
  };
  // ── State ─────────────────────────────────────────────────────────────────
  const [seller, setSeller] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [listingCounts, setListingCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [countsLoading, setCountsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [bulkImportASINsDialog, setBulkImportASINsDialog] = useState(false);
  const [bulkImportSKUsDialog, setBulkImportSKUsDialog] = useState(false);
  const [reactivateDialog, setReactivateDialog] = useState(false);
  const [deactivateDialog, setDeactivateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [success, setSuccess] = useState('');
  const [blockedCountries, setBlockedCountries] = useState([]);

  useEffect(() => {
    if (!sellerId) { navigate('/admin/select-seller'); return; }
    fetchSellerAndTemplates();
    fetchUploadLimits();
  }, [sellerId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTemplates(templates);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredTemplates(templates.filter(t => t.name?.toLowerCase().includes(q)));
    }
  }, [searchQuery, templates]);

  const fetchSellerAndTemplates = async () => {
    try {
      setLoading(true);
      const [sellerRes, templatesRes] = await Promise.all([
        api.get('/sellers/all'),
        api.get('/listing-templates')
      ]);
      const sellerData = sellerRes.data.find(s => s._id === sellerId);
      if (!sellerData) { setError('Seller not found'); setSeller(null); setTemplates([]); setFilteredTemplates([]); return; }
      setSeller(sellerData);
      setTemplates(templatesRes.data || []);
      setFilteredTemplates(templatesRes.data || []);
      fetchListingCounts(templatesRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchListingCounts = async (templatesList) => {
    if (!templatesList.length) { setListingCounts({}); return; }
    setCountsLoading(true);
    try {
      const ids = templatesList.map(t => t._id).join(',');
      const { data } = await api.get(`/template-listings/counts?templateIds=${ids}&sellerId=${sellerId}`);
      setListingCounts(data || {});
    } catch {
      // Fall back to zeros so the page still renders
      const zeros = {};
      templatesList.forEach(t => { zeros[t._id] = 0; });
      setListingCounts(zeros);
    } finally {
      setCountsLoading(false);
    }
  };

  const fetchUploadLimits = async () => {
    try {
      const { data } = await api.get('/seller-upload-limits');
      const blocked = (data || [])
        .filter(item => (item.seller?._id || item.seller) === sellerId && item.isBlocked)
        .map(item => item.country);
      setBlockedCountries(blocked);
    } catch {
      // non-critical
    }
  };

  const handleAddListings = (templateId) => navigate(`/admin/template-listings?templateId=${templateId}&sellerId=${sellerId}`);

  const getSellerDisplayName = () => {
    if (!seller) return 'Unknown';
    return seller.user?.username || seller.user?.email || 'Unknown Seller';
  };

  const handleOpenBulkDialog = (dialogType, templateId = null) => {
    setSelectedTemplateId(templateId);
    if (dialogType === 'importASINs') setBulkImportASINsDialog(true);
    else if (dialogType === 'importSKUs') setBulkImportSKUsDialog(true);
    else if (dialogType === 'reactivate') setReactivateDialog(true);
    else if (dialogType === 'deactivate') setDeactivateDialog(true);
  };

  const handleDialogSuccess = (message) => {
    setSuccess(message);
    fetchListingCounts(templates);
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <AdminPageShell>

      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 1.5, pt: 2 }}>
        <MuiLink
          component={Link}
          to="/admin/select-seller"
          underline="hover"
          sx={{ fontWeight: 600, color: BRAND_DARK, fontSize: '0.85rem', '&:hover': { color: BRAND_YELLOW_DARK } }}
        >
          Select Seller
        </MuiLink>
        <Typography sx={{ fontWeight: 600, color: alpha(BRAND_DARK, 0.5), fontSize: '0.85rem' }}>
          {getSellerDisplayName()}
        </Typography>
      </Breadcrumbs>

      <PageHeader
        title={`${getSellerDisplayName()}'s Templates`}
        subtitle={!loading ? `${templates.length} template${templates.length !== 1 ? 's' : ''} available` : undefined}
        actions={
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/admin/select-seller')}
            sx={yellowOutlinedButtonSx}
          >
            Back to Sellers
          </Button>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Upload limit block banner */}
      {blockedCountries.length > 0 && (
        <Alert
          severity="error"
          sx={{ mb: 2, fontWeight: 500 }}
          icon={<BlockIcon fontSize="small" />}
        >
          <strong>Daily upload limit reached</strong> for <strong>{blockedCountries.join(', ')}</strong>.
          Templates for {blockedCountries.length === 1 ? 'this country' : 'these countries'} are blocked (shown below). Resets at 12:00 AM IST.
        </Alert>
      )}

      {/* Bulk Operations Bar */}
      {!loading && templates.length > 0 && (
        <Paper sx={{ ...surfaceCardSx, p: 2, mb: 3 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: alpha(BRAND_DARK, 0.45), display: 'block', mb: 1.5 }}>
            Bulk Operations
          </Typography>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => handleOpenBulkDialog('importASINs')} sx={yellowOutlinedButtonSx} size="small">
              Bulk Import ASINs
            </Button>
            <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => handleOpenBulkDialog('importSKUs')} sx={yellowOutlinedButtonSx} size="small">
              Bulk Import SKUs
            </Button>
            <Button variant="outlined" startIcon={<ReactivateIcon />} onClick={() => handleOpenBulkDialog('reactivate')}
              size="small" sx={{ ...yellowOutlinedButtonSx, borderColor: 'rgba(22,163,74,0.5)', color: '#166534', backgroundColor: 'rgba(22,163,74,0.06)', '&:hover': { backgroundColor: 'rgba(22,163,74,0.14)', borderColor: '#16a34a' } }}>
              Relist by SKU
            </Button>
            <Button variant="outlined" startIcon={<DeactivateIcon />} onClick={() => handleOpenBulkDialog('deactivate')}
              size="small" sx={{ ...yellowOutlinedButtonSx, borderColor: 'rgba(220,38,38,0.35)', color: '#991b1b', backgroundColor: 'rgba(220,38,38,0.05)', '&:hover': { backgroundColor: 'rgba(220,38,38,0.12)', borderColor: '#dc2626' } }}>
              Delist by SKU
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Search Bar */}
      <Paper sx={{ ...surfaceCardSx, p: 1.5, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search templates by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& .MuiOutlinedInput-notchedOutline': { transition: 'border-color 0.2s ease' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(BRAND_DARK, 0.35) },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#b8860b', borderWidth: 2 }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: alpha(BRAND_DARK, 0.35), fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Templates Table / loading / empty */}
      {loading ? (
        <Paper sx={{ ...surfaceCardSx, overflow: 'hidden' }}>
          <Box sx={{ px: 2.5, py: 1.5, backgroundColor: BRAND_DARK, borderBottom: `2px solid ${BRAND_YELLOW}` }}>
            <Skeleton variant="text" width={160} height={20} sx={{ bgcolor: alpha('#fff', 0.12) }} />
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Template Name', 'Custom Columns', 'Listings', 'ASIN Automation', 'Actions'].map(h => (
                  <TableCell key={h} sx={tableHeaderCellSx}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[1, 2, 3, 4, 5].map(i => <TableRowSkeleton key={i} cols={5} />)}
            </TableBody>
          </Table>
        </Paper>

      ) : filteredTemplates.length === 0 ? (
        <Paper sx={{ ...surfaceCardSx, p: 5, textAlign: 'center', background: dashboardTheme.surfaces?.emptyState || alpha(BRAND_DARK, 0.02) }}>
          <ViewListIcon sx={{ fontSize: 56, color: alpha(BRAND_DARK, 0.15), mb: 1.5 }} />
          <Typography variant="h6" fontWeight={600} sx={{ color: alpha(BRAND_DARK, 0.5) }}>
            {searchQuery ? 'No templates match your search' : 'No templates available'}
          </Typography>
          <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.38), mt: 0.5 }}>
            {searchQuery ? 'Try a different search term' : 'Create a template first from the Manage Templates page'}
          </Typography>
          {searchQuery && (
            <Button onClick={() => setSearchQuery('')}
              sx={{ mt: 2, color: BRAND_DARK, fontWeight: 600, textDecoration: 'underline', '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' } }}>
              Clear Search
            </Button>
          )}
        </Paper>

      ) : (
        <Paper sx={{ ...surfaceCardSx, overflow: 'hidden' }}>
          {/* Table header bar */}
          <Stack direction="row" justifyContent="space-between" alignItems="center"
            sx={{ px: 2.5, py: 1.5, backgroundColor: BRAND_DARK, borderBottom: `2px solid ${BRAND_YELLOW}` }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.5, color: alpha('#fff', 0.95) }}>
              Templates ({filteredTemplates.length}{filteredTemplates.length !== templates.length ? ` of ${templates.length}` : ''})
            </Typography>
            {countsLoading && (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={14} sx={{ color: alpha('#fff', 0.6) }} />
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.5) }}>Loading counts…</Typography>
              </Stack>
            )}
          </Stack>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderCellSx}>Template Name</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Custom Columns</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Listings</TableCell>
                  <TableCell sx={tableHeaderCellSx}>ASIN Automation</TableCell>
                  <TableCell align="right" sx={tableHeaderCellSx}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTemplates.map((template) => {
                    const tmplCountry = MARKETPLACE_TO_COUNTRY[extractMarketplace(template.customActionField)];
                    const tmplBlocked = tmplCountry ? blockedCountries.includes(tmplCountry) : false;
                    return (
                  <TableRow key={template._id} hover sx={tableBodyRowSx}>
                    <TableCell>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography variant="body2" fontWeight={700} sx={{ color: tmplBlocked ? alpha(BRAND_DARK, 0.45) : BRAND_DARK }}>
                          {template.name}
                        </Typography>
                        {tmplBlocked && (
                          <Chip
                            label={`${tmplCountry}: Blocked`}
                            size="small"
                            sx={{
                              height: 18, fontSize: '0.62rem', fontWeight: 700,
                              backgroundColor: '#fde8e8', color: '#c0392b',
                              border: '1px solid #f5c6c6',
                            }}
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${template.customColumns?.length || 0} columns`}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          backgroundColor: template.customColumns?.length > 0 ? alpha(BRAND_YELLOW, 0.25) : alpha(BRAND_DARK, 0.06),
                          color: BRAND_DARK,
                          border: `1px solid ${template.customColumns?.length > 0 ? BRAND_YELLOW_DARK : alpha(BRAND_DARK, 0.12)}`
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={countsLoading ? '…' : `${listingCounts[template._id] ?? 0} listings`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          backgroundColor: listingCounts[template._id] > 0 ? alpha(BRAND_YELLOW, 0.2) : alpha(BRAND_DARK, 0.06),
                          color: BRAND_DARK,
                          border: `1px solid ${listingCounts[template._id] > 0 ? BRAND_YELLOW_DARK : alpha(BRAND_DARK, 0.12)}`
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={template.asinAutomation?.enabled ? 'Enabled' : 'Disabled'}
                        size="small"
                        sx={template.asinAutomation?.enabled
                          ? { fontWeight: 700, backgroundColor: 'rgba(22,163,74,0.12)', color: '#166534', border: '1px solid rgba(22,163,74,0.25)' }
                          : { fontWeight: 600, backgroundColor: alpha(BRAND_DARK, 0.06), color: alpha(BRAND_DARK, 0.5), border: `1px solid ${alpha(BRAND_DARK, 0.12)}` }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={tmplBlocked ? `Upload limit reached for ${tmplCountry}. Resets at 12:00 AM IST.` : ''} disableHoverListener={!tmplBlocked}>
                        <span>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => handleAddListings(template._id)}
                            disabled={tmplBlocked}
                            sx={yellowFilledButtonSx}
                          >
                            Add Listings
                          </Button>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Dialogs — logic unchanged */}
      <BulkImportASINsDialog open={bulkImportASINsDialog} onClose={() => setBulkImportASINsDialog(false)} templateId={selectedTemplateId} sellerId={sellerId} onImportComplete={() => handleDialogSuccess('ASINs imported successfully')} />
      <BulkImportSKUsDialog open={bulkImportSKUsDialog} onClose={() => setBulkImportSKUsDialog(false)} templateId={selectedTemplateId} sellerId={sellerId} onImportComplete={() => handleDialogSuccess('SKUs imported successfully')} />
      <BulkReactivateDialog open={reactivateDialog} onClose={() => setReactivateDialog(false)} templateId={selectedTemplateId} sellerId={sellerId} onSuccess={() => handleDialogSuccess('Listings reactivated successfully')} />
      <BulkDeactivateDialog open={deactivateDialog} onClose={() => setDeactivateDialog(false)} templateId={selectedTemplateId} sellerId={sellerId} onSuccess={() => handleDialogSuccess('Listings deactivated successfully')} />
    </AdminPageShell>
  );
}
