import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  ErrorOutline as ErrorIcon,
  BrokenImage as BrokenImageIcon
} from '@mui/icons-material';
import { useState } from 'react';

function DetailRow({ label, value, mono }) {
  if (!value) return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ mt: 0.25, fontFamily: mono ? 'monospace' : 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default function AsinDetailDialog({ open, onClose, asin }) {
  const [copiedAsin, setCopiedAsin] = useState(false);
  const [imgErrors, setImgErrors] = useState({});

  if (!asin) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(asin.asin);
    setCopiedAsin(true);
    setTimeout(() => setCopiedAsin(false), 1500);
  };

  const handleImgError = (idx) => setImgErrors(prev => ({ ...prev, [idx]: true }));

  const scrapeDate = asin.scrapedAt
    ? new Date(asin.scrapedAt).toLocaleString()
    : null;

  const addedDate = asin.addedAt
    ? new Date(asin.addedAt).toLocaleString()
    : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          {/* Scrape status badge */}
          {asin.scraped ? (
            <Chip icon={<CheckIcon />} label="Scraped" color="success" size="small" />
          ) : (
            <Chip icon={<ErrorIcon />} label="Not Scraped" color="warning" size="small" />
          )}
          <Typography variant="h6" fontWeight={700} component="span">
            {asin.asin}
          </Typography>
          <Tooltip title={copiedAsin ? 'Copied!' : 'Copy ASIN'}>
            <IconButton size="small" onClick={handleCopy}>
              {copiedAsin ? <CheckIcon fontSize="small" color="success" /> : <CopyIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent>
        <Stack spacing={3}>

          {/* ── Images ─────────────────────────────────────────────────── */}
          {asin.images?.length > 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Images ({asin.images.length})
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {asin.images.map((url, idx) => (
                  <Box key={idx}>
                    {!imgErrors[idx] ? (
                      <Box
                        component="img"
                        src={url}
                        alt={`${asin.asin}-${idx}`}
                        onError={() => handleImgError(idx)}
                        sx={{
                          width: 96, height: 96, objectFit: 'contain',
                          border: '1px solid', borderColor: 'divider',
                          borderRadius: 1, bgcolor: 'white'
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 96, height: 96, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', border: '1px solid', borderColor: 'divider',
                          borderRadius: 1, bgcolor: 'grey.100'
                        }}
                      >
                        <BrokenImageIcon sx={{ color: 'grey.400' }} />
                      </Box>
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* ── Core product info ───────────────────────────────────────── */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Product Information
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <DetailRow label="Title" value={asin.title} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <DetailRow label="Brand" value={asin.brand} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <DetailRow label="Price" value={asin.price ? `$${parseFloat(asin.price).toFixed(2)}` : ''} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <DetailRow label="Model" value={asin.model} mono />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <DetailRow label="Color" value={asin.color} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <DetailRow label="Size" value={asin.size} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <DetailRow label="Material" value={asin.material} />
                </Grid>
                {asin.specialFeatures && (
                  <Grid item xs={12}>
                    <DetailRow label="Special Features" value={asin.specialFeatures} />
                  </Grid>
                )}
                {asin.compatibility && (
                  <Grid item xs={12}>
                    <DetailRow label="Compatibility" value={asin.compatibility} />
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Box>

          {/* ── Description ─────────────────────────────────────────────── */}
          {asin.description && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Description / Feature Bullets
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                {asin.description.split('\n').filter(Boolean).map((line, i) => (
                  <Stack key={i} direction="row" spacing={1} sx={{ mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>•</Typography>
                    <Typography variant="body2">{line}</Typography>
                  </Stack>
                ))}
              </Paper>
            </Box>
          )}

          {/* ── Meta / scrape info ──────────────────────────────────────── */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Record Info
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <DetailRow label="ASIN" value={asin.asin} mono />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <DetailRow label="Added At" value={addedDate} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <DetailRow label="Scraped At" value={scrapeDate || '—'} />
                </Grid>
                {asin.scrapeError && (
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                        Scrape Error
                      </Typography>
                      <Typography variant="body2" color="error.main" sx={{ mt: 0.25 }}>
                        {asin.scrapeError}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Box>

        </Stack>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
