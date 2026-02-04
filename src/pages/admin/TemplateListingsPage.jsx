import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Box, Button, Paper, Stack, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Typography, IconButton, Dialog, DialogTitle, 
  DialogContent, DialogActions, Alert, Pagination, TextField, Tabs, Tab, MenuItem,
  Chip, CircularProgress, Switch, FormControlLabel, LinearProgress, FormControl,
  InputLabel, Select, Breadcrumbs, Link
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  ContentCopy as CopyIcon,
  Settings as SettingsIcon,
  Calculate as CalculatorIcon
} from '@mui/icons-material';
import api from '../../lib/api.js';
import BulkListingPreview from '../../components/BulkListingPreview.jsx';
import CoreFieldDefaultsDialog from '../../components/CoreFieldDefaultsDialog.jsx';
import PricingConfigSection from '../../components/PricingConfigSection.jsx';
import BulkImportASINsDialog from '../../components/BulkImportASINsDialog.jsx';
import BulkReactivateDialog from '../../components/BulkReactivateDialog.jsx';
import BulkDeactivateDialog from '../../components/BulkDeactivateDialog.jsx';
import TemplateListingStatsCard from '../../components/TemplateListingStatsCard.jsx';
import ActionFieldEditor from '../../components/ActionFieldEditor.jsx';
import TemplateCustomizationDialog from '../../components/TemplateCustomizationDialog.jsx';
import AsinReviewModal from '../../components/AsinReviewModal.jsx';
import { parseAsins, getParsingStats, getValidationError } from '../../utils/asinParser.js';
import { generateSKUFromASIN } from '../../utils/skuGenerator.js';

export default function TemplateListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const templateId = searchParams.get('templateId');
  const sellerId = searchParams.get('sellerId');

  const [template, setTemplate] = useState(null);
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Download batch filtering state
  const [batchFilter, setBatchFilter] = useState('active'); // 'active', 'all', or specific batchId
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [confirmDownloadDialog, setConfirmDownloadDialog] = useState(false);

  // Bulk ASIN import state
  const [bulkImportDialog, setBulkImportDialog] = useState(false);
  
  // SKU status management state
  const [reactivateDialog, setReactivateDialog] = useState(false);
  const [deactivateDialog, setDeactivateDialog] = useState(false);

  // Seller and pricing state
  const [seller, setSeller] = useState(null);
  const [pricingConfig, setPricingConfig] = useState(null);
  const [isCustomPricing, setIsCustomPricing] = useState(false);
  const [calculatorDialog, setCalculatorDialog] = useState(false);

  const [addEditDialog, setAddEditDialog] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);

  // ASIN Auto-Fill state
  const [asinInput, setAsinInput] = useState('');
  const [loadingAsin, setLoadingAsin] = useState(false);
  const [asinError, setAsinError] = useState('');
  const [asinSuccess, setAsinSuccess] = useState('');
  const [autoFilledFields, setAutoFilledFields] = useState(new Set());

  // Bulk mode state
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkResults, setBulkResults] = useState([]);
  const [loadingBulk, setLoadingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [processingLog, setProcessingLog] = useState([]);

  // Core field defaults dialog state
  const [defaultsDialog, setDefaultsDialog] = useState(false);
  
  // Template customization dialog state
  const [customizationDialog, setCustomizationDialog] = useState(false);
  
  // ASIN Review Modal state
  const [reviewModal, setReviewModal] = useState(false);
  const [previewItems, setPreviewItems] = useState([]);

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

  // Validate sellerId on mount
  useEffect(() => {
    if (!sellerId) {
      setError('Seller ID is required. Redirecting to seller selection...');
      setTimeout(() => navigate('/admin/select-seller'), 2000);
      return;
    }
    
    // Fetch seller info for breadcrumb
    const fetchSellerInfo = async () => {
      try {
        const { data } = await api.get('/sellers/all');
        const sellerInfo = data.find(s => s._id === sellerId);
        setSeller(sellerInfo || null);
      } catch (err) {
        console.error('Failed to fetch seller info:', err);
      }
    };
    
    fetchSellerInfo();
  }, [sellerId, navigate]);

  // Fetch pricing config for this seller + template
  useEffect(() => {
    if (!templateId || !sellerId) return;
    
    const fetchPricingConfig = async () => {
      try {
        const { data } = await api.get('/seller-pricing-config', {
          params: { sellerId, templateId }
        });
        setPricingConfig(data.pricingConfig || null);
        setIsCustomPricing(data.isCustom || false);
      } catch (err) {
        console.error('Failed to fetch pricing config:', err);
      }
    };
    
    fetchPricingConfig();
  }, [sellerId, templateId]);

  useEffect(() => {
    if (templateId && sellerId) {
      fetchTemplate();
      fetchListings();
      fetchDownloadHistory();
    }
  }, [templateId, pagination.page, sellerId, batchFilter]);

  const fetchTemplate = async () => {
    try {
      // Fetch effective template if sellerId is provided (includes seller overrides)
      const endpoint = sellerId 
        ? `/template-overrides/${templateId}/effective?sellerId=${sellerId}`
        : `/listing-templates/${templateId}`;
      const { data } = await api.get(endpoint);
      setTemplate(data);
    } catch (err) {
      setError('Failed to fetch template');
      console.error(err);
    }
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      let url = `/template-listings?templateId=${templateId}&page=${pagination.page}&limit=${pagination.limit}`;
      if (sellerId) {
        url += `&sellerId=${sellerId}`;
      }
      
      // Add batch filter parameter
      if (batchFilter && batchFilter !== 'all') {
        if (batchFilter === 'active') {
          url += `&batchFilter=active`;
        } else {
          url += `&batchId=${batchFilter}`;
        }
      } else if (batchFilter === 'all') {
        url += `&batchFilter=all`;
      }
      
      const { data } = await api.get(url);
      setListings(data.listings || []);
      setPagination(data.pagination);
    } catch (err) {
      setError('Failed to fetch listings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchDownloadHistory = async () => {
    if (!templateId || !sellerId) {
      console.log('⏭️ Skipping history fetch - missing templateId or sellerId');
      return;
    }
    
    try {
      console.log('📜 Fetching download history for template:', templateId, 'seller:', sellerId);
      const { data } = await api.get(`/template-listings/download-history/${templateId}`, {
        params: { sellerId }
      });
      console.log('✅ Download history received:', data);
      setDownloadHistory(data);
    } catch (err) {
      console.error('❌ Failed to fetch download history:', err);
    }
  };

  const handleSaveDefaults = async (defaults) => {
    console.log('🔄 handleSaveDefaults called with:', defaults);
    console.log('📤 Sending to API - template:', template);
    try {
      const response = await api.put(`/listing-templates/${templateId}`, {
        ...template,
        coreFieldDefaults: defaults
      });
      console.log('✅ API response:', response.data);
      setSuccess('Core field defaults saved successfully!');
      // Refresh template to get updated defaults
      await fetchTemplate();
    } catch (err) {
      console.error('❌ Save defaults error:', err);
      throw new Error(err.response?.data?.error || 'Failed to save defaults');
    }
  };

  const handleAddListing = () => {
    setEditingListing(null);
    setAsinInput('');
    setAsinError('');
    setAsinSuccess('');
    setAutoFilledFields(new Set());
    
    // Apply template's core field defaults (if any)
    const defaults = template?.coreFieldDefaults || {};
    console.log('📋 Applying core field defaults:', defaults);
    console.log('📄 Current template:', template);
    
    setListingFormData({
      action: 'Add',
      customLabel: defaults.customLabel || '',
      categoryId: defaults.categoryId || template?.ebayCategory?.id || '',
      categoryName: defaults.categoryName || template?.ebayCategory?.name || '',
      title: defaults.title || '',
      relationship: defaults.relationship || '',
      relationshipDetails: defaults.relationshipDetails || '',
      scheduleTime: defaults.scheduleTime || '',
      upc: defaults.upc || '',
      epid: defaults.epid || '',
      startPrice: defaults.startPrice || '',
      quantity: defaults.quantity || 1,
      itemPhotoUrl: defaults.itemPhotoUrl || '',
      videoId: defaults.videoId || '',
      conditionId: defaults.conditionId || '1000',
      description: defaults.description || '',
      format: defaults.format || 'FixedPrice',
      duration: defaults.duration || 'GTC',
      buyItNowPrice: defaults.buyItNowPrice || '',
      bestOfferEnabled: defaults.bestOfferEnabled === true || defaults.bestOfferEnabled === 'true' ? true : false,
      bestOfferAutoAcceptPrice: defaults.bestOfferAutoAcceptPrice || '',
      minimumBestOfferPrice: defaults.minimumBestOfferPrice || '',
      immediatePayRequired: defaults.immediatePayRequired === true || defaults.immediatePayRequired === 'true' ? true : false,
      location: defaults.location || '',
      shippingService1Option: defaults.shippingService1Option || '',
      shippingService1Cost: defaults.shippingService1Cost || '',
      shippingService1Priority: defaults.shippingService1Priority || '',
      shippingService2Option: defaults.shippingService2Option || '',
      shippingService2Cost: defaults.shippingService2Cost || '',
      shippingService2Priority: defaults.shippingService2Priority || '',
      maxDispatchTime: defaults.maxDispatchTime || '',
      returnsAcceptedOption: defaults.returnsAcceptedOption || '',
      returnsWithinOption: defaults.returnsWithinOption || '',
      refundOption: defaults.refundOption || '',
      returnShippingCostPaidBy: defaults.returnShippingCostPaidBy || '',
      shippingProfileName: defaults.shippingProfileName || '',
      returnProfileName: defaults.returnProfileName || '',
      paymentProfileName: defaults.paymentProfileName || '',
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
      bestOfferEnabled: listing.bestOfferEnabled === true || listing.bestOfferEnabled === 'true' ? true : false,
      bestOfferAutoAcceptPrice: listing.bestOfferAutoAcceptPrice || '',
      minimumBestOfferPrice: listing.minimumBestOfferPrice || '',
      immediatePayRequired: listing.immediatePayRequired === true || listing.immediatePayRequired === 'true' ? true : false,
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

    if (!sellerId) {
      setError('Seller ID is required');
      return;
    }

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
        templateId,
        sellerId
      };

      if (editingListing) {
        await api.put(`/template-listings/${editingListing._id}`, dataToSend);
        setSuccess('Listing updated successfully!');
      } else {
        const response = await api.post('/template-listings', dataToSend);
        if (response.data?.wasReactivated) {
          setSuccess('Inactive listing reactivated successfully!');
        } else {
          setSuccess('Listing created successfully!');
        }
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

      const { coreFields, customFields } = data.autoFilledData;

      // Generate SKU from ASIN
      const generatedSKU = generateSKUFromASIN(asinInput.trim());

      // Populate form with auto-filled data
      setListingFormData({
        ...listingFormData,
        ...coreFields,
        customLabel: generatedSKU, // Auto-generated SKU
        customFields: {
          ...listingFormData.customFields,
          ...customFields
        },
        _asinReference: asinInput.trim()
      });

      // Track which fields were auto-filled (prefix custom fields with 'custom_')
      const allFilledFields = new Set([
        ...Object.keys(coreFields),
        'customLabel', // Mark SKU as auto-filled
        ...Object.keys(customFields).map(k => `custom_${k}`)
      ]);
      setAutoFilledFields(allFilledFields);

      const totalFields = Object.keys(coreFields).length + Object.keys(customFields).length;
      
      // Show success message with pricing calculation info if available
      let successMsg = `Successfully auto-filled ${totalFields} field(s) from Amazon data (${Object.keys(coreFields).length} core, ${Object.keys(customFields).length} custom)`;
      
      if (data.pricingCalculation?.enabled && !data.pricingCalculation?.error) {
        successMsg += `\n💰 Start Price Auto-Calculated: $${data.pricingCalculation.calculatedStartPrice} (based on Amazon cost: ${data.pricingCalculation.amazonCost})`;
      } else if (data.pricingCalculation?.error) {
        console.error('Pricing calculation error:', data.pricingCalculation.error);
      }
      
      setAsinSuccess(successMsg);
    } catch (err) {
      setAsinError(err.response?.data?.error || 'Failed to auto-fill from ASIN');
      console.error(err);
    } finally {
      setLoadingAsin(false);
    }
  };

  const handleBulkAutofill = async () => {
    if (!asinInput.trim()) {
      setAsinError('Please enter at least one ASIN');
      return;
    }

    if (!sellerId) {
      setAsinError('Seller ID is required');
      return;
    }

    setAsinError('');
    setAsinSuccess('');
    setLoadingBulk(true);
    setBulkProgress({ current: 0, total: 0 });
    setProcessingLog([]);

    try {
      // Parse ASINs using flexible parser (supports commas, newlines, spaces, tabs, etc.)
      const asins = parseAsins(asinInput);
      const stats = getParsingStats(asinInput);

      if (asins.length === 0) {
        setAsinError('Please enter valid ASINs');
        setLoadingBulk(false);
        return;
      }

      if (asins.length > 80) {
        setAsinError('Maximum 80 ASINs allowed per batch');
        setLoadingBulk(false);
        return;
      }

      // Warn about invalid ASINs if any
      if (stats.invalid > 0) {
        console.warn(`Found ${stats.invalid} invalid ASIN(s) that were filtered out`);
      }

      setBulkProgress({ current: 0, total: asins.length });
      setProcessingLog([`🚀 Starting bulk autofill for ${asins.length} ASINs...`]);

      // Open modal immediately with loading state for all ASINs
      const loadingItems = asins.map(asin => ({
        id: `loading-${asin}`,
        asin,
        sku: `${sellerId}-${asin}`,
        status: 'loading',
        sourceData: null,
        generatedListing: null,
        pricingCalculation: null,
        warnings: [],
        errors: []
      }));
      
      setPreviewItems(loadingItems);
      setReviewModal(true);

      // Process in parallel batches for progressive loading
      const BATCH_SIZE = 10; // Larger batches, processed in parallel
      const batches = [];
      
      for (let i = 0; i < asins.length; i += BATCH_SIZE) {
        batches.push(asins.slice(i, i + BATCH_SIZE));
      }
      
      setProcessingLog(prev => [
        ...prev,
        `📦 Processing ${batches.length} batches in parallel (${BATCH_SIZE} ASINs each)...`
      ]);
      
      const startTime = Date.now();
      
      // Process all batches in parallel
      const batchPromises = batches.map(async (batchAsins, batchIndex) => {
        const batchNum = batchIndex + 1;
        
        setProcessingLog(prev => [
          ...prev,
          `⏳ Batch ${batchNum}/${batches.length} started (${batchAsins.length} ASINs)...`
        ]);
        
        try {
          const { data } = await api.post('/template-listings/bulk-preview', {
            templateId,
            sellerId,
            asins: batchAsins
          });
          
          return {
            batchNum,
            success: true,
            items: data.items,
            batchAsins
          };
        } catch (error) {
          return {
            batchNum,
            success: false,
            error: error.message,
            batchAsins
          };
        }
      });
      
      // Update preview items as each batch completes
      let completedCount = 0;
      
      for (const promise of batchPromises) {
        promise.then(result => {
          if (result.success) {
            // Update preview items with completed batch
            setPreviewItems(prev => {
              const updated = [...prev];
              result.items.forEach(item => {
                const index = updated.findIndex(i => i.asin === item.asin);
                if (index !== -1) {
                  updated[index] = item;
                }
              });
              return updated;
            });
            
            completedCount += result.batchAsins.length;
            setBulkProgress({ current: completedCount, total: asins.length });
            
            const batchDuration = ((Date.now() - startTime) / 1000).toFixed(1);
            
            setProcessingLog(prev => [
              ...prev,
              `✅ Batch ${result.batchNum}/${batches.length} complete (${result.items.length} ASINs, ${batchDuration}s)`
            ]);
          } else {
            setProcessingLog(prev => [
              ...prev,
              `❌ Batch ${result.batchNum}/${batches.length} failed: ${result.error}`
            ]);
          }
        });
      }
      
      // Wait for all batches to complete
      const allResults = await Promise.allSettled(batchPromises);
      
      let allPreviewItems = [];
      allResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          allPreviewItems = [...allPreviewItems, ...result.value.items];
        }
      });
      
      const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
      setBulkProgress({ current: asins.length, total: asins.length });
      
      // Calculate final totals
      const successful = allPreviewItems.filter(item => item.status !== 'error').length;
      const failed = allPreviewItems.filter(item => item.status === 'error').length;
      const warnings = allPreviewItems.filter(item => item.status === 'warning').length;
      
      setPreviewItems(allPreviewItems);
      setProcessingLog(prev => [
        ...prev,
        `🎉 All batches complete! ${successful} successful, ${failed} failed, ${warnings} warnings (${totalDuration}s total)`
      ]);
      
      setAsinSuccess(`Preview generated for ${successful} listing(s). Review and save.`);
      
    } catch (err) {
      setAsinError(err.response?.data?.error || 'Failed to process bulk ASINs');
      console.error(err);
    } finally {
      setLoadingBulk(false);
    }
  };

  const handleRemoveBulkResult = (asin) => {
    setBulkResults(bulkResults.filter(r => r.asin !== asin));
  };

  const handleRetryBulkAsin = async (asin) => {
    setLoadingBulk(true);
    try {
      const { data } = await api.post('/template-listings/bulk-autofill-from-asins', {
        asins: [asin],
        templateId
      });

      if (data.results.length > 0) {
        const newResult = {
          ...data.results[0],
          sku: generateSKUFromASIN(data.results[0].asin)
        };

        setBulkResults(bulkResults.map(r => 
          r.asin === asin ? newResult : r
        ));
      }
    } catch (err) {
      console.error('Retry error:', err);
    } finally {
      setLoadingBulk(false);
    }
  };

  // Save listings from review modal
  const handleSaveFromReview = async (listings) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data } = await api.post('/template-listings/bulk-save', {
        templateId,
        sellerId,
        listings,
        options: {
          skipDuplicates: true
        }
      });

      // Update processing log with final results
      setProcessingLog(prev => [
        ...prev,
        `💾 Saving ${listings.length} listings to database...`,
        `✅ Save completed: ${data.created} created, ${data.reactivated || 0} reactivated, ${data.failed} failed, ${data.skipped} skipped`
      ]);

      setSuccess(
        `Bulk save completed: ${data.created} created, ${data.reactivated || 0} reactivated, ${data.failed} failed, ${data.skipped} skipped`
      );

      // Refresh listings table
      await fetchListings(pagination.page);

      // Close review modal and reset state
      setReviewModal(false);
      setPreviewItems([]);
      setAsinInput('');

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save listings');
      setProcessingLog(prev => [
        ...prev,
        `❌ Save failed: ${err.response?.data?.error || err.message}`
      ]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditBulkSKU = (asin, newSKU) => {
    setBulkResults(bulkResults.map(r => 
      r.asin === asin ? { ...r, sku: newSKU } : r
    ));
  };

  const handleBulkSave = async () => {
    const validResults = bulkResults.filter(r => r.status === 'success');

    if (validResults.length === 0) {
      setError('No valid listings to save');
      return;
    }

    if (!sellerId) {
      setError('Seller ID is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get template defaults
      const defaults = template?.coreFieldDefaults || {};
      console.log('📋 Applying defaults to bulk listings:', defaults);
      
      // Prepare listings for bulk create - merge defaults with autofilled data
      const listings = validResults.map(result => {
        // Start with defaults as base layer
        const mergedCoreFields = {
          ...defaults,
          // Auto-filled data overrides defaults
          ...result.autoFilledData.coreFields
        };
        
        // Apply custom column defaults for missing values
        const customFields = { ...result.autoFilledData.customFields };
        
        if (template?.customColumns && template.customColumns.length > 0) {
          template.customColumns.forEach(col => {
            // If column has a defaultValue and the field is missing/empty, apply it
            if (col.defaultValue && !customFields[col.name]) {
              customFields[col.name] = col.defaultValue;
              console.log(`✨ Applied column default for ${col.name}: ${col.defaultValue}`);
            }
          });
        }
        
        return {
          ...mergedCoreFields,
          customFields,
          customLabel: result.sku,
          _asinReference: result.asin
        };
      });

      console.log('📤 Sending bulk listings with defaults applied:', listings);

      const { data } = await api.post('/template-listings/bulk-create', {
        templateId,
        sellerId,
        listings,
        options: {
          autoGenerateSKU: true,
          skipDuplicates: true
        }
      });

      setSuccess(
        `Bulk create completed: ${data.created} created, ${data.reactivated || 0} reactivated, ${data.failed} failed, ${data.skipped} skipped`
      );

      // Refresh listings table
      await fetchListings(pagination.page);

      // Reset bulk mode
      setBulkMode(false);
      setBulkResults([]);
      setAsinInput('');
      setAddEditDialog(false);

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save listings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const parseAsinCount = () => {
    if (!asinInput.trim()) return 0;
    const asins = parseAsins(asinInput);
    return asins.length;
  };

  const handleExportCSV = async () => {
    if (batchFilter !== 'active') {
      // For historical batches, download directly without confirmation
      await performCSVDownload();
      return;
    }
    
    // For active batch, show confirmation
    setConfirmDownloadDialog(true);
  };
  
  const performCSVDownload = async () => {
    try {
      setLoading(true);
      setConfirmDownloadDialog(false);
      
      let url = `/template-listings/export-csv/${templateId}`;
      if (sellerId) {
        url += `?sellerId=${sellerId}`;
      }
      
      console.log('📥 Downloading CSV from:', url);
      
      const response = await api.get(url, {
        responseType: 'blob'
      });
      
      console.log('📦 Response headers:', response.headers);
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = `listings_${Date.now()}.csv`; // fallback
      
      console.log('📋 Content-Disposition:', contentDisposition);
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/"/g, '');
        }
      }
      
      console.log('📁 Final filename:', filename);
      
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setSuccess('CSV downloaded successfully! Your view has been cleared for new listings.');
      
      // Refresh listings (will now be empty) and history
      console.log('🔄 Refreshing listings and history...');
      await fetchListings();
      await fetchDownloadHistory();
    } catch (err) {
      console.error('❌ Download error:', err);
      setError(err.response?.data?.error || 'Failed to export CSV');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleReDownloadBatch = async (batchId) => {
    try {
      setLoading(true);
      
      let url = `/template-listings/re-download-batch/${templateId}/${batchId}`;
      if (sellerId) {
        url += `?sellerId=${sellerId}`;
      }
      
      const response = await api.get(url, {
        responseType: 'blob'
      });
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = `batch_redownload_${Date.now()}.csv`; // fallback
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/"/g, '');
        }
      }
      
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setSuccess('Batch re-downloaded successfully!');
      setHistoryDialog(false);
    } catch (err) {
      setError('Failed to re-download batch');
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

  const handleSavePricingConfig = async () => {
    try {
      setLoading(true);
      await api.post('/seller-pricing-config', {
        sellerId,
        templateId,
        pricingConfig
      });
      setSuccess('Pricing configuration saved successfully!');
      setIsCustomPricing(true);
      setCalculatorDialog(false);
    } catch (err) {
      setError('Failed to save pricing configuration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPricingConfig = async () => {
    try {
      setLoading(true);
      await api.delete('/seller-pricing-config', {
        params: { sellerId, templateId }
      });
      // Reload pricing config (will fallback to template default)
      const { data } = await api.get('/seller-pricing-config', {
        params: { sellerId, templateId }
      });
      setPricingConfig(data.pricingConfig || null);
      setIsCustomPricing(false);
      setSuccess('Pricing configuration reset to template default');
    } catch (err) {
      setError('Failed to reset pricing configuration');
      console.error(err);
    } finally {
      setLoading(false);
    }
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
      {/* Breadcrumb Navigation */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link 
          component="button"
          variant="body2" 
          onClick={() => navigate('/admin/select-seller')}
          sx={{ cursor: 'pointer', textDecoration: 'none' }}
        >
          Select Seller
        </Link>
        <Link 
          component="button"
          variant="body2" 
          onClick={() => navigate(`/admin/seller-templates?sellerId=${sellerId}`)}
          sx={{ cursor: 'pointer', textDecoration: 'none' }}
        >
          {seller?.user?.username || seller?.user?.email || 'Seller'}
        </Link>
        <Typography color="text.primary" variant="body2">
          {template?.name || 'Template Listings'}
        </Typography>
      </Breadcrumbs>

      {/* Statistics Card */}
      {templateId && sellerId && (
        <TemplateListingStatsCard
          templateId={templateId}
          sellerId={sellerId}
          onViewDetails={() => navigate(`/admin/template-listing-analytics?templateId=${templateId}&sellerId=${sellerId}`)}
        />
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h6">
            {template ? `${template.name} - Listings` : 'Template Listings'}
          </Typography>
          {template?._isOverridden && (
            <Chip label="Customized" color="primary" size="small" />
          )}
        </Stack>
        {sellerId && templateId && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setCustomizationDialog(true)}
          >
            Customize Template
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={handleAddListing}
          disabled={!sellerId || batchFilter !== 'active'}
        >
          Add Listing
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<UploadIcon />} 
          onClick={() => setBulkImportDialog(true)}
          disabled={!sellerId || !templateId || batchFilter !== 'active'}
        >
          Bulk Import ASINs
        </Button>
        <Button 
          variant="outlined" 
          color="success"
          onClick={() => setReactivateDialog(true)}
          disabled={!sellerId || !templateId}
        >
          Relist by SKU
        </Button>
        <Button 
          variant="outlined" 
          color="error"
          onClick={() => setDeactivateDialog(true)}
          disabled={!sellerId || !templateId}
        >
          Deactivate by SKU
        </Button>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <ActionFieldEditor templateId={templateId} sellerId={sellerId} />
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCSV} disabled={loading || listings.length === 0}>
            Download CSV
          </Button>
        </Box>
        <Button
          variant="outlined"
          onClick={() => setHistoryDialog(true)}
          disabled={downloadHistory.length === 0}
        >
          Download History ({downloadHistory.length})
        </Button>
        <Button
          variant="outlined"
          startIcon={<CalculatorIcon />}
          onClick={() => setCalculatorDialog(true)}
          disabled={!pricingConfig}
        >
          Pricing Calculator {isCustomPricing && '(Custom)'}
        </Button>
        <Button 
          variant="outlined" 
          startIcon={<SettingsIcon />} 
          onClick={() => setDefaultsDialog(true)}
          color="primary"
        >
          Set Defaults
          {template?.coreFieldDefaults && Object.keys(template.coreFieldDefaults).filter(k => template.coreFieldDefaults[k]).length > 0 && (
            <Chip 
              label={Object.keys(template.coreFieldDefaults).filter(k => template.coreFieldDefaults[k]).length} 
              size="small" 
              color="primary"
              sx={{ ml: 1, height: 20 }}
            />
          )}
        </Button>
      </Stack>
      
      {/* Batch Filter */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle2">View:</Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
            >
              <MenuItem value="active">
                Active Batch ({pagination.total} items)
              </MenuItem>
              <MenuItem value="all">All Batches</MenuItem>
              {downloadHistory.map((batch) => (
                <MenuItem key={batch.batchId} value={batch.batchId}>
                  Batch #{batch.batchNumber} - {new Date(batch.downloadedAt).toLocaleDateString()} ({batch.listingCount} items)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {batchFilter !== 'active' && (
            <Chip
              label={batchFilter === 'all' ? 'Viewing All Batches' : 'Viewing Historical Batch'}
              color="info"
              size="small"
            />
          )}
        </Stack>
      </Paper>

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
        <DialogTitle>
          {editingListing ? 'Edit Listing' : bulkMode ? 'Bulk Add Listings' : 'Add New Listing'}
        </DialogTitle>
        <DialogContent>
          {/* ASIN Auto-Fill Section (only show if template has automation enabled and not editing) */}
          {!editingListing && template?.asinAutomation?.enabled && (
            <Paper variant="outlined" sx={{ p: 2, mb: 3, mt: 1, bgcolor: 'primary.50' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle2">
                  Auto-Fill from Amazon ASIN
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={bulkMode}
                      onChange={(e) => {
                        setBulkMode(e.target.checked);
                        setBulkResults([]);
                        setAsinInput('');
                        setAsinError('');
                        setAsinSuccess('');
                      }}
                      size="small"
                    />
                  }
                  label={bulkMode ? '📦 Bulk Mode' : 'Single Mode'}
                />
              </Stack>
              
              <Stack spacing={2}>
                <TextField
                  label={bulkMode ? "Amazon ASINs (any format)" : "Amazon ASIN"}
                  size="small"
                  value={asinInput}
                  onChange={(e) => setAsinInput(e.target.value)}
                  placeholder={bulkMode ? "Paste ASINs separated by commas, spaces, or newlines (e.g., from Excel/Sheets)" : "e.g., B08N5WRWNW"}
                  multiline={bulkMode}
                  rows={bulkMode ? 3 : 1}
                  fullWidth
                  disabled={loadingAsin || loadingBulk}
                  helperText={
                    bulkMode ? 
                      (() => {
                        const stats = getParsingStats(asinInput);
                        if (stats.total === 0) return 'Enter ASINs (max 50) - supports any format: commas, newlines, spaces, tabs';
                        
                        return (
                          <Stack direction="row" spacing={1} alignItems="center" component="span">
                            <Chip 
                              size="small" 
                              label={`${stats.uniqueValid} valid ASIN${stats.uniqueValid !== 1 ? 's' : ''}`} 
                              color="success" 
                              sx={{ height: 20 }}
                            />
                            {stats.invalid > 0 && (
                              <Chip 
                                size="small" 
                                label={`${stats.invalid} invalid`} 
                                color="warning" 
                                sx={{ height: 20 }}
                              />
                            )}
                            {stats.duplicates > 0 && (
                              <Chip 
                                size="small" 
                                label={`${stats.duplicates} duplicate${stats.duplicates !== 1 ? 's' : ''}`} 
                                color="info" 
                                sx={{ height: 20 }}
                              />
                            )}
                            {stats.uniqueValid > 50 && (
                              <Chip 
                                size="small" 
                                label="Exceeds limit (50 max)" 
                                color="error" 
                                sx={{ height: 20 }}
                              />
                            )}
                          </Stack>
                        );
                      })()
                      : ''
                  }
                />
                
                <Stack direction="row" spacing={2}>
                  {!bulkMode ? (
                    <Button
                      variant="contained"
                      onClick={handleAsinAutofill}
                      disabled={loadingAsin || !asinInput.trim()}
                      startIcon={loadingAsin && <CircularProgress size={16} />}
                      fullWidth
                    >
                      {loadingAsin ? 'Loading...' : 'Auto-Fill'}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleBulkAutofill}
                      disabled={loadingBulk || parseAsinCount() === 0 || parseAsinCount() > 50}
                      startIcon={loadingBulk && <CircularProgress size={16} />}
                      fullWidth
                    >
                      {loadingBulk ? `Processing... ${bulkProgress.current}/${bulkProgress.total}` : `🚀 Bulk Auto-Fill (${parseAsinCount()} ASINs)`}
                    </Button>
                  )}
                </Stack>
              </Stack>
              
              {loadingBulk && (
                <Box sx={{ mt: 2 }}>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={(bulkProgress.current / bulkProgress.total) * 100} 
                        sx={{ flexGrow: 1, height: 8, borderRadius: 1 }}
                      />
                      <Typography variant="body2" sx={{ minWidth: 80, textAlign: 'right' }}>
                        {bulkProgress.current}/{bulkProgress.total}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {Math.round((bulkProgress.current / bulkProgress.total) * 100)}% complete
                    </Typography>
                  </Stack>
                </Box>
              )}
              
              {/* Processing Log */}
              {processingLog.length > 0 && (
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    mt: 2, 
                    p: 2, 
                    maxHeight: 200, 
                    overflowY: 'auto',
                    bgcolor: 'grey.50',
                    fontFamily: 'monospace',
                    fontSize: '0.875rem'
                  }}
                >
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Processing Log
                  </Typography>
                  {processingLog.map((log, idx) => (
                    <Typography 
                      key={idx} 
                      variant="body2" 
                      sx={{ 
                        mb: 0.5,
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        color: log.includes('❌') || log.includes('failed') ? 'error.main' :
                               log.includes('✅') || log.includes('complete') ? 'success.main' :
                               log.includes('📦') ? 'primary.main' :
                               'text.secondary'
                      }}
                    >
                      {log}
                    </Typography>
                  ))}
                </Paper>
              )}
              
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
              
              {/* Bulk Preview */}
              {bulkMode && bulkResults.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <BulkListingPreview
                    results={bulkResults}
                    onRemove={handleRemoveBulkResult}
                    onRetry={handleRetryBulkAsin}
                    onEditSKU={handleEditBulkSKU}
                  />
                </Box>
              )}
            </Paper>
          )}

          {/* Show form tabs only in single mode */}
          {!bulkMode && (
            <>
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
                  value={String(listingFormData.bestOfferEnabled)}
                  onChange={(e) => setListingFormData({ ...listingFormData, bestOfferEnabled: e.target.value === 'true' })}
                >
                  <MenuItem value="false">No</MenuItem>
                  <MenuItem value="true">Yes</MenuItem>
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
                  value={String(listingFormData.immediatePayRequired)}
                  onChange={(e) => setListingFormData({ ...listingFormData, immediatePayRequired: e.target.value === 'true' })}
                >
                  <MenuItem value="false">No</MenuItem>
                  <MenuItem value="true">Yes</MenuItem>
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
                        onChange={(e) => {
                          updateCustomField(col.name, e.target.value);
                          // Clear auto-filled indicator when user edits
                          setAutoFilledFields(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(`custom_${col.name}`);
                            return newSet;
                          });
                        }}
                        placeholder={col.placeholder}
                        required={col.isRequired}
                        {...getAutoFilledProps(`custom_${col.name}`)}
                      />
                    ))
                ) : (
                  <Typography color="text.secondary">No custom fields defined for this template</Typography>
                )}
              </Stack>
            )}
          </Box>
          </>
          )}
        </DialogContent>
        <DialogActions>
          {/* Show only OK button if save was successful, otherwise show normal buttons */}
          {!reviewModal && processingLog.some(log => log.includes('Save completed')) ? (
            <Button 
              onClick={() => {
                setAddEditDialog(false);
                setBulkMode(false);
                setBulkResults([]);
                setAsinInput('');
                setProcessingLog([]);
              }}
              variant="contained"
            >
              OK
            </Button>
          ) : (
            <>
              <Button onClick={() => {
                setAddEditDialog(false);
                setBulkMode(false);
                setBulkResults([]);
                setAsinInput('');
              }}>
                Cancel
              </Button>
              {bulkMode && bulkResults.length > 0 ? (
                <Button 
                  onClick={handleBulkSave} 
                  variant="contained" 
                  disabled={loading || bulkResults.filter(r => r.status === 'success').length === 0}
                >
                  Save All ({bulkResults.filter(r => r.status === 'success').length} valid)
                </Button>
              ) : !bulkMode ? (
                <Button onClick={handleSaveListing} variant="contained" disabled={loading}>
                  {editingListing ? 'Update' : 'Create'}
                </Button>
              ) : null}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Core Field Defaults Dialog */}
      <CoreFieldDefaultsDialog
        open={defaultsDialog}
        onClose={() => setDefaultsDialog(false)}
        templateId={templateId}
        currentDefaults={template?.coreFieldDefaults || {}}
        onSave={handleSaveDefaults}
      />

      {/* Pricing Calculator Dialog */}
      <Dialog 
        open={calculatorDialog} 
        onClose={() => setCalculatorDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Pricing Calculator
          {isCustomPricing && (
            <Chip 
              label="Custom Config" 
              size="small" 
              color="primary" 
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This pricing configuration applies to all listings for this seller ({seller?.user?.username || seller?.user?.email}) 
            in the "{template?.name}" template.
          </Alert>
          
          {pricingConfig && (
            <PricingConfigSection
              pricingConfig={pricingConfig}
              onChange={setPricingConfig}
            />
          )}
        </DialogContent>
        <DialogActions>
          {isCustomPricing && (
            <Button onClick={handleResetPricingConfig} color="warning">
              Reset to Template Default
            </Button>
          )}
          <Button onClick={() => setCalculatorDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleSavePricingConfig} variant="contained">
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Confirm Download Dialog */}
      <Dialog
        open={confirmDownloadDialog}
        onClose={() => setConfirmDownloadDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm CSV Download</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              This will mark all current listings as downloaded and clear your view.
            </Typography>
            <Typography variant="body2">
              • {listings.length} listing(s) will be archived<br />
              • Your view will become empty after download<br />
              • You can add new listings immediately after<br />
              • Download history will be preserved
            </Typography>
          </Alert>
          <Typography variant="body2">
            Do you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDownloadDialog(false)}>
            Cancel
          </Button>
          <Button onClick={performCSVDownload} variant="contained" color="primary">
            Download & Clear View
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Download History Dialog */}
      <Dialog
        open={historyDialog}
        onClose={() => setHistoryDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Download History</DialogTitle>
        <DialogContent>
          {downloadHistory.length === 0 ? (
            <Typography color="text.secondary">No download history yet.</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Batch #</strong></TableCell>
                    <TableCell><strong>Downloaded</strong></TableCell>
                    <TableCell><strong>Listings</strong></TableCell>
                    <TableCell align="right"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {downloadHistory.map((batch) => (
                    <TableRow key={batch.batchId}>
                      <TableCell>Batch #{batch.batchNumber}</TableCell>
                      <TableCell>
                        {new Date(batch.downloadedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{batch.listingCount}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setBatchFilter(batch.batchId)}
                          >
                            View
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<DownloadIcon />}
                            onClick={() => handleReDownloadBatch(batch.batchId)}
                          >
                            Re-Download
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Import ASINs Dialog */}
      <BulkImportASINsDialog
        open={bulkImportDialog}
        onClose={() => setBulkImportDialog(false)}
        templateId={templateId}
        sellerId={sellerId}
        onImportComplete={() => {
          fetchListings();
          setSuccess('ASINs imported successfully');
        }}
      />
      
      {/* Bulk Reactivate Dialog */}
      <BulkReactivateDialog
        open={reactivateDialog}
        onClose={() => setReactivateDialog(false)}
        templateId={templateId}
        sellerId={sellerId}
        onSuccess={() => {
          fetchListings();
          setSuccess('Listings reactivated successfully');
        }}
      />
      
      {/* Bulk Deactivate Dialog */}
      <BulkDeactivateDialog
        open={deactivateDialog}
        onClose={() => setDeactivateDialog(false)}
        templateId={templateId}
        sellerId={sellerId}
        onSuccess={() => {
          fetchListings();
          setSuccess('Listings deactivated successfully');
        }}
      />
      
      {/* Template Customization Dialog */}
      <TemplateCustomizationDialog
        open={customizationDialog}
        onClose={() => {
          setCustomizationDialog(false);
          // Refresh template to show updated override status
          fetchTemplate();
        }}
        templateId={templateId}
        sellerId={sellerId}
        templateName={template?.name}
      />
      
      {/* ASIN Review Modal */}
      <AsinReviewModal
        open={reviewModal}
        onClose={() => {
          setReviewModal(false);
          setPreviewItems([]);
        }}
        previewItems={previewItems}
        onSave={handleSaveFromReview}
        templateColumns={[
          ...(template?.customColumns?.map(col => ({ ...col, type: 'custom' })) || []),
          { name: 'title', label: 'Title', type: 'core' },
          { name: 'description', label: 'Description', type: 'core' },
          { name: 'startPrice', label: 'Start Price', type: 'core' },
          { name: 'quantity', label: 'Quantity', type: 'core' }
        ]}
      />
    </Box>
  );
}
