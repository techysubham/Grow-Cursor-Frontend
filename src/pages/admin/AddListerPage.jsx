import { useMemo, useState, useEffect } from 'react';
import { Box, Button, Paper, Stack, TextField, Typography, FormControl, InputLabel, Select, MenuItem, Snackbar, Alert } from '@mui/material';
import api from '../../lib/api.js';

export default function AddListerPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [showCreds, setShowCreds] = useState(false);
  const [creds, setCreds] = useState({ email: '', username: '', password: '', role: 'lister' });
  const [errors, setErrors] = useState({ email: '', username: '' });
  const [checking, setChecking] = useState({ email: false, username: false });
  
  const currentUser = useMemo(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }, []);
  const isSuper = currentUser?.role === 'superadmin';
  const isListingAdmin = currentUser?.role === 'listingadmin';
  const [role, setRole] = useState('lister');

  // Check if email exists
  const checkEmail = async (email) => {
    if (!email) return;
    setChecking(prev => ({ ...prev, email: true }));
    try {
      const response = await api.get(`/users/check-exists?email=${email}`);
      setErrors(prev => ({ ...prev, email: response.data.exists ? 'Email already exists' : '' }));
    } catch (e) {
      console.error('Error checking email:', e);
    }
    setChecking(prev => ({ ...prev, email: false }));
  };

  // Check if username exists
  const checkUsername = async (username) => {
    if (!username) return;
    setChecking(prev => ({ ...prev, username: true }));
    try {
      const response = await api.get(`/users/check-exists?username=${username}`);
      setErrors(prev => ({ ...prev, username: response.data.exists ? 'Username already exists' : '' }));
    } catch (e) {
      console.error('Error checking username:', e);
    }
    setChecking(prev => ({ ...prev, username: false }));
  };

  // Debounced email check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (email) checkEmail(email);
    }, 500);
    return () => clearTimeout(timer);
  }, [email]);

  // Debounced username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username) checkUsername(username);
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg('');

    // Final validation before submission
    if (errors.email || errors.username) {
      setMsg('Please fix the errors before submitting');
      return;
    }

    try {
      const newRole = isSuper ? role : 'lister';
      const response = await api.post('/users', { email, username, password, newUserRole: newRole });
      const roleNames = { productadmin: 'Product Admin', listingadmin: 'Listing Admin', lister: 'Lister' };
      setMsg(`${roleNames[newRole]} created`);
      
      // Store credentials if response includes them (superadmin only)
      if (response.data.credentials) {
        const savedCreds = localStorage.getItem('userCredentials');
        const existingCreds = savedCreds ? JSON.parse(savedCreds) : [];
        existingCreds.push(response.data.credentials);
        localStorage.setItem('userCredentials', JSON.stringify(existingCreds));
      }
      
      setCreds({ email, username, password, role: newRole });
      setShowCreds(true);
      setEmail('');
      setUsername('');
      setPassword('');
      setRole('lister');
      setErrors({ email: '', username: '' });
    } catch (e) {
      setMsg(e?.response?.data?.error || 'Failed to create user');
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 520 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Add User</Typography>
      <Stack spacing={2} component="form" onSubmit={handleCreate}>
        <TextField 
          label="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required
          error={!!errors.email}
          helperText={checking.email ? 'Checking email...' : errors.email}
          disabled={checking.email}
        />
        <TextField 
          label="Username" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
          required
          error={!!errors.username}
          helperText={checking.username ? 'Checking username...' : errors.username}
          disabled={checking.username}
        />
        <TextField 
          label="Password" 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required
        />
        {isSuper ? (
          <FormControl>
            <InputLabel>Role</InputLabel>
            <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
              <MenuItem value="productadmin">Product Research Admin</MenuItem>
              <MenuItem value="listingadmin">Listing Admin</MenuItem>
              <MenuItem value="lister">Lister</MenuItem>
            </Select>
          </FormControl>
        ) : isListingAdmin ? (
          <Typography variant="body2" color="text.secondary">Creating Lister</Typography>
        ) : null}
        <Box>
          <Button type="submit" variant="contained">Create</Button>
        </Box>
        {msg ? <Typography color="success.main">{msg}</Typography> : null}
      </Stack>
      <Snackbar open={showCreds} autoHideDuration={10000} onClose={() => setShowCreds(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setShowCreds(false)} severity="info" sx={{ width: '100%' }}>
          Share these credentials securely:
          <br />Email: {creds.email}
          <br />Username: {creds.username}
          <br />Password: {creds.password}
          <br />Role: {creds.role}
        </Alert>
      </Snackbar>
    </Paper>
  );
}


