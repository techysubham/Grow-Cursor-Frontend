import { Box, Fade, Skeleton, Stack } from '@mui/material';
import SectionCard from '../SectionCard.jsx';

export default function AmazonArrivalsSkeleton() {
  return (
    <Fade in timeout={200}>
      <Box sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        p: 3,
        overflow: 'hidden',
      }}>
        <Skeleton variant="text" width={200} height={36} sx={{ mb: 2 }} />

        <SectionCard sx={{ p: 2, mb: 2, flexShrink: 0 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap" useFlexGap>
            <Skeleton variant="rounded" width={200} height={40} />
            <Skeleton variant="rounded" width={170} height={40} />
            <Skeleton variant="rounded" width={170} height={40} />
            <Skeleton variant="rounded" width={200} height={40} sx={{ flex: { xs: 'none', sm: 1 } }} />
            <Skeleton variant="rounded" width={150} height={40} />
            <Skeleton variant="rounded" width={200} height={40} />
            <Skeleton variant="rounded" width={140} height={40} />
            <Skeleton variant="rounded" width={100} height={40} />
          </Stack>
        </SectionCard>

        <SectionCard sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', p: 0 }}>
          <Box sx={{ px: 2, pt: 2, pb: 1 }}>
            <Skeleton variant="rounded" height={48} sx={{ borderRadius: 1 }} />
          </Box>
          <Box sx={{ px: 2, pb: 2, flex: 1 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={48}
                sx={{ mb: '2px', borderRadius: 1, opacity: 1 - i * 0.06 }}
              />
            ))}
          </Box>
        </SectionCard>

        <SectionCard sx={{ py: 1, px: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, flexShrink: 0, mt: 2 }}>
          <Skeleton variant="text" width={220} height={20} />
          <Skeleton variant="rounded" width={220} height={32} sx={{ borderRadius: 4 }} />
        </SectionCard>
      </Box>
    </Fade>
  );
}
