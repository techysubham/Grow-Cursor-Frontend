import { Fragment, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Grid,
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
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
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
  yellowOutlinedButtonSx,
} from '../../theme/tableStyles.js';

const EMPTY_VALUE = 'Not provided';

function formatFieldValue(value) {
  return String(value || '').trim() || EMPTY_VALUE;
}

function buildAddressSummary(account) {
  return [account.city, account.state, account.country]
    .filter((value) => String(value || '').trim())
    .join(', ') || 'No address details yet';
}

export default function ManageAmazonAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phoneNumber: '',
    notes: '',
  });

  const populateEditForm = (account) => {
    if (!account) return;

    setEditFormData({
      name: account.name || '',
      addressLine1: account.addressLine1 || '',
      addressLine2: account.addressLine2 || '',
      city: account.city || '',
      state: account.state || '',
      postalCode: account.postalCode || '',
      country: account.country || '',
      phoneNumber: account.phoneNumber || '',
      notes: account.notes || '',
    });
  };

  const fetchAccounts = () => {
    api.get('/amazon-accounts').then(({ data }) => setAccounts(data)).catch(console.error);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const addAccount = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await api.post('/amazon-accounts', { name });
      setName('');
      fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add account');
    }
  };

  const deleteAccount = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Amazon account?')) return;

    try {
      await api.delete(`/amazon-accounts/${id}`);

      if (expandedId === id) {
        setExpandedId(null);
        setEditingId(null);
      }

      fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete account');
    }
  };

  const handleExpandRow = (accountId) => {
    if (expandedId === accountId) {
      setExpandedId(null);
      setEditingId(null);
      return;
    }

    const account = accounts.find((entry) => entry._id === accountId);
    setExpandedId(accountId);
    setEditingId(null);
    populateEditForm(account);
  };

  const handleEditClick = (accountId) => {
    const account = accounts.find((entry) => entry._id === accountId);
    setEditingId(accountId);
    populateEditForm(account);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    const account = accounts.find((entry) => entry._id === expandedId);
    populateEditForm(account);
  };

  const handleUpdateAccount = async (accountId) => {
    setError('');

    try {
      await api.patch(`/amazon-accounts/${accountId}`, editFormData);
      setEditingId(null);
      fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update account');
    }
  };

  const handleFormChange = (field, value) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <AdminPageShell>
      <PageHeader
        title="Manage Amazon Accounts"
        subtitle="Maintain Amazon purchasing accounts and address records used by compliance and support."
        actions={
          <Chip
            label={`${accounts.length} ${accounts.length === 1 ? 'Account' : 'Accounts'}`}
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
                Add Amazon Account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create a new account entry before filling in address and contact details below.
              </Typography>
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}

            <Stack
              component="form"
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              onSubmit={addAccount}
              alignItems={{ xs: 'stretch', md: 'center' }}
            >
              <TextField
                label="Amazon Account Name"
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
                Add Account
              </Button>
            </Stack>
          </Stack>
        </SectionCard>

        <SectionCard sx={{ p: 0, overflow: 'hidden' }}>
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
              Account Registry
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Expand a row to review address details or update the saved account information.
            </Typography>
          </Box>

          <TableContainer sx={{ ...tableContainerSx, border: 'none', boxShadow: 'none', borderRadius: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderCellSx}>Account Name</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Address Snapshot</TableCell>
                  <TableCell sx={{ ...tableHeaderCellSx, width: 132 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {accounts.map((account) => {
                  const isExpanded = expandedId === account._id;
                  const isEditing = editingId === account._id;

                  return (
                    <Fragment key={account._id}>
                      <TableRow
                        hover
                        onClick={() => handleExpandRow(account._id)}
                        selected={isExpanded}
                        sx={{
                          ...tableBodyRowSx,
                          cursor: 'pointer',
                          '& td': {
                            ...tableBodyRowSx['& td'],
                            verticalAlign: 'middle',
                          },
                        }}
                      >
                        <TableCell sx={tableBodyCellSx}>
                          <Stack spacing={0.5}>
                            <Typography sx={{ fontWeight: 700, color: BRAND_DARK }}>{account.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Click to {isExpanded ? 'collapse details' : 'view details'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={tableBodyCellSx}>
                          <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.82) }}>
                            {buildAddressSummary(account)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={tableBodyCellSx} onClick={(event) => event.stopPropagation()}>
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <IconButton
                              size="small"
                              onClick={() => handleExpandRow(account._id)}
                              sx={{
                                color: BRAND_DARK,
                                backgroundColor: alpha(BRAND_YELLOW, 0.12),
                                border: '1px solid',
                                borderColor: alpha(BRAND_YELLOW_DARK, 0.22),
                                '&:hover': {
                                  backgroundColor: alpha(BRAND_YELLOW, 0.2),
                                },
                              }}
                            >
                              {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => deleteAccount(account._id)}
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
                          </Stack>
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell
                          colSpan={3}
                          sx={{
                            py: 0,
                            px: 0,
                            borderBottom: isExpanded ? `1px solid ${alpha(BRAND_DARK, 0.08)}` : 'none',
                          }}
                        >
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box
                              sx={{
                                p: { xs: 2, md: 2.5 },
                                background: `linear-gradient(180deg, ${alpha(BRAND_YELLOW, 0.06)} 0%, #ffffff 100%)`,
                              }}
                            >
                              <Stack spacing={2}>
                                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1.5}>
                                  <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: BRAND_DARK }}>
                                      Address Information
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      Review the stored shipping and contact details for this account.
                                    </Typography>
                                  </Box>
                                  {!isEditing ? (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={<EditOutlinedIcon />}
                                      sx={yellowOutlinedButtonSx}
                                      onClick={() => handleEditClick(account._id)}
                                    >
                                      Edit Address
                                    </Button>
                                  ) : null}
                                </Stack>

                                {isEditing ? (
                                  <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                      <TextField
                                        label="Account Name"
                                        size="small"
                                        fullWidth
                                        value={editFormData.name}
                                        onChange={(event) => handleFormChange('name', event.target.value)}
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        label="Address Line 1"
                                        size="small"
                                        fullWidth
                                        value={editFormData.addressLine1}
                                        onChange={(event) => handleFormChange('addressLine1', event.target.value)}
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        label="Address Line 2"
                                        size="small"
                                        fullWidth
                                        value={editFormData.addressLine2}
                                        onChange={(event) => handleFormChange('addressLine2', event.target.value)}
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        label="City"
                                        size="small"
                                        fullWidth
                                        value={editFormData.city}
                                        onChange={(event) => handleFormChange('city', event.target.value)}
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        label="State"
                                        size="small"
                                        fullWidth
                                        value={editFormData.state}
                                        onChange={(event) => handleFormChange('state', event.target.value)}
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        label="Postal Code"
                                        size="small"
                                        fullWidth
                                        value={editFormData.postalCode}
                                        onChange={(event) => handleFormChange('postalCode', event.target.value)}
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        label="Country"
                                        size="small"
                                        fullWidth
                                        value={editFormData.country}
                                        onChange={(event) => handleFormChange('country', event.target.value)}
                                      />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                      <TextField
                                        label="Phone Number"
                                        size="small"
                                        fullWidth
                                        value={editFormData.phoneNumber}
                                        onChange={(event) => handleFormChange('phoneNumber', event.target.value)}
                                      />
                                    </Grid>
                                    <Grid item xs={12}>
                                      <TextField
                                        label="Notes"
                                        size="small"
                                        fullWidth
                                        multiline
                                        rows={3}
                                        value={editFormData.notes}
                                        onChange={(event) => handleFormChange('notes', event.target.value)}
                                      />
                                    </Grid>
                                    <Grid item xs={12}>
                                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        <Button
                                          size="small"
                                          variant="contained"
                                          startIcon={<SaveIcon />}
                                          sx={yellowFilledButtonSx}
                                          onClick={() => handleUpdateAccount(account._id)}
                                        >
                                          Save Changes
                                        </Button>
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          startIcon={<CancelIcon />}
                                          sx={yellowOutlinedButtonSx}
                                          onClick={handleCancelEdit}
                                        >
                                          Cancel
                                        </Button>
                                      </Stack>
                                    </Grid>
                                  </Grid>
                                ) : (
                                  <Grid container spacing={1.5}>
                                    {[
                                      ['Address Line 1', account.addressLine1],
                                      ['Address Line 2', account.addressLine2],
                                      ['City', account.city],
                                      ['State', account.state],
                                      ['Postal Code', account.postalCode],
                                      ['Country', account.country],
                                      ['Phone Number', account.phoneNumber],
                                      ['Notes', account.notes],
                                    ].map(([label, value]) => (
                                      <Grid item xs={12} sm={6} md={label === 'Notes' ? 12 : 6} key={label}>
                                        <Box
                                          sx={{
                                            height: '100%',
                                            p: 1.5,
                                            borderRadius: 2,
                                            border: '1px solid',
                                            borderColor: alpha(BRAND_DARK, 0.08),
                                            backgroundColor: '#ffffff',
                                          }}
                                        >
                                          <Typography
                                            variant="caption"
                                            sx={{
                                              display: 'block',
                                              mb: 0.5,
                                              fontWeight: 700,
                                              color: alpha(BRAND_DARK, 0.62),
                                              textTransform: 'uppercase',
                                              letterSpacing: 0.45,
                                            }}
                                          >
                                            {label}
                                          </Typography>
                                          <Typography variant="body2" sx={{ color: BRAND_DARK, whiteSpace: 'pre-wrap' }}>
                                            {formatFieldValue(value)}
                                          </Typography>
                                        </Box>
                                      </Grid>
                                    ))}
                                  </Grid>
                                )}
                              </Stack>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })}

                {accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ py: 5, textAlign: 'center', color: 'text.secondary' }}>
                      No Amazon accounts found.
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