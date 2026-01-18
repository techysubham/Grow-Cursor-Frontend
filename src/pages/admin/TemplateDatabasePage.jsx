import { useState, useEffect } from 'react';
import { 
  Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Typography, Chip, Stack, IconButton, Link as MuiLink, FormControl,
  InputLabel, Select, MenuItem, TextField, Collapse, Pagination, Alert,
  useMediaQuery, useTheme
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../../lib/api';

export default function TemplateDatabasePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Filter state
  const [selectedSeller, setSelectedSeller] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data state
  const [listings, setListings] = useState([]);
  const [groupedListings, setGroupedListings] = useState({});
  const [sellers, setSellers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState({});
  
  // UI state
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedSellers, setExpandedSellers] = useState(new Set());

  useEffect(() => {
    fetchSellers();
    fetchTemplates();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchListings();
  }, [selectedSeller, selectedTemplate, statusFilter, searchQuery, pagination.page]);

  useEffect(() => {
    // Group listings by seller
    const grouped = {};
    listings.forEach(listing => {
      const sellerName = listing.sellerId?.user?.username || listing.sellerId?.user?.email || 'Unassigned';
      if (!grouped[sellerName]) {
        grouped[sellerName] = [];
      }
      grouped[sellerName].push(listing);
    });
    setGroupedListings(grouped);
    
    // Auto-expand all sellers initially
    setExpandedSellers(new Set(Object.keys(grouped)));
  }, [listings]);

  const fetchSellers = async () => {
    try {
      const { data } = await api.get('/sellers/all');
      setSellers(data || []);
    } catch (err) {
      console.error('Error fetching sellers:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data } = await api.get('/listing-templates');
      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/template-listings/database-stats');
      setStats(data || {});
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      
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

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const toggleSeller = (sellerName) => {
    setExpandedSellers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sellerName)) {
        newSet.delete(sellerName);
      } else {
        newSet.add(sellerName);
      }
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

  // Filter templates based on selected seller
  const filteredTemplates = selectedSeller
    ? templates.filter(t => 
        listings.some(l => l.templateId?._id === t._id && l.sellerId?._id === selectedSeller)
      )
    : templates;

  return (
    <Box>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', lg: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Typography variant="h6">Template Listings Database</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label={`Total: ${stats.total || 0}`} color="primary" variant="outlined" />
          <Chip label={`Sellers: ${stats.sellers || 0}`} variant="outlined" />
          <Chip label={`Templates: ${stats.templates || 0}`} variant="outlined" />
          {stats.draft > 0 && <Chip label={`Draft: ${stats.draft}`} size="small" />}
          {stats.active > 0 && <Chip label={`Active: ${stats.active}`} size="small" color="success" />}
        </Stack>
      </Stack>

      {/* Filter Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          {/* Filter Controls */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Seller</InputLabel>
              <Select
                value={selectedSeller}
                onChange={(e) => {
                  setSelectedSeller(e.target.value);
                  setSelectedTemplate(''); // Reset template when seller changes
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                label="Seller"
              >
                <MenuItem value="">All Sellers</MenuItem>
                {sellers.map(seller => (
                  <MenuItem key={seller._id} value={seller._id}>
                    {seller.user?.username || seller.user?.email || 'Unknown'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Template</InputLabel>
              <Select
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                label="Template"
              >
                <MenuItem value="">All Templates</MenuItem>
                {filteredTemplates.map(template => (
                  <MenuItem key={template._id} value={template._id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                label="Status"
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* Search Bar */}
          <TextField
            fullWidth
            placeholder="Search by ASIN, SKU, or Title..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />

          {/* Active Filters */}
          {hasActiveFilters && (
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              <Typography variant="body2" color="text.secondary">Active filters:</Typography>
              {selectedSeller && (
                <Chip
                  label={`Seller: ${sellers.find(s => s._id === selectedSeller)?.user?.username || 'Unknown'}`}
                  onDelete={() => setSelectedSeller('')}
                  size="small"
                  color="primary"
                />
              )}
              {selectedTemplate && (
                <Chip
                  label={`Template: ${templates.find(t => t._id === selectedTemplate)?.name || 'Unknown'}`}
                  onDelete={() => setSelectedTemplate('')}
                  size="small"
                  color="primary"
                />
              )}
              {statusFilter && (
                <Chip
                  label={`Status: ${statusFilter}`}
                  onDelete={() => setStatusFilter('')}
                  size="small"
                  color="primary"
                />
              )}
              {searchQuery && (
                <Chip
                  label={`Search: "${searchQuery}"`}
                  onDelete={() => setSearchQuery('')}
                  size="small"
                  color="primary"
                />
              )}
              <Button size="small" onClick={clearAllFilters}>
                Clear All
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Loading listings...</Typography>
        </Paper>
      ) : Object.keys(groupedListings).length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters 
              ? 'No listings found matching your filters.' 
              : 'No listings found. Add listings from the Add Template Listings page.'}
          </Typography>
          {hasActiveFilters && (
            <Button onClick={clearAllFilters} sx={{ mt: 2 }}>
              Clear Filters
            </Button>
          )}
        </Paper>
      ) : (
        <Stack spacing={3}>
          {Object.entries(groupedListings).map(([sellerName, sellerListings]) => {
            const isExpanded = expandedSellers.has(sellerName);
            
            return (
              <Box key={sellerName}>
                {/* Seller Header */}
                <Paper 
                  sx={{ 
                    p: 2, 
                    mb: 1, 
                    bgcolor: 'primary.main', 
                    color: 'white',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'primary.dark' }
                  }}
                  onClick={() => toggleSeller(sellerName)}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={1}
                  >
                    <Typography variant="h6" fontWeight="bold">
                      {sellerName}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={`${sellerListings.length} listing${sellerListings.length !== 1 ? 's' : ''}`}
                        size="small"
                        sx={{ bgcolor: 'white', color: 'primary.main' }}
                      />
                      <IconButton size="small" sx={{ color: 'white' }}>
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>

                {/* Listings Content */}
                <Collapse in={isExpanded}>
                  {/* MOBILE: Card view */}
                  <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' }, mb: 2 }}>
                    {sellerListings.map((listing, index) => (
                      <Paper key={listing._id} sx={{ p: 2, border: 1, borderColor: 'divider' }}>
                        <Stack spacing={1.5}>
                          {/* Row number */}
                          <Typography variant="caption" color="text.secondary" fontWeight="medium">
                            #{index + 1}
                          </Typography>

                          {/* ASIN */}
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50 }}>
                              ASIN:
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 'bold', color: 'primary.main' }}
                            >
                              {listing._asinReference || 'N/A'}
                            </Typography>
                            {listing._asinReference && (
                              <IconButton size="small" onClick={() => handleCopy(listing._asinReference)} title="Copy ASIN">
                                <ContentCopyIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            )}
                          </Stack>

                          {/* SKU */}
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50 }}>
                              SKU:
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: '0.85rem',
                                bgcolor: 'grey.100',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                fontWeight: 'medium'
                              }}
                            >
                              {listing.customLabel}
                            </Typography>
                            <IconButton size="small" onClick={() => handleCopy(listing.customLabel)} title="Copy SKU">
                              <ContentCopyIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Stack>

                          {/* Amazon Link */}
                          {listing.amazonLink && (
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50 }}>
                                Link:
                              </Typography>
                              <MuiLink
                                href={listing.amazonLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                underline="hover"
                                sx={{
                                  fontSize: '0.8rem',
                                  fontFamily: 'monospace',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 0.5,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '100%'
                                }}
                              >
                                {listing.amazonLink}
                                <OpenInNewIcon sx={{ fontSize: 14, flexShrink: 0 }} />
                              </MuiLink>
                              <IconButton size="small" onClick={() => handleCopy(listing.amazonLink)} title="Copy Link">
                                <ContentCopyIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Stack>
                          )}

                          {/* Title */}
                          <Typography
                            variant="body2"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              lineHeight: 1.3,
                              fontSize: '0.85rem'
                            }}
                          >
                            {listing.title}
                          </Typography>

                          {/* Template & Status */}
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip
                              label={listing.templateId?.name || 'N/A'}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                            <Chip
                              label={listing.status || 'draft'}
                              size="small"
                              color={listing.status === 'active' ? 'success' : 'default'}
                              sx={{ fontSize: '0.75rem' }}
                            />
                          </Stack>

                          {/* Price & Quantity */}
                          <Stack direction="row" spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                              Price: <strong>${listing.startPrice?.toFixed(2) || '0.00'}</strong>
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Qty: <strong>{listing.quantity || 0}</strong>
                            </Typography>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>

                  {/* DESKTOP: Table view */}
                  <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
                    <Table size="small" sx={{ '& .MuiTableCell-root': { py: 1.5 } }}>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                          <TableCell sx={{ fontWeight: 'bold', width: 50 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', width: 120 }}>ASIN</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', width: 140 }}>SKU</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: 300 }}>Link</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>Title</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', width: 120 }}>Template</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', width: 100 }}>Price</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', width: 80 }}>Qty</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', width: 100 }}>Status</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', width: 100 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sellerListings.map((listing, index) => (
                          <TableRow key={listing._id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" fontWeight="medium">
                                {index + 1}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.85rem',
                                  fontWeight: 'bold',
                                  color: 'primary.main'
                                }}
                              >
                                {listing._asinReference || 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                    bgcolor: 'grey.100',
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    fontWeight: 'medium'
                                  }}
                                >
                                  {listing.customLabel}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => handleCopy(listing.customLabel)}
                                  title="Copy SKU"
                                >
                                  <ContentCopyIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              {listing.amazonLink ? (
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <MuiLink
                                    href={listing.amazonLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    underline="hover"
                                    sx={{
                                      fontSize: '0.8rem',
                                      fontFamily: 'monospace',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 0.5
                                    }}
                                  >
                                    {listing.amazonLink}
                                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                                  </MuiLink>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCopy(listing.amazonLink)}
                                    title="Copy Link"
                                  >
                                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Stack>
                              ) : (
                                <Typography variant="body2" color="text.secondary">-</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="body2"
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  lineHeight: 1.3,
                                  fontSize: '0.85rem'
                                }}
                              >
                                {listing.title}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={listing.templateId?.name || 'N/A'}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.75rem' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                ${listing.startPrice?.toFixed(2) || '0.00'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {listing.quantity || 0}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={listing.status || 'draft'}
                                size="small"
                                color={listing.status === 'active' ? 'success' : 'default'}
                                sx={{ fontSize: '0.75rem' }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                {listing._asinReference && (
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCopy(listing._asinReference)}
                                    title="Copy ASIN"
                                    color="primary"
                                  >
                                    <ContentCopyIcon sx={{ fontSize: 16 }} />
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
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={pagination.pages}
            page={pagination.page}
            onChange={(e, page) => setPagination(prev => ({ ...prev, page }))}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
}
