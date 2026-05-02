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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  TextField,
  IconButton,
  Pagination,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Fade
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import api from '../../lib/api';
import AllOrdersSheetSkeleton from '../../components/skeletons/AllOrdersSheetSkeleton';
import AdminPageShell from '../../components/AdminPageShell.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import StatMetricCard from '../../components/StatMetricCard.jsx';
import { dashboardSignatureTokens } from '../../theme/appTheme.js';
import { tableHeaderCellSx, tableBodyCellSx, tableBodyRowSx, tableContainerSx, yellowOutlinedButtonSx, yellowFilledButtonSx } from '../../theme/tableStyles.js';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';

const EXCHANGE_RATE_OPTIONS = [
  { value: 'EBAY_US', label: 'eBay US', channel: 'EBAY' },
  { value: 'EBAY_AU', label: 'eBay AU', channel: 'EBAY' },
  { value: 'EBAY_GB', label: 'eBay GB', channel: 'EBAY' },
  { value: 'EBAY_CA', label: 'eBay CA', channel: 'EBAY' },
  { value: 'AMAZON_US', label: 'Amazon US', channel: 'AMAZON' },
  { value: 'AMAZON_AU', label: 'Amazon AU', channel: 'AMAZON' },
  { value: 'AMAZON_GB', label: 'Amazon GB', channel: 'AMAZON' },
  { value: 'AMAZON_CA', label: 'Amazon CA', channel: 'AMAZON' }
];

const EXCHANGE_RATE_LABELS = EXCHANGE_RATE_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const EXCHANGE_RATE_DEFAULTS = {
  EBAY_US: 82,
  EBAY_AU: 82,
  EBAY_GB: 82,
  EBAY_CA: 82,
  AMAZON_US: 87,
  AMAZON_AU: 87,
  AMAZON_GB: 87,
  AMAZON_CA: 87
};

export default function AllOrdersSheetPage() {
  const [sellers, setSellers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Counts for categories, ranges, and products
  const [counts, setCounts] = useState({
    uniqueCategories: 0,
    uniqueRanges: 0,
    uniqueProducts: 0,
    categoryData: [],
    rangeData: [],
    productData: []
  });
  
  // Exchange rate management
  const [exchangeRatesByMarketplace, setExchangeRatesByMarketplace] = useState({});
  const [selectedRateMarketplace, setSelectedRateMarketplace] = useState('EBAY_US');
  const [rateApplicationMode, setRateApplicationMode] = useState('effective');
  const [newRate, setNewRate] = useState('');
  const [newRateDate, setNewRateDate] = useState('');
  const [rateHistory, setRateHistory] = useState([]);
  const [showRateHistory, setShowRateHistory] = useState(false);
  const [updatingExchangeRates, setUpdatingExchangeRates] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  
  // CSV Export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [csvStartDate, setCsvStartDate] = useState('');
  const [csvEndDate, setCsvEndDate] = useState('');
  const [csvFileName, setCsvFileName] = useState('');

  // Price update state (for manual price changes)
  const [priceUpdateModal, setPriceUpdateModal] = useState({ open: false, order: null });
  const [tryPricing, setTryPricing] = useState('');
  const [itemPriceUpdates, setItemPriceUpdates] = useState({}); // { legacyItemId: newPrice }
  const [updatingItemPrices, setUpdatingItemPrices] = useState({}); // { legacyItemId: boolean }
  const [updatedOrderIds, setUpdatedOrderIds] = useState(new Set()); // Track orders with price updates
  const [orderTotalUpdates, setOrderTotalUpdates] = useState({}); // { orderId: value }
  const [updatingOrderTotals, setUpdatingOrderTotals] = useState({}); // { orderId: boolean }
  const [confirmOrderTotal, setConfirmOrderTotal] = useState({ open: false, order: null, value: '' });

  // Search filters
  const [selectedSeller, setSelectedSeller] = useState('');
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchBuyerName, setSearchBuyerName] = useState('');
  const [searchItemNumber, setSearchItemNumber] = useState('');
  const [searchProductName, setSearchProductName] = useState('');
  const [searchMarketplace, setSearchMarketplace] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [excludeLowValue, setExcludeLowValue] = useState(true);
  const [excludeNoAmazonAccount, setExcludeNoAmazonAccount] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [rawCount, setRawCount] = useState(null);
  const [ordersPerPage] = useState(50);

  // Date filter
  const [dateFilter, setDateFilter] = useState({
    mode: 'none',
    single: '',
    from: '',
    to: ''
  });

  // Profit filter
  const [profitFilter, setProfitFilter] = useState({
    mode: 'none',
    single: '',
    from: '',
    to: ''
  });

  // Subtotal filter
  const [subtotalFilter, setSubtotalFilter] = useState({
    mode: 'none',
    single: '',
    from: '',
    to: ''
  });

  // Cross-page filtered totals (from server aggregation, active when date filter is set)
  const [filteredTotals, setFilteredTotals] = useState(null);

  // Toggle states for card sections
  const [showProfitCards, setShowProfitCards] = useState(false);
  const [showSubtotalCards, setShowSubtotalCards] = useState(false);
  const [showExchangeRate, setShowExchangeRate] = useState(false);

  // Modal state for showing category/range/product names
  const [namesModal, setNamesModal] = useState({
    open: false,
    type: '', // 'categories', 'ranges', or 'products'
    title: '',
    items: []
  });

  const isInitialMount = useRef(true);
  const hasFetchedInitialData = useRef(false);
  
  const prevFilters = useRef({
    selectedSeller,
    searchOrderId,
    searchBuyerName,
    searchItemNumber,
    searchProductName,
    searchMarketplace,
    dateFilter,
    profitFilter,
    subtotalFilter
  });

  // Persist filter state to sessionStorage
  useEffect(() => {
    // Clear any stale filter state from previous sessions
    try { sessionStorage.removeItem('all_orders_sheet_state'); } catch (_) {}
  }, []);

  // Initial load
  useEffect(() => {
    if (!hasFetchedInitialData.current) {
      hasFetchedInitialData.current = true;
      fetchSellers();
      fetchAllCurrentExchangeRates();
      fetchRateHistory('EBAY_US');
      loadOrders();
    }
  }, []);

  // Refetch rate history when marketplace or showRateHistory changes
  useEffect(() => {
    if (showRateHistory) {
      fetchRateHistory(selectedRateMarketplace);
    }
  }, [showRateHistory, selectedRateMarketplace]);

  // Reload when page changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadOrders();
  }, [currentPage]);

  function handleApplyFilters() {
    if (currentPage === 1) {
      loadOrders();
    } else {
      setCurrentPage(1);
    }
  }

  async function fetchSellers() {
    setError('');
    try {
      const { data } = await api.get('/sellers/all');
      setSellers(data || []);
    } catch (e) {
      setError('Failed to load sellers');
    }
  }

  async function fetchCurrentExchangeRate(marketplace = 'EBAY_US') {
    try {
      const { data } = await api.get('/exchange-rates/current', { params: { marketplace } });
      setExchangeRatesByMarketplace(prev => ({ ...prev, [marketplace]: data }));
    } catch (e) {
      console.error(`Failed to fetch ${marketplace} exchange rate:`, e);
    }
  }

  async function fetchAllCurrentExchangeRates() {
    await Promise.all(EXCHANGE_RATE_OPTIONS.map((option) => fetchCurrentExchangeRate(option.value)));
  }

  async function fetchRateHistory(marketplace = 'EBAY_US') {
    try {
      const { data } = await api.get('/exchange-rates/history', { params: { marketplace, limit: 20 } });
      setRateHistory(data || []);
    } catch (e) {
      console.error(`Failed to fetch ${marketplace} rate history:`, e);
    }
  }

  async function handleSetExchangeRate() {
    if (!newRate || !newRateDate) {
      alert('Please enter both rate and effective date');
      return;
    }

    try {
      setUpdatingExchangeRates(true);
      const { data } = await api.post('/exchange-rates', {
        rate: parseFloat(newRate),
        effectiveDate: newRateDate,
        marketplace: selectedRateMarketplace,
        applicationMode: rateApplicationMode,
        updateExistingOrders: true,
        notes: `Set via All Orders Sheet for ${selectedRateMarketplace} (${rateApplicationMode})`
      });
      
      setNewRate('');
      setNewRateDate('');
      await fetchAllCurrentExchangeRates();
      await fetchRateHistory(selectedRateMarketplace);
      await loadOrders();
      alert(`${EXCHANGE_RATE_LABELS[selectedRateMarketplace]} rate set successfully. Updated ${data?.updatedOrders || 0} orders.`);
    } catch (e) {
      alert('Failed to set exchange rate: ' + (e?.response?.data?.error || e.message));
    } finally {
      setUpdatingExchangeRates(false);
    }
  }

  async function exportToCSV(useCustomRange = false) {
    setExportingCSV(true);

    try {
      let ordersToExport = orders;
      
      // If custom date range is selected, fetch all orders in that range
      if (useCustomRange && csvStartDate && csvEndDate) {
        const params = {
          page: 1,
          limit: 10000, // Large limit to get all orders
          startDate: csvStartDate,
          endDate: csvEndDate,
          excludeCancelled: true
        };
        
        if (selectedSeller) params.sellerId = selectedSeller;
        if (searchMarketplace) params.searchMarketplace = searchMarketplace;
        if (excludeLowValue) params.excludeLowValue = true;
        if (excludeNoAmazonAccount) params.excludeNoAmazonAccount = true;
        if (searchOrderId.trim()) params.searchOrderId = searchOrderId.trim();
        if (searchBuyerName.trim()) params.searchBuyerName = searchBuyerName.trim();
        if (searchItemNumber.trim()) params.searchItemNumber = searchItemNumber.trim();
        if (searchProductName.trim()) params.productName = searchProductName.trim();

        // Profit filter
        if (profitFilter.mode === 'single' && profitFilter.single !== '') {
          params.maxProfit = profitFilter.single;
        } else if (profitFilter.mode === 'range') {
          if (profitFilter.from !== '') params.minProfit = profitFilter.from;
          if (profitFilter.to !== '') params.maxProfit = profitFilter.to;
        }

        // Subtotal filter
        if (subtotalFilter.mode === 'single' && subtotalFilter.single !== '') {
          params.maxSubtotal = subtotalFilter.single;
        } else if (subtotalFilter.mode === 'range') {
          if (subtotalFilter.from !== '') params.minSubtotal = subtotalFilter.from;
          if (subtotalFilter.to !== '') params.maxSubtotal = subtotalFilter.to;
        }
        
        const { data } = await api.get('/ebay/all-orders-usd', { params });
        ordersToExport = data.orders || [];
        
        if (ordersToExport.length === 0) {
          alert('No orders found in the selected date range');
          setExportingCSV(false);
          setShowExportModal(false);
          return;
        }
      } else if (orders.length === 0) {
        alert('No orders to export');
        setExportingCSV(false);
        return;
      }
      // Define CSV headers matching table structure
      const headers = [
        'Seller',
        'Date Sold',
        'Product Name',
        'Marketplace',
        // eBay Side
        'Subtotal',
        'Shipping',
        'Sales Tax',
        'Discount',
        'Transaction Fees',
        'Ad Fee',
        'Earnings',
        'Order total',
        'TDS',
        'T.ID',
        'NET',
        'Exchange Rate',
        'P.Balance (INR)',
        // Amazon Side (5 columns)
        'Before Tax',
        'Estimated Tax',
        'Amazon_total',
        'Amazon Exch Rate',
        'A_total-inr',
        // Credit Card (3 columns)
        'Marketplace Fee',
        'IGST',
        'Total_CC',
        // Final columns
        'PROFIT (INR)',
        'Amazon Acc',
        'Order ID',
        'Buyer Name',
        'Arriving'
      ];

      // Generate CSV rows
      const rows = ordersToExport.map(order => {
        const isCancelled = order.cancelState === 'CANCELED' || 
                           order.cancelState === 'CANCELLED' || 
                           order.cancelStatus?.cancelState === 'CANCELED' ||
                           order.cancelStatus?.cancelState === 'CANCELLED';
        const isPartiallyRefunded = order.orderPaymentStatus === 'PARTIALLY_REFUNDED';
        const showZero = isCancelled || isPartiallyRefunded;
        
        const subtotal = showZero ? 0 : (parseFloat(order.subtotal) || 0);
        const salesTax = showZero ? 0 : (parseFloat(order.salesTax) || 0);
        const transactionFees = showZero ? 0 : (parseFloat(order.transactionFees) || 0);
        const adFeeGeneral = showZero ? 0 : (parseFloat(order.adFeeGeneral) || 0);
        const discount = showZero ? 0 : (parseFloat(order.discount) || 0);
        const shipping = showZero ? 0 : (parseFloat(order.shipping) || 0);
        const orderTotal = showZero ? 0 : (order.orderTotal ?? ((parseFloat(order.pricingSummary?.total?.value) || 0) + (parseFloat(order.salesTax) || 0)));
        
        // Use DB fields for financial calculations
        const earnings = parseFloat(order.orderEarnings) || 0;
        const tds = parseFloat(order.tds) || 0;
        const tid = parseFloat(order.tid) || 0;
        const net = parseFloat(order.net) || 0;

        const exchangeRate = order.ebayExchangeRate || 85;
        const pBalanceINR = parseFloat(order.pBalanceINR) || 0;

        // Use DB fields for Amazon financial calculations
        const beforeTax = isCancelled ? 0 : (parseFloat(order.beforeTax) || 0);
        const estimatedTax = isCancelled ? 0 : (parseFloat(order.estimatedTax) || 0);
        const amazonTotal = parseFloat(order.amazonTotal) || 0;
        const amazonExchangeRate = order.amazonExchangeRate || 87;
        const aTotalInr = parseFloat(order.amazonTotalINR) || 0;
        const marketplaceFee = parseFloat(order.marketplaceFee) || 0;
        const igst = parseFloat(order.igst) || 0;
        const totalCC = parseFloat(order.totalCC) || 0;
        const profit = pBalanceINR - aTotalInr - totalCC;

        return [
          order.seller?.user?.username || '-',
          formatDate(order.dateSold, order.purchaseMarketplaceId).replace('\n', ' '),
          (order.lineItems && order.lineItems.length > 0 
            ? order.lineItems.map(item => `x${item.quantity} ${item.title}`).join(' | ')
            : order.productName || '-'
          ).replace(/"/g, '""'), // Escape quotes
          order.purchaseMarketplaceId?.replace('EBAY_', '') || '-',
          subtotal.toFixed(2),
          shipping.toFixed(2),
          salesTax.toFixed(2),
          discount.toFixed(2),
          transactionFees.toFixed(2),
          adFeeGeneral.toFixed(2),
          earnings.toFixed(2),
          orderTotal.toFixed(2),
          tds.toFixed(2),
          tid.toFixed(2),
          net.toFixed(2),
          exchangeRate.toFixed(5),
          pBalanceINR.toFixed(2),
          beforeTax.toFixed(2),
          estimatedTax.toFixed(2),
          amazonTotal.toFixed(2),
          amazonExchangeRate,
          aTotalInr.toFixed(2),
          marketplaceFee.toFixed(2),
          igst.toFixed(2),
          totalCC.toFixed(2),
          profit.toFixed(2),
          order.amazonAccount || '-',
          order.orderId || '-',
          order.buyer?.buyerRegistrationAddress?.fullName || '-',
          (() => {
            const d = order.arrivingDate;
            if (!d) return '-';
            const s = String(d).trim();
            // YYYY-MM-DD or YYYY-MM-DDTHH:mm... (ISO / MongoDB string)
            const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m1) return `${m1[2]}/${m1[3]}/${m1[1]}`;
            // MM-DD-YYYY (dash-separated, month-first)
            const m2 = s.match(/^(\d{2})-(\d{2})-(\d{4})/);
            if (m2) return `${m2[1]}/${m2[2]}/${m2[3]}`;
            // Already MM/DD/YYYY
            if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s.slice(0, 10);
            return s;
          })()
        ];
      });

      // Combine headers and rows
      // Date column indices (0-based): 1=Date Sold, 29=Arriving
      const DATE_COL_INDICES = new Set([1, 29]);
      const csvContent = [
        headers.join(','),
        ...rows.map(row =>
          row.map((cell, i) => {
            const s = String(cell);
            // For date columns, force Excel to treat as text by using ="..." syntax
            // This prevents Excel from auto-converting MM/DD/YYYY to its own date serial
            if (DATE_COL_INDICES.has(i) && /^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
              return `="${s}"`;
            }
            return `"${s.replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      // Create blob with UTF-8 BOM so Excel opens with correct encoding
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      const fileName = csvFileName.trim() 
        ? `${csvFileName.trim()}.csv` 
        : `all_orders_sheet_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (useCustomRange) {
        setShowExportModal(false);
        setCsvStartDate('');
        setCsvEndDate('');
        setCsvFileName('');
      }
    } catch (error) {
      console.error('CSV export error:', error);
      alert('Failed to export CSV');
    } finally {
      setExportingCSV(false);
    }
  }

  async function loadOrders() {
    setLoading(true);
    setError('');
    
    try {
      // For single date, fetch all orders without pagination
      const isSingleDate = dateFilter.mode === 'single' && dateFilter.single;
      
      const params = {
        page: isSingleDate ? 1 : currentPage,
        limit: isSingleDate ? 10000 : ordersPerPage, // High limit for single date to get all
        excludeCancelled: true // Exclude cancelled orders
      };
      
      if (selectedSeller) params.sellerId = selectedSeller;
      if (searchOrderId.trim()) params.searchOrderId = searchOrderId.trim();
      if (searchBuyerName.trim()) params.searchBuyerName = searchBuyerName.trim();
      if (searchItemNumber.trim()) params.searchItemNumber = searchItemNumber.trim();
      if (searchProductName.trim()) params.productName = searchProductName.trim();
      if (searchMarketplace) params.searchMarketplace = searchMarketplace;
      if (excludeLowValue) params.excludeLowValue = true;
      if (excludeNoAmazonAccount) params.excludeNoAmazonAccount = true;

      if (dateFilter.mode === 'single' && dateFilter.single) {
        params.startDate = dateFilter.single;
        params.endDate = dateFilter.single;
      } else if (dateFilter.mode === 'range') {
        if (dateFilter.from) params.startDate = dateFilter.from;
        if (dateFilter.to) params.endDate = dateFilter.to;
      }

      // Add profit filter parameters
      if (profitFilter.mode === 'single' && profitFilter.single !== '') {
        params.maxProfit = profitFilter.single;
      } else if (profitFilter.mode === 'range') {
        if (profitFilter.from !== '') params.minProfit = profitFilter.from;
        if (profitFilter.to !== '') params.maxProfit = profitFilter.to;
      }

      // Add subtotal filter parameters
      if (subtotalFilter.mode === 'single' && subtotalFilter.single !== '') {
        params.maxSubtotal = subtotalFilter.single;
      } else if (subtotalFilter.mode === 'range') {
        if (subtotalFilter.from !== '') params.minSubtotal = subtotalFilter.from;
        if (subtotalFilter.to !== '') params.maxSubtotal = subtotalFilter.to;
      }

      const { data } = await api.get('/ebay/all-orders-usd', { params });
      setOrders(data?.orders || []);
      
      if (data?.pagination) {
        setTotalPages(data.pagination.totalPages);
        setTotalOrders(data.pagination.totalOrders);
        setRawCount(data.pagination.rawCount ?? null);
      }

      if (data?.counts) {
        setCounts(data.counts);
      }

      setFilteredTotals(data?.filteredTotals || null);
    } catch (e) {
      setOrders([]);
      setCounts({ uniqueCategories: 0, uniqueRanges: 0, uniqueProducts: 0, categoryData: [], rangeData: [], productData: [] });
      setError(e?.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value) => {
    if (value == null || value === '') return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return '-';
    return `$${num.toFixed(2)}`;
  };

  // Handler for opening price update modal
  function openPriceUpdateModal(order) {
    setPriceUpdateModal({ open: true, order });
    setTryPricing('');
    setItemPriceUpdates({});
  }

  function getOrderTotalInputValue(order) {
    if (Object.prototype.hasOwnProperty.call(orderTotalUpdates, order._id)) {
      return orderTotalUpdates[order._id];
    }

    const storedValue = order.orderTotal ?? ((parseFloat(order.pricingSummary?.total?.value) || 0) + (parseFloat(order.salesTax) || 0));
    return storedValue == null ? '' : String(storedValue);
  }

  async function handleSaveOrderTotal(order, overrideValue) {
    const rawValue = overrideValue !== undefined ? overrideValue : orderTotalUpdates[order._id];
    const fallbackValue = order.orderTotal ?? ((parseFloat(order.pricingSummary?.total?.value) || 0) + (parseFloat(order.salesTax) || 0));
    const nextValue = rawValue === undefined ? fallbackValue : rawValue;

    if (nextValue === '' || nextValue === null || nextValue === undefined || Number.isNaN(parseFloat(nextValue))) {
      alert('Please enter a valid order total');
      return;
    }

    const parsedValue = parseFloat(nextValue);
    const currentValue = order.orderTotal ?? ((parseFloat(order.pricingSummary?.total?.value) || 0) + (parseFloat(order.salesTax) || 0));
    if (parsedValue === currentValue) {
      setOrderTotalUpdates(prev => {
        const updated = { ...prev };
        delete updated[order._id];
        return updated;
      });
      return;
    }

    setUpdatingOrderTotals(prev => ({ ...prev, [order._id]: true }));

    try {
      const { data } = await api.patch(`/ebay/orders/${order._id}/order-total`, {
        orderTotal: parsedValue
      });

      setOrders(prev => prev.map(existingOrder => (
        existingOrder._id === order._id ? data.order : existingOrder
      )));
      setOrderTotalUpdates(prev => {
        const updated = { ...prev };
        delete updated[order._id];
        return updated;
      });
    } catch (err) {
      alert('Failed to update order total: ' + (err?.response?.data?.error || err.message));
    } finally {
      setUpdatingOrderTotals(prev => ({ ...prev, [order._id]: false }));
    }
  }

  // Handler for updating individual item price
  async function handleUpdateItemPrice(legacyItemId, order) {
    const newPrice = itemPriceUpdates[legacyItemId];
    
    if (!newPrice || isNaN(parseFloat(newPrice))) {
      alert('Please enter a valid price');
      return;
    }

    // Find the item in order.lineItems to get the product title
    const item = order.lineItems?.find(item => item.legacyItemId === legacyItemId);
    const productTitle = item?.title || 'Unknown Product';

    setUpdatingItemPrices(prev => ({ ...prev, [legacyItemId]: true }));

    try {
      const response = await api.post('/ebay/update-listing', {
        sellerId: order.seller._id,
        itemId: legacyItemId,
        price: parseFloat(newPrice),
        orderId: order.orderId,
        productTitle: productTitle
      });

      if (response.data.success) {
        alert(`✓ Successfully updated price to $${parseFloat(newPrice).toFixed(2)} for item ${legacyItemId}`);
        if (response.data.warning) {
          console.warn(`Warning:`, response.data.warning);
        }
        // Mark this order as having a price update
        setUpdatedOrderIds(prev => new Set(prev).add(order.orderId));
        // Clear the input for this item
        setItemPriceUpdates(prev => {
          const updated = { ...prev };
          delete updated[legacyItemId];
          return updated;
        });
      }
    } catch (err) {
      alert('Failed to update price: ' + (err?.response?.data?.error || err.message));
    } finally {
      setUpdatingItemPrices(prev => ({ ...prev, [legacyItemId]: false }));
    }
  }

  // Calculate expected profit based on try pricing
  function calculateExpectedProfit(tryPricingValue, order) {
    if (!tryPricingValue || isNaN(parseFloat(tryPricingValue))) return null;
    
    const tryPrice = parseFloat(tryPricingValue);
    const originalSubtotal = parseFloat(order.subtotal) || 0;
    
    if (originalSubtotal === 0) return null;
    
    // Calculate the proportion/ratio
    const ratio = tryPrice / originalSubtotal;
    
    // Scale the fees proportionally (keep high precision)
    const originalDiscount = parseFloat(order.discount) || 0;
    const originalTransactionFees = parseFloat(order.transactionFees) || 0;
    const originalAdFeeGeneral = parseFloat(order.adFeeGeneral) || 0;
    
    const newDiscount = originalDiscount * ratio;
    const newTransactionFees = originalTransactionFees * ratio;
    const newAdFeeGeneral = originalAdFeeGeneral * ratio;
    const originalOrderTotal = order.orderTotal ?? ((parseFloat(order.pricingSummary?.total?.value) || 0) + (parseFloat(order.salesTax) || 0));
    const newOrderTotal = originalOrderTotal * ratio;
    
    // Calculate eBay earnings with new proportional fees (excluding sales tax)
    // Using high precision to match backend calculation
    const ebayEarnings = tryPrice + newDiscount - newTransactionFees - newAdFeeGeneral;
    
    // TDS and TID calculations (round to match backend)
    const newTDS = Math.round(newOrderTotal * 0.01 * 100) / 100;
    const newTID = 0.24;
    const newNet = Math.round((ebayEarnings - newTDS - newTID) * 100) / 100;
    
    // Convert to INR
    const ebayExchangeRate = parseFloat(order.ebayExchangeRate) || 85;
    const newPBalanceINR = Math.round(newNet * ebayExchangeRate * 100) / 100;
    
    // Get Amazon and CC costs
    const amazonTotalINR = parseFloat(order.amazonTotalINR) || 0;
    const totalCC = parseFloat(order.totalCC) || 0;
    
    // Calculate expected profit
    const expectedProfit = Math.round((newPBalanceINR - amazonTotalINR - totalCC) * 100) / 100;
    
    return {
      profit: expectedProfit,
      breakdown: {
        tryPrice,
        discount: newDiscount,
        transactionFees: newTransactionFees,
        adFeeGeneral: newAdFeeGeneral,
        ebayEarnings,
        orderTotal: newOrderTotal,
        tds: newTDS,
        tid: newTID,
        net: newNet,
        pBalanceINR: newPBalanceINR,
        amazonTotalINR,
        totalCC,
        ratio: ((ratio - 1) * 100).toFixed(1) // percentage change
      }
    };
  }

  const formatDate = (dateStr, marketplaceId) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      
      // Determine timezone based on marketplace
      let timezone = 'America/Los_Angeles'; // Default PT
      if (marketplaceId === 'EBAY_AU') timezone = 'Australia/Sydney';
      else if (marketplaceId === 'EBAY_CA') timezone = 'America/Toronto';
      else if (marketplaceId === 'EBAY_GB') timezone = 'Europe/London';
      
      // Use formatToParts to guarantee MM/DD/YYYY with slashes regardless of OS locale
      const formatter = new Intl.DateTimeFormat('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric',
        timeZone: timezone
      });
      const parts = formatter.formatToParts(date);
      const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
      return `${p.month}/${p.day}/${p.year}`;
    } catch {
      return '-';
    }
  };

  if (loading && orders.length === 0) return <AllOrdersSheetSkeleton />;

  return (
    <Fade in timeout={600}>
    <AdminPageShell>
      {/* CSV Export Modal */}
      <Dialog open={showExportModal} onClose={() => setShowExportModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Orders by Date Range</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Select a date range to download all orders within that period. All currently active filters will be applied.
            </Typography>
            <TextField
              label="Start Date"
              type="date"
              value={csvStartDate}
              onChange={(e) => setCsvStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="End Date"
              type="date"
              value={csvEndDate}
              onChange={(e) => setCsvEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="CSV File Name (optional)"
              type="text"
              value={csvFileName}
              onChange={(e) => setCsvFileName(e.target.value)}
              placeholder="e.g. my_orders_december"
              helperText="Leave empty for default name with date"
              fullWidth
            />
            {/* Active filters summary */}
            {(() => {
              const activeFilters = [];
              if (selectedSeller) {
                const sellerObj = sellers.find(s => s._id === selectedSeller);
                activeFilters.push(`Seller: ${sellerObj?.user?.username || selectedSeller}`);
              }
              if (searchMarketplace) activeFilters.push(`Marketplace: ${searchMarketplace.replace('EBAY_', 'eBay ')}`);
              if (excludeLowValue) activeFilters.push('Excluding low-value orders');
              if (excludeNoAmazonAccount) activeFilters.push('Excluding no Amazon account');
              if (searchOrderId.trim()) activeFilters.push(`Order ID: ${searchOrderId.trim()}`);
              if (searchBuyerName.trim()) activeFilters.push(`Buyer: ${searchBuyerName.trim()}`);
              if (searchProductName.trim()) activeFilters.push(`Product: ${searchProductName.trim()}`);
              if (profitFilter.mode === 'range' && (profitFilter.from || profitFilter.to))
                activeFilters.push(`Profit: ${profitFilter.from || '*'} – ${profitFilter.to || '*'}`);
              if (subtotalFilter.mode === 'range' && (subtotalFilter.from || subtotalFilter.to))
                activeFilters.push(`Subtotal: ${subtotalFilter.from || '*'} – ${subtotalFilter.to || '*'}`);
              if (activeFilters.length === 0) return null;
              return (
                <Alert severity="info" icon={false}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>Active filters that will be applied:</Typography>
                  {activeFilters.map((f, i) => (
                    <Typography key={i} variant="caption" sx={{ display: 'block' }}>• {f}</Typography>
                  ))}
                </Alert>
              );
            })()}
            {csvStartDate && csvEndDate && (
              <Alert severity="success">
                Will export orders from{' '}
                {new Date(csvStartDate + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}{' '}
                to{' '}
                {new Date(csvEndDate + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExportModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => exportToCSV(true)}
            disabled={!csvStartDate || !csvEndDate || exportingCSV}
          >
            {exportingCSV ? 'Exporting...' : 'Download CSV'}
          </Button>
        </DialogActions>
      </Dialog>

      <SectionCard sx={{ p: { xs: 2, md: 3 }, mb: 3, background: dashboardSignatureTokens.surfaces.pageCard }}>
        <PageHeader
          title="All Orders Sheet (USD)"
          subtitle="Financial summary of all eBay orders in USD with INR conversions."
          actions={
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => exportToCSV(false)}
                disabled={exportingCSV || orders.length === 0}
                sx={{ ...yellowOutlinedButtonSx, height: 40 }}
              >
                {exportingCSV ? 'Exporting...' : 'Download Current Page'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  // Pre-populate dates from active date filter
                  if (dateFilter.mode === 'range') {
                    if (dateFilter.from) setCsvStartDate(dateFilter.from);
                    if (dateFilter.to) setCsvEndDate(dateFilter.to);
                  } else if (dateFilter.mode === 'single' && dateFilter.single) {
                    setCsvStartDate(dateFilter.single);
                    setCsvEndDate(dateFilter.single);
                  }
                  setShowExportModal(true);
                }}
                disabled={exportingCSV}
                sx={{ ...yellowOutlinedButtonSx, height: 40 }}
              >
                Download by Date Range
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                onClick={loadOrders}
                disabled={loading}
                sx={{ ...yellowOutlinedButtonSx, height: 40 }}
              >
                Refresh
              </Button>
            </Stack>
          }
        />
      </SectionCard>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <SectionCard sx={{ p: 2.5, mb: 2, background: dashboardSignatureTokens.surfaces.pageCard }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Select Seller</InputLabel>
            <Select
              value={selectedSeller}
              label="Select Seller"
              onChange={(e) => setSelectedSeller(e.target.value)}
            >
              <MenuItem value="">All Sellers</MenuItem>
              {sellers.map((seller) => (
                <MenuItem key={seller._id} value={seller._id}>
                  {seller.user?.username || seller._id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Marketplace</InputLabel>
            <Select
              value={searchMarketplace}
              label="Marketplace"
              onChange={(e) => setSearchMarketplace(e.target.value)}
            >
              <MenuItem value="">All Marketplaces</MenuItem>
              <MenuItem value="EBAY_US">eBay US</MenuItem>
              <MenuItem value="EBAY_AU">eBay Australia</MenuItem>
              <MenuItem value="EBAY_CA">eBay Canada</MenuItem>
              <MenuItem value="EBAY_GB">eBay UK</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={excludeLowValue}
                onChange={(e) => setExcludeLowValue(e.target.checked)}
                size="small"
                color="warning"
              />
            }
            label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Hide &lt;$3</Typography>}
            sx={{ m: 0, px: 1.5, minHeight: 40, display: 'inline-flex', alignItems: 'center', gap: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, boxSizing: 'border-box' }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={excludeNoAmazonAccount}
                onChange={(e) => setExcludeNoAmazonAccount(e.target.checked)}
                size="small"
                color="info"
              />
            }
            label={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Hide No Amazon Account</Typography>}
            sx={{ m: 0, px: 1.5, minHeight: 40, display: 'inline-flex', alignItems: 'center', gap: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, boxSizing: 'border-box' }}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleApplyFilters}
            disabled={loading}
            sx={{ ...yellowFilledButtonSx, ml: 'auto', height: 40 }}
          >
            Apply Filters
          </Button>
        </Stack>
      </SectionCard>

      {/* Search Filters */}
      <SectionCard sx={{ p: 2.5, mb: 2, background: dashboardSignatureTokens.surfaces.pageCard }}>
        <Box sx={{ p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
          <Box 
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setFiltersExpanded(!filtersExpanded)}
          >
            <Typography variant="subtitle2" fontWeight="bold">
              Search Filters
            </Typography>
            <IconButton size="small">
              {filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
          {filtersExpanded && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1.5 }}>
              <TextField
                size="small"
                label="Order ID"
                value={searchOrderId}
                onChange={(e) => setSearchOrderId(e.target.value)}
                placeholder="Search by order ID..."
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Buyer Name"
                value={searchBuyerName}
                onChange={(e) => setSearchBuyerName(e.target.value)}
                placeholder="Search by buyer name..."
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Item Number"
                value={searchItemNumber}
                onChange={(e) => setSearchItemNumber(e.target.value)}
                placeholder="Search by legacy item ID..."
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Product Name"
                value={searchProductName}
                onChange={(e) => setSearchProductName(e.target.value)}
                placeholder="Search by product name..."
                sx={{ flex: 1 }}
              />
              
              {/* Date Mode Selector */}
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel id="date-mode-label">Date Mode</InputLabel>
                <Select
                  labelId="date-mode-label"
                  value={dateFilter.mode}
                  label="Date Mode"
                  onChange={(e) => setDateFilter(prev => ({ ...prev, mode: e.target.value }))}
                >
                  <MenuItem value="none">None</MenuItem>
                  <MenuItem value="single">Single Day</MenuItem>
                  <MenuItem value="range">Date Range</MenuItem>
                </Select>
              </FormControl>

              {/* Single Date Input */}
              {dateFilter.mode === 'single' && (
                <TextField
                  size="small"
                  label="Date"
                  type="date"
                  value={dateFilter.single}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, single: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 150 }}
                />
              )}

              {/* Range Inputs */}
              {dateFilter.mode === 'range' && (
                <>
                  <TextField
                    size="small"
                    label="From"
                    type="date"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 150 }}
                  />
                  <TextField
                    size="small"
                    label="To"
                    type="date"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 150 }}
                  />
                </>
              )}

              {/* Profit Filter Mode Selector */}
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel id="profit-mode-label">Profit Filter</InputLabel>
                <Select
                  labelId="profit-mode-label"
                  value={profitFilter.mode}
                  label="Profit Filter"
                  onChange={(e) => setProfitFilter(prev => ({ ...prev, mode: e.target.value }))}
                >
                  <MenuItem value="none">None</MenuItem>
                  <MenuItem value="single">≤ Value</MenuItem>
                  <MenuItem value="range">Range</MenuItem>
                </Select>
              </FormControl>

              {/* Single Profit Input (less than or equal) */}
              {profitFilter.mode === 'single' && (
                <TextField
                  size="small"
                  label="Max Profit (INR)"
                  type="number"
                  value={profitFilter.single}
                  onChange={(e) => setProfitFilter(prev => ({ ...prev, single: e.target.value }))}
                  placeholder="e.g. 100"
                  sx={{ width: 150 }}
                  helperText="Show profit ≤ this value"
                />
              )}

              {/* Range Inputs for Profit */}
              {profitFilter.mode === 'range' && (
                <>
                  <TextField
                    size="small"
                    label="Min Profit (INR)"
                    type="number"
                    value={profitFilter.from}
                    onChange={(e) => setProfitFilter(prev => ({ ...prev, from: e.target.value }))}
                    placeholder="e.g. 100"
                    sx={{ width: 150 }}
                  />
                  <TextField
                    size="small"
                    label="Max Profit (INR)"
                    type="number"
                    value={profitFilter.to}
                    onChange={(e) => setProfitFilter(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="e.g. 500"
                    sx={{ width: 150 }}
                  />
                </>
              )}

              {/* Clear Button */}
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setSearchOrderId('');
                  setSearchBuyerName('');
                  setSearchItemNumber('');
                  setSearchProductName('');
                  setDateFilter({ mode: 'none', single: '', from: '', to: '' });
                  setProfitFilter({ mode: 'none', single: '', from: '', to: '' });
                  setSubtotalFilter({ mode: 'none', single: '', from: '', to: '' });
                }}
                sx={{ minWidth: 80 }}
              >
                CLEAR
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleApplyFilters}
                disabled={loading}
                sx={yellowFilledButtonSx}
              >
                Apply Filters
              </Button>
            </Stack>
          )}
        </Box>
      </SectionCard>

      {/* Quick Filter Cards */}
      <SectionCard sx={{ p: 2.5, mb: 2, background: dashboardSignatureTokens.surfaces.pageCard }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Quick Filters</Typography>
          <Typography variant="caption" color="text.secondary">
            Filters orders based on <strong>profit</strong> (calculated field) and <strong>subtotal</strong> (order subtotal) from the database
          </Typography>
        </Stack>
        
        {/* Profit Range Cards */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
              Filter by Profit (INR)
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowProfitCards(!showProfitCards)}
              endIcon={showProfitCards ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              {showProfitCards ? 'Hide' : 'Show'}
            </Button>
          </Box>
          {showProfitCards && (
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Paper
              elevation={profitFilter.mode === 'range' && profitFilter.from === '200' && profitFilter.to === '300' ? 8 : 2}
              sx={{
                p: 2,
                cursor: 'pointer',
                minWidth: 140,
                textAlign: 'center',
                border: profitFilter.mode === 'range' && profitFilter.from === '200' && profitFilter.to === '300' 
                  ? '2px solid #1976d2' 
                  : '2px solid transparent',
                backgroundColor: profitFilter.mode === 'range' && profitFilter.from === '200' && profitFilter.to === '300' 
                  ? '#e3f2fd' 
                  : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4
                }
              }}
              onClick={() => {
                // Toggle: if already selected, deselect
                if (profitFilter.mode === 'range' && profitFilter.from === '200' && profitFilter.to === '300') {
                  setProfitFilter({ mode: 'none', single: '', from: '', to: '' });
                } else {
                  setProfitFilter({ mode: 'range', single: '', from: '200', to: '300' });
                }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                ₹200 - ₹300
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Profit Range
              </Typography>
            </Paper>

            <Paper
              elevation={profitFilter.mode === 'range' && profitFilter.from === '500' && profitFilter.to === '600' ? 8 : 2}
              sx={{
                p: 2,
                cursor: 'pointer',
                minWidth: 140,
                textAlign: 'center',
                border: profitFilter.mode === 'range' && profitFilter.from === '500' && profitFilter.to === '600' 
                  ? '2px solid #1976d2' 
                  : '2px solid transparent',
                backgroundColor: profitFilter.mode === 'range' && profitFilter.from === '500' && profitFilter.to === '600' 
                  ? '#e3f2fd' 
                  : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4
                }
              }}
              onClick={() => {
                // Toggle: if already selected, deselect
                if (profitFilter.mode === 'range' && profitFilter.from === '500' && profitFilter.to === '600') {
                  setProfitFilter({ mode: 'none', single: '', from: '', to: '' });
                } else {
                  setProfitFilter({ mode: 'range', single: '', from: '500', to: '600' });
                }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                ₹500 - ₹600
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Profit Range
              </Typography>
            </Paper>

            <Paper
              elevation={profitFilter.mode === 'range' && profitFilter.from === '900' && profitFilter.to === '' ? 8 : 2}
              sx={{
                p: 2,
                cursor: 'pointer',
                minWidth: 140,
                textAlign: 'center',
                border: profitFilter.mode === 'range' && profitFilter.from === '900' && profitFilter.to === '' 
                  ? '2px solid #1976d2' 
                  : '2px solid transparent',
                backgroundColor: profitFilter.mode === 'range' && profitFilter.from === '900' && profitFilter.to === '' 
                  ? '#e3f2fd' 
                  : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4
                }
              }}
              onClick={() => {
                // Toggle: if already selected, deselect
                if (profitFilter.mode === 'range' && profitFilter.from === '900' && profitFilter.to === '') {
                  setProfitFilter({ mode: 'none', single: '', from: '', to: '' });
                } else {
                  setProfitFilter({ mode: 'range', single: '', from: '900', to: '' });
                }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                ₹900+
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Profit Range
              </Typography>
            </Paper>
          </Stack>
          )}
        </Box>

        {/* Subtotal Range Cards */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
              Filter by Subtotal (USD)
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowSubtotalCards(!showSubtotalCards)}
              endIcon={showSubtotalCards ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              {showSubtotalCards ? 'Hide' : 'Show'}
            </Button>
          </Box>
          {showSubtotalCards && (
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Paper
              elevation={subtotalFilter.mode === 'range' && subtotalFilter.from === '0' && subtotalFilter.to === '15' ? 8 : 2}
              sx={{
                p: 2,
                cursor: 'pointer',
                minWidth: 140,
                textAlign: 'center',
                border: subtotalFilter.mode === 'range' && subtotalFilter.from === '0' && subtotalFilter.to === '15' 
                  ? '2px solid #1976d2' 
                  : '2px solid transparent',
                backgroundColor: subtotalFilter.mode === 'range' && subtotalFilter.from === '0' && subtotalFilter.to === '15' 
                  ? '#e3f2fd' 
                  : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4
                }
              }}
              onClick={() => {
                // Toggle: if already selected, deselect
                if (subtotalFilter.mode === 'range' && subtotalFilter.from === '0' && subtotalFilter.to === '15') {
                  setSubtotalFilter({ mode: 'none', single: '', from: '', to: '' });
                } else {
                  setSubtotalFilter({ mode: 'range', single: '', from: '0', to: '15' });
                }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                $0 - $15
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Subtotal Range
              </Typography>
            </Paper>

            <Paper
              elevation={subtotalFilter.mode === 'range' && subtotalFilter.from === '15' && subtotalFilter.to === '30' ? 8 : 2}
              sx={{
                p: 2,
                cursor: 'pointer',
                minWidth: 140,
                textAlign: 'center',
                border: subtotalFilter.mode === 'range' && subtotalFilter.from === '15' && subtotalFilter.to === '30' 
                  ? '2px solid #1976d2' 
                  : '2px solid transparent',
                backgroundColor: subtotalFilter.mode === 'range' && subtotalFilter.from === '15' && subtotalFilter.to === '30' 
                  ? '#e3f2fd' 
                  : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4
                }
              }}
              onClick={() => {
                // Toggle: if already selected, deselect
                if (subtotalFilter.mode === 'range' && subtotalFilter.from === '15' && subtotalFilter.to === '30') {
                  setSubtotalFilter({ mode: 'none', single: '', from: '', to: '' });
                } else {
                  setSubtotalFilter({ mode: 'range', single: '', from: '15', to: '30' });
                }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                $15 - $30
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Subtotal Range
              </Typography>
            </Paper>

            <Paper
              elevation={subtotalFilter.mode === 'range' && subtotalFilter.from === '30' && subtotalFilter.to === '90' ? 8 : 2}
              sx={{
                p: 2,
                cursor: 'pointer',
                minWidth: 140,
                textAlign: 'center',
                border: subtotalFilter.mode === 'range' && subtotalFilter.from === '30' && subtotalFilter.to === '90' 
                  ? '2px solid #1976d2' 
                  : '2px solid transparent',
                backgroundColor: subtotalFilter.mode === 'range' && subtotalFilter.from === '30' && subtotalFilter.to === '90' 
                  ? '#e3f2fd' 
                  : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4
                }
              }}
              onClick={() => {
                // Toggle: if already selected, deselect
                if (subtotalFilter.mode === 'range' && subtotalFilter.from === '30' && subtotalFilter.to === '90') {
                  setSubtotalFilter({ mode: 'none', single: '', from: '', to: '' });
                } else {
                  setSubtotalFilter({ mode: 'range', single: '', from: '30', to: '90' });
                }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                $30 - $90
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Subtotal Range
              </Typography>
            </Paper>

            <Paper
              elevation={subtotalFilter.mode === 'range' && subtotalFilter.from === '90' && subtotalFilter.to === '' ? 8 : 2}
              sx={{
                p: 2,
                cursor: 'pointer',
                minWidth: 140,
                textAlign: 'center',
                border: subtotalFilter.mode === 'range' && subtotalFilter.from === '90' && subtotalFilter.to === '' 
                  ? '2px solid #1976d2' 
                  : '2px solid transparent',
                backgroundColor: subtotalFilter.mode === 'range' && subtotalFilter.from === '90' && subtotalFilter.to === '' 
                  ? '#e3f2fd' 
                  : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4
                }
              }}
              onClick={() => {
                // Toggle: if already selected, deselect
                if (subtotalFilter.mode === 'range' && subtotalFilter.from === '90' && subtotalFilter.to === '') {
                  setSubtotalFilter({ mode: 'none', single: '', from: '', to: '' });
                } else {
                  setSubtotalFilter({ mode: 'range', single: '', from: '90', to: '' });
                }
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                $90+
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Subtotal Range
              </Typography>
            </Paper>
          </Stack>
          )}
        </Box>
      </SectionCard>

      {/* Exchange Rate Management */}
      <SectionCard sx={{ p: 2.5, mb: 2, position: 'relative', overflow: 'hidden', background: dashboardSignatureTokens.surfaces.pageCard }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Exchange Rate (USD to INR)
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowExchangeRate(!showExchangeRate)}
              endIcon={showExchangeRate ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              {showExchangeRate ? 'Hide' : 'Show'}
            </Button>
          </Stack>

          {updatingExchangeRates && (
            <Alert
              severity="info"
              icon={<CircularProgress size={18} color="inherit" />}
            >
              Recalculating affected orders. P.Balance (INR), A_total-inr, and Profit are being refreshed.
            </Alert>
          )}

          {showExchangeRate && (
          <>
          <Stack direction="row" spacing={2} alignItems="stretch" flexWrap="wrap">
            {EXCHANGE_RATE_OPTIONS.map((option) => {
              const rateInfo = exchangeRatesByMarketplace[option.value];
              const accentColor = option.channel === 'AMAZON' ? 'success.main' : 'primary.main';

              return (
                <Paper key={option.value} variant="outlined" sx={{ p: 1.5, minWidth: 150 }}>
                  <Typography variant="body2" color="text.secondary">{option.label}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: accentColor }}>
                    {rateInfo?.rate || EXCHANGE_RATE_DEFAULTS[option.value]} INR
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {rateInfo?.applicationMode === 'specific-date' ? 'Specific Date' : 'Effective'}
                  </Typography>
                  {rateInfo?.effectiveDate && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {new Date(rateInfo.effectiveDate).toLocaleDateString()}
                    </Typography>
                  )}
                </Paper>
              );
            })}
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Rate For</InputLabel>
              <Select
                value={selectedRateMarketplace}
                label="Rate For"
                onChange={(e) => setSelectedRateMarketplace(e.target.value)}
                disabled={updatingExchangeRates}
              >
                {EXCHANGE_RATE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Apply As</InputLabel>
              <Select
                value={rateApplicationMode}
                label="Apply As"
                onChange={(e) => setRateApplicationMode(e.target.value)}
                disabled={updatingExchangeRates}
              >
                <MenuItem value="effective">Effective From</MenuItem>
                <MenuItem value="specific-date">Specific Date Only</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="New Rate"
              type="number"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              sx={{ width: 150 }}
              placeholder="e.g. 84"
              disabled={updatingExchangeRates}
            />
            <TextField
              size="small"
              label={rateApplicationMode === 'specific-date' ? 'Specific Date' : 'Effective From'}
              type="date"
              value={newRateDate}
              onChange={(e) => setNewRateDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText={rateApplicationMode === 'specific-date' ? 'Uses the same PST/PDT day pattern as the All Orders Sheet search date filter.' : 'Starts from this PST/PDT day, matching the All Orders Sheet search date filter.'}
              sx={{ width: 180 }}
              disabled={updatingExchangeRates}
            />
            <Button
              variant="contained"
              onClick={handleSetExchangeRate}
              disabled={!newRate || !newRateDate || updatingExchangeRates}
              startIcon={updatingExchangeRates ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {updatingExchangeRates ? 'Recalculating...' : `Set ${EXCHANGE_RATE_LABELS[selectedRateMarketplace]} Rate`}
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setShowRateHistory(!showRateHistory)}
              endIcon={showRateHistory ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              disabled={updatingExchangeRates}
            >
              {showRateHistory ? 'Hide' : 'Show'} History
            </Button>
          </Stack>

          {showRateHistory && rateHistory.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{EXCHANGE_RATE_LABELS[selectedRateMarketplace]} Rate History</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Effective Date</TableCell>
                      <TableCell>Mode</TableCell>
                      <TableCell>Rate (INR)</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rateHistory.map((rate) => (
                      <TableRow key={rate._id}>
                        <TableCell>{new Date(rate.effectiveDate).toLocaleDateString()}</TableCell>
                        <TableCell>{rate.applicationMode === 'specific-date' ? 'Specific Date' : 'Effective'}</TableCell>
                        <TableCell><strong>{rate.rate}</strong></TableCell>
                        <TableCell>{new Date(rate.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{rate.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
          </>
          )}
        </Stack>
      </SectionCard>

      {/* Orders Count & Pagination */}
      {!loading && (
        <SectionCard sx={{ p: 2.5, mb: 2, background: dashboardSignatureTokens.surfaces.pageCard }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={2}>
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="baseline" flexWrap="wrap">
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  {dateFilter.mode === 'single' ? (
                    <>Filtered: {orders.length} order{orders.length !== 1 ? 's' : ''}</>
                  ) : (
                    <>Filtered: {orders.length > 0 ? `${(currentPage - 1) * ordersPerPage + 1}–${(currentPage - 1) * ordersPerPage + orders.length}` : '0'} of {totalOrders} order{totalOrders !== 1 ? 's' : ''}</>
                  )}
                </Typography>
                {rawCount !== null && (
                  <Tooltip title="Total orders in this date/seller/marketplace scope before any exclusion filters (matches Fulfillment Dashboard count)">
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        borderLeft: '1px solid #ccc',
                        pl: 1.5,
                        cursor: 'default',
                        fontStyle: 'italic'
                      }}
                    >
                      Raw total: {rawCount}
                      {rawCount !== totalOrders && (
                        <Typography component="span" sx={{ ml: 0.5, color: 'warning.main', fontWeight: 'bold', fontStyle: 'normal' }}>
                          (−{rawCount - totalOrders} excluded)
                        </Typography>
                      )}
                    </Typography>
                  </Tooltip>
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {selectedSeller && 'Seller filter active • '}
                {searchMarketplace && 'Marketplace filter active • '}
                {(dateFilter.mode !== 'none') && 'Date filter active • '}
                {(profitFilter.mode !== 'none') && 'Profit filter active • '}
                {(subtotalFilter.mode !== 'none') && 'Subtotal filter active • '}
                {excludeLowValue && 'Hiding <$3 • '}
                {excludeNoAmazonAccount && 'Hiding no Amazon account • '}
                {searchOrderId && 'Order ID search active • '}
                {searchBuyerName && 'Buyer name search active • '}
                {searchItemNumber && 'Item number search active • '}
                {searchProductName && 'Product name search active'}
              </Typography>
            </Box>
            
            {/* Category, Range, Product Counts */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Box 
                sx={{ 
                  textAlign: 'center', 
                  px: 2, 
                  borderLeft: `2px solid ${BRAND_YELLOW_DARK}`, 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: `rgba(245,200,66,0.1)`,
                    transform: 'translateY(-2px)'
                  }
                }}
                onClick={() => setNamesModal({
                  open: true,
                  type: 'categories',
                  title: 'Categories',
                  items: counts.categoryData
                })}
              >
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: BRAND_YELLOW_DARK }}>
                  {counts.uniqueCategories}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Categories
                </Typography>
              </Box>
              <Box 
                sx={{ 
                  textAlign: 'center', 
                  px: 2, 
                  borderLeft: `2px solid ${BRAND_YELLOW_DARK}`, 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: `rgba(245,200,66,0.1)`,
                    transform: 'translateY(-2px)'
                  }
                }}
                onClick={() => setNamesModal({
                  open: true,
                  type: 'ranges',
                  title: 'Ranges',
                  items: counts.rangeData
                })}
              >
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: BRAND_YELLOW_DARK }}>
                  {counts.uniqueRanges}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Ranges
                </Typography>
              </Box>
              <Box 
                sx={{ 
                  textAlign: 'center', 
                  px: 2, 
                  borderLeft: `2px solid ${BRAND_YELLOW_DARK}`, 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: `rgba(245,200,66,0.1)`,
                    transform: 'translateY(-2px)'
                  }
                }}
                onClick={() => setNamesModal({
                  open: true,
                  type: 'products',
                  title: 'Products',
                  items: counts.productData
                })}
              >
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: BRAND_YELLOW_DARK }}>
                  {counts.uniqueProducts}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Products
                </Typography>
              </Box>
            </Stack>

            {dateFilter.mode !== 'single' && orders.length > 0 && (
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(e, page) => setCurrentPage(page)}
                color="primary"
              />
            )}
          </Stack>
        </SectionCard>
      )}

      {/* Cross-page Filtered Totals — shown when a date filter is active */}
      {filteredTotals && dateFilter.mode !== 'none' && (
        <SectionCard sx={{ p: 2, mb: 2, background: dashboardSignatureTokens.surfaces.pageCard }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Totals for all {totalOrders} filtered order{totalOrders !== 1 ? 's' : ''} across {totalPages} page{totalPages !== 1 ? 's' : ''}
          </Typography>
          <Stack direction="row" flexWrap="nowrap" spacing={1.5} sx={{ overflowX: 'auto', pb: 0.5 }}>
            <StatMetricCard
              label="PROFIT (INR)"
              value={`₹${(filteredTotals.profit ?? 0).toFixed(2)}`}
              tone={filteredTotals.profit >= 0 ? 'success' : 'danger'}
              sx={{ minWidth: 130, flexShrink: 0 }}
            />
            <StatMetricCard
              label="P.Balance (INR)"
              value={`₹${(filteredTotals.pBalanceINR ?? 0).toFixed(2)}`}
              tone="info"
              sx={{ minWidth: 130, flexShrink: 0 }}
            />
            <StatMetricCard
              label="Amazon Total (INR)"
              value={`₹${(filteredTotals.amazonTotalINR ?? 0).toFixed(2)}`}
              tone="amazon"
              sx={{ minWidth: 130, flexShrink: 0 }}
            />
            <StatMetricCard
              label="Total CC (INR)"
              value={`₹${(filteredTotals.totalCC ?? 0).toFixed(2)}`}
              tone="warning"
              sx={{ minWidth: 120, flexShrink: 0 }}
            />
            <StatMetricCard
              label="Mktplace Fee (INR)"
              value={`₹${(filteredTotals.marketplaceFee ?? 0).toFixed(2)}`}
              tone="neutral"
              sx={{ minWidth: 130, flexShrink: 0 }}
            />
            <StatMetricCard
              label="IGST (INR)"
              value={`₹${(filteredTotals.igst ?? 0).toFixed(2)}`}
              tone="neutral"
              sx={{ minWidth: 110, flexShrink: 0 }}
            />
            <Box sx={{ width: '1px', bgcolor: 'divider', alignSelf: 'stretch', flexShrink: 0 }} />
            <StatMetricCard
              label="Subtotal ($)"
              value={`$${(filteredTotals.subtotal ?? 0).toFixed(2)}`}
              tone="neutral"
              sx={{ minWidth: 110, flexShrink: 0 }}
            />
            <StatMetricCard
              label="Shipping ($)"
              value={`$${(filteredTotals.shipping ?? 0).toFixed(2)}`}
              tone="shipping"
              sx={{ minWidth: 110, flexShrink: 0 }}
            />
            <StatMetricCard
              label="Sales Tax ($)"
              value={`$${(filteredTotals.salesTax ?? 0).toFixed(2)}`}
              tone="neutral"
              sx={{ minWidth: 110, flexShrink: 0 }}
            />
            <StatMetricCard
              label="Earnings ($)"
              value={`$${(filteredTotals.orderEarnings ?? 0).toFixed(2)}`}
              tone="success"
              sx={{ minWidth: 120, flexShrink: 0 }}
            />
            <StatMetricCard
              label="TDS ($)"
              value={`$${(filteredTotals.tds ?? 0).toFixed(2)}`}
              tone="neutral"
              sx={{ minWidth: 90, flexShrink: 0 }}
            />
            <StatMetricCard
              label="NET ($)"
              value={`$${(filteredTotals.net ?? 0).toFixed(2)}`}
              tone="info"
              sx={{ minWidth: 100, flexShrink: 0 }}
            />
            <StatMetricCard
              label="Amazon Total ($)"
              value={`$${(filteredTotals.amazonTotal ?? 0).toFixed(2)}`}
              tone="amazon"
              sx={{ minWidth: 120, flexShrink: 0 }}
            />
          </Stack>
        </SectionCard>
      )}

      {/* Orders Table */}
      {orders.length === 0 ? (
        <Alert severity="info">No orders found{(selectedSeller || searchMarketplace || dateFilter.mode !== 'none' || profitFilter.mode !== 'none' || subtotalFilter.mode !== 'none' || excludeLowValue || excludeNoAmazonAccount || searchOrderId || searchBuyerName) ? ' with current filters' : ''}</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ ...tableContainerSx, overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
          <Table size="small" stickyHeader sx={{
            '& thead tr:nth-of-type(1) th': { top: 0, zIndex: 5 },
            '& thead tr:nth-of-type(2) th': { top: 47, zIndex: 4 },
          }}>
            <TableHead>
              {/* First row: Section headers */}
              <TableRow>
                <TableCell rowSpan={2} sx={{ ...tableHeaderCellSx, borderRight: `2px solid ${BRAND_DARK}`, minWidth: 100 }}>Seller</TableCell>
                <TableCell rowSpan={2} sx={{ ...tableHeaderCellSx, borderRight: `2px solid ${BRAND_DARK}`, minWidth: 110 }}>Date Sold</TableCell>
                <TableCell rowSpan={2} sx={{ ...tableHeaderCellSx, borderRight: `2px solid ${BRAND_DARK}`, minWidth: 350 }}>Product Name</TableCell>
                <TableCell rowSpan={2} sx={{ ...tableHeaderCellSx, borderRight: `2px solid ${BRAND_DARK}`, minWidth: 120 }}>Marketplace</TableCell>
                <TableCell colSpan={13} align="center" sx={{ ...tableHeaderCellSx, borderBottom: `3px solid ${BRAND_YELLOW}`, borderRight: `2px solid ${BRAND_DARK}` }}>eBay Side</TableCell>
                <TableCell colSpan={5} align="center" sx={{ ...tableHeaderCellSx, borderBottom: '3px solid #10b981', borderRight: `2px solid ${BRAND_DARK}` }}>Amazon Side</TableCell>
                <TableCell colSpan={3} align="center" sx={{ ...tableHeaderCellSx, borderBottom: '3px solid #f43f5e', borderRight: `2px solid ${BRAND_DARK}` }}>Credit Card</TableCell>
                <TableCell rowSpan={2} sx={{ ...tableHeaderCellSx, borderBottom: `3px solid ${BRAND_YELLOW}`, borderRight: `2px solid ${BRAND_DARK}` }} align="right">PROFIT<br />(INR)</TableCell>
                <TableCell rowSpan={2} sx={{ ...tableHeaderCellSx, borderRight: `2px solid ${BRAND_DARK}` }}>Amazon<br />Acc</TableCell>
                <TableCell rowSpan={2} sx={{ ...tableHeaderCellSx, borderRight: `2px solid ${BRAND_DARK}` }}>Order ID</TableCell>
                <TableCell rowSpan={2} sx={{ ...tableHeaderCellSx, borderRight: `2px solid ${BRAND_DARK}` }}>Buyer<br />Name</TableCell>
                <TableCell rowSpan={2} sx={{ ...tableHeaderCellSx, borderRight: `2px solid ${BRAND_DARK}` }}>Arriving</TableCell>
                <TableCell rowSpan={2} sx={{ ...tableHeaderCellSx, borderRight: `2px solid ${BRAND_DARK}`, minWidth: 180 }}>Update Price</TableCell>
              </TableRow>
              {/* Second row: eBay Side and Amazon Side column headers */}
              <TableRow>
                <Tooltip title="Product price (excluding tax and shipping)" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">Subtotal</TableCell>
                </Tooltip>
                <Tooltip title="Shipping cost" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">Shipping</TableCell>
                </Tooltip>
                <Tooltip title="Sales tax collected" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">Sales Tax</TableCell>
                </Tooltip>
                <Tooltip title="Discount applied" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">Discount</TableCell>
                </Tooltip>
                <Tooltip title="eBay marketplace transaction fees" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">Transaction Fees</TableCell>
                </Tooltip>
                <Tooltip title="eBay advertising fees" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">Ad Fee</TableCell>
                </Tooltip>
                <Tooltip title="Earnings = Subtotal + Discount - Sales Tax - Transaction Fees - Ad Fee - Shipping" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">Earnings</TableCell>
                </Tooltip>
                <Tooltip title="Order total = pricingSummary.total.value + salesTax" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">Order total</TableCell>
                </Tooltip>
                <Tooltip title="TDS = 1% of (pricingSummary.total.value + salesTax)" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">TDS</TableCell>
                </Tooltip>
                <Tooltip title="T.ID = $0.24 (fixed transaction ID fee)" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">T.ID</TableCell>
                </Tooltip>
                <Tooltip title="NET = Earnings - TDS - T.ID" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">NET</TableCell>
                </Tooltip>
                <Tooltip title="Exchange Rate (USD to INR) based on order date" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">Exchange Rate</TableCell>
                </Tooltip>
                <Tooltip title="P.Balance = NET × Exchange Rate (in INR)" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, borderRight: `2px solid ${BRAND_DARK}`, cursor: 'help' }} align="right">P.Balance (INR)</TableCell>
                </Tooltip>
                <Tooltip title="Amazon order cost before tax" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">Before Tax</TableCell>
                </Tooltip>
                <Tooltip title="Amazon estimated tax" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">Estimated Tax</TableCell>
                </Tooltip>
                <Tooltip title="Amazon Total = Before Tax + Estimated Tax" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">Amazon_total</TableCell>
                </Tooltip>
                <Tooltip title="Amazon Exchange Rate (USD to INR)" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">Amazon Exch Rate</TableCell>
                </Tooltip>
                <Tooltip title="A_total-inr = Amazon_total × Amazon Exchange Rate" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, borderRight: `2px solid ${BRAND_DARK}`, cursor: 'help' }} align="right">A_total-inr</TableCell>
                </Tooltip>
                <Tooltip title="Marketplace Fee = 4% of A_total-inr" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">Marketplace Fee</TableCell>
                </Tooltip>
                <Tooltip title="IGST = 18% of Marketplace Fee" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, cursor: 'help' }} align="right">IGST</TableCell>
                </Tooltip>
                <Tooltip title="Total_CC = Marketplace Fee + IGST" arrow placement="top">
                  <TableCell sx={{ ...tableHeaderCellSx, borderRight: `2px solid ${BRAND_DARK}`, cursor: 'help' }} align="right">Total_CC</TableCell>
                </Tooltip>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order._id} sx={{
                  '& td': { borderBottomColor: dashboardSignatureTokens.table.rowBorder },
                  '&:nth-of-type(even) td': { backgroundColor: '#f8fafc' },
                  '&:hover td': { backgroundColor: 'rgba(37, 99, 235, 0.05) !important' },
                }}>
                  <TableCell>{order.seller?.user?.username || '-'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.4, fontSize: '0.8rem' }}>
                      {formatDate(order.dateSold, order.purchaseMarketplaceId)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 350, maxWidth: 500 }}>
                    <Stack spacing={0.5}>
                      {order.lineItems && order.lineItems.length > 0 ? (
                        order.lineItems.map((item, i) => (
                          <Box 
                            key={i}
                            sx={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 0.5,
                              borderBottom: i < order.lineItems.length - 1 ? '1px dashed rgba(0,0,0,0.1)' : 'none',
                              pb: i < order.lineItems.length - 1 ? 0.5 : 0
                            }}
                          >
                            <Chip
                              label={`x${item.quantity}`}
                              size="small"
                              sx={{
                                height: 20,
                                minWidth: 30,
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                bgcolor: item.quantity > 1 ? '#ed6c02' : '#e0e0e0',
                                color: item.quantity > 1 ? '#fff' : 'rgba(0,0,0,0.87)'
                              }}
                            />
                            <Typography 
                              variant="body2" 
                              sx={{
                                flex: 1,
                                fontSize: '0.85rem',
                                lineHeight: 1.3,
                                fontWeight: item.quantity > 1 ? 500 : 400,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                              }}
                              title={item.title}
                            >
                              {item.title}
                            </Typography>
                          </Box>
                        ))
                      ) : (
                        <Typography variant="body2">{order.productName || '-'}</Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={order.purchaseMarketplaceId?.replace('EBAY_', '') || '-'} 
                      size="small"
                      color={order.purchaseMarketplaceId === 'EBAY_US' ? 'primary' : 'default'}
                    />
                  </TableCell>
                  {/* eBay Side Columns - Show $0.00 for cancelled or partially refunded orders */}
                  {(() => {
                    const isCancelled = order.cancelState === 'CANCELED' || 
                                       order.cancelState === 'CANCELLED' || 
                                       order.cancelStatus?.cancelState === 'CANCELED' ||
                                       order.cancelStatus?.cancelState === 'CANCELLED';
                    const isPartiallyRefunded = order.orderPaymentStatus === 'PARTIALLY_REFUNDED';
                    const showZero = isCancelled || isPartiallyRefunded;
                    
                    return (
                      <>
                        <TableCell align="right">{showZero ? '$0.00' : formatCurrency(order.subtotal)}</TableCell>
                        <TableCell align="right">{showZero ? '$0.00' : formatCurrency(order.shipping)}</TableCell>
                        <TableCell align="right">{showZero ? '$0.00' : formatCurrency(order.salesTax)}</TableCell>
                        <TableCell align="right">{showZero ? '$0.00' : formatCurrency(order.discount)}</TableCell>
                        <TableCell align="right">{showZero ? '$0.00' : formatCurrency(order.transactionFees)}</TableCell>
                        <TableCell align="right">{showZero ? '$0.00' : formatCurrency(order.adFeeGeneral)}</TableCell>
                      </>
                    );
                  })()}
                  {/* Earnings (from DB), TDS, T.ID, NET, Exchange Rate, P.Balance */}
                  <TableCell align="right">
                    {formatCurrency(order.orderEarnings)}
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      const isPartiallyRefunded = order.orderPaymentStatus === 'PARTIALLY_REFUNDED';
                      const showZero = isCancelled || isPartiallyRefunded;

                      if (showZero) {
                        return '$0.00';
                      }

                      return (
                        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                          <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(getOrderTotalInputValue(order))}
                          </Typography>
                          <IconButton
                            size="small"
                            disabled={Boolean(updatingOrderTotals[order._id])}
                            onClick={() => setConfirmOrderTotal({
                              open: true,
                              order,
                              value: String(getOrderTotalInputValue(order))
                            })}
                            sx={{ p: 0.5 }}
                          >
                            {updatingOrderTotals[order._id]
                              ? <CircularProgress size={14} />
                              : <span style={{ fontSize: 14 }}>✏️</span>}
                          </IconButton>
                        </Stack>
                      );
                    })()}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(order.tds)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(order.tid)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(order.net)}
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      if (isCancelled) return '-';
                      
                      // Show manually set eBay exchange rate from DB
                      const rate = order.ebayExchangeRate || 85;
                      
                      return (
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {rate}
                        </Typography>
                      );
                    })()}
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      
                      if (isCancelled) return '₹0.00';
                      
                      // Use pBalanceINR from DB
                      const pBalance = order.pBalanceINR;
                      if (pBalance == null) return '-';
                      
                      return (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'bold', 
                            color: pBalance < 0 ? 'error.main' : 'success.main'
                          }}
                        >
                          ₹{parseFloat(pBalance).toFixed(2)}
                        </Typography>
                      );
                    })()}
                  </TableCell>
                  {/* Amazon Side Columns */}
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      return isCancelled ? '$0.00' : formatCurrency(order.beforeTax);
                    })()}
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      return isCancelled ? '$0.00' : formatCurrency(order.estimatedTax);
                    })()}
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      if (isCancelled) return '$0.00';
                      
                      // Use amazonTotal from DB
                      return formatCurrency(order.amazonTotal);
                    })()}
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      if (isCancelled) return '-';
                      
                      return (
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {order.amazonExchangeRate || 87}
                        </Typography>
                      );
                    })()}
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      if (isCancelled) return '₹0.00';
                      
                      // Use amazonTotalINR from DB
                      const aTotalInr = parseFloat(order.amazonTotalINR) || 0;
                      
                      return (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'bold', 
                            color: aTotalInr < 0 ? 'error.main' : 'primary.main'
                          }}
                        >
                          ₹{aTotalInr.toFixed(2)}
                        </Typography>
                      );
                    })()}
                  </TableCell>
                  {/* Credit Card Columns */}
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      if (isCancelled) return '₹0.00';
                      
                      // Use marketplaceFee from DB
                      const marketplaceFee = parseFloat(order.marketplaceFee) || 0;
                      return '₹' + marketplaceFee.toFixed(2);
                    })()}
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      if (isCancelled) return '₹0.00';
                      
                      // Use igst from DB
                      const igst = parseFloat(order.igst) || 0;
                      return '₹' + igst.toFixed(2);
                    })()}
                  </TableCell>
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      if (isCancelled) return '₹0.00';
                      
                      // Use totalCC from DB
                      const totalCC = parseFloat(order.totalCC) || 0;
                      return '₹' + totalCC.toFixed(2);
                    })()}
                  </TableCell>
                  {/* PROFIT Column */}
                  <TableCell align="right">
                    {(() => {
                      const isCancelled = order.cancelState === 'CANCELED' || 
                                         order.cancelState === 'CANCELLED' || 
                                         order.cancelStatus?.cancelState === 'CANCELED' ||
                                         order.cancelStatus?.cancelState === 'CANCELLED';
                      const isPartiallyRefunded = order.orderPaymentStatus === 'PARTIALLY_REFUNDED';
                      
                      // Use all values from DB
                      const pBalance = parseFloat(order.pBalanceINR) || 0;
                      const aTotalInr = parseFloat(order.amazonTotalINR) || 0;
                      const totalCC = parseFloat(order.totalCC) || 0;
                      const profit = pBalance - aTotalInr - totalCC;
                      
                      return (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'bold', 
                            fontSize: '0.95rem',
                            color: profit < 0 ? 'error.main' : 'success.main'
                          }}
                        >
                          ₹{profit.toFixed(2)}
                        </Typography>
                      );
                    })()}
                  </TableCell>
                  {/* Moved columns to end */}
                  <TableCell>{order.amazonAccount || '-'}</TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {order.orderId}
                      </Typography>
                      {(order.priceUpdatedViaSheet || updatedOrderIds.has(order.orderId)) && (
                        <Tooltip 
                          title={
                            order.lastPriceUpdateDate 
                              ? `Price updated on ${new Date(order.lastPriceUpdateDate).toLocaleDateString()}` 
                              : "Price updated via All Orders Sheet"
                          } 
                          arrow 
                          placement="top"
                        >
                          <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>{order.buyer?.buyerRegistrationAddress?.fullName || '-'}</TableCell>
                  <TableCell>{order.arrivingDate || '-'}</TableCell>
                  {/* Update Price Column */}
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => openPriceUpdateModal(order)}
                      sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                    >
                      Change Price
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Totals Row */}
              {orders.length > 0 && (() => {
                const totals = orders.reduce((acc, order) => {
                  const isCancelled = order.cancelState === 'CANCELED' || 
                                     order.cancelState === 'CANCELLED' || 
                                     order.cancelStatus?.cancelState === 'CANCELED' ||
                                     order.cancelStatus?.cancelState === 'CANCELLED';
                  const isPartiallyRefunded = order.orderPaymentStatus === 'PARTIALLY_REFUNDED';
                  const showZero = isCancelled || isPartiallyRefunded;
                  
                  if (!showZero) {
                    acc.subtotal += parseFloat(order.subtotal) || 0;
                    acc.shipping += parseFloat(order.shipping) || 0;
                    acc.salesTax += parseFloat(order.salesTax) || 0;
                    acc.discount += parseFloat(order.discount) || 0;
                    acc.transactionFees += parseFloat(order.transactionFees) || 0;
                    acc.adFeeGeneral += parseFloat(order.adFeeGeneral) || 0;
                    acc.orderTotal += order.orderTotal ?? ((parseFloat(order.pricingSummary?.total?.value) || 0) + (parseFloat(order.salesTax) || 0));
                  }
                  
                  acc.orderEarnings += parseFloat(order.orderEarnings) || 0;
                  acc.tds += parseFloat(order.tds) || 0;
                  acc.tid += parseFloat(order.tid) || 0;
                  acc.net += parseFloat(order.net) || 0;
                  acc.pBalanceINR += parseFloat(order.pBalanceINR) || 0;
                  
                  if (!isCancelled) {
                    acc.beforeTax += parseFloat(order.beforeTax) || 0;
                    acc.estimatedTax += parseFloat(order.estimatedTax) || 0;
                    acc.amazonTotal += parseFloat(order.amazonTotal) || 0;
                    acc.amazonTotalINR += parseFloat(order.amazonTotalINR) || 0;
                    acc.marketplaceFee += parseFloat(order.marketplaceFee) || 0;
                    acc.igst += parseFloat(order.igst) || 0;
                    acc.totalCC += parseFloat(order.totalCC) || 0;
                    
                    const pBalance = parseFloat(order.pBalanceINR) || 0;
                    const aTotalInr = parseFloat(order.amazonTotalINR) || 0;
                    const totalCC = parseFloat(order.totalCC) || 0;
                    acc.profit += pBalance - aTotalInr - totalCC;
                  }
                  
                  return acc;
                }, {
                  subtotal: 0, shipping: 0, salesTax: 0, discount: 0, transactionFees: 0,
                  adFeeGeneral: 0, orderEarnings: 0, orderTotal: 0, tds: 0, tid: 0, net: 0,
                  pBalanceINR: 0, beforeTax: 0, estimatedTax: 0, amazonTotal: 0,
                  amazonTotalINR: 0, marketplaceFee: 0, igst: 0, totalCC: 0, profit: 0
                });
                
                return (
                  <TableRow sx={{ bgcolor: '#f5f5f5', '& td': { fontWeight: 'bold', borderTop: '2px solid #000' } }}>
                    <TableCell sx={{ bgcolor: '#f5f5f5' }}>TOTALS</TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5' }}></TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5', minWidth: 350 }}></TableCell>
                    <TableCell sx={{ bgcolor: '#f5f5f5' }}></TableCell>
                    <TableCell align="right">${totals.subtotal.toFixed(2)}</TableCell>
                    <TableCell align="right">${totals.shipping.toFixed(2)}</TableCell>
                    <TableCell align="right">${totals.salesTax.toFixed(2)}</TableCell>
                    <TableCell align="right">${totals.discount.toFixed(2)}</TableCell>
                    <TableCell align="right">${totals.transactionFees.toFixed(2)}</TableCell>
                    <TableCell align="right">${totals.adFeeGeneral.toFixed(2)}</TableCell>
                    <TableCell align="right">${totals.orderEarnings.toFixed(2)}</TableCell>
                    <TableCell align="right">${totals.orderTotal.toFixed(2)}</TableCell>
                    <TableCell align="right">${totals.tds.toFixed(2)}</TableCell>
                    <TableCell align="right">${totals.tid.toFixed(2)}</TableCell>
                    <TableCell align="right">${totals.net.toFixed(2)}</TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right">₹{totals.pBalanceINR.toFixed(2)}</TableCell>
                    <TableCell align="right">${totals.beforeTax.toFixed(2)}</TableCell>
                    <TableCell align="right">${totals.estimatedTax.toFixed(2)}</TableCell>
                    <TableCell align="right">${totals.amazonTotal.toFixed(2)}</TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right">₹{totals.amazonTotalINR.toFixed(2)}</TableCell>
                    <TableCell align="right">₹{totals.marketplaceFee.toFixed(2)}</TableCell>
                    <TableCell align="right">₹{totals.igst.toFixed(2)}</TableCell>
                    <TableCell align="right">₹{totals.totalCC.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ color: totals.profit < 0 ? 'error.main' : 'success.main' }}>
                      ₹{totals.profit.toFixed(2)}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                );
              })()}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Category/Range/Product Names Modal */}
      <Dialog 
        open={namesModal.open} 
        onClose={() => setNamesModal({ ...namesModal, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {namesModal.title} ({namesModal.items.length})
        </DialogTitle>
        <DialogContent>
          {namesModal.items.length > 0 ? (
            <List>
              {namesModal.items.map((item, index) => (
                <ListItem 
                  key={index} 
                  divider={index < namesModal.items.length - 1}
                  secondaryAction={
                    <Chip 
                      label={`${item.count} order${item.count !== 1 ? 's' : ''}`}
                      size="small"
                      color={namesModal.type === 'categories' ? 'primary' : 
                             namesModal.type === 'ranges' ? 'success' : 
                             'warning'}
                    />
                  }
                >
                  <ListItemText 
                    primary={item.name}
                    primaryTypographyProps={{
                      sx: { 
                        fontWeight: 500,
                        color: namesModal.type === 'categories' ? 'primary.main' : 
                               namesModal.type === 'ranges' ? 'success.main' : 
                               'warning.main'
                      }
                    }}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No {namesModal.title.toLowerCase()} found
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNamesModal({ ...namesModal, open: false })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bottom Pagination - Hide for single date mode */}
      {!loading && orders.length > 0 && dateFilter.mode !== 'single' && (
        <Box display="flex" justifyContent="center" sx={{ mt: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(e, page) => setCurrentPage(page)}
            color="primary"
          />
        </Box>
      )}

      {/* Order Total Confirmation Dialog */}
      <Dialog
        open={confirmOrderTotal.open}
        onClose={() => setConfirmOrderTotal({ open: false, order: null, value: '' })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold' }}>Edit Order Total</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Current value: <strong>{formatCurrency(confirmOrderTotal.order ? (confirmOrderTotal.order.orderTotal ?? ((parseFloat(confirmOrderTotal.order.pricingSummary?.total?.value) || 0) + (parseFloat(confirmOrderTotal.order.salesTax) || 0))) : '')}</strong>
            </Typography>
            <TextField
              label="New Order Total (USD)"
              type="number"
              size="small"
              fullWidth
              autoFocus
              value={confirmOrderTotal.value}
              onChange={(e) => setConfirmOrderTotal(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (confirmOrderTotal.order) {
                    handleSaveOrderTotal(confirmOrderTotal.order, confirmOrderTotal.value);
                    setConfirmOrderTotal({ open: false, order: null, value: '' });
                  }
                }
              }}
              inputProps={{ min: 0, step: '0.01' }}
            />
            <Typography variant="caption" color="text.secondary">
              Order ID: {confirmOrderTotal.order?.orderId}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOrderTotal({ open: false, order: null, value: '' })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (confirmOrderTotal.order) {
                handleSaveOrderTotal(confirmOrderTotal.order, confirmOrderTotal.value);
                setConfirmOrderTotal({ open: false, order: null, value: '' });
              }
            }}
            disabled={!confirmOrderTotal.value || isNaN(parseFloat(confirmOrderTotal.value))}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Price Update Modal */}
      <Dialog 
        open={priceUpdateModal.open} 
        onClose={() => setPriceUpdateModal({ open: false, order: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#fff3e0', borderBottom: '2px solid #ffb74d' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Update Listing Price
          </Typography>
          {priceUpdateModal.order && (
            <Typography variant="caption" color="text.secondary">
              Order ID: {priceUpdateModal.order.orderId}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {priceUpdateModal.order && (() => {
            const order = priceUpdateModal.order;
            const amazonTotalINR = parseFloat(order.amazonTotalINR) || 0;
            const totalCC = parseFloat(order.totalCC) || 0;
            const profit = parseFloat(order.profit) || 0;
            
            return (
              <Stack spacing={3}>
                {/* Order Summary */}
                <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, color: 'primary.main' }}>
                    Order Summary
                  </Typography>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">Subtotal (eBay):</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        ${parseFloat(order.subtotal).toFixed(2)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">Earnings (eBay):</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        ${parseFloat(order.orderEarnings).toFixed(2)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">Amazon Total (INR):</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        ₹{amazonTotalINR.toFixed(2)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">Total CC:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        ₹{totalCC.toFixed(2)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" sx={{ pt: 1, borderTop: '1px solid #ddd' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Current PROFIT:</Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 'bold',
                          fontSize: '1.1rem',
                          color: profit < 0 ? 'error.main' : 'success.main'
                        }}
                      >
                        ₹{profit.toFixed(2)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>

                {/* Try Pricing Calculator */}
                <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, color: 'success.main' }}>
                    Try Pricing Calculator
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      label="Try New Price (USD)"
                      type="number"
                      value={tryPricing}
                      onChange={(e) => setTryPricing(e.target.value)}
                      placeholder="Enter price to see expected profit"
                      fullWidth
                      inputProps={{ step: '0.01', min: '0' }}
                    />
                    {tryPricing && (() => {
                      const result = calculateExpectedProfit(tryPricing, order);
                      if (!result) return null;
                      
                      const { profit: expectedProfit, breakdown } = result;
                      
                      // Check if there's a difference from current profit (for debugging rounding)
                      const currentProfit = parseFloat(order.profit) || 0;
                      const profitDifference = Math.abs(expectedProfit - currentProfit);
                      const isSameAsSubtotal = Math.abs(parseFloat(tryPricing) - parseFloat(order.subtotal)) < 0.01;
                      
                      return (
                        <Stack spacing={2}>
                          {/* Show rounding notice if try pricing = subtotal but profit differs */}
                          {isSameAsSubtotal && profitDifference > 0.1 && (
                            <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>
                              <Typography variant="caption">
                                Note: Expected profit differs from current by ₹{profitDifference.toFixed(2)} due to rounding differences in calculation methods.
                              </Typography>
                            </Alert>
                          )}
                          
                          {/* Expected Profit Summary */}
                          <Alert severity="info" sx={{ bgcolor: 'white' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                Expected Profit:
                              </Typography>
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  color: expectedProfit < 0 ? 'error.main' : 'success.main'
                                }}
                              >
                                ₹{expectedProfit.toFixed(2)}
                              </Typography>
                            </Stack>
                          </Alert>
                          
                          {/* Breakdown Details */}
                          <Paper sx={{ p: 2, bgcolor: '#f9f9f9', border: '1px solid #ddd' }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 1, display: 'block', color: 'text.secondary' }}>
                              Calculation Breakdown {breakdown.ratio !== '0.0' && `(${breakdown.ratio > 0 ? '+' : ''}${breakdown.ratio}% from original)`}
                            </Typography>
                            <Stack spacing={0.5} sx={{ fontSize: '0.8rem' }}>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="caption">Try Price:</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                  ${breakdown.tryPrice.toFixed(2)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="caption">Discount (adjusted):</Typography>
                                <Typography variant="caption" sx={{ color: 'error.main' }}>
                                  ${breakdown.discount.toFixed(2)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="caption">Transaction Fees (adjusted):</Typography>
                                <Typography variant="caption" sx={{ color: 'error.main' }}>
                                  -${breakdown.transactionFees.toFixed(2)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="caption">Ad Fee (adjusted):</Typography>
                                <Typography variant="caption" sx={{ color: 'error.main' }}>
                                  -${breakdown.adFeeGeneral.toFixed(2)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between" sx={{ pt: 0.5, borderTop: '1px dashed #ccc' }}>
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>eBay Earnings:</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                  ${breakdown.ebayEarnings.toFixed(2)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="caption">Order total (adjusted):</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                  ${breakdown.orderTotal.toFixed(2)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="caption">TDS (1% of pricingSummary.total.value + salesTax):</Typography>
                                <Typography variant="caption" sx={{ color: 'error.main' }}>
                                  -${breakdown.tds.toFixed(2)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="caption">T.ID:</Typography>
                                <Typography variant="caption" sx={{ color: 'error.main' }}>
                                  -${breakdown.tid.toFixed(2)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between" sx={{ pt: 0.5, borderTop: '1px dashed #ccc' }}>
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>NET (USD):</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                  ${breakdown.net.toFixed(2)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="caption">Exchange Rate:</Typography>
                                <Typography variant="caption">
                                  {order.ebayExchangeRate || 85}
                                </Typography>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between" sx={{ pt: 0.5, borderTop: '1px dashed #ccc' }}>
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>P.Balance (INR):</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                  ₹{breakdown.pBalanceINR.toFixed(2)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="caption">Amazon Total (INR):</Typography>
                                <Typography variant="caption" sx={{ color: 'error.main' }}>
                                  -₹{breakdown.amazonTotalINR.toFixed(2)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="caption">Total CC:</Typography>
                                <Typography variant="caption" sx={{ color: 'error.main' }}>
                                  -₹{breakdown.totalCC.toFixed(2)}
                                </Typography>
                              </Stack>
                              <Stack 
                                direction="row" 
                                justifyContent="space-between" 
                                sx={{ 
                                  pt: 1, 
                                  mt: 0.5,
                                  borderTop: '2px solid #333',
                                  bgcolor: expectedProfit < 0 ? '#ffebee' : '#e8f5e9',
                                  p: 1,
                                  borderRadius: 1
                                }}
                              >
                                <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                  EXPECTED PROFIT:
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    fontWeight: 'bold',
                                    fontSize: '0.9rem',
                                    color: expectedProfit < 0 ? 'error.main' : 'success.main'
                                  }}
                                >
                                  ₹{expectedProfit.toFixed(2)}
                                </Typography>
                              </Stack>
                            </Stack>
                          </Paper>
                        </Stack>
                      );
                    })()}
                  </Stack>
                </Paper>

                {/* Line Items with Individual Price Update */}
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, color: 'primary.main' }}>
                    Line Items & Price Update
                  </Typography>
                  <Stack spacing={2}>
                    {order.lineItems?.map((item, index) => (
                      <Box 
                        key={index}
                        sx={{ 
                          p: 2, 
                          border: '1px solid #ddd', 
                          borderRadius: 1,
                          bgcolor: '#fafafa'
                        }}
                      >
                        <Stack spacing={1.5}>
                          {/* Product Title */}
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {item.title}
                          </Typography>
                          
                          {/* Legacy Item ID with eBay Link */}
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              Item ID:
                            </Typography>
                            <Chip
                              label={item.legacyItemId}
                              size="small"
                              onClick={() => window.open(`https://www.ebay.com/itm/${item.legacyItemId}`, '_blank')}
                              sx={{ 
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'primary.light', color: 'white' }
                              }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              (Click to view on eBay)
                            </Typography>
                          </Stack>

                          {/* Current Price */}
                          <Typography variant="caption" color="text.secondary">
                            Current Price: ${parseFloat(item.lineItemCost?.value || 0).toFixed(2)}
                          </Typography>

                          {/* Price Update Input */}
                          <Stack direction="row" spacing={1} alignItems="center">
                            <TextField
                              size="small"
                              type="number"
                              label="Change Listing Price in eBay"
                              value={itemPriceUpdates[item.legacyItemId] || ''}
                              onChange={(e) => setItemPriceUpdates(prev => ({ 
                                ...prev, 
                                [item.legacyItemId]: e.target.value 
                              }))}
                              inputProps={{ step: '0.01', min: '0' }}
                              sx={{ flex: 1 }}
                              placeholder="Enter new price"
                              disabled={updatingItemPrices[item.legacyItemId]}
                            />
                            <Button
                              variant="contained"
                              onClick={() => handleUpdateItemPrice(item.legacyItemId, order)}
                              disabled={!itemPriceUpdates[item.legacyItemId] || updatingItemPrices[item.legacyItemId]}
                              sx={{ minWidth: 100 }}
                            >
                              {updatingItemPrices[item.legacyItemId] ? (
                                <CircularProgress size={20} color="inherit" />
                              ) : (
                                'Update'
                              )}
                            </Button>
                          </Stack>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              </Stack>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPriceUpdateModal({ open: false, order: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </AdminPageShell>
    </Fade>
  );
}
