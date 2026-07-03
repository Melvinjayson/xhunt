'use client';

import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { X } from 'lucide-react';
import { t } from '@/theme/colors';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeight?: string;
}

export default function BottomSheet({ isOpen, onClose, title, children, maxHeight = '90vh' }: BottomSheetProps) {
  return (
    <Drawer
      anchor="bottom"
      open={isOpen}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: '24px 24px 0 0',
            maxHeight,
            bgcolor: t.surface,
            borderTop: '1px solid',
            borderTopColor: 'divider',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
            overflowY: 'auto',
          },
        },
      }}
    >
      {/* Drag handle */}
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 1 }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.15)' }} />
      </Box>

      {/* Header */}
      {title && (
        <Stack
          direction="row"
          sx={{ px: 2.5, pb: 2, alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', fontSize: 16 }}>
            {title}
          </Typography>
          <Box
            component="button"
            onClick={onClose}
            sx={{
              width: 32,
              height: 32,
              borderRadius: '10px',
              bgcolor: 'rgba(255,255,255,0.06)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: t.txtFaint,
            }}
          >
            <X size={16} strokeWidth={2} />
          </Box>
        </Stack>
      )}

      {/* Content */}
      <Box sx={{ pb: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
        {children}
      </Box>
    </Drawer>
  );
}
