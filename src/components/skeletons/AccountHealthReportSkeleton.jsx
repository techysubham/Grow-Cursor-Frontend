import { Box, Fade, Skeleton, Stack } from '@mui/material';
import SectionCard from '../SectionCard.jsx';

export default function AccountHealthReportSkeleton() {
    return (
        <Fade in timeout={200}>
            <Box sx={{ p: 3 }}>
                <SectionCard sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
                    <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', lg: 'center' }} gap={2.5}>
                        <Stack spacing={1.25}>
                            <Skeleton variant="text" width={300} height={38} />
                            <Skeleton variant="text" width={460} height={20} />
                        </Stack>
                        <Skeleton variant="rounded" width={170} height={32} />
                    </Stack>
                </SectionCard>

                <SectionCard sx={{ p: 2, mb: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Skeleton variant="rounded" width={150} height={40} />
                        <Skeleton variant="rounded" width={140} height={40} />
                        <Skeleton variant="rounded" width={160} height={40} />
                        <Skeleton variant="rounded" width={160} height={40} />
                        <Skeleton variant="rounded" width={110} height={36} />
                        <Skeleton variant="rounded" width={110} height={40} />
                    </Stack>
                </SectionCard>

                <SectionCard sx={{ mb: 3, overflow: 'hidden' }}>
                    <Box sx={{ p: 2 }}>
                        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                            <Skeleton variant="rounded" width={130} height={42} />
                            <Skeleton variant="rounded" width={190} height={42} />
                            <Skeleton variant="rounded" width={220} height={42} />
                        </Stack>
                    </Box>
                </SectionCard>

                <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                    <Skeleton variant="text" width={280} height={28} />
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Skeleton variant="rounded" width={120} height={36} />
                        <Skeleton variant="rounded" width={120} height={36} />
                    </Stack>
                </Stack>

                <SectionCard sx={{ overflow: 'hidden', p: 0 }}>
                    <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                        <Skeleton variant="rounded" height={44} sx={{ borderRadius: 1 }} />
                    </Box>
                    <Box sx={{ px: 2, pb: 2 }}>
                        {Array.from({ length: 8 }).map((_, index) => (
                            <Skeleton
                                key={index}
                                variant="rounded"
                                height={46}
                                sx={{ mb: '2px', borderRadius: 1, opacity: 1 - index * 0.06 }}
                            />
                        ))}
                    </Box>
                </SectionCard>
            </Box>
        </Fade>
    );
}