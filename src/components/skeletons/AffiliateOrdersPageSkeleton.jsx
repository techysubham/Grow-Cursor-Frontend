import { Box, Fade, Skeleton, Stack } from '@mui/material';
import AdminPageShell from '../AdminPageShell.jsx';
import SectionCard from '../SectionCard.jsx';

export default function AffiliateOrdersPageSkeleton({ showActualSpend = false }) {
    return (
        <Fade in timeout={200}>
            <AdminPageShell>
                <SectionCard sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
                    <Stack spacing={1.25}>
                        <Skeleton variant="text" width={280} height={38} />
                        <Skeleton variant="text" width={560} height={20} />
                    </Stack>
                </SectionCard>

                <SectionCard sx={{ p: 2, mb: 2 }}>
                    <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', lg: 'center' }} spacing={2}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Skeleton variant="rounded" width={120} height={28} />
                            <Skeleton variant="rounded" width={160} height={28} />
                            <Skeleton variant="rounded" width={130} height={28} />
                        </Stack>
                        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                            <Skeleton variant="rounded" width={150} height={36} />
                            <Skeleton variant="rounded" width={170} height={40} />
                        </Stack>
                    </Stack>
                </SectionCard>

                <SectionCard sx={{ mb: 2, overflow: 'hidden' }}>
                    <Box sx={{ px: 2, py: 1.5 }}>
                        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                            <Skeleton variant="rounded" width={130} height={34} />
                            <Skeleton variant="rounded" width={180} height={34} />
                            <Skeleton variant="rounded" width={120} height={34} />
                            {showActualSpend && <Skeleton variant="rounded" width={130} height={34} />}
                        </Stack>
                    </Box>
                </SectionCard>

                <SectionCard sx={{ p: 2, mb: 2 }}>
                    <Stack direction={{ xs: 'column', xl: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', xl: 'center' }} spacing={2}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Skeleton variant="text" width={260} height={20} />
                            <Skeleton variant="rounded" width={110} height={28} />
                            <Skeleton variant="rounded" width={110} height={28} />
                            <Skeleton variant="rounded" width={110} height={28} />
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Skeleton variant="rounded" width={220} height={40} />
                            <Skeleton variant="rounded" width={130} height={36} />
                            <Skeleton variant="rounded" width={110} height={36} />
                            <Skeleton variant="rounded" width={100} height={36} />
                        </Stack>
                    </Stack>
                </SectionCard>

                <SectionCard sx={{ overflow: 'hidden', p: 0 }}>
                    <Box sx={{ px: 2, pt: 2, pb: 1 }}>
                        <Skeleton variant="rounded" height={46} sx={{ borderRadius: 1 }} />
                    </Box>
                    <Box sx={{ px: 2, pb: 2 }}>
                        {Array.from({ length: 10 }).map((_, index) => (
                            <Skeleton
                                key={index}
                                variant="rounded"
                                height={54}
                                sx={{ mb: '2px', borderRadius: 1, opacity: 1 - index * 0.05 }}
                            />
                        ))}
                    </Box>
                </SectionCard>
            </AdminPageShell>
        </Fade>
    );
}