import { useEffect, useState, useMemo } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import { 
  Box, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TextField, Typography, IconButton, Dialog, DialogTitle, 
  DialogContent, DialogActions, Alert, Chip, FormControl, InputLabel, Select, MenuItem,
  Tabs, Tab, Switch, FormControlLabel, Divider, CircularProgress, InputAdornment
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  ContentCopy as CopyIcon,
  Publish as PublishIcon,
  Search as SearchIcon,
  ViewList as ViewListIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api.js';
import FieldConfigList from '../../components/FieldConfigList.jsx';
import CoreFieldDefaultsForm from '../../components/CoreFieldDefaultsForm.jsx';
import PricingConfigSection from '../../components/PricingConfigSection.jsx';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';
import { dashboardSignatureTokens } from '../../theme/appTheme.js';

// ── Marketplace helpers (derived from customActionField) ─────────────────
function extractMarketplace(customActionField) {
  if (!customActionField) return 'US';
  if (customActionField.includes('SiteID=eBayMotors'))  return 'Motors';
  if (customActionField.includes('SiteID=Australia'))   return 'Australia';
  if (customActionField.includes('SiteID=Canada'))      return 'Canada';
  if (customActionField.includes('SiteID=UK'))          return 'UK';
  return 'US';
}

const MARKETPLACE_LABELS = {
  US:        'eBay US',
  Motors:    'eBay Motors',
  Australia: 'eBay AU',
  Canada:    'eBay CA',
  UK:        'eBay UK',
};

export default function ManageTemplatesPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const dashboardTheme = theme.customTokens?.dashboardSignature || dashboardSignatureTokens;

  // ── Shared style tokens ────────────────────────────────────────────────────
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
    fontSize: '0.74rem',
    letterSpacing: 0.55,
    textTransform: 'uppercase',
    color: alpha(theme.palette.common.white, 0.96),
    backgroundColor: BRAND_DARK,
    borderBottom: 'none'
  };
  const tableBodyRowSx = {
    '& td': { borderBottomColor: dashboardTheme.table.rowBorder },
    '&:nth-of-type(even) td': { backgroundColor: dashboardTheme.table.rowStripe },
    '&:hover td': { backgroundColor: `${dashboardTheme.table.rowHover} !important` }
  };
  const yellowFilledButtonSx = {
    minHeight: 40, px: 2, borderRadius: 1.5,
    color: BRAND_DARK, backgroundColor: BRAND_YELLOW, fontWeight: 700,
    boxShadow: `0 8px 18px ${alpha(BRAND_YELLOW_DARK, 0.2)}`,
    '&:hover': { backgroundColor: BRAND_YELLOW_DARK },
    '&.Mui-disabled': { color: alpha(BRAND_DARK, 0.35), backgroundColor: alpha(BRAND_YELLOW, 0.38), boxShadow: 'none' }
  };
  const yellowOutlinedButtonSx = {
    minHeight: 36, px: 1.5, borderRadius: 1.5,
    color: BRAND_DARK, borderColor: BRAND_YELLOW_DARK, fontWeight: 600,
    backgroundColor: alpha(BRAND_YELLOW, 0.08),
    '&:hover': { borderColor: BRAND_YELLOW_DARK, backgroundColor: alpha(BRAND_YELLOW, 0.18) },
    '&.Mui-disabled': { borderColor: alpha(BRAND_DARK, 0.16), color: alpha(BRAND_DARK, 0.35) }
  };
  const filterChipSx = (active) => ({
    fontWeight: 600, fontSize: '0.78rem', borderRadius: 1.5, cursor: 'pointer',
    backgroundColor: active ? BRAND_YELLOW : alpha(BRAND_DARK, 0.06),
    color: active ? BRAND_DARK : alpha(BRAND_DARK, 0.65),
    border: `1px solid ${active ? BRAND_YELLOW_DARK : alpha(BRAND_DARK, 0.12)}`,
    '&:hover': { backgroundColor: active ? BRAND_YELLOW_DARK : alpha(BRAND_DARK, 0.10) }
  });
  const textFieldSx = {
    '& label.Mui-focused': { color: '#b8860b' },
    '& .MuiOutlinedInput-root': {
      '&.Mui-focused fieldset': { borderColor: '#b8860b' }
    }
  };
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    customColumns: [],
    asinAutomation: {
      enabled: false,
      fieldConfigs: []
    },
    coreFieldDefaults: {},
    customActionField: '*Action(SiteID=US|Country=US|Currency=USD|Version=1193)',
    rangeId: null,
    listProductId: null,
    pricingConfig: {
      enabled: false,
      spentRate: null,
      payoutRate: null,
      desiredProfit: null,
      fixedFee: 0,
      saleTax: 0,
      ebayFee: 12.9,
      adsFee: 3,
      tdsFee: 1,
      shippingCost: 0,
      taxRate: 10
    }
  });
  
  const [currentTab, setCurrentTab] = useState(0);

  const [editDialog, setEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [columnDialog, setColumnDialog] = useState(false);
  const [editingColumnIndex, setEditingColumnIndex] = useState(null);
  const [columnFormData, setColumnFormData] = useState({
    name: '',
    displayName: '',
    dataType: 'text',
    defaultValue: '',
    isRequired: false,
    placeholder: ''
  });

  // Bulk reset state
  const [bulkResetDialog, setBulkResetDialog] = useState(false);
  const [bulkResetTarget, setBulkResetTarget] = useState(null);
  const [affectedSellersCount, setAffectedSellersCount] = useState(0);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [bulkResetLoading, setBulkResetLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');

  // Filter state
  const [marketplaceFilter, setMarketplaceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter]       = useState('all');
  const [asinFilter, setAsinFilter]               = useState('all');
  const [pricingFilter, setPricingFilter]         = useState('all');
  const [colsFilter, setColsFilter]               = useState('all');

  // Directory assignment cascade
  const [formCategories, setFormCategories] = useState([]);
  const [allRanges, setAllRanges] = useState([]);    // all ranges, used for reverse lookup
  const [formRanges, setFormRanges] = useState([]);  // filtered to selected category
  const [formProducts, setFormProducts] = useState([]);
  const [formCategoryId, setFormCategoryId] = useState(''); // UI-only, not saved

  useEffect(() => {
    fetchTemplates();
    // Load categories and all ranges for the assignment cascade
    Promise.all([
      api.get('/asin-list-categories'),
      api.get('/asin-list-ranges', { params: { all: true } }),
    ]).then(([catRes, rangeRes]) => {
      setFormCategories(catRes.data || []);
      setAllRanges(rangeRes.data || []);
    }).catch(() => {});
  }, []);

  // Filter ranges when formCategoryId changes
  useEffect(() => {
    if (!formCategoryId) {
      setFormRanges([]);
      return;
    }
    setFormRanges(
      allRanges.filter(r => String(r.categoryId?._id || r.categoryId) === String(formCategoryId))
    );
  }, [formCategoryId, allRanges]);

  // Load products when rangeId changes in the form
  useEffect(() => {
    const rid = formData.rangeId;
    if (!rid) { setFormProducts([]); return; }
    api.get('/asin-list-products', { params: { rangeId: String(rid._id || rid) } })
      .then(r => setFormProducts(r.data || []))
      .catch(() => setFormProducts([]));
  }, [formData.rangeId]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/listing-templates');
      setTemplates(data || []);
    } catch (err) {
      setError('Failed to fetch templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived filter values ────────────────────────────────────────────────
  const availableMarketplaces = useMemo(() => {
    const mp = templates.map(t => extractMarketplace(t.customActionField));
    return [...new Set(mp)];
  }, [templates]);

  const availableCategories = useMemo(() => {
    const cats = templates.map(t => t.category).filter(c => c && c.trim() !== '');
    return [...new Set(cats)].sort();
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (templateSearch && !t.name.toLowerCase().includes(templateSearch.toLowerCase())) return false;
      if (marketplaceFilter !== 'all' && extractMarketplace(t.customActionField) !== marketplaceFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (asinFilter === 'enabled'  && !t.asinAutomation?.enabled) return false;
      if (asinFilter === 'disabled' &&  t.asinAutomation?.enabled) return false;
      if (pricingFilter === 'enabled'  && !t.pricingConfig?.enabled) return false;
      if (pricingFilter === 'disabled' &&  t.pricingConfig?.enabled) return false;
      if (colsFilter === 'yes' && !(t.customColumns?.length > 0)) return false;
      if (colsFilter === 'no'  &&   t.customColumns?.length > 0)  return false;
      return true;
    });
  }, [templates, templateSearch, marketplaceFilter, categoryFilter, asinFilter, pricingFilter, colsFilter]);

  const hasActiveFilters = templateSearch || marketplaceFilter !== 'all' || categoryFilter !== 'all'
    || asinFilter !== 'all' || pricingFilter !== 'all' || colsFilter !== 'all';

  const clearAllFilters = () => {
    setTemplateSearch('');
    setMarketplaceFilter('all');
    setCategoryFilter('all');
    setAsinFilter('all');
    setPricingFilter('all');
    setColsFilter('all');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name) {
      setError('Template name is required');
      return;
    }

    try {
      setLoading(true);
      await api.post('/listing-templates', formData);
      setSuccess('Template created successfully!');
      setFormData({
        name: '',
        customColumns: [],
        asinAutomation: {
          enabled: false,
          fieldConfigs: []
        },
        coreFieldDefaults: {},
        pricingConfig: {
          enabled: false,
          spentRate: null,
          payoutRate: null,
          desiredProfit: null,
          fixedFee: 0,
          saleTax: 0,
          ebayFee: 12.9,
          adsFee: 3,
          tdsFee: 1,
          shippingCost: 0,
          taxRate: 10
        }
      });
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create template');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    // Pre-populate cascade for the assignment section
    if (template.rangeId) {
      const rangeIdStr = String(template.rangeId?._id || template.rangeId);
      const matchingRange = allRanges.find(r => String(r._id) === rangeIdStr);
      if (matchingRange) {
        setFormCategoryId(String(matchingRange.categoryId?._id || matchingRange.categoryId));
      }
      api.get('/asin-list-products', { params: { rangeId: rangeIdStr } })
        .then(r => setFormProducts(r.data || []))
        .catch(() => {});
    } else {
      setFormCategoryId('');
      setFormRanges([]);
      setFormProducts([]);
    }
    setFormData({
      name: template.name,
      customColumns: template.customColumns || [],
      asinAutomation: template.asinAutomation || {
        enabled: false,
        fieldConfigs: []
      },
      coreFieldDefaults: template.coreFieldDefaults || {},
      customActionField: template.customActionField || '*Action(SiteID=US|Country=US|Currency=USD|Version=1193)',
      rangeId: template.rangeId || null,
      listProductId: template.listProductId || null,
      pricingConfig: template.pricingConfig || {
        enabled: false,
        spentRate: null,
        payoutRate: null,
        desiredProfit: null,
        fixedFee: 0,
        saleTax: 0,
        ebayFee: 12.9,
        adsFee: 3,
        tdsFee: 1,
        shippingCost: 0,
        taxRate: 10
      }
    });
    setEditDialog(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialog(false);
    setEditingTemplate(null);
    setCurrentTab(0);
    setFormCategoryId('');
    setFormRanges([]);
    setFormProducts([]);
    setFormData({
      name: '',
      customColumns: [],
      asinAutomation: {
        enabled: false,
        fieldConfigs: []
      },
      coreFieldDefaults: {},
      customActionField: '*Action(SiteID=US|Country=US|Currency=USD|Version=1193)',
      rangeId: null,
      listProductId: null,
      pricingConfig: {
        enabled: false,
        spentRate: null,
        payoutRate: null,
        desiredProfit: null,
        fixedFee: 0,
        saleTax: 0,
        ebayFee: 12.9,
        adsFee: 3,
        tdsFee: 1,
        shippingCost: 0,
        taxRate: 10
      }
    });
  };

  const handleUpdate = async () => {
    setError('');
    setSuccess('');

    try {
      setLoading(true);
      await api.put(`/listing-templates/${editingTemplate._id}`, formData);
      setSuccess('Template updated successfully!');
      setEditDialog(false);
      setEditingTemplate(null);
      setFormCategoryId('');
      setFormRanges([]);
      setFormProducts([]);
      setFormData({
        name: '',
        customColumns: [],
        asinAutomation: {
          enabled: false,
          fieldConfigs: []
        },
        coreFieldDefaults: {},
        customActionField: '*Action(SiteID=US|Country=US|Currency=USD|Version=1193)',
        rangeId: null,
        listProductId: null,
        pricingConfig: {
          enabled: false,
          spentRate: null,
          payoutRate: null,
          desiredProfit: null,
          fixedFee: 0,
          saleTax: 0,
          ebayFee: 12.9,
          adsFee: 3,
          tdsFee: 1,
          shippingCost: 0,
          taxRate: 10
        }
      });
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update template');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will NOT delete associated listings.`)) return;

    try {
      setLoading(true);
      await api.delete(`/listing-templates/${id}`);
      setSuccess('Template deleted successfully!');
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete template');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (templateId, templateName) => {
    if (!window.confirm(`Create a copy of "${templateName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const { data } = await api.post(`/listing-templates/${templateId}/duplicate`);
      
      setSuccess(`Template duplicated successfully as "${data.name}"!`);
      await fetchTemplates();
      
      // Highlight the new template
      setHighlightedId(data._id);
      
      // Auto-scroll to top where new template will appear
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      
      // Auto-open edit dialog for immediate customization
      setTimeout(() => {
        handleEdit(data);
      }, 300);
      
      // Clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightedId(null);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to duplicate template');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBulkReset = async (template) => {
    try {
      setBulkResetLoading(true);
      setError('');
      
      // Fetch the count of affected sellers
      const { data } = await api.get(`/template-overrides/${template._id}/count`);
      
      setAffectedSellersCount(data.count);
      setBulkResetTarget(template);
      setConfirmationInput('');
      setBulkResetDialog(true);
    } catch (err) {
      setError('Failed to fetch affected sellers count');
      console.error(err);
    } finally {
      setBulkResetLoading(false);
    }
  };

  const handleBulkReset = async () => {
    if (!bulkResetTarget) return;

    try {
      setBulkResetLoading(true);
      setError('');

      const { data } = await api.delete(`/listing-templates/${bulkResetTarget._id}/bulk-reset-overrides`);
      
      setSuccess(data.message || `Successfully reset ${data.deletedCount} seller customizations!`);
      setBulkResetDialog(false);
      setBulkResetTarget(null);
      setConfirmationInput('');
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset overrides');
      console.error(err);
    } finally {
      setBulkResetLoading(false);
    }
  };

  const handleCloseBulkResetDialog = () => {
    if (!bulkResetLoading) {
      setBulkResetDialog(false);
      setBulkResetTarget(null);
      setConfirmationInput('');
      setAffectedSellersCount(0);
    }
  };

  const handleAddColumn = () => {
    setEditingColumnIndex(null);
    setColumnFormData({
      name: '',
      displayName: '',
      dataType: 'text',
      defaultValue: '',
      isRequired: false,
      placeholder: ''
    });
    setColumnDialog(true);
  };

  const handleEditColumn = (columnIndex) => {
    const column = formData.customColumns[columnIndex];
    setEditingColumnIndex(columnIndex);
    setColumnFormData({
      name: column.name,
      displayName: column.displayName,
      dataType: column.dataType,
      defaultValue: column.defaultValue || '',
      isRequired: column.isRequired || false,
      placeholder: column.placeholder || ''
    });
    setColumnDialog(true);
  };

  const handleSaveColumn = () => {
    if (!columnFormData.name || !columnFormData.displayName) {
      setError('Column name and display name are required');
      return;
    }

    if (editingColumnIndex !== null) {
      // Edit existing column
      const updatedColumns = [...formData.customColumns];
      updatedColumns[editingColumnIndex] = {
        ...updatedColumns[editingColumnIndex],
        ...columnFormData
      };
      
      setFormData({
        ...formData,
        customColumns: updatedColumns
      });
    } else {
      // Add new column
      const maxOrder = formData.customColumns.length > 0 
        ? Math.max(...formData.customColumns.map(col => col.order))
        : 38;

      setFormData({
        ...formData,
        customColumns: [
          ...formData.customColumns,
          {
            ...columnFormData,
            order: maxOrder + 1
          }
        ]
      });
    }

    setColumnDialog(false);
    setEditingColumnIndex(null);
  };

  const handleRemoveColumn = (columnName) => {
    setFormData({
      ...formData,
      customColumns: formData.customColumns.filter(col => col.name !== columnName)
    });
  };
  
  const handleAddFieldConfig = () => {
    setFormData({
      ...formData,
      asinAutomation: {
        ...formData.asinAutomation,
        fieldConfigs: [
          ...formData.asinAutomation.fieldConfigs,
          {
            fieldType: 'core',
            ebayField: 'title',
            source: 'ai',
            promptTemplate: '',
            amazonField: '',
            transform: 'none',
            enabled: true,
            defaultValue: ''
          }
        ]
      }
    });
  };

  const handleViewListings = (templateId) => {
    // Navigate to seller selection page with returnTo parameter for direct template access
    navigate(`/admin/select-seller?returnTo=/admin/template-listings?templateId=${templateId}`);
  };

  const countCoreDefaults = () => {
    return Object.keys(formData.coreFieldDefaults || {}).filter(
      key => formData.coreFieldDefaults[key] !== '' && 
             formData.coreFieldDefaults[key] !== null && 
             formData.coreFieldDefaults[key] !== undefined
    ).length;
  };

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, pb: 4, backgroundColor: theme.palette.background.paper, minHeight: '100vh' }}>

      {/* Page Header */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3, pt: 2 }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: 2,
          background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${alpha(BRAND_DARK, 0.8)} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 12px ${alpha(BRAND_DARK, 0.25)}`
        }}>
          <ViewListIcon sx={{ color: BRAND_YELLOW, fontSize: 22 }} />
        </Box>
        <Typography variant="h5" fontWeight={800} sx={{ color: BRAND_DARK, letterSpacing: -0.5 }}>
          Manage Listing Templates
        </Typography>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Create New Template Card */}
      <Paper sx={{ ...surfaceCardSx, p: 2.5, mb: 3 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: alpha(BRAND_DARK, 0.5), display: 'block', mb: 1.5 }}>
          Create New Template
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Template Name"
              required
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Phone Case Template"
              helperText="All 38 core eBay columns will be automatically included. You can add custom columns below."
              sx={textFieldSx}
            />

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: BRAND_DARK }}>Custom Columns</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={handleAddColumn} sx={yellowOutlinedButtonSx}>
                  Add Column
                </Button>
              </Stack>

              {formData.customColumns.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No custom columns added yet. Click "Add Column" to create template-specific fields.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {formData.customColumns.map((col) => (
                    <Paper key={col.name} variant="outlined" sx={{ p: 1.5, borderColor: alpha(BRAND_DARK, 0.1) }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ color: BRAND_DARK }}>{col.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {col.displayName} • {col.dataType}
                            {col.isRequired && ' • Required'}
                            {col.defaultValue && ` • Default: ${col.defaultValue}`}
                          </Typography>
                        </Box>
                        <IconButton size="small" color="error" onClick={() => handleRemoveColumn(col.name)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>

            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{ ...yellowFilledButtonSx, mt: 1 }}
            >
              Create Template
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Existing Templates Table */}
      <Paper sx={tableContainerSx}>

        {/* Table Header Bar */}
        <Stack direction="row" justifyContent="space-between" alignItems="center"
          sx={{ px: 2.5, py: 1.5, backgroundColor: BRAND_DARK, borderBottom: `2px solid ${BRAND_YELLOW}` }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.5, color: alpha('#fff', 0.95) }}>
            Existing Templates ({filteredTemplates.length}{hasActiveFilters ? ` of ${templates.length}` : ''})
          </Typography>
          <TextField
            size="small"
            placeholder="Search by name…"
            value={templateSearch}
            onChange={(e) => setTemplateSearch(e.target.value)}
            sx={{
              width: 260,
              '& .MuiOutlinedInput-root': {
                backgroundColor: alpha('#fff', 0.1),
                borderRadius: 1.5,
                color: '#fff',
                '& fieldset': { borderColor: alpha('#fff', 0.25) },
                '&:hover fieldset': { borderColor: alpha('#fff', 0.5) },
                '&.Mui-focused fieldset': { borderColor: BRAND_YELLOW }
              },
              '& .MuiInputBase-input::placeholder': { color: alpha('#fff', 0.5) }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: alpha('#fff', 0.6) }} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>

        {/* Filter Bar */}
        <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${alpha(BRAND_DARK, 0.08)}`, backgroundColor: alpha(BRAND_DARK, 0.02) }}>
          <Stack spacing={1.5}>

            {/* Marketplace chips */}
            {availableMarketplaces.length > 1 && (
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Typography variant="caption" sx={{ minWidth: 90, fontWeight: 700, color: alpha(BRAND_DARK, 0.5), letterSpacing: 0.4, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                  Marketplace
                </Typography>
                {[{ v: 'all', label: 'All' }, ...availableMarketplaces.map(mp => ({ v: mp, label: MARKETPLACE_LABELS[mp] }))].map(({ v, label }) => (
                  <Chip key={v} label={label} size="small" onClick={() => setMarketplaceFilter(v)} sx={filterChipSx(marketplaceFilter === v)} />
                ))}
              </Stack>
            )}

            {/* Category dropdown */}
            {availableCategories.length > 0 && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="caption" sx={{ minWidth: 90, fontWeight: 700, color: alpha(BRAND_DARK, 0.5), letterSpacing: 0.4, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                  Category
                </Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} displayEmpty>
                    <MenuItem value="all"><em>All Categories</em></MenuItem>
                    {availableCategories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
            )}

            {/* Quick toggle chips */}
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
              <Typography variant="caption" sx={{ minWidth: 90, fontWeight: 700, color: alpha(BRAND_DARK, 0.5), letterSpacing: 0.4, textTransform: 'uppercase', fontSize: '0.68rem' }}>
                Quick
              </Typography>
              {[{ v: 'all', label: 'All ASIN' }, { v: 'enabled', label: 'ASIN ✓' }, { v: 'disabled', label: 'ASIN ✗' }].map(({ v, label }) => (
                <Chip key={v} label={label} size="small" onClick={() => setAsinFilter(v)} sx={filterChipSx(asinFilter === v)} />
              ))}
              {[{ v: 'all', label: 'All Pricing' }, { v: 'enabled', label: 'Pricing ✓' }, { v: 'disabled', label: 'Pricing ✗' }].map(({ v, label }) => (
                <Chip key={v} label={label} size="small" onClick={() => setPricingFilter(v)} sx={filterChipSx(pricingFilter === v)} />
              ))}
              {[{ v: 'all', label: 'All Cols' }, { v: 'yes', label: 'Has Cols' }, { v: 'no', label: 'No Cols' }].map(({ v, label }) => (
                <Chip key={v} label={label} size="small" onClick={() => setColsFilter(v)} sx={filterChipSx(colsFilter === v)} />
              ))}
            </Stack>

            {hasActiveFilters && (
              <Box>
                <Button size="small" onClick={clearAllFilters}
                  sx={{ color: BRAND_DARK, fontWeight: 600, textDecoration: 'underline', p: 0, minWidth: 0, '&:hover': { textDecoration: 'underline', backgroundColor: 'transparent' } }}>
                  Clear all filters
                </Button>
              </Box>
            )}
          </Stack>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={tableHeaderCellSx}>Name</TableCell>
              <TableCell sx={tableHeaderCellSx}>Marketplace</TableCell>
              <TableCell sx={tableHeaderCellSx}>Custom Columns</TableCell>
              <TableCell sx={tableHeaderCellSx}>Created</TableCell>
              <TableCell align="right" sx={tableHeaderCellSx}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} sx={{ color: BRAND_YELLOW_DARK }} />
                </TableCell>
              </TableRow>
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary', background: dashboardTheme.surfaces.emptyState }}>
                  No templates found. Create one above!
                </TableCell>
              </TableRow>
            ) : filteredTemplates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary', background: dashboardTheme.surfaces.emptyState }}>
                  No templates match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredTemplates.map((template) => (
                <TableRow
                  key={template._id}
                  hover
                  sx={{
                    ...tableBodyRowSx,
                    ...(highlightedId === template._id && {
                      '& td': { backgroundColor: `${alpha(BRAND_YELLOW, 0.18)} !important` }
                    }),
                    transition: 'background-color 0.3s ease'
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} sx={{ color: BRAND_DARK }}>
                      {template.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={MARKETPLACE_LABELS[extractMarketplace(template.customActionField)] || 'eBay US'}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        backgroundColor: alpha(BRAND_DARK, 0.07),
                        color: BRAND_DARK,
                        border: `1px solid ${alpha(BRAND_DARK, 0.15)}`
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {template.customColumns?.length > 0 ? (
                      <Chip
                        label={`${template.customColumns.length} columns`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          backgroundColor: alpha(BRAND_YELLOW, 0.25),
                          color: BRAND_DARK,
                          border: `1px solid ${BRAND_YELLOW_DARK}`
                        }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">None</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.6) }}>
                      {new Date(template.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleViewListings(template._id)} title="View Listings"
                      sx={{ '&:hover': { color: BRAND_DARK, backgroundColor: alpha(BRAND_YELLOW, 0.2) } }}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDuplicate(template._id, template.name)} title="Duplicate Template"
                      sx={{ '&:hover': { color: BRAND_DARK, backgroundColor: alpha(BRAND_YELLOW, 0.2) } }}>
                      <CopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="success" onClick={() => handleOpenBulkReset(template)} title="Apply Base Template to All Sellers">
                      <PublishIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleEdit(template)} title="Edit Template"
                      sx={{ '&:hover': { color: BRAND_DARK, backgroundColor: alpha(BRAND_YELLOW, 0.2) } }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(template._id, template.name)} title="Delete Template">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Edit Template Dialog */}
      <Dialog open={editDialog} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
        <DialogTitle>Edit Template</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Tabs 
              value={currentTab} 
              onChange={(e, v) => setCurrentTab(v)} 
              sx={{ mb: 3 }}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="Basic Info" />
              <Tab label="Custom Columns" />
              <Tab label="ASIN Auto-Fill" />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Core Defaults
                    {countCoreDefaults() > 0 && (
                      <Chip label={countCoreDefaults()} size="small" color="primary" sx={{ height: 18, fontSize: '0.7rem' }} />
                    )}
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    Pricing Calc
                    {formData.pricingConfig?.enabled && (
                      <Chip label="✓" size="small" color="success" sx={{ height: 18, fontSize: '0.7rem' }} />
                    )}
                  </Box>
                } 
              />
            </Tabs>
            
            <Box sx={{ minHeight: 300 }}>
              {/* Tab 0: Basic Info */}
              {currentTab === 0 && (
                <Stack spacing={2}>
                  <TextField
                    label="Template Name"
                    required
                    fullWidth
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />

                  {/* Directory Assignment */}
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>
                    Listing Directory Assignment
                  </Typography>

                  <FormControl size="small" fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      label="Category"
                      value={formCategoryId}
                      onChange={e => {
                        setFormCategoryId(e.target.value);
                        setFormData({ ...formData, rangeId: null, listProductId: null });
                      }}
                    >
                      <MenuItem value=""><em>None</em></MenuItem>
                      {formCategories.map(c => (
                        <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" fullWidth disabled={!formCategoryId}>
                    <InputLabel>Range</InputLabel>
                    <Select
                      label="Range"
                      value={formData.rangeId ? String(formData.rangeId?._id || formData.rangeId) : ''}
                      onChange={e => setFormData({ ...formData, rangeId: e.target.value || null, listProductId: null })}
                    >
                      <MenuItem value=""><em>None</em></MenuItem>
                      {formRanges.map(r => (
                        <MenuItem key={r._id} value={r._id}>{r.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" fullWidth disabled={!formData.rangeId}>
                    <InputLabel>Product (optional)</InputLabel>
                    <Select
                      label="Product (optional)"
                      value={formData.listProductId ? String(formData.listProductId?._id || formData.listProductId) : ''}
                      onChange={e => setFormData({ ...formData, listProductId: e.target.value || null })}
                    >
                      <MenuItem value=""><em>None — Range level</em></MenuItem>
                      {formProducts.map(p => (
                        <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              )}
              
              {/* Tab 1: Custom Columns */}
              {currentTab === 1 && (
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Custom Columns</Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={handleAddColumn}>
                      Add Column
                    </Button>
                  </Stack>

                  {formData.customColumns.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No custom columns
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {formData.customColumns.map((col, index) => (
                        <Paper key={col.name} variant="outlined" sx={{ p: 1.5 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="body2" fontWeight="bold">{col.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {col.displayName} • {col.dataType}
                                {col.isRequired && ' • Required'}
                                {col.defaultValue && ` • Default: ${col.defaultValue}`}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={0.5}>
                              <IconButton size="small" onClick={() => handleEditColumn(index)} title="Edit Column">
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleRemoveColumn(col.name)} title="Delete Column">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}
              
              {/* Tab 2: ASIN Auto-Fill */}
              {currentTab === 2 && (
                <Stack spacing={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.asinAutomation?.enabled || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          asinAutomation: {
                            ...formData.asinAutomation,
                            enabled: e.target.checked
                          }
                        })}
                      />
                    }
                    label="Enable ASIN Auto-Fill for Listings"
                  />
                  
                  {formData.asinAutomation?.enabled && (
                    <>
                      <Alert severity="info">
                        Configure which eBay fields should auto-populate when users enter an ASIN while creating listings. The system will fetch Amazon data and use AI to generate field values.
                      </Alert>
                      
                      <Typography variant="subtitle2">
                        Auto-Fill Field Configurations
                      </Typography>
                      
                      <FieldConfigList
                        configs={formData.asinAutomation.fieldConfigs}
                        customColumns={formData.customColumns}
                        onChange={(configs) => setFormData({
                          ...formData,
                          asinAutomation: {
                            ...formData.asinAutomation,
                            fieldConfigs: configs
                          }
                        })}
                      />
                      
                      <Button
                        startIcon={<AddIcon />}
                        onClick={handleAddFieldConfig}
                      >
                        Add Field Configuration
                      </Button>
                    </>
                  )}
                </Stack>
              )}
              
              {/* Tab 3: Core Field Defaults */}
              {currentTab === 3 && (
                <Box>
                  {/* eBay Action Field dropdown */}
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    eBay Action Field
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <FormControl fullWidth size="small" sx={{ mb: 4 }}>
                    <InputLabel>eBay Platform</InputLabel>
                    <Select
                      value={formData.customActionField || '*Action(SiteID=US|Country=US|Currency=USD|Version=1193)'}
                      label="eBay Platform"
                      onChange={(e) => setFormData({ ...formData, customActionField: e.target.value })}
                    >
                      <MenuItem value="*Action(SiteID=US|Country=US|Currency=USD|Version=1193)">
                        eBay US &nbsp;—&nbsp; *Action(SiteID=US|Country=US|Currency=USD|Version=1193)
                      </MenuItem>
                      <MenuItem value="*Action(SiteID=eBayMotors|Country=US|Currency=USD|Version=1193)">
                        eBay Motors &nbsp;—&nbsp; *Action(SiteID=eBayMotors|Country=US|Currency=USD|Version=1193)
                      </MenuItem>
                      <MenuItem value="*Action(SiteID=Australia|Country=AU|Currency=AUD|Version=1193)">
                        eBay Australia &nbsp;—&nbsp; *Action(SiteID=Australia|Country=AU|Currency=AUD|Version=1193)
                      </MenuItem>
                      <MenuItem value="*Action(SiteID=Canada|Country=CA|Currency=CAD|Version=1193)">
                        eBay Canada &nbsp;—&nbsp; *Action(SiteID=Canada|Country=CA|Currency=CAD|Version=1193)
                      </MenuItem>
                      <MenuItem value="*Action(SiteID=UK|Country=GB|Currency=GBP|Version=1193)">
                        eBay UK &nbsp;—&nbsp; *Action(SiteID=UK|Country=GB|Currency=GBP|Version=1193)
                      </MenuItem>
                    </Select>
                  </FormControl>

                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                      <strong>How it works:</strong> Set default values for core eBay fields at the template level. 
                      These defaults will apply to all sellers using this template unless they set seller-specific overrides.
                      Auto-fill (AI/ASIN/Calculator) can still override these defaults.
                    </Typography>
                  </Alert>
                  
                  <CoreFieldDefaultsForm
                    formData={formData.coreFieldDefaults || {}}
                    onChange={(newDefaults) => setFormData({
                      ...formData,
                      coreFieldDefaults: newDefaults
                    })}
                  />
                </Box>
              )}
              
              {/* Tab 4: Pricing Calculator */}
              {currentTab === 4 && (
                <Box>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                      <strong>How it works:</strong> Configure the pricing calculator at the template level.
                      When enabled, the calculator will automatically compute the Start Price based on Amazon ASIN data,
                      exchange rates, fees, and desired profit margins. Sellers can override these settings if needed.
                    </Typography>
                  </Alert>
                  
                  <PricingConfigSection
                    pricingConfig={formData.pricingConfig || {}}
                    onChange={(newPricingConfig) => setFormData({
                      ...formData,
                      pricingConfig: newPricingConfig
                    })}
                  />
                </Box>
              )}


            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseEditDialog} sx={{ color: alpha(BRAND_DARK, 0.6) }}>Cancel</Button>
          <Button onClick={handleUpdate} variant="contained" disabled={loading} sx={yellowFilledButtonSx}>
            Update Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Column Dialog */}
      <Dialog open={columnDialog} onClose={() => { setColumnDialog(false); setEditingColumnIndex(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingColumnIndex !== null ? 'Edit Custom Column' : 'Add Custom Column'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Stack spacing={2}>
              <TextField
                label="Column Name (CSV Header)"
                required
                fullWidth
                value={columnFormData.name}
                onChange={(e) => setColumnFormData({ ...columnFormData, name: e.target.value })}
                placeholder="e.g., C:Brand, C:Color, C:Material"
                helperText="Exact column name as it will appear in CSV"
              />

              <TextField
                label="Display Name"
                required
                fullWidth
                value={columnFormData.displayName}
                onChange={(e) => setColumnFormData({ ...columnFormData, displayName: e.target.value })}
                placeholder="e.g., Brand, Color, Material"
                helperText="User-friendly name for the UI"
              />

              <FormControl fullWidth>
                <InputLabel>Data Type</InputLabel>
                <Select
                  value={columnFormData.dataType}
                  label="Data Type"
                  onChange={(e) => setColumnFormData({ ...columnFormData, dataType: e.target.value })}
                >
                  <MenuItem value="text">Text</MenuItem>
                  <MenuItem value="number">Number</MenuItem>
                  <MenuItem value="multiselect">Multi-select</MenuItem>
                  <MenuItem value="boolean">Boolean</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Default Value"
                fullWidth
                value={columnFormData.defaultValue}
                onChange={(e) => setColumnFormData({ ...columnFormData, defaultValue: e.target.value })}
                placeholder="e.g., Does Not Apply"
              />

              <TextField
                label="Placeholder"
                fullWidth
                value={columnFormData.placeholder}
                onChange={(e) => setColumnFormData({ ...columnFormData, placeholder: e.target.value })}
                placeholder="e.g., Enter brand name"
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setColumnDialog(false); setEditingColumnIndex(null); }} sx={{ color: alpha(BRAND_DARK, 0.6) }}>Cancel</Button>
          <Button onClick={handleSaveColumn} variant="contained" sx={yellowFilledButtonSx}>
            {editingColumnIndex !== null ? 'Update Column' : 'Add Column'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Reset Confirmation Dialog */}
      <Dialog 
        open={bulkResetDialog} 
        onClose={handleCloseBulkResetDialog}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
          <PublishIcon />
          Apply Base Template to All Sellers
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="warning" variant="outlined">
              <strong>⚠️ Warning:</strong> This action is irreversible!
            </Alert>

            <Box>
              <Typography variant="body1" gutterBottom>
                This will:
              </Typography>
              <Box component="ul" sx={{ mt: 1, pl: 3 }}>
                <li>Delete all seller-specific customizations for this template</li>
                <li>Force all sellers to use the current base template settings</li>
                <li>Apply immediately to <strong>{affectedSellersCount}</strong> seller{affectedSellersCount !== 1 ? 's' : ''} who have customized this template</li>
              </Box>
            </Box>

            {affectedSellersCount === 0 && (
              <Alert severity="info">
                No sellers have customized this template yet. No changes will be made.
              </Alert>
            )}

            {affectedSellersCount > 0 && (
              <>
                <Alert severity="warning">
                  <strong>{affectedSellersCount}</strong> seller{affectedSellersCount !== 1 ? 's' : ''} will be affected.
                  Their customizations will be permanently deleted.
                </Alert>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    To confirm, type the template name: <strong>{bulkResetTarget?.name}</strong>
                  </Typography>
                  <TextField
                    fullWidth
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    placeholder="Enter template name exactly"
                    autoFocus
                    sx={{ mt: 1 }}
                  />
                </Box>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBulkResetDialog} disabled={bulkResetLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleBulkReset} 
            variant="contained"
            color="warning"
            disabled={
              bulkResetLoading || 
              affectedSellersCount === 0 ||
              confirmationInput !== bulkResetTarget?.name
            }
          >
            {bulkResetLoading ? 'Applying...' : `Apply to ${affectedSellersCount} Seller${affectedSellersCount !== 1 ? 's' : ''}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
