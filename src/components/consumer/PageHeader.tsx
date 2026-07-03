import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import { alpha } from '@mui/material/styles';
import { t } from '@/theme/colors';

interface PageHeaderProps {
  greeting?: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  initials?: string;
  action?: React.ReactNode;
  sticky?: boolean;
  borderBottom?: boolean;
}

export default function PageHeader({
  greeting,
  title,
  subtitle,
  avatarUrl,
  initials,
  action,
  sticky = false,
  borderBottom = false,
}: PageHeaderProps) {
  const showAvatar = !!(avatarUrl || initials);
  return (
    <Box
      className={sticky ? 'sticky top-0 z-30' : ''}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2.5,
        py: 2,
        ...(sticky ? {
          bgcolor: alpha(t.bg, 0.9),
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        } : {}),
        ...(borderBottom ? {
          borderBottom: '1px solid',
          borderColor: 'divider',
        } : {}),
      }}
    >
      {showAvatar && (
        <Avatar
          src={avatarUrl ?? undefined}
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            bgcolor: `${t.accent}26`,
            border: `1px solid ${t.accent}40`,
            color: t.accent,
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {!avatarUrl && (initials ?? 'U').slice(0, 2).toUpperCase()}
        </Avatar>
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {greeting && (
          <Typography
            variant="caption"
            sx={{ display: 'block', fontWeight: 600, color: 'text.secondary', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 11 }}
          >
            {greeting}
          </Typography>
        )}
        <Typography
          variant="h6"
          sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.02em', lineHeight: 1.2, fontSize: 18 }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: '2px', fontSize: 12 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Box>
  );
}
