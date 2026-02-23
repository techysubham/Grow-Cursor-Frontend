import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  TextField,
  IconButton,
  Tooltip,
  Divider,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import api from '../lib/api.js';

// ── Single panel component ─────────────────────────────────────────────────
function TaxonomyPanel({ title, items, selectedId, onSelect, onAdd, onDelete, loading, disabled, emptyText, addPlaceholder, saving }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await onAdd(newName.trim());
    setNewName('');
    setAdding(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') { setAdding(false); setNewName(''); }
  };

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderRight: 'none' }
      }}
    >
      {/* Panel header */}
      <Box sx={{ px: 2, py: 1.5, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
          {!disabled && (
            <Tooltip title={`Add ${title.slice(0, -1)}`}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => setAdding(true)}
                  disabled={adding || disabled}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>
      </Box>

      {/* Inline add field */}
      {adding && (
        <Box sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <TextField
              autoFocus
              size="small"
              fullWidth
              placeholder={addPlaceholder}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={saving}
            />
            <IconButton size="small" color="success" onClick={handleAdd} disabled={!newName.trim() || saving}>
              {saving ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
            </IconButton>
            <IconButton size="small" onClick={() => { setAdding(false); setNewName(''); }} disabled={saving}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>
      )}

      {/* List */}
      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : disabled ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.disabled">{emptyText}</Typography>
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No items yet</Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {items.map(item => (
              <ListItem
                key={item._id}
                disablePadding
                secondaryAction={
                  <Tooltip title="Delete">
                    <IconButton
                      edge="end"
                      size="small"
                      color="error"
                      onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                      sx={{ mr: 0.5 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemButton
                  selected={selectedId === item._id}
                  onClick={() => onSelect(item._id)}
                  sx={{ pr: 6 }}
                >
                  <ListItemText
                    primary={item.name}
                    primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                  />
                  {onSelect && selectedId === item._id && (
                    <ChevronRightIcon fontSize="small" sx={{ color: 'primary.main', flexShrink: 0 }} />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
}

// ── Main dialog ─────────────────────────────────────────────────────────────
export default function AsinListManagerDialog({ open, onClose }) {
  const [categories, setCategories] = useState([]);
  const [ranges, setRanges] = useState([]);
  const [products, setProducts] = useState([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedRangeId, setSelectedRangeId] = useState('');

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingRanges, setLoadingRanges] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [savingCategory, setSavingCategory] = useState(false);
  const [savingRange, setSavingRange] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // Confirm-delete state
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, item }
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState('');

  // ── Fetch on open ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setSelectedCategoryId('');
    setSelectedRangeId('');
    setRanges([]);
    setProducts([]);
    setError('');
    setConfirmDelete(null);
    fetchCategories();
  }, [open]);

  useEffect(() => {
    setSelectedRangeId('');
    setProducts([]);
    if (selectedCategoryId) fetchRanges(selectedCategoryId);
    else setRanges([]);
  }, [selectedCategoryId]);

  useEffect(() => {
    setProducts([]);
    if (selectedRangeId) fetchProducts(selectedRangeId);
  }, [selectedRangeId]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const { data } = await api.get('/asin-list-categories');
      setCategories(data);
    } catch { setError('Failed to load categories'); }
    finally { setLoadingCategories(false); }
  };

  const fetchRanges = async (catId) => {
    try {
      setLoadingRanges(true);
      const { data } = await api.get('/asin-list-ranges', { params: { categoryId: catId } });
      setRanges(data);
    } catch { setError('Failed to load ranges'); }
    finally { setLoadingRanges(false); }
  };

  const fetchProducts = async (rngId) => {
    try {
      setLoadingProducts(true);
      const { data } = await api.get('/asin-list-products', { params: { rangeId: rngId } });
      setProducts(data);
    } catch { setError('Failed to load products'); }
    finally { setLoadingProducts(false); }
  };

  // ── Add handlers ──────────────────────────────────────────────────────────
  const handleAddCategory = async (name) => {
    try {
      setSavingCategory(true);
      const { data } = await api.post('/asin-list-categories', { name });
      setCategories(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleAddRange = async (name) => {
    try {
      setSavingRange(true);
      const { data } = await api.post('/asin-list-ranges', { name, categoryId: selectedCategoryId });
      setRanges(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create range');
    } finally {
      setSavingRange(false);
    }
  };

  const handleAddProduct = async (name) => {
    const selectedRange = ranges.find(r => r._id === selectedRangeId);
    try {
      setSavingProduct(true);
      const { data } = await api.post('/asin-list-products', {
        name,
        rangeId: selectedRangeId,
        categoryId: selectedRange?.categoryId || selectedCategoryId
      });
      setProducts(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create product');
    } finally {
      setSavingProduct(false);
    }
  };

  // ── Delete handlers ───────────────────────────────────────────────────────
  const handleDeleteRequest = (type, item) => {
    setConfirmDelete({ type, item });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const { type, item } = confirmDelete;
    try {
      setDeleting(true);
      if (type === 'category') {
        await api.delete(`/asin-list-categories/${item._id}`);
        setCategories(prev => prev.filter(c => c._id !== item._id));
        if (selectedCategoryId === item._id) {
          setSelectedCategoryId('');
          setRanges([]);
          setSelectedRangeId('');
          setProducts([]);
        }
      } else if (type === 'range') {
        await api.delete(`/asin-list-ranges/${item._id}`);
        setRanges(prev => prev.filter(r => r._id !== item._id));
        if (selectedRangeId === item._id) {
          setSelectedRangeId('');
          setProducts([]);
        }
      } else if (type === 'product') {
        await api.delete(`/asin-list-products/${item._id}`);
        setProducts(prev => prev.filter(p => p._id !== item._id));
      }
      setConfirmDelete(null);
    } catch {
      setError('Failed to delete item');
    } finally {
      setDeleting(false);
    }
  };

  // ── Confirm message ───────────────────────────────────────────────────────
  const confirmMessage = () => {
    if (!confirmDelete) return '';
    const { type, item } = confirmDelete;
    if (type === 'category') return `Delete category "${item.name}"? This will also delete all its Ranges and Products, and unassign any ASINs.`;
    if (type === 'range') return `Delete range "${item.name}"? This will also delete all its Products and unassign any ASINs.`;
    return `Delete product "${item.name}"? Any ASINs assigned to it will be unassigned.`;
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" fontWeight={700}>Manage Lists</Typography>
            <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <Divider />

        {error && (
          <Box sx={{ px: 3, pt: 2 }}>
            <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
          </Box>
        )}

        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ display: 'flex', height: 420 }}>
            <TaxonomyPanel
              title="Categories"
              items={categories}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
              onAdd={handleAddCategory}
              onDelete={(item) => handleDeleteRequest('category', item)}
              loading={loadingCategories}
              disabled={false}
              emptyText=""
              addPlaceholder="Category name"
              saving={savingCategory}
            />
            <TaxonomyPanel
              title="Ranges"
              items={ranges}
              selectedId={selectedRangeId}
              onSelect={setSelectedRangeId}
              onAdd={handleAddRange}
              onDelete={(item) => handleDeleteRequest('range', item)}
              loading={loadingRanges}
              disabled={!selectedCategoryId}
              emptyText="Select a category"
              addPlaceholder="Range name"
              saving={savingRange}
            />
            <TaxonomyPanel
              title="Products"
              items={products}
              selectedId={null}
              onSelect={() => {}}
              onAdd={handleAddProduct}
              onDelete={(item) => handleDeleteRequest('product', item)}
              loading={loadingProducts}
              disabled={!selectedRangeId}
              emptyText="Select a range"
              addPlaceholder="Product name"
              saving={savingProduct}
            />
          </Box>
        </DialogContent>

        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={onClose} variant="outlined">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{confirmMessage()}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} /> : <DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
