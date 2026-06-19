import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Link from 'next/link';
import { t } from '@/theme/colors';

interface StatTileProps {
  label: string;
  value: string | number;
  icon?: React.ElementType;
  delta?: string;
  deltaPositive?: boolean;
  accent?: string;
  href?: string;
  onClick?: () => void;
}

export default function StatTile({
  label,
  value,
  icon: Icon,
  delta,
  deltaPositive,
  accent = t.accent,
  href,
  onClick,
}: StatTileProps) {
  const cardContent = (
    <CardContent sx={{ p: '16px 18px !important' }}>
      <Stack direction="row" sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, color: 'text.secondary', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 11 }}
        >
          {label}
        </Typography>
        {Icon && (
          <Box sx={{
            width: 28,
            height: 28,
            borderRadius: '8px',
            bgcolor: `${accent}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={14} strokeWidth={2} style={{ color: accent }} />
          </Box>
        )}
      </Stack>
      <Typography
        sx={{ fontSize: 26, fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', lineHeight: 1 }}
      >
        {value}
      </Typography>
      {delta && (
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 0.75, fontSize: 11, fontWeight: 600, color: deltaPositive ? t.accent : t.error }}
        >
          {deltaPositive ? '↑' : '↓'} {delta}
        </Typography>
      )}
    </CardContent>
  );

  const card = (
    <Card
      sx={{
        bgcolor: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: '16px',
        flex: 1,
        minWidth: 0,
        boxShadow: 'none',
      }}
    >
      {(href || onClick) ? (
        <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
          {cardContent}
        </CardActionArea>
      ) : (
        cardContent
      )}
    </Card>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none', display: 'flex', flex: 1, minWidth: 0 }}>
        {card}
      </Link>
    );
  }
  return card;
}
