
import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Chip,
  InputAdornment,
  Divider,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import LaunchIcon from '@mui/icons-material/Launch';
import { listEmployeeProfiles, updateEmployeeProfile } from '../../lib/api.js';

export default function EmployeeDetailsPage() {
  const [rows, setRows] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [editForm, setEditForm] = useState({
    role: '',
    department: '',
    workingMode: '',
    workingHours: '',
    name: '',
    phoneNumber: '',
    dateOfBirth: '',
    dateOfJoining: '',
    gender: '',
    address: '',
    email: '',
    bankAccountNumber: '',
    bankIFSC: '',
    bankName: '',
    aadharNumber: '',
    panNumber: ''
  });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [validationErrors, setValidationErrors] = useState({});

  const loadProfiles = async () => {
    try {
      const list = await listEmployeeProfiles();
      setRows(list);
    } catch (e) {
      console.error('Failed to load employees', e);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const openEdit = (profile) => {
    setEditingProfile(profile);
    setEditForm({
      role: profile.user?.role || '',
      department: profile.user?.department || '',
      workingMode: profile.workingMode || '',
      workingHours: profile.workingHours || '',
      name: profile.name || '',
      phoneNumber: profile.phoneNumber || '',
      dateOfBirth: profile.dateOfBirth || '',
      dateOfJoining: profile.dateOfJoining || '',
      gender: profile.gender || '',
      address: profile.address || '',
      email: profile.email || '',
      bankAccountNumber: profile.bankAccountNumber || '',
      bankIFSC: profile.bankIFSC || '',
      bankName: profile.bankName || '',
      aadharNumber: profile.aadharNumber || '',
      panNumber: profile.panNumber || ''
    });
    setEditOpen(true);
    setIsEditing(false);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingProfile(null);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setValidationErrors({}); // Clear errors when starting edit
  };

  const validateForm = () => {
    const errors = {};

    // Required fields
    if (!editForm.name || editForm.name.trim() === '') {
      errors.name = 'Name is required';
    }
    if (!editForm.email || editForm.email.trim() === '') {
      errors.email = 'Email is required';
    }
    if (!editForm.role || editForm.role.trim() === '') {
      errors.role = 'Role is required';
    }
    if (!editForm.department || editForm.department.trim() === '') {
      errors.department = 'Department is required';
    }
    if (!editForm.workingMode || editForm.workingMode.trim() === '') {
      errors.workingMode = 'Working Mode is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!editingProfile) return;

    // Validate before saving
    if (!validateForm()) {
      setSnack({ open: true, message: 'Please fill in all required fields', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      // Sanitize payload: remove empty strings for enum fields to avoid validation errors
      const payload = { ...editForm };
      if (!payload.workingMode) delete payload.workingMode;
      if (!payload.gender) delete payload.gender;
      if (!payload.workingHours) delete payload.workingHours; // Optional but good practice

      // Also handle dates if they are empty
      if (!payload.dateOfBirth) delete payload.dateOfBirth;
      if (!payload.dateOfJoining) delete payload.dateOfJoining;

      // Send sanitized fields
      await updateEmployeeProfile(editingProfile._id, payload);
      await loadProfiles();
      setIsEditing(false); // Switch back to view mode
      setSnack({ open: true, message: 'Changes saved successfully!', severity: 'success' });
    } catch (err) {
      console.error('Failed to update profile', err);
      // Extract error message from backend if available
      const errorMsg = err.response?.data?.details || err.response?.data?.error || 'Failed to update profile. Please try again.';
      setSnack({ open: true, message: errorMsg, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };


  // Flat filter/search logic
  const filteredRows = rows.filter((profile) => {
    const name = profile.name || '';
    const username = profile.user?.username || '';
    const role = profile.user?.role || '';
    const dept = profile.user?.department || '';
    const q = search.toLowerCase();
    return (
      name.toLowerCase().includes(q) ||
      username.toLowerCase().includes(q) ||
      role.toLowerCase().includes(q) ||
      dept.toLowerCase().includes(q)
    );
  });

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>Employee Details</Typography>
        <TextField
          placeholder="Search by name, username, role, department"
          value={search}
          onChange={e => setSearch(e.target.value)}
          fullWidth
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
        <Grid container spacing={2}>
          {filteredRows.map((r) => {
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={r._id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack spacing={1} direction="row" alignItems="center" justifyContent="space-between">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1, overflow: 'hidden' }}>
                        {r.profilePicUrl && (
                          <img
                            src={r.profilePicUrl}
                            alt="Profile"
                            style={{
                              width: 50,
                              height: 50,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid #1976d2',
                              flexShrink: 0
                            }}
                          />
                        )}
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="h6" noWrap title={r.user?.username}>{r.user?.username || 'Unknown'}</Typography>
                          <Chip label={r.user?.role || 'N/A'} size="small" color="primary" sx={{ width: 'fit-content', mt: 0.5 }} />
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>{r.user?.department || '-'}</Typography>
                        </Box>
                      </Box>
                      <Tooltip title="Manage Employee Details">
                        <IconButton onClick={() => openEdit(r)} color="primary">
                          <ManageAccountsIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
          {filteredRows.length === 0 && (
            <Grid item xs={12}><Typography color="text.secondary">No employees found.</Typography></Grid>
          )}
        </Grid>
      </Paper>

      <Dialog open={editOpen} onClose={closeEdit} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', m: 0, p: 2 }}>
          <Typography variant="h6" component="div">Manage Employee - {editingProfile?.user?.username}</Typography>
          <Box>
            {!isEditing && (
              <Button
                startIcon={<EditIcon />}
                onClick={handleStartEdit}
                variant="contained"
                color="primary"
                size="small"
                sx={{ mr: 2 }}
              >
                Edit
              </Button>
            )}
            <IconButton onClick={closeEdit}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                Professional Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Role"
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    fullWidth
                    size="small"
                    disabled={!isEditing}
                    required
                    error={!!validationErrors.role}
                    helperText={validationErrors.role}
                    sx={{
                      '& .MuiFormLabel-asterisk': {
                        color: 'red',
                      },
                    }}
                  >
                    <MenuItem value="productadmin">Product Research Admin</MenuItem>
                    <MenuItem value="listingadmin">Listing Admin</MenuItem>
                    <MenuItem value="compatibilityadmin">Compatibility Admin</MenuItem>
                    <MenuItem value="compatibilityeditor">Compatibility Editor</MenuItem>
                    <MenuItem value="fulfillmentadmin">Fulfillment Admin</MenuItem>
                    <MenuItem value="hradmin">HR Admin</MenuItem>
                    <MenuItem value="hr">HR</MenuItem>
                    <MenuItem value="operationhead">Operation Head</MenuItem>
                    <MenuItem value="lister">Lister</MenuItem>
                    <MenuItem value="advancelister">Advance Lister</MenuItem>
                    <MenuItem value="trainee">Trainee</MenuItem>
                    <MenuItem value="seller">Seller</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Department"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    fullWidth
                    size="small"
                    disabled={!isEditing}
                    required
                    error={!!validationErrors.department}
                    helperText={validationErrors.department}
                    sx={{
                      '& .MuiFormLabel-asterisk': {
                        color: 'red',
                      },
                    }}
                  >
                    <MenuItem value="">Select Department</MenuItem>
                    <MenuItem value="Product Research">Product Research Department</MenuItem>
                    <MenuItem value="Listing">Listing Department</MenuItem>
                    <MenuItem value="Compatibility">Compatibility Department</MenuItem>
                    <MenuItem value="HR">HR Department</MenuItem>
                    <MenuItem value="Operations">Operations Department</MenuItem>
                    <MenuItem value="Executives">Executives Department</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="Working Mode"
                    value={editForm.workingMode}
                    onChange={(e) => setEditForm({ ...editForm, workingMode: e.target.value })}
                    fullWidth
                    size="small"
                    disabled={!isEditing}
                    required
                    error={!!validationErrors.workingMode}
                    helperText={validationErrors.workingMode}
                    sx={{
                      '& .MuiFormLabel-asterisk': {
                        color: 'red',
                      },
                    }}
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="remote">Remote</MenuItem>
                    <MenuItem value="office">Office</MenuItem>
                    <MenuItem value="hybrid">Hybrid</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Working Hours"
                    value={editForm.workingHours}
                    onChange={(e) => setEditForm({ ...editForm, workingHours: e.target.value })}
                    fullWidth
                    size="small"
                    placeholder="e.g., 9 AM - 6 PM"
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Date of Joining"
                    type="date"
                    value={editForm.dateOfJoining ? editForm.dateOfJoining.split('T')[0] : ''}
                    onChange={(e) => setEditForm({ ...editForm, dateOfJoining: e.target.value })}
                    disabled={!isEditing}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Personal Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                Personal Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    disabled={!isEditing}
                    size="small"
                    required
                    error={!!validationErrors.name}
                    helperText={validationErrors.name}
                    sx={{
                      '& .MuiFormLabel-asterisk': {
                        color: 'red',
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    disabled={!isEditing}
                    size="small"
                    required
                    error={!!validationErrors.email}
                    helperText={validationErrors.email}
                    sx={{
                      '& .MuiFormLabel-asterisk': {
                        color: 'red',
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={editForm.phoneNumber}
                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                    disabled={!isEditing}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Gender"
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    disabled={!isEditing}
                    size="small"
                  >
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                    <MenuItem value="prefer_not_to_say">Prefer not to say</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Date of Birth"
                    type="date"
                    value={editForm.dateOfBirth ? editForm.dateOfBirth.split('T')[0] : ''}
                    onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                    disabled={!isEditing}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    multiline
                    rows={2}
                    disabled={!isEditing}
                    size="small"
                  />
                </Grid>

                {/* Bank Details */}
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mt: 1, mb: 1 }}>Bank Details</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Bank Name"
                        value={editForm.bankName}
                        onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                        disabled={!isEditing}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="Account Number"
                        value={editForm.bankAccountNumber}
                        onChange={(e) => setEditForm({ ...editForm, bankAccountNumber: e.target.value })}
                        disabled={!isEditing}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        label="IFSC Code"
                        value={editForm.bankIFSC}
                        onChange={(e) => setEditForm({ ...editForm, bankIFSC: e.target.value })}
                        disabled={!isEditing}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Grid>

                {/* Documents */}
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mt: 1, mb: 1 }}>Documents</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <TextField
                          fullWidth
                          label="Aadhar Number"
                          value={editForm.aadharNumber}
                          onChange={(e) => setEditForm({ ...editForm, aadharNumber: e.target.value })}
                          disabled={!isEditing}
                          size="small"
                        />
                        {editingProfile?.aadharImageUrl && (
                          <Tooltip title="View Aadhar Card">
                            <Button
                              variant="outlined"
                              onClick={() => window.open(editingProfile.aadharImageUrl, '_blank')}
                              sx={{ height: 40, minWidth: 40, px: 2 }}
                            >
                              <LaunchIcon fontSize="small" />
                            </Button>
                          </Tooltip>
                        )}
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <TextField
                          fullWidth
                          label="PAN Number"
                          value={editForm.panNumber}
                          onChange={(e) => setEditForm({ ...editForm, panNumber: e.target.value })}
                          disabled={!isEditing}
                          size="small"
                        />
                        {editingProfile?.panImageUrl && (
                          <Tooltip title="View PAN Card">
                            <Button
                              variant="outlined"
                              onClick={() => window.open(editingProfile.panImageUrl, '_blank')}
                              sx={{ height: 40, minWidth: 40, px: 2 }}
                            >
                              <LaunchIcon fontSize="small" />
                            </Button>
                          </Tooltip>
                        )}
                      </Stack>
                    </Grid>
                  </Grid>
                </Grid>

              </Grid>

            </Grid>
          </Grid>
        </DialogContent>
        {isEditing && (
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} variant="contained" color="success" disabled={saving}>
              Save Changes
            </Button>
          </DialogActions>
        )}
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ zIndex: 99999 }} // Ensure it sits above the modal
      >
        <Alert
          onClose={() => setSnack({ ...snack, open: false })}
          severity={snack.severity}
          sx={{ width: '100%' }}
          variant="filled" // Correct variant for solid color
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
