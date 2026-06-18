import { useState } from 'react';
import {
  Box,
  Chip,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import SectionCard from '../../components/SectionCard.jsx';
import { BRAND_DARK, BRAND_DARK_ALT, BRAND_YELLOW } from '../../constants/brandTheme.js';
import {
  tableBodyCellSx,
  tableBodyRowSx,
  tableContainerSx,
  tableHeaderCellSx,
} from '../../theme/tableStyles.js';

const roleChipStyles = {
  superadmin: {
    color: '#b91c1c',
    background: alpha('#ef4444', 0.12),
    border: alpha('#ef4444', 0.22),
  },
  listingadmin: {
    color: '#2563eb',
    background: alpha('#2563eb', 0.12),
    border: alpha('#2563eb', 0.22),
  },
  productadmin: {
    color: '#7c3aed',
    background: alpha('#8b5cf6', 0.12),
    border: alpha('#8b5cf6', 0.22),
  },
  default: {
    color: BRAND_DARK,
    background: alpha(BRAND_DARK, 0.06),
    border: alpha(BRAND_DARK, 0.12),
  },
};

export default function UserCredentialsPage() {
  const [credentials, setCredentials] = useState(() => {
    const saved = localStorage.getItem('userCredentials');
    return saved ? JSON.parse(saved) : [];
  });

  const superadminCount = credentials.filter((cred) => cred.role === 'superadmin').length;
  const listingAdminCount = credentials.filter((cred) => cred.role === 'listingadmin').length;

  const getRoleChipSx = (role) => {
    const style = roleChipStyles[role] || roleChipStyles.default;
    return {
      color: style.color,
      bgcolor: style.background,
      border: `1px solid ${style.border}`,
      fontWeight: 700,
    };
  };

  return (
    <Box sx={{ maxWidth: 1500, mx: 'auto' }}>
      <SectionCard
        emphasized
        sx={{
          mb: 3,
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${BRAND_DARK_ALT} 55%, #31577d 100%)`,
          border: `1px solid ${alpha(BRAND_YELLOW, 0.18)}`,
          color: '#fffdf0',
          position: 'relative',
        }}
      >
        <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <Box sx={{ position: 'absolute', top: -92, right: -74, width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle, ${alpha(BRAND_YELLOW, 0.22)} 0%, transparent 70%)` }} />
          <Box sx={{ position: 'absolute', bottom: -88, left: '24%', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, transparent 70%)' }} />
        </Box>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          justifyContent="space-between"
          sx={{ position: 'relative', p: { xs: 3, md: 4 } }}
        >
          <Box sx={{ maxWidth: 780 }}>
            <Chip
              label="Access Records"
              size="small"
              sx={{
                mb: 1.5,
                bgcolor: alpha(BRAND_YELLOW, 0.14),
                color: BRAND_YELLOW,
                border: `1px solid ${alpha(BRAND_YELLOW, 0.24)}`,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            />
            <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1, mb: 1 }}>
              User Credentials
            </Typography>
            <Typography sx={{ color: 'rgba(255, 253, 240, 0.76)', maxWidth: 700 }}>
              Review locally saved account credentials in the same refreshed admin dashboard layout used across the updated management pages.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'row', md: 'column' }} spacing={1.25}>
            <Chip label={`${credentials.length} Records`} sx={{ bgcolor: alpha('#fff', 0.08), color: '#fffdf0', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700 }} />
            <Chip label={`${superadminCount} Super Admin`} sx={{ bgcolor: alpha('#fff', 0.08), color: '#fffdf0', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700 }} />
            <Chip label={`${listingAdminCount} Listing Admin`} sx={{ bgcolor: alpha('#fff', 0.08), color: '#fffdf0', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700 }} />
          </Stack>
        </Stack>
      </SectionCard>

      <SectionCard sx={{ p: { xs: 2, md: 3 } }}>
        <Box
          sx={{
            mb: 2.5,
            p: { xs: 2, md: 2.5 },
            borderRadius: 3,
            border: `1px solid ${alpha('#7c3aed', 0.16)}`,
            background: `linear-gradient(135deg, ${alpha('#7c3aed', 0.1)} 0%, ${alpha('#2563eb', 0.04)} 100%)`,
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between">
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 44, height: 44, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)', color: '#fff' }}>
                <BadgeRoundedIcon />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: BRAND_DARK }}>
                  Saved Credentials
                </Typography>
                <Typography variant="body2" sx={{ color: alpha(BRAND_DARK, 0.64) }}>
                  View the locally saved email, username, role, password, and creation timestamp entries.
                </Typography>
              </Box>
            </Stack>
            <Chip label={`${credentials.length} visible`} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, bgcolor: alpha(BRAND_DARK, 0.06), color: BRAND_DARK, fontWeight: 700, border: `1px solid ${alpha(BRAND_DARK, 0.1)}` }} />
          </Stack>
        </Box>

        {credentials.length > 0 ? (
          <TableContainer sx={tableContainerSx}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderCellSx}>Email</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Username</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Role</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Password</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Created At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {credentials.map((cred, index) => (
                  <TableRow key={index} sx={tableBodyRowSx}>
                    <TableCell sx={tableBodyCellSx}>{cred.email}</TableCell>
                    <TableCell sx={tableBodyCellSx}>{cred.username}</TableCell>
                    <TableCell sx={tableBodyCellSx}>
                      <Chip label={cred.role} size="small" sx={getRoleChipSx(cred.role)} />
                    </TableCell>
                    <TableCell sx={tableBodyCellSx}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <KeyRoundedIcon sx={{ fontSize: 16, color: alpha(BRAND_DARK, 0.52) }} />
                        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{cred.password}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell sx={tableBodyCellSx}>{new Date(cred.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: 3,
              border: `1px dashed ${alpha(BRAND_DARK, 0.18)}`,
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
              textAlign: 'center',
            }}
          >
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: alpha(BRAND_DARK, 0.05), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <ShieldRoundedIcon sx={{ fontSize: 30, color: alpha(BRAND_DARK, 0.4) }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: BRAND_DARK, mb: 0.5 }}>
              No credentials saved yet
            </Typography>
            <Typography color="text.secondary">
              They will appear here when new users are created and stored in local browser data.
            </Typography>
          </Box>
        )}
      </SectionCard>
    </Box>
  );
}