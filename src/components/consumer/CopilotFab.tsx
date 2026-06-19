'use client';

import Box from '@mui/material/Box';
import AIAssistant from '@/components/AIAssistant';
import type { AIHuntContext } from '@/components/AIAssistant';

interface CopilotFabProps {
  context?: AIHuntContext;
}

// Thin wrapper: AIAssistant renders its own FAB trigger and panel.
// Place this in the root of consumer pages to make the copilot globally available.
export default function CopilotFab({ context }: CopilotFabProps) {
  return (
    <Box sx={{ position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', right: 16, zIndex: 90 }}>
      <AIAssistant context={context} />
    </Box>
  );
}
