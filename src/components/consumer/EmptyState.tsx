import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from 'next/link';
import { t } from '@/theme/colors';

interface EmptyStateProps {
  icon?: React.ElementType;
  emoji?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  compact?: boolean;
}

export default function EmptyState({ icon: Icon, emoji, title, description, action, compact }: EmptyStateProps) {
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      py: compact ? 3 : 6,
      px: 3,
    }}>
      {emoji && (
        <Typography sx={{ fontSize: compact ? 32 : 48, mb: 1.5, lineHeight: 1 }}>{emoji}</Typography>
      )}
      {Icon && !emoji && (
        <Box sx={{
          width: compact ? 52 : 64,
          height: compact ? 52 : 64,
          borderRadius: '50%',
          background: `${t.accent}14`,
          border: `1px solid ${t.accent}26`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
        }}>
          <Icon size={compact ? 22 : 28} strokeWidth={1.5} style={{ color: t.accent }} />
        </Box>
      )}
      <Typography
        variant={compact ? 'subtitle2' : 'subtitle1'}
        sx={{ fontWeight: 700, color: 'text.primary', mb: 0.75, fontSize: compact ? 14 : 16 }}
      >
        {title}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 280, lineHeight: 1.5, mb: action ? 0 : 0, fontSize: 13 }}
        >
          {description}
        </Typography>
      )}
      {action && (
        <Button
          variant="contained"
          size="small"
          sx={{ mt: 2.5, borderRadius: '12px', px: 2.5, fontSize: 13, fontWeight: 700, height: 40 }}
          {...(action.href ? { component: Link, href: action.href } : { onClick: action.onClick })}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
}
