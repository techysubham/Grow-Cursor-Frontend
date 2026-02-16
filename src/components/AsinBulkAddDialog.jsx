import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  Typography,
  Stack,
  Chip
} from '@mui/material';
import { parseBulkAsins } from '../utils/asinDirectoryUtils.js';

export default function AsinBulkAddDialog({ open, onClose, onAdd }) {
  const [asinText, setAsinText] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTextChange = (e) => {
    const text = e.target.value;
    setAsinText(text);
    
    // Auto-generate preview
    if (text.trim()) {
      const parsed = parseBulkAsins(text);
      setPreview(parsed);
    } else {
      setPreview(null);
    }
  };

  const handleAdd = async () => {
    if (!preview || preview.valid.length === 0) {
      setError('No valid ASINs to add');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onAdd(preview.valid);
      setAsinText('');
      setPreview(null);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add ASINs');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAsinText('');
    setPreview(null);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Add ASINs Manually</DialogTitle>
      
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          
          <Alert severity="info">
            <Typography variant="body2">
              Paste ASINs separated by newlines, commas, semicolons, or spaces.
              Each ASIN should be 10 characters starting with 'B'.
            </Typography>
          </Alert>

          <TextField
            multiline
            rows={10}
            fullWidth
            placeholder="B08N5WRWNW&#10;B07K2G8Z4Q&#10;B09H3TLQX5&#10;..."
            value={asinText}
            onChange={handleTextChange}
            helperText="Example: B08N5WRWNW, B07K2G8Z4Q"
          />

          {preview && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Preview:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {preview.valid.length > 0 && (
                  <Chip
                    label={`${preview.valid.length} Valid`}
                    color="success"
                    size="small"
                  />
                )}
                {preview.duplicates.length > 0 && (
                  <Chip
                    label={`${preview.duplicates.length} Duplicates in Input`}
                    color="warning"
                    size="small"
                  />
                )}
                {preview.invalid.length > 0 && (
                  <Chip
                    label={`${preview.invalid.length} Invalid`}
                    color="error"
                    size="small"
                  />
                )}
              </Stack>

              {preview.invalid.length > 0 && preview.invalid.length <= 10 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="error">
                    Invalid ASINs: {preview.invalid.join(', ')}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          disabled={loading || !preview || preview.valid.length === 0}
        >
          {loading ? 'Adding...' : `Add ${preview?.valid.length || 0} ASINs`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
