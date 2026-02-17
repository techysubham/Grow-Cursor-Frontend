import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  LinearProgress,
  Chip,
  TextField,
  Grid,
  Paper,
  Divider,
  Alert,
  Stack,
  Skeleton,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  Close as CloseIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Save as SaveIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  HourglassEmpty as LoadingIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';

export default function AsinReviewModal({ 
  open, 
  onClose, 
  previewItems = [], 
  onSave,
  templateColumns = []
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editedItems, setEditedItems] = useState({});
  const [dismissedItems, setDismissedItems] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [descriptionViewMode, setDescriptionViewMode] = useState('code'); // 'code' | 'preview'
  const [amazonWindowRef, setAmazonWindowRef] = useState(null);
  const [showAmazonPreview, setShowAmazonPreview] = useState(false);

  // Filter out dismissed items
  const activeItems = previewItems.filter(item => !dismissedItems.has(item.id));
  const currentItem = activeItems[currentIndex];
  const itemData = editedItems[currentItem?.id] || currentItem?.generatedListing || {};

  // Initialize edited items from preview data
  useEffect(() => {
    if (previewItems.length > 0) {
      const initial = {};
      previewItems.forEach(item => {
        if (item.generatedListing) {
          initial[item.id] = { ...item.generatedListing };
        }
      });
      setEditedItems(initial);
    }
  }, [previewItems]);

  // Sync Amazon preview window when navigating
  useEffect(() => {
    if (showAmazonPreview && amazonWindowRef && !amazonWindowRef.closed && currentItem?.asin) {
      const asin = currentItem.asin;
      const amazonUrl = `https://www.amazon.com/dp/${asin}`;
      try {
        amazonWindowRef.location.href = amazonUrl;
      } catch (error) {
        // Window might be closed or blocked
        console.warn('Could not update Amazon preview window:', error);
        setShowAmazonPreview(false);
        setAmazonWindowRef(null);
      }
    }
  }, [currentIndex, currentItem?.asin, showAmazonPreview, amazonWindowRef]);

  // Check if Amazon preview window was closed manually
  useEffect(() => {
    if (!showAmazonPreview || !amazonWindowRef) return;
    
    const checkWindowClosed = setInterval(() => {
      if (amazonWindowRef.closed) {
        setShowAmazonPreview(false);
        setAmazonWindowRef(null);
      }
    }, 500);
    
    return () => clearInterval(checkWindowClosed);
  }, [showAmazonPreview, amazonWindowRef]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, activeItems.length, hasUnsavedChanges]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < activeItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDismiss = () => {
    if (!currentItem) return;
    
    // Add to dismissed set
    setDismissedItems(prev => new Set([...prev, currentItem.id]));
    
    // Navigate to next item, or previous if we're at the end
    if (currentIndex >= activeItems.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
    // If this was the last item, currentIndex stays the same but will show next remaining item
  };

  const handleFieldChange = (field, value, isCustomField = false) => {
    const updatedItem = { ...itemData };
    
    if (isCustomField) {
      updatedItem.customFields = { ...updatedItem.customFields, [field]: value };
    } else {
      updatedItem[field] = value;
    }
    
    setEditedItems(prev => ({
      ...prev,
      [currentItem.id]: updatedItem
    }));
    
    setHasUnsavedChanges(true);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Convert edited items to array format (exclude errors, loading, blocked, and dismissed items)
      const listingsToSave = activeItems
        .filter(item => !['error', 'loading', 'blocked'].includes(item.status))
        .map(item => editedItems[item.id] || item.generatedListing);
      
      await onSave(listingsToSave);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const openAmazonPreview = () => {
    if (!currentItem?.asin) return;
    
    const asin = currentItem.asin;
    const amazonUrl = `https://www.amazon.com/dp/${asin}`;
    
    // Calculate window position - right side of screen
    const width = 900;
    const height = window.screen.height - 100;
    const left = window.screen.width - width - 20;
    const top = 20;
    
    const windowRef = window.open(
      amazonUrl,
      'AmazonPreview',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,location=yes`
    );
    
    if (windowRef) {
      setAmazonWindowRef(windowRef);
      setShowAmazonPreview(true);
    } else {
      alert('Please allow popups to view Amazon preview side-by-side');
    }
  };

  const closeAmazonPreview = () => {
    if (amazonWindowRef && !amazonWindowRef.closed) {
      amazonWindowRef.close();
    }
    setAmazonWindowRef(null);
    setShowAmazonPreview(false);
  };

  const toggleAmazonPreview = () => {
    if (showAmazonPreview) {
      closeAmazonPreview();
    } else {
      openAmazonPreview();
    }
  };

  const handleClose = () => {
    // Close Amazon preview window if open
    closeAmazonPreview();
    
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'loading':
        return <CircularProgress size={20} />;
      case 'ready':
      case 'success':
        return <CheckIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'blocked':
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'loading':
        return 'info';
      case 'ready':
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'blocked':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  if (!currentItem) {
    return null;
  }

  // Separate core fields and custom fields from template columns
  const coreFieldColumns = templateColumns.filter(col => col.type === 'core');
  const customFieldColumns = templateColumns.filter(col => col.type === 'custom');

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth={false}
      fullScreen
      PaperProps={{
        sx: { 
          bgcolor: '#f5f5f5',
          height: '100vh'
        }
      }}
    >
      <DialogContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ 
          bgcolor: 'white', 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">
              Review Generated Listings
            </Typography>
            <Chip 
              label={`${currentIndex + 1} of ${activeItems.length}`}
              color="primary"
              size="small"
            />
            {dismissedItems.size > 0 && (
              <Chip 
                label={`${dismissedItems.size} dismissed`}
                color="default"
                size="small"
                variant="outlined"
              />
            )}
            <Chip
              icon={getStatusIcon(currentItem?.status)}
              label={currentItem?.status || 'N/A'}
              color={getStatusColor(currentItem?.status)}
              size="small"
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={showAmazonPreview ? "contained" : "outlined"}
              onClick={toggleAmazonPreview}
              size="small"
              sx={{ whiteSpace: 'nowrap' }}
            >
              {showAmazonPreview ? '✓ Amazon Preview' : 'View on Amazon'}
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDismiss}
              disabled={!currentItem || activeItems.length === 0}
            >
              Dismiss
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveAll}
              disabled={saving || activeItems.every(i => ['error', 'loading', 'blocked'].includes(i.status))}
            >
              {saving ? 'Saving...' : `Save All (${activeItems.filter(i => !['error', 'loading', 'blocked'].includes(i.status)).length})`}
            </Button>
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ bgcolor: 'white', px: 2, pb: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={activeItems.length > 0 ? ((currentIndex + 1) / activeItems.length) * 100 : 0}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>

        {/* Warnings/Errors */}
        {(currentItem.warnings?.length > 0 || currentItem.errors?.length > 0) && (
          <Box sx={{ px: 2, pt: 2 }}>
            {currentItem.errors?.map((error, idx) => (
              <Alert key={idx} severity="error" sx={{ mb: 1 }}>
                {error}
              </Alert>
            ))}
            {currentItem.warnings?.map((warning, idx) => (
              <Alert key={idx} severity="warning" sx={{ mb: 1 }}>
                {warning}
              </Alert>
            ))}
          </Box>
        )}

        {/* Main Content - Split Panel */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          gap: 2, 
          p: 2, 
          overflow: 'hidden'
        }}>
          {/* Right Panel - Amazon Source Data */}
          <Paper sx={{ 
            width: '40%', 
            p: 2, 
            overflow: 'auto',
            bgcolor: '#fafafa'
          }}>
            <Typography variant="h6" gutterBottom>
              Amazon Product Data
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {currentItem.status === 'loading' ? (
              // Loading skeleton for source data
              <Stack spacing={2}>
                <Box>
                  <Skeleton variant="text" width="30%" />
                  <Skeleton variant="text" width="60%" />
                </Box>
                <Box>
                  <Skeleton variant="text" width="40%" />
                  <Skeleton variant="rectangular" height={40} />
                </Box>
                <Box>
                  <Skeleton variant="text" width="30%" />
                  <Skeleton variant="text" width="50%" />
                </Box>
                <Box>
                  <Skeleton variant="text" width="25%" />
                  <Skeleton variant="text" width="40%" />
                </Box>
                <Box>
                  <Skeleton variant="rectangular" height={150} />
                </Box>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Skeleton variant="rectangular" height={120} />
                  </Grid>
                  <Grid item xs={6}>
                    <Skeleton variant="rectangular" height={120} />
                  </Grid>
                </Grid>
              </Stack>
            ) : currentItem.sourceData ? (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    ASIN
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {currentItem.asin}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Original Title
                  </Typography>
                  <Typography variant="body2">
                    {currentItem.sourceData.title}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Brand
                  </Typography>
                  <Typography variant="body2">
                    {currentItem.sourceData.brand}
                  </Typography>
                </Box>

                {currentItem.sourceData?.color && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Color
                    </Typography>
                    <Typography variant="body2">
                      {currentItem.sourceData.color}
                    </Typography>
                  </Box>
                )}

                {currentItem.sourceData?.compatibility && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Compatibility
                    </Typography>
                    <Typography variant="body2">
                      {currentItem.sourceData.compatibility}
                    </Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Price
                  </Typography>
                  <Typography variant="body2">
                    ${currentItem.sourceData.price}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Description
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.875rem',
                      lineHeight: 1.6
                    }}
                  >
                    {currentItem.sourceData.description}
                  </Typography>
                </Box>

                {currentItem.sourceData?.images?.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      Images ({currentItem.sourceData.images.length})
                    </Typography>
                    <Grid container spacing={1} sx={{ mt: 0.5 }}>
                      {currentItem.sourceData.images.map((img, idx) => (
                        <Grid item xs={6} key={idx}>
                          <Box
                            component="img"
                            src={img}
                            sx={{
                              width: '100%',
                              height: 120,
                              objectFit: 'contain',
                              border: 1,
                              borderColor: 'divider',
                              borderRadius: 1,
                              bgcolor: 'white'
                            }}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </Stack>
            ) : (
              <Alert severity="error">
                Failed to load Amazon product data
              </Alert>
            )}
          </Paper>

          {/* Left Panel - Generated Listing (Editable) */}
          <Paper sx={{ 
            width: '60%', 
            p: 2, 
            overflow: 'auto'
          }}>
            <Typography variant="h6" gutterBottom>
              Generated Listing
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {currentItem.status === 'loading' ? (
              // Loading skeleton for generated listing
              <Stack spacing={2}>
                <Skeleton variant="rectangular" height={56} />
                <Skeleton variant="rectangular" height={56} />
                <Skeleton variant="rectangular" height={56} />
                <Skeleton variant="rectangular" height={120} />
                <Skeleton variant="rectangular" height={56} />
                <Skeleton variant="rectangular" height={56} />
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Generating listing for ASIN: {currentItem.asin}
                  </Typography>
                </Box>
              </Stack>
            ) : currentItem.generatedListing ? (
              <Stack spacing={2}>
                {/* SKU */}
                <TextField
                  label="SKU (Custom Label)"
                  value={itemData.customLabel || ''}
                  size="small"
                  fullWidth
                  disabled
                  helperText="Auto-generated from ASIN"
                />

                {/* Core Fields */}
                {coreFieldColumns.map(col => {
                  // Special handling for description field with HTML preview
                  if (col.name === 'description') {
                    return (
                      <Box key={col.name}>
                        {/* Toggle Header */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight="500">
                            {col.label || 'Description'}
                          </Typography>
                          <ToggleButtonGroup
                            value={descriptionViewMode}
                            exclusive
                            onChange={(e, newMode) => newMode && setDescriptionViewMode(newMode)}
                            size="small"
                          >
                            <ToggleButton value="code">
                              <CodeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                              Code
                            </ToggleButton>
                            <ToggleButton value="preview">
                              <VisibilityIcon sx={{ fontSize: 16, mr: 0.5 }} />
                              Preview
                            </ToggleButton>
                          </ToggleButtonGroup>
                        </Box>

                        {/* Content Area */}
                        {descriptionViewMode === 'code' ? (
                          <TextField
                            value={itemData.description || ''}
                            onChange={(e) => handleFieldChange('description', e.target.value, false)}
                            multiline
                            rows={8}
                            size="small"
                            fullWidth
                            placeholder="<html>...</html>"
                            helperText={`HTML allowed • ${(itemData.description || '').length} characters`}
                          />
                        ) : (
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 2,
                              minHeight: 200,
                              maxHeight: 400,
                              overflow: 'auto',
                              bgcolor: 'white',
                              border: '1px solid',
                              borderColor: 'divider',
                              '& img': { maxWidth: '100%', height: 'auto' },
                              '& table': { width: '100%', borderCollapse: 'collapse' },
                              '& td, & th': { border: '1px solid #ddd', padding: '8px' },
                              '& p': { margin: '0 0 8px 0' },
                              '& ul, & ol': { marginLeft: '20px' }
                            }}
                          >
                            {itemData.description ? (
                              <Box dangerouslySetInnerHTML={{ __html: itemData.description }} />
                            ) : (
                              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                No description generated
                              </Typography>
                            )}
                          </Paper>
                        )}
                      </Box>
                    );
                  }

                  // Regular fields
                  return (
                    <TextField
                      key={col.name}
                      label={col.label || col.name}
                      value={itemData[col.name] || ''}
                      onChange={(e) => handleFieldChange(col.name, e.target.value, false)}
                      size="small"
                      fullWidth
                      required={col.name === 'title' || col.name === 'startPrice'}
                      type={col.name === 'startPrice' || col.name === 'quantity' ? 'number' : 'text'}
                      helperText={
                        col.name === 'title' ? `${(itemData.title || '').length}/80` :
                        col.name !== 'startPrice' && col.name !== 'quantity' ? `${(itemData[col.name] || '').length}/60` :
                        ''
                      }
                    />
                  );
                })}

                {/* Custom Fields */}
                {customFieldColumns.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }}>
                      <Chip label="Custom Fields" size="small" />
                    </Divider>

                    {customFieldColumns.map(col => (
                      <TextField
                        key={col.name}
                        label={col.label || col.name}
                        value={itemData.customFields?.[col.name] || ''}
                        onChange={(e) => handleFieldChange(col.name, e.target.value, true)}
                        multiline={col.name.toLowerCase().includes('description')}
                        rows={col.name.toLowerCase().includes('description') ? 4 : 1}
                        size="small"
                        fullWidth
                        helperText={`${(itemData.customFields?.[col.name] || '').length}/60`}
                      />
                    ))}
                  </>
                )}

                {/* Pricing Calculation Info */}
                {currentItem.pricingCalculation?.enabled && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="caption" fontWeight="bold" display="block" gutterBottom>
                      Pricing Breakdown
                    </Typography>
                    <Typography variant="caption" display="block">
                      Amazon Cost: {currentItem.pricingCalculation.amazonCost}
                    </Typography>
                    {currentItem.pricingCalculation.breakdown?.profitTier?.enabled ? (
                      <Typography variant="caption" display="block" sx={{ color: 'success.main', fontWeight: 600 }}>
                        Profit (Tier): {currentItem.pricingCalculation.breakdown.profitTier.profit} INR
                        {currentItem.pricingCalculation.breakdown.profitTier.costRange && 
                          ` (${currentItem.pricingCalculation.breakdown.profitTier.costRange})`
                        }
                      </Typography>
                    ) : (
                      <Typography variant="caption" display="block">
                        Profit: {currentItem.pricingCalculation.breakdown?.desiredProfit || currentItem.pricingCalculation.breakdown?.applicableProfit} INR
                      </Typography>
                    )}
                    <Typography variant="caption" display="block" sx={{ fontWeight: 600, mt: 0.5 }}>
                      Calculated Start Price: ${currentItem.pricingCalculation.calculatedStartPrice}
                    </Typography>
                  </Alert>
                )}
              </Stack>
            ) : (
              <Alert severity="error">
                Failed to generate listing data
              </Alert>
            )}
          </Paper>
        </Box>

        {/* Footer - Navigation */}
        <Box sx={{ 
          bgcolor: 'white', 
          p: 2, 
          borderTop: 1, 
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Button
            startIcon={<PrevIcon />}
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          
          <Typography variant="body2" color="text.secondary">
            Use arrow keys to navigate
          </Typography>
          
          <Button
            endIcon={<NextIcon />}
            onClick={handleNext}
            disabled={currentIndex === activeItems.length - 1}
          >
            Next
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
