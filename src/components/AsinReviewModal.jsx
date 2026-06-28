import { useState, useEffect, useRef } from 'react';
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
  ToggleButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip
} from '@mui/material';
import { DESCRIPTION_FOOTER_TEMPLATES, FOOTER_SENTINEL_START, FOOTER_SENTINEL_END } from '../constants/descriptionFooterTemplates';
import {
  Close as CloseIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  HourglassEmpty as LoadingIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
  Visibility as VisibilityIcon,
  Update as UpdateIcon,
  Autorenew as AutorenewIcon,
  InfoOutlined as InfoOutlinedIcon
} from '@mui/icons-material';
import { Undo as UndoIcon } from '@mui/icons-material';
import api from '../lib/api.js';

const MARKETPLACE_DOMAINS = {
  US: 'www.amazon.com',
  UK: 'www.amazon.co.uk',
  CA: 'www.amazon.ca',
  AU: 'www.amazon.com.au',
};

const CURRENCY_SYMBOLS = {
  US: '$',
  UK: '£',
  CA: 'CA$',
  AU: 'A$',
};

/**
 * Calculates "Actual Profit" (INR) for a US marketplace listing.
 * @param {number} buyingPrice - Amazon price in USD
 * @param {number} sold - eBay Start Price in USD
 * @returns {object} All intermediate values + actualProfit, all rounded to 2dp
 */
function calcActualProfit(buyingPrice, sold) {
  const A            = parseFloat((sold * 1.1).toFixed(2));
  const eBay         = parseFloat((A * 0.1395 + 0.4).toFixed(2));
  const ADS          = parseFloat((A * 0.15).toFixed(2));
  const TDS          = parseFloat((A * 0.01).toFixed(2));
  const TCont        = 0.24;
  const Net          = parseFloat((sold - eBay - ADS - TDS - TCont).toFixed(2));
  const AmazonWithTax = parseFloat((buyingPrice * 1.1).toFixed(2));
  const Payoneer     = parseFloat((Net * 90).toFixed(2));
  const AmazonExpense = parseFloat((AmazonWithTax * 95).toFixed(2));
  const actualProfit = parseFloat((Payoneer - AmazonExpense).toFixed(2));
  return { A, eBay, ADS, TDS, TCont, Net, AmazonWithTax, Payoneer, AmazonExpense, actualProfit };
}

/**
 * Calculates "Actual Profit" (INR) for an AU marketplace listing.
 * @param {number} buyingPrice - Amazon AU price in AUD
 * @param {number} sold - eBay Start Price in AUD
 * @returns {object} All intermediate values + actualProfit, all rounded to 2dp
 */
function calcActualProfitAU(buyingPrice, sold) {
  const TotalBuyingPrice = parseFloat(buyingPrice.toFixed(2));        // Ship=0, Tax=0
  const Coupon           = parseFloat((sold * 0.07).toFixed(2));      // 7% of Sold
  const SoldMinusCoupon  = parseFloat((sold - Coupon).toFixed(2));
  const eBayFee          = parseFloat((SoldMinusCoupon * 0.1388 + 0.27).toFixed(2)); // (12.18+1.7)% + 0.27
  const Ads              = parseFloat(((eBayFee + Coupon) * 0.08).toFixed(2));       // 8% of eBayFee+Coupon
  const OrderEarnings    = parseFloat(((sold - Coupon - eBayFee - Ads) * 0.67).toFixed(2)); // AUD→USD
  const TDS1pct          = parseFloat((SoldMinusCoupon * 0.01).toFixed(2));          // 1% of SoldMinusCoupon
  const TCont            = 0.24;
  const Net              = parseFloat((OrderEarnings - TDS1pct - TCont).toFixed(2));
  const Payoneer         = parseFloat((Net * 90).toFixed(2));          // USD→INR
  const TotalSpent       = parseFloat((TotalBuyingPrice * 70).toFixed(2)); // AUD→INR
  const actualProfit     = parseFloat((Payoneer - TotalSpent).toFixed(2));
  return { TotalBuyingPrice, Coupon, SoldMinusCoupon, eBayFee, Ads, OrderEarnings, TDS1pct, TCont, Net, Payoneer, TotalSpent, actualProfit };
}

function formatProductInfoKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const PRODUCT_INFO_SKIP_KEYS = new Set([
  'asin', 'color', 'brand_name', 'customer_reviews'
]);

function buildInitialEditedItems(items = []) {
  const initial = {};

  items.forEach(item => {
    if (item.generatedListing) {
      initial[item.id] = { ...item.generatedListing };
    }
  });

  return initial;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shuffleArrayWithChange(values) {
  if (!Array.isArray(values) || values.length < 2) return Array.isArray(values) ? [...values] : [];

  const shuffled = [...values];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  if (shuffled.some((value, index) => value !== values[index])) {
    return shuffled;
  }

  return [...values.slice(1), values[0]];
}

function shuffleKnownImageUrlsInHtml(htmlContent, imageUrls = []) {
  if (!htmlContent || typeof htmlContent !== 'string') return htmlContent;
  if (!Array.isArray(imageUrls) || imageUrls.length < 2) return htmlContent;

  const matchedUrls = getMatchedKnownImageUrls(htmlContent, imageUrls);
  if (matchedUrls.length < 2) return htmlContent;

  const shuffledUrls = shuffleArrayWithChange(matchedUrls);
  const tokenPrefix = `__ASIN_IMAGE_SHUFFLE_${Date.now()}_${Math.random().toString(36).slice(2)}__`;
  let processedContent = htmlContent;

  matchedUrls.forEach((url, index) => {
    processedContent = processedContent.replace(new RegExp(escapeRegExp(url), 'g'), `${tokenPrefix}${index}__`);
  });

  shuffledUrls.forEach((url, index) => {
    processedContent = processedContent.replace(new RegExp(escapeRegExp(`${tokenPrefix}${index}__`), 'g'), url);
  });

  return processedContent;
}

function getMatchedKnownImageUrls(htmlContent, imageUrls = []) {
  if (!htmlContent || typeof htmlContent !== 'string') return [];
  if (!Array.isArray(imageUrls)) return [];

  const uniqueImageUrls = [...new Set(imageUrls.filter(Boolean))];
  return uniqueImageUrls.filter(url => htmlContent.includes(url));
}

function getItemAiRunId(item = {}) {
  const listing = item.generatedListing || {};
  return listing._aiRunId || listing.aiRunId || item._aiRunId || item.aiRunId || null;
}

function normalizeComparableTitle(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function getComparablePrice(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
}

function getComparablePriceCents(value) {
  const price = getComparablePrice(value);
  return price === null ? null : Math.round(price * 100);
}

function getNextNonMatchingPrice(value, records = [], stepCents = 2) {
  const startCents = getComparablePriceCents(value);
  if (startCents === null) return null;

  const matchedPriceCents = new Set(
    records
      .map(record => getComparablePriceCents(record.price))
      .filter(price => price !== null)
  );

  if (!matchedPriceCents.has(startCents)) return null;

  let nextCents = startCents;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    nextCents += stepCents;
    if (!matchedPriceCents.has(nextCents)) {
      return (nextCents / 100).toFixed(2);
    }
  }

  return null;
}

function getCrossSellerMatchSummary(skuState, itemData = {}) {
  const records = Array.isArray(skuState?.otherSellerMatches) ? skuState.otherSellerMatches : [];
  const currentTitle = normalizeComparableTitle(itemData.title);
  const currentPrice = getComparablePrice(itemData.startPrice);

  const titleMatches = records.filter(record => currentTitle && normalizeComparableTitle(record.title) === currentTitle);
  const priceMatches = records.filter(record => {
    const otherPrice = getComparablePrice(record.price);
    return currentPrice !== null && otherPrice !== null && otherPrice === currentPrice;
  });

  const sellerNames = [...new Set([...titleMatches, ...priceMatches].map(record => record.sellerName).filter(Boolean))];

  return {
    records,
    titleMatches,
    priceMatches,
    sellerNames,
    hasTitleMatch: titleMatches.length > 0,
    hasPriceMatch: priceMatches.length > 0
  };
}

function formatSellerSkuPrice(record = {}) {
  if (record.price === null || record.price === undefined || record.price === '') return 'Price unavailable';
  const prefix = record.currency ? `${record.currency} ` : '';
  return `${prefix}${Number(record.price).toFixed(2)}`;
}

function buildDismissedReviewStats(previewItems = [], dismissedItems = new Set()) {
  const byRunId = new Map();
  const eligibleStatuses = new Set(['success', 'warning', 'duplicate_updateable', 'ready']);

  previewItems.forEach((item) => {
    if (!dismissedItems.has(item.id) || !eligibleStatuses.has(item.status)) return;

    const aiRunId = getItemAiRunId(item);
    if (!aiRunId) return;

    const current = byRunId.get(aiRunId) || {
      aiRunId,
      dismissedCount: 0,
      dismissedNewAsinCount: 0,
      dismissedUpdateableDuplicateCount: 0
    };

    current.dismissedCount += 1;
    if (item.status === 'duplicate_updateable') {
      current.dismissedUpdateableDuplicateCount += 1;
    } else {
      current.dismissedNewAsinCount += 1;
    }

    byRunId.set(aiRunId, current);
  });

  return {
    dismissedByRunId: [...byRunId.values()]
  };
}

export default function AsinReviewModal({ 
  open, 
  onClose, 
  previewItems = [], 
  onSave,
  onListDirectly = null,
  templateColumns = [],
  marketplace = 'US',
  sellerId = null,
  templateName = ''
}) {
  const amazonDomain = MARKETPLACE_DOMAINS[marketplace] || MARKETPLACE_DOMAINS.US;
  const wasOpenRef = useRef(false);
  const checkedSkuIdsRef = useRef(new Set()); // tracks item IDs whose SKU check has already been initiated
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editedItems, setEditedItems] = useState({});
  const [dismissedItems, setDismissedItems] = useState(new Set());
  const [dismissHistory, setDismissHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [descriptionViewMode, setDescriptionViewMode] = useState('preview'); // 'code' | 'preview'
  const [amazonWindowRef, setAmazonWindowRef] = useState(null);
  const [showAmazonPreview, setShowAmazonPreview] = useState(false);
  const [appliedDescTemplates, setAppliedDescTemplates] = useState({}); // { [itemId]: templateKey | '' }
  const [rephrasing, setRephrasing] = useState({}); // { [itemId]: true|false }
  const [startPriceEditMode, setStartPriceEditMode] = useState({}); // { [itemId]: true|false }
  const [skuStatus, setSkuStatus] = useState({}); // { [itemId]: { status: 'loading'|'active'|'inactive'|null, count: number } }
  const [autoPriceAdjustments, setAutoPriceAdjustments] = useState({}); // { [itemId]: { from, to } }
  const [vehicleInputs, setVehicleInputs] = useState({}); // { [itemId]: string } — Steering Wheel Cover only
  const isSteeringWheelCover = templateName?.toLowerCase() === 'steering wheel cover';

  // Filter out dismissed items
  const activeItems = previewItems.filter(item => !dismissedItems.has(item.id));
  const safeCurrentIndex = activeItems.length > 0
    ? Math.min(currentIndex, activeItems.length - 1)
    : 0;
  const currentItem = activeItems[safeCurrentIndex];
  const itemData = editedItems[currentItem?.id] || currentItem?.generatedListing || {};
  const lastDismissedId = dismissHistory[dismissHistory.length - 1] || null;
  const lastDismissedItem = lastDismissedId
    ? previewItems.find(item => item.id === lastDismissedId)
    : null;
  const isStartPriceEditing = !!(currentItem?.id && startPriceEditMode[currentItem.id]);
  const startPriceValue = itemData.startPrice ?? '';
  const actualProfitBuyingPrice = parseFloat(currentItem?.sourceData?.price);
  const actualProfitSoldPrice = parseFloat(startPriceValue);
  const showActualProfit = (marketplace === 'US' || marketplace === 'AU')
    && !isNaN(actualProfitBuyingPrice) && actualProfitBuyingPrice > 0
    && !isNaN(actualProfitSoldPrice) && actualProfitSoldPrice > 0;
  const actualProfit = showActualProfit
    ? (marketplace === 'AU'
        ? calcActualProfitAU(actualProfitBuyingPrice, actualProfitSoldPrice)
        : calcActualProfit(actualProfitBuyingPrice, actualProfitSoldPrice))
    : null;
  const actualProfitColor = actualProfit && actualProfit.actualProfit < 300 ? 'error' : 'success';
  const matchedDescriptionImageUrls = getMatchedKnownImageUrls(
    itemData.description,
    currentItem?.sourceData?.images
  );
  const canShuffleDescriptionImages = currentItem?.status === 'duplicate_updateable'
    && matchedDescriptionImageUrls.length >= 2;
  const currentSkuStatus = currentItem?.id ? skuStatus[currentItem.id] : null;
  const crossSellerSummary = getCrossSellerMatchSummary(currentSkuStatus, itemData);
  const currentAutoPriceAdjustment = currentItem?.id ? autoPriceAdjustments[currentItem.id] : null;

  // Reset modal-local session state only when the modal opens.
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;

    if (justOpened) {
      setCurrentIndex(0);
      setEditedItems(buildInitialEditedItems(previewItems));
      setDismissedItems(new Set());
      setDismissHistory([]);
      setSaving(false);
      setHasUnsavedChanges(false);
      setDescriptionViewMode('preview');
      setAppliedDescTemplates({});
      setRephrasing({});
      setStartPriceEditMode({});
      setSkuStatus({});
      setAutoPriceAdjustments({});
      checkedSkuIdsRef.current = new Set();
    }

    wasOpenRef.current = open;
  }, [open, previewItems]);

  // Check each SKU as soon as its customLabel becomes available (items generate via SSE stream).
  // Uses a ref to ensure each item is only checked once even as editedItems keeps changing.
  useEffect(() => {
    if (!open || !sellerId) return;
    previewItems.forEach(item => {
      if (checkedSkuIdsRef.current.has(item.id)) return; // already initiated for this item
      const sku = (editedItems[item.id] || item.generatedListing || {}).customLabel;
      if (!sku) return; // not generated yet — will re-run when editedItems updates
      checkedSkuIdsRef.current.add(item.id);
      const baseSku = sku.includes('-') ? sku.split('-')[0] : sku;
      setSkuStatus(prev => ({ ...prev, [item.id]: { status: 'loading', count: 0 } }));
      api.get(`/ebay/check-sku-active?sku=${encodeURIComponent(baseSku)}&sellerId=${encodeURIComponent(sellerId)}`)
        .then(({ data }) => {
          setSkuStatus(prev => ({
            ...prev,
            [item.id]: {
              status: data.active ? 'active' : 'inactive',
              count: data._debug?.count ?? data._debug?.itemCount ?? 0,
              otherSellerMatches: data.otherSellerMatches || [],
              otherSellerCount: data.otherSellerCount || 0
            }
          }));
        })
        .catch(() => {
          setSkuStatus(prev => ({ ...prev, [item.id]: { status: null, count: 0 } }));
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sellerId, editedItems]);

  useEffect(() => {
    if (!open) return;

    const adjustments = {};
    let hasAdjustments = false;

    setEditedItems(prev => {
      let changed = false;
      const next = { ...prev };

      previewItems.forEach(item => {
        const records = skuStatus[item.id]?.otherSellerMatches || [];
        if (records.length === 0) return;

        const listingData = next[item.id] || item.generatedListing;
        if (!listingData?.startPrice) return;

        const adjustedPrice = getNextNonMatchingPrice(listingData.startPrice, records, 20);
        if (!adjustedPrice) return;

        next[item.id] = {
          ...listingData,
          startPrice: adjustedPrice
        };
        adjustments[item.id] = {
          from: getComparablePrice(listingData.startPrice).toFixed(2),
          to: adjustedPrice
        };
        changed = true;
        hasAdjustments = true;
      });

      return changed ? next : prev;
    });

    if (hasAdjustments) {
      setAutoPriceAdjustments(prev => ({
        ...prev,
        ...adjustments
      }));
      setHasUnsavedChanges(true);
    }
  }, [open, previewItems, skuStatus, editedItems]);

  // Merge streamed/generated listings into the editable map without overwriting user edits.
  useEffect(() => {
    if (!open || previewItems.length === 0) return;

    setEditedItems(prev => {
      let changed = false;
      const next = { ...prev };

      previewItems.forEach(item => {
        if (item.generatedListing && !next[item.id]) {
          next[item.id] = { ...item.generatedListing };
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [open, previewItems]);

  // Sync Amazon preview window when navigating
  useEffect(() => {
    if (showAmazonPreview && amazonWindowRef && !amazonWindowRef.closed && currentItem?.asin) {
      const asin = currentItem.asin;
      const amazonUrl = `https://${amazonDomain}/dp/${asin}`;
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
    if (safeCurrentIndex > 0) {
      setCurrentIndex(safeCurrentIndex - 1);
    }
  };

  const handleNext = () => {
    if (safeCurrentIndex < activeItems.length - 1) {
      setCurrentIndex(safeCurrentIndex + 1);
    }
  };

  const handleDismiss = () => {
    if (!currentItem) return;
    
    // Add to dismissed set
    setDismissedItems(prev => new Set([...prev, currentItem.id]));
    setDismissHistory(prev => [...prev, currentItem.id]);
    
    // Navigate to next item, or previous if we're at the end
    if (safeCurrentIndex >= activeItems.length - 1 && safeCurrentIndex > 0) {
      setCurrentIndex(safeCurrentIndex - 1);
    }
    // If this was the last item, currentIndex stays the same but will show next remaining item
  };

  const handleUndoDismiss = () => {
    if (!lastDismissedId) return;

    const nextDismissedItems = new Set(dismissedItems);
    nextDismissedItems.delete(lastDismissedId);

    const restoredItems = previewItems.filter(item => !nextDismissedItems.has(item.id));
    const restoredIndex = restoredItems.findIndex(item => item.id === lastDismissedId);

    setDismissedItems(nextDismissedItems);
    setDismissHistory(prev => prev.slice(0, -1));
    setCurrentIndex(restoredIndex >= 0 ? restoredIndex : 0);
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

    if (field === 'startPrice' && !isCustomField) {
      setAutoPriceAdjustments(prev => {
        if (!prev[currentItem.id]) return prev;
        const next = { ...prev };
        delete next[currentItem.id];
        return next;
      });
    }
    
    setHasUnsavedChanges(true);
  };

  const handleStartPriceEdit = () => {
    if (!currentItem) return;
    setStartPriceEditMode(prev => ({
      ...prev,
      [currentItem.id]: true
    }));
  };

  const handleStartPriceSave = () => {
    if (!currentItem) return;
    setStartPriceEditMode(prev => ({
      ...prev,
      [currentItem.id]: false
    }));
  };

  const applyDescTemplate = (itemId, templateKey) => {
    const currentDesc = (editedItems[itemId] || currentItem?.generatedListing || {}).description || '';
    // Strip any existing footer using sentinel comments
    const baseDesc = currentDesc.includes(FOOTER_SENTINEL_START)
      ? currentDesc.slice(0, currentDesc.indexOf(FOOTER_SENTINEL_START)).trimEnd()
      : currentDesc;

    let newDesc;
    if (!templateKey) {
      newDesc = baseDesc;
    } else {
      const template = DESCRIPTION_FOOTER_TEMPLATES.find(t => t.key === templateKey);
      newDesc = baseDesc + '\n' + FOOTER_SENTINEL_START + '\n' + template.html + '\n' + FOOTER_SENTINEL_END;
    }

    setEditedItems(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || currentItem?.generatedListing || {}), description: newDesc }
    }));
    setAppliedDescTemplates(prev => ({ ...prev, [itemId]: templateKey }));
    setHasUnsavedChanges(true);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Convert edited items to array format (exclude errors, loading, blocked, and dismissed items)
      const listingsToSave = activeItems
        .filter(item => !['error', 'loading', 'blocked'].includes(item.status))
        .map(item => {
          const listingData = editedItems[item.id] || item.generatedListing;
          
          // Mark duplicates for update
          if (item.status === 'duplicate_updateable') {
            return {
              ...listingData,
              _isDuplicateUpdate: true,
              _existingListingId: item.generatedListing?._existingListingId || listingData._existingListingId
            };
          }
          
          return listingData;
        });
      
      await onSave(listingsToSave, buildDismissedReviewStats(previewItems, dismissedItems));
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRephrase = async () => {
    if (!currentItem || !itemData.title) return;
    setRephrasing(prev => ({ ...prev, [currentItem.id]: true }));
    try {
      const payload = {
        currentTitle: itemData.title,
        sourceTitle: currentItem.sourceData?.title || '',
        brand: currentItem.sourceData?.brand || '',
        color: currentItem.sourceData?.color || '',
        compatibility: currentItem.sourceData?.compatibility || ''
      };
      if (isSteeringWheelCover && vehicleInputs[currentItem.id]?.trim()) {
        payload.vehicleMentions = vehicleInputs[currentItem.id].trim();
      }
      const { data } = await api.post('/ai/rephrase-title', payload);
      handleFieldChange('title', data.rephrasedTitle, false);
    } catch (error) {
      console.error('[Rephrase Title] Error:', error);
    } finally {
      setRephrasing(prev => ({ ...prev, [currentItem.id]: false }));
    }
  };

  const handleShuffleDescriptionImages = () => {
    if (!currentItem || !canShuffleDescriptionImages) return;

    const shuffledDescription = shuffleKnownImageUrlsInHtml(
      itemData.description,
      currentItem.sourceData.images
    );

    if (shuffledDescription === itemData.description) return;

    setEditedItems(prev => ({
      ...prev,
      [currentItem.id]: {
        ...(prev[currentItem.id] || currentItem.generatedListing || {}),
        description: shuffledDescription
      }
    }));
    setHasUnsavedChanges(true);
  };

  const openAmazonPreview = () => {
    if (!currentItem?.asin) return;
    
    const asin = currentItem.asin;
    const amazonUrl = `https://${amazonDomain}/dp/${asin}`;
    
    const halfWidth = Math.floor(window.screen.width / 2);
    const screenHeight = window.screen.height;

    // Move the main browser window to the right half
    try {
      window.moveTo(halfWidth, 0);
      window.resizeTo(halfWidth, screenHeight);
    } catch (e) {
      // Silently ignore — not permitted for regular browser tabs
    }
    
    // Open Amazon popup on the left half
    const windowRef = window.open(
      amazonUrl,
      'AmazonPreview',
      `width=${halfWidth},height=${screenHeight},left=0,top=0,resizable=yes,scrollbars=yes,location=yes`
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

    // Restore main window to full screen
    try {
      window.moveTo(0, 0);
      window.resizeTo(window.screen.width, window.screen.height);
    } catch (e) {
      // Silently ignore
    }
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
    setStartPriceEditMode({});
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
      case 'duplicate_updateable':
        return <UpdateIcon color="warning" />;
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
      case 'duplicate_updateable':
        return 'warning';
      case 'blocked':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const actualProfitTooltipContent = actualProfit ? (
    <Box sx={{ fontFamily: 'monospace', fontSize: '0.72rem', lineHeight: 1.8, p: 0.5 }}>
      {marketplace === 'AU' ? (
        <>
          <Box>Bought (Amazon):&nbsp;&nbsp; A${actualProfitBuyingPrice.toFixed(2)}</Box>
          <Box>Sold (Start):&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; A${actualProfitSoldPrice.toFixed(2)}</Box>
          <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.3)' }} />
          <Box>Coupon (7%):&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; A${actualProfit.Coupon.toFixed(2)}&nbsp; (Sold × 7%)</Box>
          <Box>Sold−Coupon:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; A${actualProfit.SoldMinusCoupon.toFixed(2)}</Box>
          <Box>eBay Fee:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; A${actualProfit.eBayFee.toFixed(2)}&nbsp; (Sold−Coupon × 13.88% + A$0.27)</Box>
          <Box>Ads (8%):&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; A${actualProfit.Ads.toFixed(2)}&nbsp; ((eBayFee + Coupon) × 8%)</Box>
          <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.3)' }} />
          <Box>Order Earnings:&nbsp;&nbsp;&nbsp; ${actualProfit.OrderEarnings.toFixed(2)}&nbsp; ((Sold−Coupon−eBayFee−Ads) × 0.67)</Box>
          <Box>1% TDS:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${actualProfit.TDS1pct.toFixed(2)}&nbsp; (Sold−Coupon × 1%)</Box>
          <Box>T.Cont:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${actualProfit.TCont.toFixed(2)}</Box>
          <Box>Net (USD):&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${actualProfit.Net.toFixed(2)}&nbsp; (OrderEarnings − TDS − T.Cont)</Box>
          <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.3)' }} />
          <Box>Payoneer (INR):&nbsp;&nbsp;&nbsp;&nbsp; ₹{actualProfit.Payoneer.toFixed(2)}&nbsp; (Net × 90)</Box>
          <Box>Total Spent (INR):&nbsp; ₹{actualProfit.TotalSpent.toFixed(2)}&nbsp; (Bought × 70)</Box>
          <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.3)' }} />
          <Box sx={{ fontWeight: 700, color: actualProfit.actualProfit < 300 ? '#e57373' : '#81c784' }}>
            Actual Profit:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ₹{actualProfit.actualProfit.toFixed(2)}
          </Box>
        </>
      ) : (
        <>
          <Box>Bought (Amazon):&nbsp; ${actualProfitBuyingPrice.toFixed(2)}</Box>
          <Box>Sold (Start):&nbsp;&nbsp;&nbsp;&nbsp; ${actualProfitSoldPrice.toFixed(2)}</Box>
          <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.3)' }} />
          <Box>A (eBay+Tax):&nbsp;&nbsp;&nbsp;&nbsp; ${actualProfit.A.toFixed(2)}&nbsp; (Sold × 1.1)</Box>
          <Box>eBay Fee:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${actualProfit.eBay.toFixed(2)}&nbsp; (A × 13.95% + $0.40)</Box>
          <Box>ADS:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${actualProfit.ADS.toFixed(2)}&nbsp; (A × 15%)</Box>
          <Box>TDS:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${actualProfit.TDS.toFixed(2)}&nbsp; (A × 1%)</Box>
          <Box>T.Cont:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${actualProfit.TCont.toFixed(2)}</Box>
          <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.3)' }} />
          <Box>Net (USD):&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${actualProfit.Net.toFixed(2)}&nbsp; (Sold − eBay − ADS − TDS − T.Cont)</Box>
          <Box>Amazon + Tax:&nbsp;&nbsp; ${actualProfit.AmazonWithTax.toFixed(2)}&nbsp; (Bought + 10% of Bought)</Box>
          <Box>Payoneer (INR):&nbsp;&nbsp; ₹{actualProfit.Payoneer.toFixed(2)}&nbsp; (Net × 90)</Box>
          <Box>Amazon Spend:&nbsp;&nbsp;&nbsp;&nbsp; ₹{actualProfit.AmazonExpense.toFixed(2)}&nbsp; ((Amazon + Tax) × 95)</Box>
          <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.3)' }} />
          <Box sx={{ fontWeight: 700, color: actualProfit.actualProfit < 300 ? '#e57373' : '#81c784' }}>
            Actual Profit:&nbsp;&nbsp;&nbsp;&nbsp; ₹{actualProfit.actualProfit.toFixed(2)}
          </Box>
        </>
      )}
    </Box>
  ) : '';

  const startPriceTooltipContent = (() => {
    const bd = currentItem?.pricingCalculation?.breakdown;
    if (!bd) return null;
    return (
      <Box sx={{ fontFamily: 'monospace', fontSize: '0.72rem', lineHeight: 1.8, p: 0.5 }}>
        <Box>Amazon Cost:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${Number(bd.cost).toFixed(2)}</Box>
        <Box>Tax ({bd.taxRate}%):&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${Number(bd.tax).toFixed(2)}&nbsp; (cost × {bd.taxRate}%)</Box>
        {bd.shipping > 0 && <Box>Shipping:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${Number(bd.shipping).toFixed(2)}</Box>}
        <Box>Buying Price (USD):&nbsp;&nbsp; ${Number(bd.buyingPriceUSD).toFixed(2)}&nbsp; (cost + ship + tax)</Box>
        <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.3)' }} />
        {bd.profitTier?.enabled ? (
          <Box sx={{ color: '#81c784' }}>Profit (Tier {bd.profitTier.costRange}):&nbsp; ₹{Number(bd.profitTier.profit).toFixed(0)}</Box>
        ) : (
          <Box>Desired Profit:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ₹{Number(bd.applicableProfit).toFixed(0)}</Box>
        )}
        <Box>Buying Price (INR):&nbsp;&nbsp; ₹{Number(bd.buyingPriceINR).toFixed(2)}&nbsp; (USD × spentRate)</Box>
        <Box>Profit Component:&nbsp;&nbsp;&nbsp;&nbsp; ₹{Number(bd.profitComponent).toFixed(2)}&nbsp; (profit + buyingINR)</Box>
        <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.3)' }} />
        <Box>Payout (USD):&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${Number(bd.payoutUSD).toFixed(4)}&nbsp; (component ÷ payoutRate)</Box>
        {bd.fixedFee > 0 && <Box>+ Fixed Fee:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${Number(bd.withFixedFee - bd.payoutUSD).toFixed(4)}</Box>}
        <Box>Fee Multiplier:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {Number(bd.feeMultiplier).toFixed(4)}&nbsp; (1 − fees)</Box>
        <Divider sx={{ my: 0.5, borderColor: 'rgba(255,255,255,0.3)' }} />
        <Box sx={{ fontWeight: 700, color: '#81c784' }}>Start Price:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${Number(bd.finalPrice).toFixed(2)}&nbsp; (withFee ÷ multiplier)</Box>
      </Box>
    );
  })();

  // Separate core fields and custom fields from template columns
  const coreFieldColumns = templateColumns.filter(col => col.type === 'core');
  const customFieldColumns = templateColumns.filter(col => col.type === 'custom');

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth={false}
      fullScreen={!showAmazonPreview}
      PaperProps={{
        sx: showAmazonPreview
          ? {
              position: 'fixed',
              right: 0,
              top: 0,
              width: '50vw',
              height: '100vh',
              maxHeight: '100vh',
              m: 0,
              borderRadius: 0,
              bgcolor: '#f5f5f5'
            }
          : {
              bgcolor: '#f5f5f5',
              height: '100vh'
            }
      }}
    >
      <DialogContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ 
          bgcolor: 'white', 
          p: showAmazonPreview ? 1 : 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: showAmazonPreview ? 'wrap' : 'nowrap',
          gap: showAmazonPreview ? 0.5 : 0
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: showAmazonPreview ? 0.5 : 2, flexWrap: 'wrap' }}>
            {!showAmazonPreview && (
              <Typography variant="h6">
                Review Generated Listings
              </Typography>
            )}
            <Chip 
              label={`${activeItems.length > 0 ? safeCurrentIndex + 1 : 0} / ${activeItems.length}`}
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
            {currentItem && (
              <Chip
                icon={getStatusIcon(currentItem?.status)}
                label={currentItem?.status || 'N/A'}
                color={getStatusColor(currentItem?.status)}
                size="small"
              />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant={showAmazonPreview ? "contained" : "outlined"}
              onClick={toggleAmazonPreview}
              size="small"
              sx={{ whiteSpace: 'nowrap', fontSize: showAmazonPreview ? '0.7rem' : undefined }}
            >
              {showAmazonPreview ? '✓ Split' : 'Split View Amazon'}
            </Button>

            {showAmazonPreview && (
              <Button
                variant="outlined"
                size="small"
                sx={{ whiteSpace: 'nowrap', fontSize: '0.7rem' }}
                onClick={() => {
                  if (amazonWindowRef && !amazonWindowRef.closed) {
                    amazonWindowRef.focus();
                  }
                }}
              >
                ↗ Amazon
              </Button>
            )}

            {currentItem?.asin && (
              <Button
                variant="outlined"
                size="small"
                sx={{ whiteSpace: 'nowrap', fontSize: showAmazonPreview ? '0.7rem' : undefined }}
                onClick={() => {
                  window.open(
                    `https://${amazonDomain}/dp/${currentItem.asin}#customerReviews`,
                    '_blank',
                    'noopener,noreferrer'
                  );
                }}
              >
                See Reviews
              </Button>
            )}
            
            {showAmazonPreview ? (
              <>
                <Tooltip title={lastDismissedItem?.asin ? `Undo dismiss (${lastDismissedItem.asin})` : 'Undo dismiss'}>
                  <span>
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={handleUndoDismiss}
                      disabled={!lastDismissedId}
                    >
                      <UndoIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <IconButton
                  color="error"
                  size="small"
                  onClick={handleDismiss}
                  disabled={!currentItem || activeItems.length === 0}
                  title="Dismiss"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </>
            ) : (
              <>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<UndoIcon />}
                  onClick={handleUndoDismiss}
                  disabled={!lastDismissedId}
                  size="small"
                >
                  Undo Dismiss
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleDismiss}
                  disabled={!currentItem || activeItems.length === 0}
                  size="small"
                >
                  Dismiss
                </Button>
              </>
            )}
            {onListDirectly && (
              <Button
                variant="contained"
                color="secondary"
                size="small"
                onClick={() => {
                  const listingsToSave = activeItems
                    .filter(item => !['error', 'loading', 'blocked'].includes(item.status))
                    .map(item => {
                      const listingData = editedItems[item.id] || item.generatedListing;
                      if (item.status === 'duplicate_updateable') {
                        return {
                          ...listingData,
                          _isDuplicateUpdate: true,
                          _existingListingId: item.generatedListing?._existingListingId || listingData._existingListingId
                        };
                      }
                      return listingData;
                    });
                  onListDirectly(listingsToSave, buildDismissedReviewStats(previewItems, dismissedItems));
                }}
                disabled={saving || activeItems.every(i => ['error', 'loading', 'blocked'].includes(i.status))}
                sx={{ fontSize: showAmazonPreview ? '0.7rem' : undefined, whiteSpace: 'nowrap' }}
              >
                List Directly
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={showAmazonPreview ? null : <SaveIcon />}
              onClick={handleSaveAll}
              size="small"
              disabled={saving || activeItems.every(i => ['error', 'loading', 'blocked'].includes(i.status))}
              sx={{ fontSize: showAmazonPreview ? '0.7rem' : undefined, whiteSpace: 'nowrap' }}
            >
              {saving ? 'Saving...' : `Save All (${activeItems.filter(i => !['error', 'loading', 'blocked'].includes(i.status)).length})`}
            </Button>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon fontSize={showAmazonPreview ? 'small' : 'medium'} />
            </IconButton>
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ bgcolor: 'white', px: showAmazonPreview ? 1 : 2, pb: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={activeItems.length > 0 ? ((safeCurrentIndex + 1) / activeItems.length) * 100 : 0}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>

        {activeItems.length === 0 ? (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: showAmazonPreview ? 2 : 4 }}>
            <Paper sx={{ p: 4, width: '100%', maxWidth: 520, textAlign: 'center' }}>
              <Stack spacing={2} alignItems="center">
                <Typography variant="h6">
                  All ASINs are currently dismissed
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Restore the last dismissed ASIN to continue reviewing this batch.
                </Typography>
                {dismissedItems.size > 0 && (
                  <Chip
                    label={`${dismissedItems.size} dismissed in this session`}
                    size="small"
                    variant="outlined"
                  />
                )}
                <Stack direction="row" spacing={1.5} justifyContent="center">
                  <Button
                    variant="contained"
                    startIcon={<UndoIcon />}
                    onClick={handleUndoDismiss}
                    disabled={!lastDismissedId}
                  >
                    Undo Last Dismiss
                  </Button>
                  <Button variant="outlined" onClick={handleClose}>
                    Close
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Box>
        ) : (
          <>
            {/* Duplicate Notification */}
            {currentItem?.status === 'duplicate_updateable' && (
              <Box sx={{ px: showAmazonPreview ? 1 : 2, pt: showAmazonPreview ? 1 : 2 }}>
                <Alert severity="info" sx={{ mb: 1 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" fontWeight="bold">
                      📝 Editing Existing Listing
                    </Typography>
                    <Typography variant="caption">
                      You are editing an existing ASIN. Make any changes needed and click Save to update.
                    </Typography>
                    {currentItem.warnings?.map((warning, idx) => (
                      <Typography key={idx} variant="caption" color="text.secondary">
                        • {warning}
                      </Typography>
                    ))}
                  </Stack>
                </Alert>
              </Box>
            )}

            {/* Warnings/Errors (exclude duplicate_updateable warnings since shown above) */}
            {(currentItem.warnings?.length > 0 || currentItem.errors?.length > 0) && currentItem?.status !== 'duplicate_updateable' && (
              <Box sx={{ px: showAmazonPreview ? 1 : 2, pt: showAmazonPreview ? 1 : 2 }}>
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
              gap: showAmazonPreview ? 0 : 2, 
              p: showAmazonPreview ? 0.5 : 2, 
              overflow: 'hidden'
            }}>
              {/* Left Panel - Amazon Source Data (hidden in split view mode) */}
              <Paper sx={{ 
                width: '40%', 
                p: 2, 
                overflow: 'auto',
                bgcolor: '#fafafa',
                display: showAmazonPreview ? 'none' : undefined
              }}>
                <Typography variant="h6" gutterBottom>
                  Amazon Product Data
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {currentItem.sourceData ? (
                  <Stack spacing={2}>
                    {currentItem.status === 'loading' && (
                      <Alert severity="info" variant="outlined">
                        Amazon data is ready. Generated listing fields are still being prepared.
                      </Alert>
                    )}
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
                        {CURRENCY_SYMBOLS[marketplace] || '$'}{currentItem.sourceData.price}
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

                    {(() => {
                      const info = currentItem.sourceData?.productInfo
                        || currentItem.sourceData?.rawData?.rawData?.product_information
                        || currentItem.sourceData?.rawData?.product_information;
                      if (!info || !Object.keys(info).length) return null;
                      const entries = Object.entries(info).filter(
                        ([k, v]) => !PRODUCT_INFO_SKIP_KEYS.has(k) && v !== null && v !== '' && v !== undefined
                      );
                      const reviews = info.customer_reviews;
                      if (!entries.length && !reviews?.stars) return null;
                      return (
                        <Box>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                            Product Information
                          </Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 1.5, rowGap: 0.5 }}>
                            {reviews?.stars && (
                              <>
                                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>Rating</Typography>
                                <Typography variant="caption">
                                  {reviews.stars}★{reviews.ratings_count ? ` (${reviews.ratings_count})` : ''}
                                </Typography>
                              </>
                            )}
                            {entries.map(([key, value]) => (
                              <>
                                <Typography key={`k-${key}`} variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                                  {formatProductInfoKey(key)}
                                </Typography>
                                <Typography key={`v-${key}`} variant="caption">
                                  {Array.isArray(value) ? value.join(' · ') : String(value)}
                                </Typography>
                              </>
                            ))}
                          </Box>
                        </Box>
                      );
                    })()}
                  </Stack>
                ) : currentItem.status === 'loading' ? (
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
                ) : !currentItem.sourceData ? (
                  <Stack spacing={2}>
                    <Alert severity="info" variant="outlined">
                      <Typography variant="body2" fontWeight="bold" gutterBottom>
                        Existing Listing
                      </Typography>
                      <Typography variant="caption">
                        This is an existing listing from the directory. Edit any fields on the right, then click <strong>Save All</strong> to update or <strong>List Directly</strong> to proceed to listing.
                      </Typography>
                    </Alert>
                    {currentItem.asin && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">ASIN</Typography>
                        <Typography variant="body2" fontWeight="bold">{currentItem.asin}</Typography>
                      </Box>
                    )}
                    {currentItem.sku && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">SKU</Typography>
                        <Typography variant="body2">{currentItem.sku}</Typography>
                      </Box>
                    )}
                  </Stack>
                ) : (
                  <Alert severity="error">
                    Failed to load Amazon product data
                  </Alert>
                )}
              </Paper>

              {/* Right Panel - Generated Listing (Editable) */}
              <Paper sx={{ 
                width: showAmazonPreview ? '100%' : '60%', 
                p: showAmazonPreview ? 1.5 : 2, 
                overflow: 'auto'
              }}>
                <Typography variant="h6" gutterBottom>
                  Generated Listing
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {currentItem.status === 'loading' ? (
                  <Stack spacing={2}>
                    <Skeleton variant="rectangular" height={56} />
                    <Skeleton variant="rectangular" height={56} />
                    <Skeleton variant="rectangular" height={56} />
                    <Skeleton variant="rectangular" height={120} />
                    <Skeleton variant="rectangular" height={56} />
                    <Skeleton variant="rectangular" height={56} />
                    <Box sx={{ pt: 2 }}>
                      <LinearProgress variant="indeterminate" sx={{ borderRadius: 1, mb: 1.5 }} />
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small"
                          label="1. Fetching data"
                          color={currentItem.progressStage === 'fetching' || currentItem.progressStage === 'generating' || currentItem.sourceData ? 'primary' : 'default'}
                          variant={currentItem.progressStage === 'generating' ? 'outlined' : 'filled'}
                        />
                        <Typography variant="caption" color="text.disabled">→</Typography>
                        <Chip
                          size="small"
                          label="2. Generating with AI"
                          color={currentItem.progressStage === 'generating' ? 'primary' : 'default'}
                          variant={currentItem.progressStage === 'generating' ? 'filled' : 'outlined'}
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {currentItem.progressStage === 'generating'
                          ? 'Amazon data is loaded. Generating listing fields now.'
                          : currentItem.progressStage === 'queued'
                            ? 'Queued for processing.'
                            : 'Fetching Amazon product data.'}
                      </Typography>
                    </Box>
                  </Stack>
                ) : currentItem.generatedListing ? (
                  <Stack spacing={2}>
                {/* SKU */}
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      label="SKU (Custom Label)"
                      value={itemData.customLabel || ''}
                      size="small"
                      fullWidth
                      disabled
                      helperText="Auto-generated from ASIN"
                    />
                    {sellerId && itemData.customLabel && (() => {
                      const s = skuStatus[currentItem?.id];
                      if (!s || s.status === 'loading') return <CircularProgress size={18} sx={{ flexShrink: 0 }} />;
                      if (s.status === 'active') return <Chip label={`Active${s.count > 0 ? ` (${s.count})` : ''}`} color="error" size="small" sx={{ flexShrink: 0 }} />;
                      if (s.status === 'inactive') return <Chip label="Not Active" color="success" size="small" sx={{ flexShrink: 0 }} />;
                      return null;
                    })()}
                    {currentSkuStatus?.status !== 'loading' && itemData.customLabel && crossSellerSummary.records.length === 0 && (
                      <Chip
                        label="No other seller SKU match"
                        color="success"
                        size="small"
                        sx={{ flexShrink: 0, fontWeight: 800 }}
                      />
                    )}
                    {crossSellerSummary.records.length > 0 && (
                      <Tooltip
                        arrow
                        placement="bottom-end"
                        title={
                          <Stack spacing={1} sx={{ maxWidth: 560 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              Same SKU found in other sellers
                            </Typography>
                            {crossSellerSummary.records.slice(0, 10).map((record, index) => (
                              <Box
                                key={`${record.sellerId || 'seller'}-${record.itemId || index}`}
                                sx={{
                                  pb: 0.75,
                                  borderBottom: index < Math.min(crossSellerSummary.records.length, 10) - 1 ? '1px solid rgba(255,255,255,0.18)' : 'none'
                                }}
                              >
                                <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: '#fff' }}>
                                  {record.sellerName || 'Unknown Seller'} {record.itemId ? `• ${record.itemId}` : ''}
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block', color: '#ffd166' }}>
                                  Price: {formatSellerSkuPrice(record)}
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.86)' }}>
                                  {record.title || 'Title unavailable'}
                                </Typography>
                              </Box>
                            ))}
                            {crossSellerSummary.records.length > 10 && (
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                                +{crossSellerSummary.records.length - 10} more
                              </Typography>
                            )}
                          </Stack>
                        }
                      >
                        <Chip
                          label={`Other sellers: ${crossSellerSummary.records.length}`}
                          color={crossSellerSummary.hasTitleMatch || crossSellerSummary.hasPriceMatch ? 'warning' : 'info'}
                          variant="outlined"
                          size="small"
                          sx={{
                            flexShrink: 0,
                            fontWeight: 800,
                            borderWidth: 2,
                            bgcolor: crossSellerSummary.hasTitleMatch || crossSellerSummary.hasPriceMatch ? '#fff4de' : '#e8f4fd',
                            '&:hover': {
                              bgcolor: crossSellerSummary.hasTitleMatch || crossSellerSummary.hasPriceMatch ? '#ffe6b8' : '#d8ecfb'
                            }
                          }}
                        />
                      </Tooltip>
                    )}
                  </Stack>
                  {currentSkuStatus?.otherSellerCount > 0 && (
                    <Alert
                      severity={crossSellerSummary.hasTitleMatch || crossSellerSummary.hasPriceMatch ? 'warning' : 'info'}
                      icon={<WarningIcon fontSize="small" />}
                      sx={{
                        mt: 1,
                        alignItems: 'center',
                        border: '1px solid',
                        borderColor: crossSellerSummary.hasTitleMatch || crossSellerSummary.hasPriceMatch ? 'warning.main' : 'info.main',
                        bgcolor: crossSellerSummary.hasTitleMatch || crossSellerSummary.hasPriceMatch ? '#fff4de' : '#e8f4fd',
                        '& .MuiAlert-message': { width: '100%' }
                      }}
                    >
                      <Stack spacing={0.75}>
                        <Typography variant="body2" sx={{ fontWeight: 900, color: crossSellerSummary.hasTitleMatch || crossSellerSummary.hasPriceMatch ? 'warning.dark' : 'info.dark' }}>
                          Same SKU exists in {crossSellerSummary.records.length} other seller listing{crossSellerSummary.records.length === 1 ? '' : 's'}
                        </Typography>
                        {crossSellerSummary.sellerNames.length > 0 && (
                          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                              Sellers:
                            </Typography>
                            {crossSellerSummary.sellerNames.slice(0, 5).map(name => (
                              <Chip
                                key={name}
                                label={name}
                                size="small"
                                sx={{ height: 22, fontWeight: 800, bgcolor: '#fff3cd', color: '#7a4b00', border: '1px solid #f0b429' }}
                              />
                            ))}
                          </Stack>
                        )}
                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Chip
                            label={crossSellerSummary.hasTitleMatch
                              ? `Title matches: ${crossSellerSummary.titleMatches.length}`
                              : 'Title different'}
                            size="small"
                            sx={{
                              fontWeight: 900,
                              bgcolor: crossSellerSummary.hasTitleMatch ? '#ffecb3' : '#e8f4fd',
                              color: crossSellerSummary.hasTitleMatch ? '#8a5300' : '#0b5f8f',
                              border: '1px solid',
                              borderColor: crossSellerSummary.hasTitleMatch ? '#f0a500' : '#64b5f6'
                            }}
                          />
                          <Chip
                            label={crossSellerSummary.hasPriceMatch
                              ? `Price matches: ${crossSellerSummary.priceMatches.length}`
                              : 'Price different'}
                            size="small"
                            sx={{
                              fontWeight: 900,
                              bgcolor: crossSellerSummary.hasPriceMatch ? '#ffe0e0' : '#e8f4fd',
                              color: crossSellerSummary.hasPriceMatch ? '#a11111' : '#0b5f8f',
                              border: '1px solid',
                              borderColor: crossSellerSummary.hasPriceMatch ? '#e57373' : '#64b5f6'
                            }}
                          />
                        </Stack>
                      </Stack>
                    </Alert>
                  )}
                </Box>

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

                        {/* Footer Template Dropdown + Start Price + Actual Profit */}
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          spacing={1.5}
                          sx={{ mb: 1.5, flexWrap: 'wrap' }}
                          useFlexGap
                        >
                          <FormControl size="small" sx={{ width: 280, flexShrink: 0 }}>
                            <InputLabel>Append Footer Template</InputLabel>
                            <Select
                              value={appliedDescTemplates[currentItem?.id] || ''}
                              label="Append Footer Template"
                              onChange={(e) => applyDescTemplate(currentItem.id, e.target.value)}
                            >
                              <MenuItem value=""><em>— No Footer —</em></MenuItem>
                              {DESCRIPTION_FOOTER_TEMPLATES.map(t => (
                                <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>

                          {currentItem?.status === 'duplicate_updateable' && (
                            <Tooltip
                              title={canShuffleDescriptionImages
                                ? 'Shuffle Amazon product images in this description'
                                : 'At least two matching Amazon images are required'}
                              placement="bottom"
                              arrow
                            >
                              <span>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={handleShuffleDescriptionImages}
                                  disabled={!canShuffleDescriptionImages}
                                  sx={{ height: 40, flexShrink: 0, whiteSpace: 'nowrap' }}
                                >
                                  Shuffle Images
                                </Button>
                              </span>
                            </Tooltip>
                          )}

                          {/* Inline Start Price editor */}
                          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
                            <TextField
                              label="Start Price"
                              value={startPriceValue}
                              onChange={(e) => handleFieldChange('startPrice', e.target.value, false)}
                              size="small"
                              required
                              type="number"
                              disabled={!isStartPriceEditing}
                              sx={{
                                width: 130,
                                '& input::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
                                '& input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                                '& input[type=number]': { MozAppearance: 'textfield' },
                              }}
                            />
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={isStartPriceEditing ? handleStartPriceSave : handleStartPriceEdit}
                              startIcon={isStartPriceEditing ? <SaveIcon fontSize="small" /> : <EditIcon fontSize="small" />}
                              sx={{ minWidth: 80, height: 40, flexShrink: 0 }}
                            >
                              {isStartPriceEditing ? 'Save' : 'Edit'}
                            </Button>
                            {currentAutoPriceAdjustment && (
                              <Tooltip
                                title={`Start price auto-increased from ${currentAutoPriceAdjustment.from} to ${currentAutoPriceAdjustment.to} because the original price matched another seller with this SKU.`}
                                placement="bottom"
                                arrow
                              >
                                <Chip
                                  label={`Auto +${(Number(currentAutoPriceAdjustment.to) - Number(currentAutoPriceAdjustment.from)).toFixed(2)}`}
                                  size="small"
                                  sx={{
                                    height: 26,
                                    fontWeight: 900,
                                    bgcolor: '#e8f4fd',
                                    color: '#0b5f8f',
                                    border: '1px solid #64b5f6',
                                    flexShrink: 0
                                  }}
                                />
                              </Tooltip>
                            )}
                            {startPriceTooltipContent && (
                              <Tooltip
                                title={startPriceTooltipContent}
                                placement="bottom-start"
                                arrow
                                componentsProps={{
                                  tooltip: { sx: { maxWidth: 420, bgcolor: '#1a1a2e', color: '#fff' } },
                                  arrow: { sx: { color: '#1a1a2e' } }
                                }}
                              >
                                <InfoOutlinedIcon sx={{ fontSize: 18, color: 'info.main', cursor: 'help', flexShrink: 0 }} />
                              </Tooltip>
                            )}
                          </Stack>

                          {showActualProfit && (
                            <Tooltip
                              title={actualProfitTooltipContent}
                              placement="bottom-end"
                              arrow
                              componentsProps={{
                                tooltip: { sx: { maxWidth: 380, bgcolor: '#1a1a2e', color: '#fff' } },
                                arrow: { sx: { color: '#1a1a2e' } }
                              }}
                            >
                              <Chip
                                label={`Actual Profit: ₹${actualProfit.actualProfit.toFixed(2)}`}
                                size="small"
                                variant="outlined"
                                color={actualProfitColor}
                                sx={{ mt: 0.5, cursor: 'default' }}
                              />
                            </Tooltip>
                          )}
                          {!showActualProfit && currentItem.status !== 'loading' && currentItem.status !== 'blocked' && currentItem.status !== 'error' && (() => {
                            let reason;
                            if (marketplace !== 'US' && marketplace !== 'AU') {
                              reason = `Profit calculation not yet supported for ${marketplace} marketplace`;
                            } else if (!actualProfitBuyingPrice || isNaN(actualProfitBuyingPrice) || actualProfitBuyingPrice <= 0) {
                              reason = 'Amazon price unavailable for this ASIN';
                            } else {
                              reason = 'Start price not available — pricing calculator may be disabled';
                            }
                            return (
                              <Tooltip title={reason} placement="bottom-end" arrow>
                                <Chip
                                  label="Profit unavailable"
                                  size="small"
                                  variant="outlined"
                                  color="default"
                                  sx={{ mt: 0.5, cursor: 'default', opacity: 0.55 }}
                                />
                              </Tooltip>
                            );
                          })()}
                        </Stack>

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

                  // Title field — with rephrase button
                  if (col.name === 'title') {
                    return (
                      <Box key="title">
                        <Stack direction="row" alignItems="flex-start" spacing={1}>
                          <TextField
                            label={col.label || col.name}
                            value={itemData.title || ''}
                            onChange={(e) => handleFieldChange('title', e.target.value, false)}
                            size="small"
                            fullWidth
                            required
                            helperText={
                              crossSellerSummary.records.length > 0
                                ? `${(itemData.title || '').length}/80 • ${
                                    crossSellerSummary.hasTitleMatch
                                      ? `Title matches ${crossSellerSummary.titleMatches.length} other seller listing${crossSellerSummary.titleMatches.length === 1 ? '' : 's'}`
                                      : 'Title no longer matches other sellers with this SKU'
                                  }`
                                : `${(itemData.title || '').length}/80`
                            }
                            sx={{ flex: 1 }}
                          />
                          <Tooltip title="Rephrase title">
                            <span>
                              <IconButton
                                onClick={handleRephrase}
                                disabled={!itemData.title || !!rephrasing[currentItem.id]}
                                size="small"
                                sx={{ mt: 0.5 }}
                              >
                                {rephrasing[currentItem.id]
                                  ? <CircularProgress size={18} />
                                  : <AutorenewIcon fontSize="small" />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                        {isSteeringWheelCover && (
                          <TextField
                            label="Vehicle models (from reviews)"
                            placeholder="e.g. 2022 Toyota Camry, 2019 Honda Accord"
                            value={vehicleInputs[currentItem?.id] || ''}
                            onChange={(e) => setVehicleInputs(prev => ({ ...prev, [currentItem.id]: e.target.value }))}
                            size="small"
                            fullWidth
                            sx={{ mt: 1 }}
                            helperText="Paste from 'See Reviews' · used when rephrasing"
                          />
                        )}
                      </Box>
                    );
                  }

                  // Skip startPrice — it's rendered inline in the description toolbar above
                  if (col.name === 'startPrice') {
                    return null;
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
                      required={col.name === 'startPrice'}
                      type={col.name === 'startPrice' || col.name === 'quantity' ? 'number' : 'text'}
                      helperText={
                        col.name !== 'startPrice' && col.name !== 'quantity' ? `${(itemData[col.name] || '').length}/60` :
                        ''
                      }
                      {...(col.name === 'startPrice' && {
                        sx: {
                          '& input::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
                          '& input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                          '& input[type=number]': { MozAppearance: 'textfield' },
                        },
                      })}
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
          </>
        )}

        {/* Footer - Navigation */}
        <Box sx={{ 
          bgcolor: 'white', 
          p: showAmazonPreview ? 1 : 2, 
          borderTop: 1, 
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Button
            startIcon={<PrevIcon />}
            onClick={handlePrevious}
            disabled={activeItems.length === 0 || safeCurrentIndex === 0}
            size={showAmazonPreview ? 'small' : 'medium'}
          >
            {showAmazonPreview ? 'Prev' : 'Previous'}
          </Button>
          
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: showAmazonPreview ? '0.7rem' : undefined }}>
            {showAmazonPreview ? '← →' : 'Use arrow keys to navigate'}
          </Typography>
          
          <Button
            endIcon={<NextIcon />}
            onClick={handleNext}
            disabled={activeItems.length === 0 || safeCurrentIndex === activeItems.length - 1}
            size={showAmazonPreview ? 'small' : 'medium'}
          >
            Next
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
