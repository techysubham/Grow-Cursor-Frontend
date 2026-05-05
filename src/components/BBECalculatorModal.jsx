import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Grid,
  Box,
  Divider,
  Stack,
  IconButton,
  Chip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import CalculateIcon from '@mui/icons-material/Calculate';
import SectionCard from './SectionCard.jsx';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../constants/brandTheme.js';
import { yellowFilledButtonSx, yellowOutlinedButtonSx } from '../theme/tableStyles.js';

export default function BBECalculatorModal({ open, onClose, initialSales = 0, initialSnad = 0 }) {
  const [sales, setSales] = useState(initialSales);
  const [snad, setSnad] = useState(initialSnad);
  const [addSales, setAddSales] = useState(0);
  const [addSnad, setAddSnad] = useState(0);
  const [targetRate, setTargetRate] = useState(1.0);

  useEffect(() => {
    if (open) {
      setSales(initialSales);
      setSnad(initialSnad);
      setAddSales(0);
      setAddSnad(0);
      setTargetRate(1.0);
    }
  }, [open, initialSales, initialSnad]);

  const currentRate = sales > 0 ? (snad / sales) * 100 : 0;
  const projectedSales = Number(sales) + Number(addSales);
  const projectedSnad = Number(snad) + Number(addSnad);
  const projectedRate = projectedSales > 0 ? (projectedSnad / projectedSales) * 100 : 0;

  let salesNeeded = 0;
  if (targetRate > 0 && snad > 0) {
    const totalSalesNeeded = (snad * 100) / targetRate;
    salesNeeded = Math.ceil(totalSalesNeeded - sales);
  }

  const rateTone = (rate) => {
    if (rate > 1.5) {
      return {
        bg: alpha(BRAND_YELLOW_DARK, 0.18),
        border: alpha(BRAND_YELLOW_DARK, 0.42),
        valueColor: BRAND_DARK,
        chipSx: {
          color: BRAND_DARK,
          backgroundColor: alpha(BRAND_YELLOW_DARK, 0.22),
          borderColor: alpha(BRAND_YELLOW_DARK, 0.42),
          fontWeight: 700,
        },
        label: 'Above threshold',
      };
    }

    if (rate > 1.1) {
      return {
        bg: alpha(BRAND_YELLOW, 0.12),
        border: alpha(BRAND_YELLOW_DARK, 0.28),
        valueColor: BRAND_DARK,
        chipSx: {
          color: BRAND_DARK,
          backgroundColor: alpha(BRAND_YELLOW, 0.14),
          borderColor: alpha(BRAND_YELLOW_DARK, 0.28),
          fontWeight: 700,
        },
        label: 'Watch closely',
      };
    }

    return {
      bg: alpha(BRAND_DARK, 0.03),
      border: alpha(BRAND_DARK, 0.1),
      valueColor: BRAND_DARK,
      chipSx: {
        color: BRAND_DARK,
        backgroundColor: alpha(BRAND_DARK, 0.05),
        borderColor: alpha(BRAND_DARK, 0.14),
        fontWeight: 700,
      },
      label: 'Within target',
    };
  };

  const currentRateTone = rateTone(currentRate);
  const projectedRateTone = rateTone(projectedRate);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 24px 56px rgba(15, 23, 42, 0.18)',
          backgroundImage: `linear-gradient(180deg, ${alpha(BRAND_YELLOW, 0.08)} 0%, #ffffff 18%, #ffffff 100%)`,
          border: '1px solid',
          borderColor: alpha(BRAND_DARK, 0.12),
        },
      }}
    >
      <DialogTitle
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2.5,
          borderBottom: '1px solid',
          borderColor: alpha(BRAND_DARK, 0.1),
          backgroundColor: alpha(BRAND_YELLOW, 0.08),
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: alpha(BRAND_YELLOW, 0.28),
                color: BRAND_DARK,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalculateIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND_DARK }}>
                BBE Rate Calculator
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Evaluate current performance, project changes, and estimate the sales needed to hit a safer rate.
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} size="small" sx={{ color: alpha(BRAND_DARK, 0.7) }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 3, bgcolor: alpha(BRAND_YELLOW, 0.035) }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 2.5 }}>
          <Chip size="small" variant="outlined" sx={currentRateTone.chipSx} label={`Current: ${currentRateTone.label}`} />
          <Chip size="small" variant="outlined" sx={projectedRateTone.chipSx} label={`Projected: ${projectedRateTone.label}`} />
          <Chip
            size="small"
            variant="outlined"
            sx={{
              color: BRAND_DARK,
              backgroundColor: alpha(BRAND_YELLOW, 0.1),
              borderColor: alpha(BRAND_YELLOW_DARK, 0.24),
              fontWeight: 700,
            }}
            label={`Target ${Number(targetRate || 0).toFixed(2)}%`}
          />
        </Stack>

        <Grid container spacing={2.5}>
          {/* Section 1: Current Status */}
          <Grid item xs={12}>
            <SectionCard sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: currentRateTone.bg, borderColor: currentRateTone.border }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                spacing={1.5}
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">Current Status</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Use the current sales and SNAD totals from the selected evaluation window.
                  </Typography>
                </Box>
                <Chip size="small" variant="outlined" sx={currentRateTone.chipSx} label={currentRateTone.label} />
              </Stack>

              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Current Total Sales"
                    type="number"
                    fullWidth
                    size="small"
                    value={sales}
                    onChange={(e) => setSales(Number(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Current SNAD Count"
                    type="number"
                    fullWidth
                    size="small"
                    value={snad}
                    onChange={(e) => setSnad(Number(e.target.value))}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: 56,
                      borderRadius: 2,
                      bgcolor: alpha('#ffffff', 0.84),
                      border: '1px solid',
                      borderColor: currentRateTone.border,
                      px: 2,
                      py: 1,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">Current BBE Rate</Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: currentRateTone.valueColor }}>
                      {currentRate.toFixed(2)}%
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </SectionCard>
          </Grid>

          {/* Section 2: Projection */}
          <Grid item xs={12} md={6}>
            <SectionCard sx={{ p: { xs: 2, sm: 2.5 }, height: '100%', bgcolor: '#ffffff', borderColor: alpha(BRAND_DARK, 0.1) }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={1}
                sx={{ mb: 1.5 }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ color: BRAND_DARK }}>Projection</Typography>
                  <Typography variant="body2" color="text.secondary">
                    See how additional sales or SNADs change the rate immediately.
                  </Typography>
                </Box>
                <Chip size="small" variant="outlined" sx={projectedRateTone.chipSx} label={projectedRateTone.label} />
              </Stack>

              <Stack spacing={2}>
                <TextField
                  label="Add Hypothetical Sales"
                  type="number"
                  fullWidth
                  size="small"
                  value={addSales}
                  onChange={(e) => setAddSales(Number(e.target.value))}
                  helperText={`Total Projected Sales: ${projectedSales}`}
                />
                <TextField
                  label="Add Hypothetical SNADs"
                  type="number"
                  fullWidth
                  size="small"
                  value={addSnad}
                  onChange={(e) => setAddSnad(Number(e.target.value))}
                  helperText={`Total Projected SNADs: ${projectedSnad}`}
                />

                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, gap: 2 }}>
                  <Box>
                    <Typography variant="body1" fontWeight={600}>Projected Rate</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Based on {projectedSales.toLocaleString()} sales and {projectedSnad.toLocaleString()} SNADs
                    </Typography>
                  </Box>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: projectedRateTone.valueColor }}>
                    {projectedRate.toFixed(2)}%
                  </Typography>
                </Box>
              </Stack>
            </SectionCard>
          </Grid>

          {/* Section 3: Target Calculator */}
          <Grid item xs={12} md={6}>
            <SectionCard sx={{ p: { xs: 2, sm: 2.5 }, height: '100%', bgcolor: alpha(BRAND_YELLOW, 0.08), borderColor: alpha(BRAND_YELLOW_DARK, 0.2) }}>
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ color: BRAND_DARK }}>Target Calculator</Typography>
                <Typography variant="body2" color="text.secondary">
                  Estimate the extra sales required to bring the current SNAD count down to a target rate.
                </Typography>
              </Box>

              <Stack spacing={2}>
                <TextField
                  label="Target BBE Rate (%)"
                  type="number"
                  fullWidth
                  size="small"
                  value={targetRate}
                  onChange={(e) => setTargetRate(Number(e.target.value))}
                  inputProps={{ step: 0.1, min: 0.01 }}
                />

                <Divider />

                <Box
                  sx={{
                    px: 2,
                    py: 2,
                    borderRadius: 2,
                    bgcolor: alpha('#ffffff', 0.84),
                    border: '1px solid',
                    borderColor: alpha(BRAND_YELLOW_DARK, 0.24),
                  }}
                >
                  <Typography variant="body2" gutterBottom color="text.secondary">
                    Additional Sales Needed (assuming 0 new SNADs):
                  </Typography>
                  {salesNeeded > 0 ? (
                    <>
                      <Typography variant="h4" sx={{ color: BRAND_DARK }} fontWeight="bold">
                        +{salesNeeded.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total sales required: {(sales + salesNeeded).toLocaleString()}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="h6" sx={{ color: BRAND_DARK }} fontWeight={700}>
                      Target Reached!
                    </Typography>
                  )}
                </Box>
              </Stack>
            </SectionCard>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          borderTop: '1px solid',
          borderColor: alpha(BRAND_DARK, 0.1),
          bgcolor: '#ffffff',
        }}
      >
        <Button onClick={onClose} variant="outlined" sx={yellowOutlinedButtonSx}>Close</Button>
        <Button onClick={onClose} variant="contained" sx={yellowFilledButtonSx}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
