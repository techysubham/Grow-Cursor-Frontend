import { Box, CircularProgress } from '@mui/material';
import { BRAND_YELLOW } from '../constants/brandTheme.js';

export default function PageLoader() {
  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress sx={{ color: BRAND_YELLOW }} size={40} thickness={4} />
    </Box>
  );
}
