'use client';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { t } from '@/theme/colors';

interface ProgressBarProps {
  value: number;
  color?: string;
  height?: number;
  label?: string;
  showPercent?: boolean;
  style?: React.CSSProperties;
}

export default function ProgressBar({ value, color, height = 6, label, showPercent, style }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const barColor = color ?? t.accent;

  return (
    <Box style={style}>
      {(label || showPercent) && (
        <Stack direction="row" sx={{ mb: 0.5, justifyContent: 'space-between', alignItems: 'center' }}>
          {label && <Typography variant="caption" color="text.secondary">{label}</Typography>}
          {showPercent && <Typography variant="caption" sx={{ color: barColor, fontWeight: 700 }}>{Math.round(clampedValue)}%</Typography>}
        </Stack>
      )}
      <LinearProgress
        variant="determinate"
        value={clampedValue}
        sx={{
          height,
          borderRadius: height / 2,
          bgcolor: 'rgba(255,255,255,0.07)',
          '& .MuiLinearProgress-bar': {
            borderRadius: height / 2,
            bgcolor: barColor,
          },
        }}
      />
    </Box>
  );
}
