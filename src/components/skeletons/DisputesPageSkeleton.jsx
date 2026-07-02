import { Box, Fade, Skeleton, Stack } from '@mui/material';
import AdminPageShell from '../AdminPageShell.jsx';
import SectionCard from '../SectionCard.jsx';

export default function DisputesPageSkeleton() {
    return (
        <Fade in timeout={200}>
            <AdminPageShell>
                <SectionCard sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
                    <Stack spacing={1.25}>
                        <Skeleton variant="text" width={320} height={38} />
                        <Skeleton variant="text" width={520} height={20} />
                    </Stack>

                    <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Skeleton variant="rounded" width={140} height={40} />
                            <Skeleton variant="rounded" width={160} height={40} />
                            <Skeleton variant="rounded" width={160} height={40} />
                        </Stack>
                    </Box>
                </SectionCard>

                <SectionCard sx={{ mb: 3, overflow: 'hidden' }}>
                    <Box sx={{ p: 2 }}>
                        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                            <Skeleton variant="rounded" width={170} height={42} />
                            <Skeleton variant="rounded" width={210} height={42} />
                            <Skeleton variant="rounded" width={160} height={42} />
                            <Skeleton variant="rounded" width={160} height={42} />
                            <Skeleton variant="rounded" width={130} height={42} />
                        </Stack>
                    </Box>
                </SectionCard>

                <Stack direction="row" spacing={2} mb={2} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Skeleton variant="rounded" width={220} height={40} />
                        <Skeleton variant="text" width={260} height={18} />
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Skeleton variant="rounded" width={150} height={36} />
                        <Skeleton variant="rounded" width={110} height={36} />
                    </Stack>
                </Stack>

                <SectionCard sx={{ p: 2, mb: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Skeleton variant="rounded" width={150} height={40} />
                        <Skeleton variant="rounded" width={180} height={40} />
                        <Skeleton variant="rounded" width={150} height={40} />
                        <Skeleton variant="rounded" width={100} height={32} />
                    </Stack>
                </SectionCard>

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
            </AdminPageShell>
        </Fade>
    );
}