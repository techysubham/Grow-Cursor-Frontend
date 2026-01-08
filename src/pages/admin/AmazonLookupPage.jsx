import { useState, useEffect } from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import api from '../../lib/api';

// Helper function to construct static file URLs
const getStaticUrl = (path) => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  // Remove /api suffix if present, since static files aren't served under /api
  const cleanBaseUrl = baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;
  return `${cleanBaseUrl}${path}`;
};

export default function AmazonLookupPage() {
  const [asins, setAsins] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportingCSV, setExportingCSV] = useState(false);
  
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [umbrellas, setUmbrellas] = useState([]);
  const [selectedUmbrella, setSelectedUmbrella] = useState('');
  const [savedProducts, setSavedProducts] = useState([]);
  const [customColumnNames, setCustomColumnNames] = useState([]);

  useEffect(() => {
    fetchSellers();
    fetchUmbrellas();
    fetchSavedProducts();
  }, []);

  useEffect(() => {
    // Extract unique custom column names from all products
    const columnNamesSet = new Set();
    savedProducts.forEach(product => {
      if (product.customFields) {
        Object.keys(product.customFields).forEach(key => columnNamesSet.add(key));
      }
    });
    setCustomColumnNames(Array.from(columnNamesSet));
  }, [savedProducts]);

  const fetchSellers = async () => {
    try {
      const { data } = await api.get('/sellers/all');
      setSellers(data || []);
    } catch (err) {
      console.error('Error fetching sellers:', err);
    }
  };

  const fetchUmbrellas = async () => {
    try {
      const { data } = await api.get('/product-umbrellas');
      setUmbrellas(data || []);
    } catch (err) {
      console.error('Error fetching umbrellas:', err);
    }
  };

  const fetchSavedProducts = async () => {
    try {
      const { data } = await api.get('/amazon-lookup');
      setSavedProducts(data || []);
    } catch (err) {
      console.error('Error fetching saved products:', err);
    }
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!asins.trim() || !selectedSeller || !selectedUmbrella) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Split ASINs by space and filter empty strings
      const asinList = asins.trim().split(/\s+/).filter(Boolean);
      
      // Process each ASIN
      for (const asin of asinList) {
        await api.post('/amazon-lookup', {
          asin: asin.trim(),
          sellerId: selectedSeller,
          productUmbrellaId: selectedUmbrella
        });
      }
      
      setAsins('');
      fetchSavedProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch product data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId, asin) => {
    if (!confirm(`Are you sure you want to delete product ${asin}?`)) return;

    try {
      await api.delete(`/amazon-lookup/${productId}`);
      fetchSavedProducts();
    } catch (err) {
      alert('Failed to delete product');
    }
  };

  const exportToCSV = () => {
    if (savedProducts.length === 0) {
      alert('No products to export');
      return;
    }

    setExportingCSV(true);

    try {
      // Define CSV headers
      const headers = [
        'ASIN',
        'Title',
        'Price',
        'Brand',
        'Seller',
        'Umbrella',
        ...customColumnNames, // Dynamic custom columns
        'Description',
        'Images',
        'eBay Image',
        'Added Date'
      ];

      // Generate CSV rows
      const rows = savedProducts.map(product => {
        const customFieldValues = customColumnNames.map(columnName => 
          product.customFields?.[columnName] || ''
        );

        return [
          product.asin || '',
          (product.title || '').replace(/"/g, '""'), // Escape quotes
          product.price || '',
          product.brand || '',
          getSellerName(product.sellerId),
          product.productUmbrellaId?.name || '',
          ...customFieldValues,
          (product.description || '').replace(/"/g, '""').substring(0, 500), // Limit description
          (product.images || []).join(' | '),
          product.ebayImage || '',
          product.createdAt ? new Date(product.createdAt).toLocaleDateString() : ''
        ];
      });

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      const fileName = `amazon_products_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    } finally {
      setExportingCSV(false);
    }
  };

  // Get seller username for display
  const getSellerName = (sellerId) => {
    if (!sellerId) return 'N/A';
    const seller = sellers.find(s => s._id === sellerId);
    return seller?.user?.username || seller?.user?.email || 'N/A';
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Amazon Product Lookup</Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2} component="form" onSubmit={handleLookup}>
          <Stack direction="row" spacing={2}>
            <FormControl sx={{ flex: 1 }} required>
              <InputLabel>Select Seller</InputLabel>
              <Select 
                label="Select Seller" 
                value={selectedSeller} 
                onChange={(e) => setSelectedSeller(e.target.value)}
              >
                {sellers.map((seller) => (
                  <MenuItem key={seller._id} value={seller._id}>
                    {seller.user?.username || seller.user?.email || seller._id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl sx={{ flex: 1 }} required>
              <InputLabel>Product Umbrella</InputLabel>
              <Select 
                label="Product Umbrella" 
                value={selectedUmbrella} 
                onChange={(e) => setSelectedUmbrella(e.target.value)}
              >
                {umbrellas.map((umbrella) => (
                  <MenuItem key={umbrella._id} value={umbrella._id}>
                    {umbrella.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField 
              label="ASIN(s) - Separate multiple with spaces" 
              value={asins} 
              onChange={(e) => setAsins(e.target.value)} 
              placeholder="e.g., B08N5WRWNW B0CGV192GK"
              required 
              sx={{ flex: 1 }}
            />
            <Button 
              type="submit" 
              variant="contained" 
              disabled={loading || !selectedSeller || !selectedUmbrella}
              sx={{ minWidth: 120 }}
            >
              {loading ? 'Processing...' : 'Add Products'}
            </Button>
          </Stack>

          {error && (
            <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
              {error}
            </Paper>
          )}
        </Stack>
      </Paper>

      {/* Saved Products Table */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Saved Products ({savedProducts.length})</Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={exportToCSV}
          disabled={exportingCSV || savedProducts.length === 0}
        >
          {exportingCSV ? 'Exporting...' : 'Download CSV'}
        </Button>
      </Stack>
      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table size="small" sx={{ '& .MuiTableCell-root': { py: 1.5 } }} stickyHeader>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.100' }}>
              <TableCell sx={{ fontWeight: 'bold', width: 100, bgcolor: 'grey.100' }}>ASIN</TableCell>
              <TableCell sx={{ fontWeight: 'bold', minWidth: 250, bgcolor: 'grey.100' }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 80, bgcolor: 'grey.100' }}>Price</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 120, bgcolor: 'grey.100' }}>Brand</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 120, bgcolor: 'grey.100' }}>Seller</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 120, bgcolor: 'grey.100' }}>Umbrella</TableCell>
              
              {/* Dynamic custom columns */}
              {customColumnNames.map((columnName) => (
                <TableCell key={columnName} sx={{ fontWeight: 'bold', minWidth: 200, bgcolor: 'grey.100' }}>
                  {columnName}
                </TableCell>
              ))}
              
              <TableCell sx={{ fontWeight: 'bold', minWidth: 200, bgcolor: 'grey.100' }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 100, bgcolor: 'grey.100' }}>Images</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 100, bgcolor: 'grey.100' }}>eBay Image</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 100, bgcolor: 'grey.100' }}>Added</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: 80, bgcolor: 'grey.100' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {savedProducts.map((product) => (
              <TableRow key={product._id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {product.asin}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.3
                  }}>
                    {product.title}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium" color="success.main">
                    {product.price}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{product.brand}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {product.sellerId?.user?.username || product.sellerId?.user?.email || getSellerName(product.sellerId?._id) || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{product.productUmbrellaId?.name || 'N/A'}</Typography>
                </TableCell>
                
                {/* Dynamic custom field columns */}
                {customColumnNames.map((columnName) => (
                  <TableCell key={columnName}>
                    <Typography 
                      variant="body2" 
                      title={product.customFields?.[columnName] || '-'}
                      sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        fontSize: '0.85rem',
                        color: product.customFields?.[columnName] ? 'primary.main' : 'text.secondary',
                        cursor: 'help',
                        lineHeight: 1.3,
                        fontWeight: product.customFields?.[columnName] ? 'medium' : 'normal'
                      }}
                    >
                      {product.customFields?.[columnName] || '-'}
                    </Typography>
                  </TableCell>
                ))}
                
                <TableCell>
                  <Typography 
                    variant="body2" 
                    title={product.description}
                    sx={{ 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      cursor: 'help',
                      lineHeight: 1.3
                    }}
                  >
                    {product.description || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {product.images?.[0] && (
                      <Box
                        component="img"
                        src={product.images[0]}
                        alt="Product"
                        sx={{
                          width: 40,
                          height: 40,
                          objectFit: 'cover',
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'grey.300'
                        }}
                      />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {product.images?.length || 0}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  {product.ebayImage ? (
                    <Box
                      component="img"
                      src={product.ebayImage}
                      alt="eBay Product with Overlay"
                      sx={{
                        width: 40,
                        height: 40,
                        objectFit: 'cover',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'success.main',
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(product.ebayImage, '_blank')}
                    />
                  ) : (
                    <Typography variant="caption" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontSize="0.75rem">
                    {new Date(product.createdAt).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleDeleteProduct(product._id, product.asin)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {savedProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={11 + customColumnNames.length} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No saved products yet. Add your first product above!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
