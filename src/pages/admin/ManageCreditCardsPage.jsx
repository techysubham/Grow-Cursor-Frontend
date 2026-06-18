import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AdminPageShell from '../../components/AdminPageShell.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { BRAND_DARK, BRAND_YELLOW, BRAND_YELLOW_DARK } from '../../constants/brandTheme.js';
import api from '../../lib/api.js';
import {
  tableBodyCellSx,
  tableBodyRowSx,
  tableContainerSx,
  tableHeaderCellSx,
  yellowFilledButtonSx,
} from '../../theme/tableStyles.js';

export default function ManageCreditCardsPage() {
  const queryClient = useQueryClient();
  const { data: cards = [] } = useQuery({
    queryKey: ['/credit-cards'],
    queryFn: () => api.get('/credit-cards').then((response) => response.data),
  });
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/credit-cards'] });

  const addCard = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await api.post('/credit-cards', { name });
      setName('');
      invalidate();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add credit card');
    }
  };

  const deleteCard = async (id) => {
    if (!window.confirm('Are you sure you want to delete this credit card?')) return;

    try {
      await api.delete(`/credit-cards/${id}`);
      invalidate();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete credit card');
    }
  };

  return (
    <AdminPageShell>
      <PageHeader
        title="Manage Credit Cards"
        subtitle="Maintain the shared credit card registry used across compliance and support workflows."
        actions={
          <Chip
            label={`${cards.length} ${cards.length === 1 ? 'Card' : 'Cards'}`}
            sx={{
              color: BRAND_DARK,
              fontWeight: 700,
              backgroundColor: alpha(BRAND_YELLOW, 0.16),
              border: '1px solid',
              borderColor: alpha(BRAND_YELLOW_DARK, 0.22),
            }}
          />
        }
      />

      <Stack spacing={3}>
        <SectionCard emphasized sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: BRAND_DARK }}>
                Add Credit Card
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add a new payment source so it is available in the compliance and support flow.
              </Typography>
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}

            <Stack
              component="form"
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              onSubmit={addCard}
              alignItems={{ xs: 'stretch', md: 'center' }}
            >
              <TextField
                label="Credit Card Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                fullWidth
                size="small"
                sx={{
                  maxWidth: { md: 420 },
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: alpha(BRAND_YELLOW, 0.04),
                  },
                }}
              />
              <Button type="submit" variant="contained" startIcon={<AddIcon />} sx={yellowFilledButtonSx}>
                Add Card
              </Button>
            </Stack>
          </Stack>
        </SectionCard>

        <SectionCard sx={{ p: 0, overflow: 'hidden', maxWidth: 720 }}>
          <Box
            sx={{
              px: { xs: 2, md: 2.5 },
              py: 2,
              borderBottom: '1px solid',
              borderColor: alpha(BRAND_DARK, 0.08),
              background: `linear-gradient(135deg, ${alpha(BRAND_YELLOW, 0.16)} 0%, ${alpha(BRAND_YELLOW, 0.05)} 100%)`,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: BRAND_DARK }}>
              Credit Card Registry
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review and manage the list of available cards used by the team.
            </Typography>
          </Box>

          <TableContainer sx={{ ...tableContainerSx, border: 'none', boxShadow: 'none', borderRadius: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderCellSx}>Card Name</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, width: 92 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cards.map((card) => (
                  <TableRow key={card._id} hover sx={tableBodyRowSx}>
                    <TableCell sx={tableBodyCellSx}>
                      <Typography sx={{ fontWeight: 700, color: BRAND_DARK }}>{card.name}</Typography>
                    </TableCell>
                    <TableCell sx={tableBodyCellSx}>
                      <IconButton
                        size="small"
                        onClick={() => deleteCard(card._id)}
                        sx={{
                          color: alpha(BRAND_DARK, 0.75),
                          border: '1px solid',
                          borderColor: alpha(BRAND_DARK, 0.12),
                          '&:hover': {
                            color: BRAND_DARK,
                            backgroundColor: alpha(BRAND_DARK, 0.06),
                          },
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}

                {cards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} sx={{ py: 5, textAlign: 'center', color: 'text.secondary' }}>
                      No credit cards found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      </Stack>
    </AdminPageShell>
  );
}
