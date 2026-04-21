import { Box, useTheme } from '@mui/material';

/**
 * AdminPageShell
 * Standardised outermost wrapper for every admin page.
 * Applies consistent horizontal padding, bottom padding, and page background.
 *
 * Usage:
 *   <AdminPageShell>
 *     ...page content...
 *   </AdminPageShell>
 *
 * Props:
 *   children  — page content
 *   sx        — optional sx overrides
 */
export default function AdminPageShell({ children, sx }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        px: { xs: 2, md: 3 },
        pb: 4,
        backgroundColor: theme.palette.background.paper,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
