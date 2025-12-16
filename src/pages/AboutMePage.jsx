import { useEffect, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
import { AppBar, Toolbar, IconButton, Box, Paper, Typography, Grid, TextField, MenuItem, Button, Stack, Snackbar, Alert, Tabs, Tab } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import ChatIcon from '@mui/icons-material/Chat';
import { useLocation, useNavigate } from 'react-router-dom';
import InternalMessagesPage from './admin/InternalMessagesPage.jsx';
import { getMyProfile, updateMyProfile } from '../lib/api.js';

export default function AboutMePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [form, setForm] = useState({
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
    panNumber: '',
    profilePicUrl: '',
    aadharImageUrl: '',
    panImageUrl: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [uploading, setUploading] = useState({ profilePic: false, aadhar: false, pan: false });

  useEffect(() => {
    (async () => {
      try {
        const p = await getMyProfile();
        setForm({
          name: p?.name || '',
          phoneNumber: p?.phoneNumber || '',
          dateOfBirth: p?.dateOfBirth ? p.dateOfBirth.substring(0, 10) : '',
          dateOfJoining: p?.dateOfJoining ? p.dateOfJoining.substring(0, 10) : '',
          gender: p?.gender || '',
          address: p?.address || '',
          email: p?.email || '',
          bankAccountNumber: p?.bankAccountNumber || '',
          bankIFSC: p?.bankIFSC || '',
          bankName: p?.bankName || '',
          aadharNumber: p?.aadharNumber || '',
          panNumber: p?.panNumber || '',
          profilePicUrl: p?.profilePicUrl || '',
          aadharImageUrl: p?.aadharImageUrl || '',
          panImageUrl: p?.panImageUrl || ''
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Cloudinary upload helper - only for images now
  const uploadToCloudinary = async (file) => {
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', UPLOAD_PRESET);
    
    const res = await fetch(url, { method: 'POST', body: data });
    const json = await res.json();
    
    return json.secure_url;
  };

  const handleUpload = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    let uploadKey;
    if (key === 'profilePicUrl') uploadKey = 'profilePic';
    else if (key === 'aadharImageUrl') uploadKey = 'aadhar';
    else if (key === 'panImageUrl') uploadKey = 'pan';
    setUploading(u => ({ ...u, [uploadKey]: true }));
    try {
      const url = await uploadToCloudinary(file);
      setForm(f => ({ ...f, [key]: url }));
      setSnackbar({ open: true, message: 'Upload successful!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Upload failed!', severity: 'error' });
    } finally {
      setUploading(u => ({ ...u, [uploadKey]: false }));
    }
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMyProfile({
        ...form,
        dateOfBirth: form.dateOfBirth || null,
        dateOfJoining: form.dateOfJoining || null
      });
      setSnackbar({ open: true, message: 'Profile saved successfully!', severity: 'success' });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Failed to save profile', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const isInAdminLayout = location.pathname.startsWith('/admin/');

  return (
    <Box maxWidth="1200px" mx="auto">
      {!isInAdminLayout && (
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <IconButton edge="start" onClick={() => navigate(-1)} aria-label="back">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>About Me</Typography>
          </Toolbar>
        </AppBar>
      )}
      
      {/* Tabs for Profile and Chat */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)} variant="fullWidth">
          <Tab icon={<PersonIcon />} label="My Profile" />
          <Tab icon={<ChatIcon />} label="Team Chat" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {currentTab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">My Profile</Typography>
            <Button onClick={onSubmit} variant="contained" disabled={saving || uploading.profilePic || uploading.aadhar || uploading.pan}>
              {(uploading.profilePic || uploading.aadhar || uploading.pan) ? 'Uploading...' : 'Save'}
            </Button>
          </Stack>
        <Box component="form" onSubmit={onSubmit}>
          <Grid container spacing={2}>
            {/* Profile Photo Upload */}
            <Grid item xs={12} sm={6}>
              <label>Profile Photo:</label>
              {form.profilePicUrl ? (
                <img src={form.profilePicUrl} alt="Profile" style={{ width: 80, height: 80, borderRadius: '50%', display: 'block', marginTop: 8 }} />
              ) : uploading.profilePic ? (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <CircularProgress size={24} />
                  <span style={{ marginLeft: 8 }}>Uploading...</span>
                </Box>
              ) : (
                <input type="file" accept="image/*" onChange={e => handleUpload(e, 'profilePicUrl')} />
              )}
            </Grid>
            {/* Aadhar Image Upload */}
            <Grid item xs={12} sm={6}>
              <label>Aadhar Card Image:</label>
              {form.aadharImageUrl ? (
                <Box sx={{ mt: 1 }}>
                  <img src={form.aadharImageUrl} alt="Aadhar" style={{ width: 120, height: 80, objectFit: 'cover', display: 'block', border: '1px solid #ddd' }} />
                  <Typography variant="caption" color="success.main">Aadhar image uploaded</Typography>
                </Box>
              ) : uploading.aadhar ? (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <CircularProgress size={24} />
                  <span style={{ marginLeft: 8 }}>Uploading...</span>
                </Box>
              ) : (
                <input type="file" accept="image/*" onChange={e => handleUpload(e, 'aadharImageUrl')} />
              )}
            </Grid>
            {/* PAN Image Upload */}
            <Grid item xs={12} sm={6}>
              <label>PAN Card Image:</label>
              {form.panImageUrl ? (
                <Box sx={{ mt: 1 }}>
                  <img src={form.panImageUrl} alt="PAN" style={{ width: 120, height: 80, objectFit: 'cover', display: 'block', border: '1px solid #ddd' }} />
                  <Typography variant="caption" color="success.main">PAN image uploaded</Typography>
                </Box>
              ) : uploading.pan ? (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <CircularProgress size={24} />
                  <span style={{ marginLeft: 8 }}>Uploading...</span>
                </Box>
              ) : (
                <input type="file" accept="image/*" onChange={e => handleUpload(e, 'panImageUrl')} />
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Name" name="name" value={form.name} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Email" name="email" value={form.email} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Phone Number" name="phoneNumber" value={form.phoneNumber} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Date of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={onChange} fullWidth InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Date of Joining" name="dateOfJoining" type="date" value={form.dateOfJoining} onChange={onChange} fullWidth InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Gender" name="gender" value={form.gender} onChange={onChange} fullWidth>
                <MenuItem value="">Select</MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
                <MenuItem value="prefer_not_to_say">Prefer not to say</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Address" name="address" value={form.address} onChange={onChange} fullWidth multiline minRows={2} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Bank Account Number" name="bankAccountNumber" value={form.bankAccountNumber} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Bank IFSC Code" name="bankIFSC" value={form.bankIFSC} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Bank Name" name="bankName" value={form.bankName} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Aadhar Number" name="aadharNumber" value={form.aadharNumber} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="PAN Number" name="panNumber" value={form.panNumber} onChange={onChange} fullWidth />
            </Grid>
          </Grid>
        </Box>
        </Paper>
      )}

      {/* Tab 2: Team Chat */}
      {currentTab === 1 && (
        <Box sx={{ height: '75vh' }}>
          <InternalMessagesPage />
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
