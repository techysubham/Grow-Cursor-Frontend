import { useEffect, useState } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography
} from '@mui/material';
import api from '../lib/api.js';

/**
 * Dialog that lets the user pick a Seller + Template before launching
 * the "Create Listing from Directory" flow on AsinListPage.
 *
 * Props:
 *   open        – boolean
 *   onClose     – () => void
 *   asinCount   – number of selected ASINs (displayed only)
 *   onConfirm   – ({ sellerId, templateId, template }) => void
 */
export default function AsinListCreateDialog({ open, onClose, asinCount = 0, onConfirm }) {
  const [sellers, setSellers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [sellerId, setSellerId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch sellers + templates when dialog opens
  useEffect(() => {
    if (!open) return;
    setSellerId('');
    setTemplateId('');
    fetchData();
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sellersRes, templatesRes] = await Promise.all([
        api.get('/sellers/all'),
        api.get('/listing-templates')
      ]);
      setSellers(sellersRes.data || []);
      setTemplates(templatesRes.data || []);
    } catch (err) {
      console.error('Failed to load sellers/templates', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    const template = templates.find(t => t._id === templateId);
    onConfirm({ sellerId, templateId, template });
  };

  const getSellerLabel = (seller) =>
    seller.user?.username || seller.user?.email || seller._id;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Listing from ASIN List</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Creating listings for{' '}
          <strong>{asinCount} selected ASIN{asinCount !== 1 ? 's' : ''}</strong>.
          Choose the seller and template to use.
        </Typography>

        {loading ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <Stack spacing={3}>
            {/* Seller */}
            <FormControl fullWidth>
              <InputLabel>Seller *</InputLabel>
              <Select
                value={sellerId}
                label="Seller *"
                onChange={e => setSellerId(e.target.value)}
              >
                {sellers.map(s => (
                  <MenuItem key={s._id} value={s._id}>
                    {getSellerLabel(s)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Template */}
            <FormControl fullWidth>
              <InputLabel>Template *</InputLabel>
              <Select
                value={templateId}
                label="Template *"
                onChange={e => setTemplateId(e.target.value)}
              >
                {templates.map(t => (
                  <MenuItem key={t._id} value={t._id}>
                    {t.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={loading || !sellerId || !templateId}
        >
          Generate Listings
        </Button>
      </DialogActions>
    </Dialog>
  );
}
