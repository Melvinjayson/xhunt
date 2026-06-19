import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Badge from '@mui/material/Badge';
import Link from 'next/link';
import { t } from '@/theme/colors';

export interface QuickAction {
  icon: React.ElementType;
  label: string;
  href?: string;
  onClick?: () => void;
  color?: string;
  badge?: string | number;
  description?: string;
}

interface QuickActionGridProps {
  actions: QuickAction[];
  columns?: 2 | 3 | 4;
}

function ActionItem({ icon: Icon, label, href, onClick, color = t.accent, badge, description }: QuickAction) {
  const content = (
    <Card
      sx={{
        bgcolor: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: 'none',
        transition: 'transform 0.18s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardActionArea
        onClick={onClick}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          p: '16px 8px',
          textAlign: 'center',
        }}
      >
        <Badge badgeContent={badge} color="error">
          <Box sx={{
            width: 44,
            height: 44,
            borderRadius: '14px',
            bgcolor: `${color}18`,
            border: `1px solid ${color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon size={20} strokeWidth={1.8} style={{ color }} />
          </Box>
        </Badge>
        <Box>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: 'text.primary', fontSize: 12 }}>
            {label}
          </Typography>
          {description && (
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontSize: 10, mt: '2px' }}>
              {description}
            </Typography>
          )}
        </Box>
      </CardActionArea>
    </Card>
  );

  if (href) return <Link href={href} style={{ textDecoration: 'none' }}>{content}</Link>;
  return content;
}

export default function QuickActionGrid({ actions, columns = 4 }: QuickActionGridProps) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 1.25 }}>
      {actions.map((a, i) => <ActionItem key={i} {...a} />)}
    </Box>
  );
}
