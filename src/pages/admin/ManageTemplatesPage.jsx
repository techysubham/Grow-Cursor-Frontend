import { useEffect, useState } from 'react';
import { 
  Box, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TextField, Typography, IconButton, Dialog, DialogTitle, 
  DialogContent, DialogActions, Alert, Chip, FormControl, InputLabel, Select, MenuItem,
  Tabs, Tab, Switch, FormControlLabel
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  ContentCopy as CopyIcon,
  Publish as PublishIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api.js';
import FieldConfigList from '../../components/FieldConfigList.jsx';
import CoreFieldDefaultsForm from '../../components/CoreFieldDefaultsForm.jsx';
import PricingConfigSection from '../../components/PricingConfigSection.jsx';
import ActionFieldEditor from '../../components/ActionFieldEditor.jsx';

export default function ManageTemplatesPage() {
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchTemplates();
  }, []);

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
    setFormData({
      name: template.name,
      customColumns: template.customColumns || [],
      asinAutomation: template.asinAutomation || {
        enabled: false,
        fieldConfigs: []
      },
      coreFieldDefaults: template.coreFieldDefaults || {},
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
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Manage Listing Templates</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
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
            />

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2">Custom Columns</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={handleAddColumn}>
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
              sx={{ mt: 2 }}
            >
              Create Template
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Paper>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, bgcolor: 'grey.100', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">
            Existing Templates ({templates.filter(t => t.name.toLowerCase().includes(templateSearch.toLowerCase())).length}{templateSearch ? ` of ${templates.length}` : ''})
          </Typography>
          <TextField
            size="small"
            placeholder="Search by name…"
            value={templateSearch}
            onChange={(e) => setTemplateSearch(e.target.value)}
            sx={{ width: 240 }}
          />
        </Stack>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>

                <TableCell sx={{ fontWeight: 'bold' }}>Custom Columns</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    No templates found. Create one above!
                  </TableCell>
                </TableRow>
              ) : templates.filter(t => t.name.toLowerCase().includes(templateSearch.toLowerCase())).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    No templates match "{templateSearch}"
                  </TableCell>
                </TableRow>
              ) : (
                templates.filter(t => t.name.toLowerCase().includes(templateSearch.toLowerCase())).map((template) => (
                  <TableRow 
                    key={template._id} 
                    hover
                    sx={{
                      bgcolor: highlightedId === template._id ? 'success.50' : 'transparent',
                      transition: 'background-color 0.3s ease'
                    }}
                  >
                    <TableCell><strong>{template.name}</strong></TableCell>
                    <TableCell>
                      {template.customColumns?.length > 0 ? (
                        <Chip label={`${template.customColumns.length} columns`} size="small" color="primary" variant="outlined" />
                      ) : (
                        <Typography variant="body2" color="text.secondary">None</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(template.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleViewListings(template._id)} title="View Listings">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDuplicate(template._id, template.name)} title="Duplicate Template">
                        <CopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="success" onClick={() => handleOpenBulkReset(template)} title="Apply Base Template to All Sellers">
                        <PublishIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleEdit(template)} title="Edit Template">
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
        </TableContainer>
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
              <Tab label="eBay Action Field" />
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

              {/* Tab 5: eBay Action Field */}
              {currentTab === 5 && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    This field defines the eBay marketplace settings for CSV export.
                    Changes here affect the base template and will be used by default for all sellers
                    unless they create a seller-specific override.
                  </Alert>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <ActionFieldEditor templateId={editingTemplate?._id} sellerId={null} />
                  </Box>
                  
                  <Alert severity="warning" variant="outlined" sx={{ mt: 2 }}>
                    <strong>Common Marketplace Examples:</strong>
                    <br />• <strong>US:</strong> *Action(SiteID=US|Country=US|Currency=USD|Version=1193)
                    <br />• <strong>UK:</strong> *Action(SiteID=UK|Country=GB|Currency=GBP|Version=1193)
                    <br />• <strong>AU:</strong> *Action(SiteID=AU|Country=AU|Currency=AUD|Version=1193)
                    <br />• <strong>CA:</strong> *Action(SiteID=CA|Country=CA|Currency=CAD|Version=1193)
                    <br />• <strong>DE:</strong> *Action(SiteID=DE|Country=DE|Currency=EUR|Version=1193)
                    <br />• <strong>eBay Motors:</strong> *Action(SiteID=eBayMotors|Country=US|Currency=USD|Version=1193)
                  </Alert>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button onClick={handleUpdate} variant="contained" disabled={loading}>
            Update
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
        <DialogActions>
          <Button onClick={() => { setColumnDialog(false); setEditingColumnIndex(null); }}>Cancel</Button>
          <Button onClick={handleSaveColumn} variant="contained">
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
