import { Component } from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { BRAND_YELLOW } from '../constants/brandTheme.js';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);

    const message = String(error?.message || '');
    const isChunkLoadError =
      error?.name === 'ChunkLoadError' ||
      /Loading chunk \d+ failed/i.test(message) ||
      /Failed to fetch dynamically imported module/i.test(message) ||
      /Importing a module script failed/i.test(message);

    if (isChunkLoadError && !sessionStorage.getItem('chunk_load_retry')) {
      sessionStorage.setItem('chunk_load_retry', '1');
      window.location.reload();
      return;
    }

    sessionStorage.removeItem('chunk_load_retry');
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 52, color: BRAND_YELLOW }} />
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
            Something went wrong
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', maxWidth: 420, textAlign: 'center' }}
          >
            {this.state.error?.message || 'An unexpected error occurred while loading this page.'}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => this.setState({ hasError: false, error: null })}
            sx={{ borderColor: BRAND_YELLOW, color: BRAND_YELLOW, mt: 1 }}
          >
            Try Again
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
