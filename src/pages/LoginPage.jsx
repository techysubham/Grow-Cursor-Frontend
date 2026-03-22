import { useState } from 'react';
import { 
  Box, 
  Button, 
  Stack, 
  TextField, 
  Typography,
  InputAdornment,
  IconButton,
  Alert
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import api from '../lib/api.js';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { username, password });
      onLogin(data.token, data.user);
    } catch (e) {
      const errorMessage = e?.response?.data?.error || e.message || 'Login failed';
      console.error('Login error:', e);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 420 }}>

        {/* Brand card */}
        <Box
          sx={{
            background: '#f5c842',
            borderRadius: 4,
            p: '32px 40px 28px',
            mb: 3,
            boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
            textAlign: 'center',
          }}
        >
          {/* Logo mark — bracket G */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', mb: 0.75 }}>
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                width: 22,
                height: 22,
                borderTop: '3px solid #4a4a6a',
                borderLeft: '3px solid #4a4a6a',
                borderRadius: '3px 0 0 0',
                mb: '2px',
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontSize: '1.55rem',
                fontWeight: 800,
                color: '#3a3a5c',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              Grow Mentality
            </Typography>
          </Box>
          <Typography
            sx={{
              fontSize: '0.72rem',
              color: '#5a5a7a',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            Nurture Proper For The Future
          </Typography>
        </Box>

        {/* Sign-in card */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            background: 'rgba(255,255,255,0.97)',
            borderRadius: 3,
            p: '32px 32px 28px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a1a2e', mb: 0.5 }}>
            Sign in
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Employee Management System
          </Typography>

          <Stack spacing={2.5}>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              fullWidth
              autoComplete="username"
              size="medium"
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(v => !v)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {error && (
              <Alert severity="error" sx={{ py: 0.5 }}>{error}</Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{
                mt: 0.5,
                py: 1.4,
                fontWeight: 700,
                fontSize: '0.95rem',
                letterSpacing: '0.08em',
                background: '#1976d2',
                '&:hover': { background: '#1565c0' },
                boxShadow: '0 4px 14px rgba(25,118,210,0.35)',
              }}
            >
              {loading ? 'Signing in…' : 'Login'}
            </Button>
          </Stack>
        </Box>

      </Box>
    </Box>
  );
}



