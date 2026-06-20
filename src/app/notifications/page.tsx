'use client';

import { Box, Typography } from '@mui/material';
import { Bell } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { t } from '@/theme/colors';

export default function NotificationsPage() {
  return (
    <div className="consumer-app" style={{ minHeight: '100vh', background: t.bg }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          gap: 2,
          px: 3,
          pb: 10,
        }}
      >
        <Bell size={40} color={t.txtFaint} />
        <Typography variant="h6" sx={{ color: t.txt, fontWeight: 600 }}>
          Notifications
        </Typography>
        <Typography variant="body2" sx={{ color: t.txtDim, textAlign: 'center' }}>
          Your activity and updates will appear here.
        </Typography>
      </Box>
      <BottomNav />
    </div>
  );
}
