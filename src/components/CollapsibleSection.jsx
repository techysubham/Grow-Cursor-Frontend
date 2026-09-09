import React, { useState } from 'react';
import { Box, Collapse, IconButton, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SectionCard from './SectionCard.jsx';
import { dashboardSignatureTokens } from '../theme/appTheme.js';

/**
 * CollapsibleSection
 * A SectionCard with a clickable header that shows/hides its body. Used to let
 * the analytics page be pared back to just the parts you care about.
 *
 * The open/closed choice is remembered per `storageKey` so a section stays
 * hidden across visits.
 *
 * Props:
 *   title       — heading text
 *   subtitle    — optional caption under the heading
 *   badge       — small node beside the title (e.g. which filters drive the card)
 *   actions     — node rendered on the right of the header (hidden while collapsed)
 *   defaultOpen — initial state when nothing is stored (default: true)
 *   storageKey  — localStorage key suffix; omit to opt out of persistence
 *   contentSx   — sx overrides for the body wrapper
 */

const STORAGE_PREFIX = 'orderAnalytics.section';

function readStored(storageKey, fallback) {
  if (!storageKey || typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(`${STORAGE_PREFIX}.${storageKey}`);
    if (stored === null) return fallback;
    return stored === 'open';
  } catch {
    return fallback;
  }
}

function writeStored(storageKey, open) {
  if (!storageKey || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}.${storageKey}`, open ? 'open' : 'closed');
  } catch {
    /* storage unavailable — the section still toggles, it just won't be remembered */
  }
}

export default function CollapsibleSection({
  title,
  subtitle,
  badge,
  actions,
  defaultOpen = true,
  storageKey,
  contentSx,
  children,
  sx,
}) {
  const [open, setOpen] = useState(() => readStored(storageKey, defaultOpen));

  const toggle = () => {
    setOpen((prev) => {
      writeStored(storageKey, !prev);
      return !prev;
    });
  };

  const headingId = `section-${(storageKey || title || '').toString().replace(/\W+/g, '-')}`;

  return (
    <SectionCard
      sx={{ p: 0, mb: 3, background: dashboardSignatureTokens.surfaces.pageCard, ...sx }}
    >
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', lg: 'center' }}
        gap={2}
        sx={{ p: { xs: 2, md: 3 }, pb: open ? { xs: 0, md: 0 } : { xs: 2, md: 3 } }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          onClick={toggle}
          role="button"
          tabIndex={0}
          aria-expanded={open}
          aria-controls={headingId}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggle();
            }
          }}
          sx={{
            cursor: 'pointer',
            minWidth: 0,
            borderRadius: `${dashboardSignatureTokens.radius.control}px`,
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
          }}
        >
          <IconButton size="small" component="span" aria-hidden tabIndex={-1}>
            <ExpandMoreIcon
              sx={{
                transition: 'transform 200ms ease',
                transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
              }}
            />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
              {badge}
            </Stack>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>

        {open && actions ? <Box sx={{ width: { xs: '100%', lg: 'auto' } }}>{actions}</Box> : null}
      </Stack>

      <Collapse in={open} timeout={220} unmountOnExit>
        <Box id={headingId} sx={{ px: { xs: 2, md: 3 }, pt: 2.5, pb: { xs: 2, md: 3 }, ...contentSx }}>
          {children}
        </Box>
      </Collapse>
    </SectionCard>
  );
}
