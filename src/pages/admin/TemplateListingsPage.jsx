import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Box, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Typography, IconButton, Dialog, DialogTitle, 
  DialogContent, DialogActions, Alert, Pagination, TextField, Tabs, Tab, MenuItem,
  Chip, CircularProgress
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import api from '../../lib/api.js';

export default function TemplateListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const templateId = searchParams.get('templateId');

  const [template, setTemplate] = useState(null);
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [addEditDialog, setAddEditDialog] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);

  // ASIN Auto-Fill state
  const [asinInput, setAsinInput] = useState('');
  const [loadingAsin, setLoadingAsin] = useState(false);
  const [asinError, setAsinError] = useState('');
  const [asinSuccess, setAsinSuccess] = useState('');
  const [autoFilledFields, setAutoFilledFields] = useState(new Set());

  const [listingFormData, setListingFormData] = useState({
    action: 'Add',
    customLabel: '',
    categoryId: '',
    categoryName: '',
    title: '',
    relationship: '',
    relationshipDetails: '',
    scheduleTime: '',
    upc: '',
    epid: '',
    startPrice: '',
    quantity: 1,
    itemPhotoUrl: '',
    videoId: '',
    conditionId: '1000',
    description: '',
    format: 'FixedPrice',
    duration: 'GTC',
    buyItNowPrice: '',
    bestOfferEnabled: false,
    bestOfferAutoAcceptPrice: '',
    minimumBestOfferPrice: '',
    immediatePayRequired: false,
    location: '',
    shippingService1Option: '',
    shippingService1Cost: '',
    shippingService1Priority: '',
    shippingService2Option: '',
    shippingService2Cost: '',
    shippingService2Priority: '',
    maxDispatchTime: '',
    returnsAcceptedOption: '',
    returnsWithinOption: '',
    refundOption: '',
    returnShippingCostPaidBy: '',
    shippingProfileName: '',
    returnProfileName: '',
    paymentProfileName: '',
    customFields: {}
  });

  // All 38 core columns - user can scroll to see them all
  const coreColumns = [
    { key: 'action', label: '*Action', width: 80 },
    { key: 'customLabel', label: 'Custom label (SKU)', width: 150 },
    { key: 'categoryId', label: 'Category ID', width: 100 },
    { key: 'categoryName', label: 'Category name', width: 200 },
    { key: 'title', label: 'Title', width: 300 },
    { key: 'relationship', label: 'Relationship', width: 120 },
    { key: 'relationshipDetails', label: 'Relationship details', width: 150 },
    { key: 'scheduleTime', label: 'Schedule time', width: 120 },
    { key: 'upc', label: 'UPC', width: 120 },
    { key: 'epid', label: 'EPID', width: 100 },
    { key: 'startPrice', label: 'Start price', width: 100 },
    { key: 'quantity', label: 'Quantity', width: 80 },
    { key: 'itemPhotoUrl', label: 'Item photo URL', width: 150 },
    { key: 'videoId', label: 'Video ID', width: 120 },
    { key: 'conditionId', label: 'Condition ID', width: 100 },
    { key: 'description', label: 'Description', width: 200 },
    { key: 'format', label: 'Format', width: 100 },
    { key: 'duration', label: 'Duration', width: 100 },
    { key: 'buyItNowPrice', label: 'Buy It Now price', width: 120 },
    { key: 'bestOfferEnabled', label: 'Best Offer enabled', width: 120 },
    { key: 'bestOfferAutoAcceptPrice', label: 'Best Offer auto accept price', width: 180 },
    { key: 'minimumBestOfferPrice', label: 'Minimum best offer price', width: 180 },
    { key: 'immediatePayRequired', label: 'Immediate pay required', width: 150 },
    { key: 'location', label: 'Location', width: 120 },
    { key: 'shippingService1Option', label: 'Shipping service-1 option', width: 180 },
    { key: 'shippingService1Cost', label: 'Shipping service-1 cost', width: 150 },
    { key: 'shippingService1Priority', label: 'Shipping service-1 priority', width: 180 },
    { key: 'shippingService2Option', label: 'Shipping service-2 option', width: 180 },
    { key: 'shippingService2Cost', label: 'Shipping service-2 cost', width: 150 },
    { key: 'shippingService2Priority', label: 'Shipping service-2 priority', width: 180 },
    { key: 'maxDispatchTime', label: 'Max dispatch time', width: 140 },
    { key: 'returnsAcceptedOption', label: 'Returns accepted option', width: 170 },
    { key: 'returnsWithinOption', label: 'Return period', width: 120 },
    { key: 'refundOption', label: 'Refund option', width: 120 },
    { key: 'returnShippingCostPaidBy', label: 'Domestic return shipping paid by', width: 220 },
    { key: 'shippingProfileName', label: 'Shipping profile name', width: 180 },
    { key: 'returnProfileName', label: 'Return profile name', width: 180 },
    { key: 'paymentProfileName', label: 'Payment profile name', width: 180 }
  ];

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
      fetchListings();
    }
  }, [templateId, pagination.page]);

  const fetchTemplate = async () => {
    try {
      const { data } = await api.get(`/listing-templates/${templateId}`);
      setTemplate(data);
    } catch (err) {
      setError('Failed to fetch template');
      console.error(err);
    }
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/template-listings?templateId=${templateId}&page=${pagination.page}&limit=${pagination.limit}`);
      setListings(data.listings || []);
      setPagination(data.pagination);
    } catch (err) {
      setError('Failed to fetch listings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddListing = () => {
    setEditingListing(null);
    setAsinInput('');
    setAsinError('');
    setAsinSuccess('');
    setAutoFilledFields(new Set());
    setListingFormData({
      action: 'Add',
      customLabel: '',
      categoryId: template?.ebayCategory?.id || '',
      categoryName: template?.ebayCategory?.name || '',
      title: '',
      relationship: '',
      relationshipDetails: '',
      scheduleTime: '',
      upc: '',
      epid: '',
      startPrice: '',
      quantity: 1,
      itemPhotoUrl: '',
      videoId: '',
      conditionId: '1000',
      description: '',
      format: 'FixedPrice',
      duration: 'GTC',
      buyItNowPrice: '',
      bestOfferEnabled: false,
      bestOfferAutoAcceptPrice: '',
      minimumBestOfferPrice: '',
      immediatePayRequired: false,
      location: '',
      shippingService1Option: '',
      shippingService1Cost: '',
      shippingService1Priority: '',
      shippingService2Option: '',
      shippingService2Cost: '',
      shippingService2Priority: '',
      maxDispatchTime: '',
      returnsAcceptedOption: '',
      returnsWithinOption: '',
      refundOption: '',
      returnShippingCostPaidBy: '',
      shippingProfileName: '',
      returnProfileName: '',
      paymentProfileName: '',
      customFields: {}
    });
    setCurrentTab(0);
    setAddEditDialog(true);
  };

  const handleEditListing = (listing) => {
    setEditingListing(listing);
    setListingFormData({
      action: listing.action || 'Add',
      customLabel: listing.customLabel || '',
      categoryId: listing.categoryId || '',
      categoryName: listing.categoryName || '',
      title: listing.title || '',
      relationship: listing.relationship || '',
      relationshipDetails: listing.relationshipDetails || '',
      scheduleTime: listing.scheduleTime || '',
      upc: listing.upc || '',
      epid: listing.epid || '',
      startPrice: listing.startPrice || '',
      quantity: listing.quantity || 1,
      itemPhotoUrl: listing.itemPhotoUrl || '',
      videoId: listing.videoId || '',
      conditionId: listing.conditionId || '1000',
      description: listing.description || '',
      format: listing.format || 'FixedPrice',
      duration: listing.duration || 'GTC',
      buyItNowPrice: listing.buyItNowPrice || '',
      bestOfferEnabled: listing.bestOfferEnabled || false,
      bestOfferAutoAcceptPrice: listing.bestOfferAutoAcceptPrice || '',
      minimumBestOfferPrice: listing.minimumBestOfferPrice || '',
      immediatePayRequired: listing.immediatePayRequired || false,
      location: listing.location || '',
      shippingService1Option: listing.shippingService1Option || '',
      shippingService1Cost: listing.shippingService1Cost || '',
      shippingService1Priority: listing.shippingService1Priority || '',
      shippingService2Option: listing.shippingService2Option || '',
      shippingService2Cost: listing.shippingService2Cost || '',
      shippingService2Priority: listing.shippingService2Priority || '',
      maxDispatchTime: listing.maxDispatchTime || '',
      returnsAcceptedOption: listing.returnsAcceptedOption || '',
      returnsWithinOption: listing.returnsWithinOption || '',
      refundOption: listing.refundOption || '',
      returnShippingCostPaidBy: listing.returnShippingCostPaidBy || '',
      shippingProfileName: listing.shippingProfileName || '',
      returnProfileName: listing.returnProfileName || '',
      paymentProfileName: listing.paymentProfileName || '',
      customFields: listing.customFields || {}
    });
    setCurrentTab(0);
    setAddEditDialog(true);
  };

  const handleSaveListing = async () => {
    setError('');
    setSuccess('');

    if (!listingFormData.customLabel) {
      setError('SKU is required');
      return;
    }

    if (!listingFormData.title) {
      setError('Title is required');
      return;
    }

    if (!listingFormData.startPrice) {
      setError('Price is required');
      return;
    }

    try {
      setLoading(true);
      const dataToSend = {
        ...listingFormData,
        templateId
      };

      if (editingListing) {
        await api.put(`/template-listings/${editingListing._id}`, dataToSend);
        setSuccess('Listing updated successfully!');
      } else {
        await api.post('/template-listings', dataToSend);
        setSuccess('Listing created successfully!');
      }

      setAddEditDialog(false);
      fetchListings();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save listing');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (id, sku) => {
    if (!window.confirm(`Are you sure you want to delete listing "${sku}"?`)) return;

    try {
      setLoading(true);
      await api.delete(`/template-listings/${id}`);
      setSuccess('Listing deleted successfully!');
      fetchListings();
    } catch (err) {
      setError('Failed to delete listing');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateListing = async (listing) => {
    setEditingListing(null);
    setListingFormData({
      ...listing,
      customLabel: `${listing.customLabel}_COPY`,
      customFields: Object.fromEntries(listing.customFields || new Map())
    });
    setCurrentTab(0);
    setAddEditDialog(true);
  };

  const handleAsinAutofill = async () => {
    if (!asinInput.trim()) {
      setAsinError('Please enter an ASIN');
      return;
    }

    setAsinError('');
    setAsinSuccess('');
    setLoadingAsin(true);

    try {
      const { data } = await api.post('/template-listings/autofill-from-asin', {
        asin: asinInput.trim(),
        templateId
      });

      // Populate form with auto-filled data
      setListingFormData({
        ...listingFormData,
        ...data.autoFilledData,
        _asinReference: asinInput.trim()
      });

      // Track which fields were auto-filled
      setAutoFilledFields(new Set(Object.keys(data.autoFilledData)));

      setAsinSuccess(`Successfully auto-filled ${Object.keys(data.autoFilledData).length} field(s) from Amazon data`);
    } catch (err) {
      setAsinError(err.response?.data?.error || 'Failed to auto-fill from ASIN');
      console.error(err);
    } finally {
      setLoadingAsin(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/template-listings/export-csv/${templateId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${template?.name || 'listings'}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setSuccess('CSV exported successfully!');
    } catch (err) {
      setError('Failed to export CSV');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateCustomField = (fieldName, value) => {
    setListingFormData({
      ...listingFormData,
      customFields: {
        ...listingFormData.customFields,
        [fieldName]: value
      }
    });
  };

  // Helper to get TextField props for auto-filled fields
  const getAutoFilledProps = (fieldKey) => {
    const isAutoFilled = autoFilledFields.has(fieldKey);
    return {
      sx: isAutoFilled ? { bgcolor: 'success.50' } : {},
      InputProps: isAutoFilled ? {
        endAdornment: (
          <Chip 
            label="Auto-filled" 
            size="small" 
            color="success" 
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        )
      } : {}
    };
  };

  if (!templateId) {
    return (
      <Box>
        <Alert severity="warning">No template selected. Please select a template from the Templates page.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">
          {template ? `${template.name} - Listings` : 'Template Listings'}
        </Typography>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddListing}>
          Add Listing
        </Button>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCSV} disabled={loading || listings.length === 0}>
          Download CSV
        </Button>
      </Stack>

      <TableContainer component={Paper} sx={{ maxHeight: 600, maxWidth: '100%', overflowX: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {/* All 38 core columns */}
              {coreColumns.map(col => (
                <TableCell key={col.key} sx={{ fontWeight: 'bold', minWidth: col.width }}>
                  {col.label}
                </TableCell>
              ))}
              
              {/* Custom columns from template */}
              {template?.customColumns?.map(col => (
                <TableCell key={col.name} sx={{ fontWeight: 'bold', minWidth: 150 }}>
                  {col.displayName}
                </TableCell>
              ))}
              
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 150, position: 'sticky', right: 0, backgroundColor: 'background.paper', zIndex: 1 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {listings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={coreColumns.length + (template?.customColumns?.length || 0) + 1} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No listings found. Add one above!
                </TableCell>
              </TableRow>
            ) : (
              listings.map((listing) => (
                <TableRow key={listing._id} hover>
                  {/* All 38 core column values */}
                  {coreColumns.map(col => (
                    <TableCell key={col.key}>
                      {col.key === 'startPrice' || col.key === 'buyItNowPrice' || col.key === 'bestOfferAutoAcceptPrice' || col.key === 'minimumBestOfferPrice' ? (
                        listing[col.key] ? `$${listing[col.key]}` : '-'
                      ) : col.key === 'bestOfferEnabled' || col.key === 'immediatePayRequired' ? (
                        listing[col.key] ? 'Yes' : 'No'
                      ) : col.key === 'itemPhotoUrl' ? (
                        listing[col.key] ? (
                          <Typography variant="caption" color="primary">
                            {listing[col.key].split('|').filter(u => u.trim()).length} images
                          </Typography>
                        ) : '-'
                      ) : col.key === 'description' ? (
                        listing[col.key] ? (
                          <Typography variant="caption" noWrap sx={{ maxWidth: 200, display: 'block' }}>
                            {listing[col.key].replace(/<[^>]*>/g, '').substring(0, 50)}...
                          </Typography>
                        ) : '-'
                      ) : (
                        listing[col.key] || '-'
                      )}
                    </TableCell>
                  ))}
                  
                  {/* Custom field values */}
                  {template?.customColumns?.map(col => (
                    <TableCell key={col.name}>
                      {listing.customFields?.[col.name] || '-'}
                    </TableCell>
                  ))}
                  
                  <TableCell align="right" sx={{ position: 'sticky', right: 0, backgroundColor: 'background.paper' }}>
                    <IconButton size="small" onClick={() => handleDuplicateListing(listing)} title="Duplicate">
                      <CopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleEditListing(listing)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDeleteListing(listing._id, listing.customLabel)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination.pages > 1 && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Pagination 
            count={pagination.pages} 
            page={pagination.page} 
            onChange={(e, page) => setPagination({ ...pagination, page })}
            color="primary"
          />
        </Box>
      )}

      {/* Add/Edit Listing Dialog */}
      <Dialog open={addEditDialog} onClose={() => setAddEditDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{editingListing ? 'Edit Listing' : 'Add New Listing'}</DialogTitle>
        <DialogContent>
          {/* ASIN Auto-Fill Section (only show if template has automation enabled and not editing) */}
          {!editingListing && template?.asinAutomation?.enabled && (
            <Paper variant="outlined" sx={{ p: 2, mb: 3, mt: 1, bgcolor: 'primary.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Auto-Fill from Amazon ASIN
              </Typography>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <TextField
                  label="Amazon ASIN"
                  size="small"
                  value={asinInput}
                  onChange={(e) => setAsinInput(e.target.value)}
                  placeholder="e.g., B08N5WRWNW"
                  sx={{ flexGrow: 1 }}
                  disabled={loadingAsin}
                />
                <Button
                  variant="contained"
                  onClick={handleAsinAutofill}
                  disabled={loadingAsin || !asinInput.trim()}
                  startIcon={loadingAsin && <CircularProgress size={16} />}
                >
                  {loadingAsin ? 'Loading...' : 'Auto-Fill'}
                </Button>
              </Stack>
              {asinError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {asinError}
                </Alert>
              )}
              {asinSuccess && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {asinSuccess}
                </Alert>
              )}
            </Paper>
          )}

          <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ mb: 2, mt: 1 }} variant="scrollable" scrollButtons="auto">
            <Tab label="Basic Info" />
            <Tab label="Pricing & Offers" />
            <Tab label="Shipping & Location" />
            <Tab label="Returns & Payments" />
            <Tab label="Images & Description" />
            <Tab label="Advanced" />
            <Tab label="Product Details" />
          </Tabs>

          <Box sx={{ mt: 2, maxHeight: '60vh', overflowY: 'auto' }}>
            {/* Tab 0: Basic Info */}
            {currentTab === 0 && (
              <Stack spacing={2}>
                <TextField
                  label="*Action"
                  select
                  fullWidth
                  value={listingFormData.action}
                  onChange={(e) => setListingFormData({ ...listingFormData, action: e.target.value })}
                >
                  <MenuItem value="Add">Add</MenuItem>
                  <MenuItem value="Revise">Revise</MenuItem>
                  <MenuItem value="End">End</MenuItem>
                </TextField>
                <TextField
                  label="Custom label (SKU)"
                  required
                  fullWidth
                  value={listingFormData.customLabel}
                  onChange={(e) => setListingFormData({ ...listingFormData, customLabel: e.target.value })}
                  placeholder="e.g., CASE-001"
                />
                <TextField
                  label="Category ID"
                  type="number"
                  fullWidth
                  value={listingFormData.categoryId}
                  onChange={(e) => setListingFormData({ ...listingFormData, categoryId: e.target.value })}
                  placeholder="e.g., 9355"
                />
                <TextField
                  label="Category name"
                  fullWidth
                  value={listingFormData.categoryName}
                  onChange={(e) => {
                    setListingFormData({ ...listingFormData, categoryName: e.target.value });
                    setAutoFilledFields(prev => {
                      const newSet = new Set(prev);
                      newSet.delete('categoryName');
                      return newSet;
                    });
                  }}
                  placeholder="e.g., /Cell Phones & Accessories/Cell Phones & Smartphones"
                  {...getAutoFilledProps('categoryName')}
                />
                <TextField
                  label="Title"
                  required
                  fullWidth
                  value={listingFormData.title}
                  onChange={(e) => {
                    setListingFormData({ ...listingFormData, title: e.target.value });
                    setAutoFilledFields(prev => {
                      const newSet = new Set(prev);
                      newSet.delete('title');
                      return newSet;
                    });
                  }}
                  inputProps={{ maxLength: 80 }}
                  helperText={`${listingFormData.title.length}/80 characters`}
                  {...getAutoFilledProps('title')}
                />
                <TextField
                  label="Quantity"
                  required
                  type="number"
                  fullWidth
                  value={listingFormData.quantity}
                  onChange={(e) => setListingFormData({ ...listingFormData, quantity: e.target.value })}
                />
                <TextField
                  label="Condition ID"
                  fullWidth
                  value={listingFormData.conditionId}
                  onChange={(e) => setListingFormData({ ...listingFormData, conditionId: e.target.value })}
                  placeholder="e.g., 1000 (New)"
                />
                <TextField
                  label="Format"
                  select
                  fullWidth
                  value={listingFormData.format}
                  onChange={(e) => setListingFormData({ ...listingFormData, format: e.target.value })}
                >
                  <MenuItem value="FixedPrice">FixedPrice</MenuItem>
                  <MenuItem value="Auction">Auction</MenuItem>
                </TextField>
                <TextField
                  label="Duration"
                  select
                  fullWidth
                  value={listingFormData.duration}
                  onChange={(e) => setListingFormData({ ...listingFormData, duration: e.target.value })}
                >
                  <MenuItem value="GTC">GTC (Good Till Cancelled)</MenuItem>
                  <MenuItem value="Days_3">3 Days</MenuItem>
                  <MenuItem value="Days_5">5 Days</MenuItem>
                  <MenuItem value="Days_7">7 Days</MenuItem>
                  <MenuItem value="Days_10">10 Days</MenuItem>
                </TextField>
              </Stack>
            )}

            {/* Tab 1: Pricing & Offers */}
            {currentTab === 1 && (
              <Stack spacing={2}>
                <TextField
                  label="Start price"
                  required
                  type="number"
                  fullWidth
                  value={listingFormData.startPrice}
                  onChange={(e) => {
                    setListingFormData({ ...listingFormData, startPrice: e.target.value });
                    setAutoFilledFields(prev => {
                      const newSet = new Set(prev);
                      newSet.delete('startPrice');
                      return newSet;
                    });
                  }}
                  placeholder="e.g., 19.99"
                  {...getAutoFilledProps('startPrice')}
                />
                <TextField
                  label="Buy It Now price"
                  type="number"
                  fullWidth
                  value={listingFormData.buyItNowPrice}
                  onChange={(e) => {
                    setListingFormData({ ...listingFormData, buyItNowPrice: e.target.value });
                    setAutoFilledFields(prev => {
                      const newSet = new Set(prev);
                      newSet.delete('buyItNowPrice');
                      return newSet;
                    });
                  }}
                  {...getAutoFilledProps('buyItNowPrice')}
                />
                <TextField
                  label="Best Offer enabled"
                  select
                  fullWidth
                  value={listingFormData.bestOfferEnabled}
                  onChange={(e) => setListingFormData({ ...listingFormData, bestOfferEnabled: e.target.value === 'true' })}
                >
                  <MenuItem value={false}>No</MenuItem>
                  <MenuItem value={true}>Yes</MenuItem>
                </TextField>
                <TextField
                  label="Best Offer auto accept price"
                  type="number"
                  fullWidth
                  value={listingFormData.bestOfferAutoAcceptPrice}
                  onChange={(e) => setListingFormData({ ...listingFormData, bestOfferAutoAcceptPrice: e.target.value })}
                />
                <TextField
                  label="Minimum best offer price"
                  type="number"
                  fullWidth
                  value={listingFormData.minimumBestOfferPrice}
                  onChange={(e) => setListingFormData({ ...listingFormData, minimumBestOfferPrice: e.target.value })}
                />
                <TextField
                  label="Immediate pay required"
                  select
                  fullWidth
                  value={listingFormData.immediatePayRequired}
                  onChange={(e) => setListingFormData({ ...listingFormData, immediatePayRequired: e.target.value === 'true' })}
                >
                  <MenuItem value={false}>No</MenuItem>
                  <MenuItem value={true}>Yes</MenuItem>
                </TextField>
              </Stack>
            )}

            {/* Tab 2: Shipping & Location */}
            {currentTab === 2 && (
              <Stack spacing={2}>
                <TextField
                  label="Location"
                  fullWidth
                  value={listingFormData.location}
                  onChange={(e) => setListingFormData({ ...listingFormData, location: e.target.value })}
                  placeholder="e.g., United States"
                />
                <TextField
                  label="Max dispatch time (days)"
                  type="number"
                  fullWidth
                  value={listingFormData.maxDispatchTime}
                  onChange={(e) => setListingFormData({ ...listingFormData, maxDispatchTime: e.target.value })}
                />
                <Typography variant="subtitle2" sx={{ mt: 2 }}>Shipping Service 1</Typography>
                <TextField
                  label="Shipping service-1 option"
                  fullWidth
                  value={listingFormData.shippingService1Option}
                  onChange={(e) => setListingFormData({ ...listingFormData, shippingService1Option: e.target.value })}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Cost"
                    type="number"
                    value={listingFormData.shippingService1Cost}
                    onChange={(e) => setListingFormData({ ...listingFormData, shippingService1Cost: e.target.value })}
                  />
                  <TextField
                    label="Priority"
                    type="number"
                    value={listingFormData.shippingService1Priority}
                    onChange={(e) => setListingFormData({ ...listingFormData, shippingService1Priority: e.target.value })}
                  />
                </Stack>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>Shipping Service 2</Typography>
                <TextField
                  label="Shipping service-2 option"
                  fullWidth
                  value={listingFormData.shippingService2Option}
                  onChange={(e) => setListingFormData({ ...listingFormData, shippingService2Option: e.target.value })}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Cost"
                    type="number"
                    value={listingFormData.shippingService2Cost}
                    onChange={(e) => setListingFormData({ ...listingFormData, shippingService2Cost: e.target.value })}
                  />
                  <TextField
                    label="Priority"
                    type="number"
                    value={listingFormData.shippingService2Priority}
                    onChange={(e) => setListingFormData({ ...listingFormData, shippingService2Priority: e.target.value })}
                  />
                </Stack>
                <TextField
                  label="Shipping profile name"
                  fullWidth
                  value={listingFormData.shippingProfileName}
                  onChange={(e) => setListingFormData({ ...listingFormData, shippingProfileName: e.target.value })}
                />
              </Stack>
            )}

            {/* Tab 3: Returns & Payments */}
            {currentTab === 3 && (
              <Stack spacing={2}>
                <TextField
                  label="Returns accepted option"
                  fullWidth
                  value={listingFormData.returnsAcceptedOption}
                  onChange={(e) => setListingFormData({ ...listingFormData, returnsAcceptedOption: e.target.value })}
                />
                <TextField
                  label="Return period"
                  fullWidth
                  value={listingFormData.returnsWithinOption}
                  onChange={(e) => setListingFormData({ ...listingFormData, returnsWithinOption: e.target.value })}
                  placeholder="e.g., Days_30"
                />
                <TextField
                  label="Refund option"
                  fullWidth
                  value={listingFormData.refundOption}
                  onChange={(e) => setListingFormData({ ...listingFormData, refundOption: e.target.value })}
                />
                <TextField
                  label="Domestic return shipping paid by"
                  fullWidth
                  value={listingFormData.returnShippingCostPaidBy}
                  onChange={(e) => setListingFormData({ ...listingFormData, returnShippingCostPaidBy: e.target.value })}
                />
                <TextField
                  label="Return profile name"
                  fullWidth
                  value={listingFormData.returnProfileName}
                  onChange={(e) => setListingFormData({ ...listingFormData, returnProfileName: e.target.value })}
                />
                <TextField
                  label="Payment profile name"
                  fullWidth
                  value={listingFormData.paymentProfileName}
                  onChange={(e) => setListingFormData({ ...listingFormData, paymentProfileName: e.target.value })}
                />
              </Stack>
            )}

            {/* Tab 4: Images & Description */}
            {currentTab === 4 && (
              <Stack spacing={2}>
                <TextField
                  label="Item photo URL"
                  fullWidth
                  multiline
                  rows={3}
                  value={listingFormData.itemPhotoUrl}
                  onChange={(e) => {
                    setListingFormData({ ...listingFormData, itemPhotoUrl: e.target.value });
                    setAutoFilledFields(prev => {
                      const newSet = new Set(prev);
                      newSet.delete('itemPhotoUrl');
                      return newSet;
                    });
                  }}
                  placeholder="https://image1.jpg| https://image2.jpg| https://image3.jpg"
                  helperText="Separate multiple URLs with pipe (|) character with spaces: ' | '"
                  {...getAutoFilledProps('itemPhotoUrl')}
                />
                <TextField
                  label="Video ID"
                  fullWidth
                  value={listingFormData.videoId}
                  onChange={(e) => setListingFormData({ ...listingFormData, videoId: e.target.value })}
                />
                <TextField
                  label="Description (HTML)"
                  fullWidth
                  multiline
                  rows={12}
                  value={listingFormData.description}
                  onChange={(e) => {
                    setListingFormData({ ...listingFormData, description: e.target.value });
                    setAutoFilledFields(prev => {
                      const newSet = new Set(prev);
                      newSet.delete('description');
                      return newSet;
                    });
                  }}
                  placeholder="<html>...</html>"
                  {...getAutoFilledProps('description')}
                />
              </Stack>
            )}

            {/* Tab 5: Advanced */}
            {currentTab === 5 && (
              <Stack spacing={2}>
                <TextField
                  label="Relationship"
                  fullWidth
                  value={listingFormData.relationship}
                  onChange={(e) => setListingFormData({ ...listingFormData, relationship: e.target.value })}
                />
                <TextField
                  label="Relationship details"
                  fullWidth
                  value={listingFormData.relationshipDetails}
                  onChange={(e) => setListingFormData({ ...listingFormData, relationshipDetails: e.target.value })}
                />
                <TextField
                  label="Schedule time"
                  type="datetime-local"
                  fullWidth
                  value={listingFormData.scheduleTime}
                  onChange={(e) => setListingFormData({ ...listingFormData, scheduleTime: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="UPC"
                  fullWidth
                  value={listingFormData.upc}
                  onChange={(e) => setListingFormData({ ...listingFormData, upc: e.target.value })}
                />
                <TextField
                  label="EPID"
                  fullWidth
                  value={listingFormData.epid}
                  onChange={(e) => setListingFormData({ ...listingFormData, epid: e.target.value })}
                />
              </Stack>
            )}

            {/* Tab 6: Product Details (Custom Fields) */}
            {currentTab === 6 && (
              <Stack spacing={2}>
                {template?.customColumns && template.customColumns.length > 0 ? (
                  template.customColumns
                    .sort((a, b) => a.order - b.order)
                    .map(col => (
                      <TextField
                        key={col.name}
                        label={col.displayName}
                        fullWidth
                        value={listingFormData.customFields[col.name] || col.defaultValue || ''}
                        onChange={(e) => updateCustomField(col.name, e.target.value)}
                        placeholder={col.placeholder}
                        required={col.isRequired}
                      />
                    ))
                ) : (
                  <Typography color="text.secondary">No custom fields defined for this template</Typography>
                )}
              </Stack>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddEditDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveListing} variant="contained" disabled={loading}>
            {editingListing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
