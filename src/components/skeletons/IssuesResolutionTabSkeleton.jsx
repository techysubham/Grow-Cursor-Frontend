import { Box, Fade, Skeleton, Stack } from '@mui/material';
import SectionCard from '../SectionCard.jsx';

export default function IssuesResolutionTabSkeleton({ showSummaryCards = false }) {
    return (
        <Fade in timeout={200}>
            <Box>
                <Stack direction="row" spacing={2} mb={2} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Skeleton variant="rounded" width={220} height={40} />
                        <Skeleton variant="text" width={240} height={18} />
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Skeleton variant="rounded" width={140} height={36} />
                        <Skeleton variant="rounded" width={110} height={36} />
                    </Stack>
                </Stack>

                <SectionCard sx={{ p: 2, mb: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Skeleton variant="rounded" width={150} height={40} />
                        <Skeleton variant="rounded" width={180} height={40} />
                        <Skeleton variant="rounded" width={160} height={40} />
                        <Skeleton variant="rounded" width={140} height={40} />
                        <Skeleton variant="rounded" width={110} height={32} />
                    </Stack>
                </SectionCard>

                {showSummaryCards && (
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
                        {Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton
                                key={index}
                                variant="rounded"
                                height={88}
                                sx={{ flex: 1, minWidth: 220, borderRadius: 2 }}
                            />
                        ))}
                    </Stack>
                )}

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