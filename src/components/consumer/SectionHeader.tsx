import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  count?: number;
  seeAllHref?: string;
  onSeeAll?: () => void;
  subtitle?: string;
  style?: React.CSSProperties;
}

export default function SectionHeader({ title, count, seeAllHref, onSeeAll, subtitle, style }: SectionHeaderProps) {
  const hasSeeAll = seeAllHref || onSeeAll;
  return (
    <Stack direction="row" style={style} sx={{ mb: 1.75, alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', fontSize: 16 }}>
            {title}
          </Typography>
          {count != null && (
            <Chip
              label={count}
              size="small"
              sx={{
                height: 20,
                fontSize: 11,
                fontWeight: 600,
                bgcolor: 'rgba(255,255,255,0.06)',
                color: 'text.secondary',
                borderRadius: '100px',
                '& .MuiChip-label': { px: '8px' },
              }}
            />
          )}
        </Stack>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: '3px', fontSize: 12 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {hasSeeAll && (
        <Button
          size="small"
          endIcon={<ChevronRight size={13} strokeWidth={2.5} />}
          {...(seeAllHref ? { component: Link, href: seeAllHref } : { onClick: onSeeAll })}
          sx={{
            color: 'primary.main',
            fontWeight: 600,
            fontSize: 12,
            minWidth: 0,
            p: 0,
            '&:hover': { background: 'none', color: 'text.primary' },
          }}
        >
          See all
        </Button>
      )}
    </Stack>
  );
}
