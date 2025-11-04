import { useState } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Paper, 
  Stack, 
  TextField, 
  Typography,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import api from '../lib/api.js';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      onLogin(data.token, data.user);
    } catch (e) {
      const errorMessage = e?.response?.data?.error || e.message || 'Login failed';
      console.error('Login error:', e);
      setError(errorMessage);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 12 }}>
      <Paper sx={{ p: 4 }}>
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <Typography variant="h5">Sign in</Typography>
          <TextField 
            label="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required
            error={error?.includes('Email')}
            helperText={error?.includes('Email') ? error : ''}
          />
          <TextField 
            label="Password" 
            type={showPassword ? "text" : "password"} 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required
            error={error?.includes('password')}
            helperText={error?.includes('password') ? error : ''}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleTogglePasswordVisibility}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {error && !error.includes('Email') && !error.includes('password') ? (
            <Typography color="error" variant="body2">{error}</Typography>
          ) : null}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button type="submit" variant="contained">Login</Button>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}


