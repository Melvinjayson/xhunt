'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import {
  Home, Compass, Target, MessageSquare, User,
  LogOut, Sun, Moon, Wallet,
} from 'lucide-react';
import { useTotalUnread } from '@/hooks/useMessages';
import { useState, useEffect } from 'react';
import { t } from '@/theme/colors';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Drawer from '@mui/material/Drawer';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';

const PRIMARY_NAV = [
  { href: '/home',     icon: Home,          label: 'Home'        },
  { href: '/explore',  icon: Compass,       label: 'Explore'     },
  { href: '/missions', icon: Target,        label: 'My Missions', accent: true },
  { href: '/messages', icon: MessageSquare, label: 'Messages',   badge: true  },
  { href: '/profile',  icon: User,          label: 'Profile'     },
];

// People → consolidated into /explore; Rewards → consolidated into /profile

function ThemeToggleBtn() {
  const [light, setLight] = useState(false);
  useEffect(() => {
    setLight(localStorage.getItem('xhunt-theme') === 'light');
  }, []);
  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.setAttribute('data-theme', next ? 'light' : 'dark');
    localStorage.setItem('xhunt-theme', next ? 'light' : 'dark');
  }
  return (
    <IconButton
      onClick={toggle}
      size="small"
      title={light ? 'Dark mode' : 'Light mode'}
      sx={{ color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}
    >
      {light ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
    </IconButton>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const unreadCount = useTotalUnread(user?.id ?? null);

  const currentTab = PRIMARY_NAV.find(n =>
    pathname === n.href || (n.href !== '/home' && pathname.startsWith(n.href + '/'))
  )?.href ?? '/home';

  function handleSignOut() {
    signOut({ redirectUrl: '/' });
  }

  return (
    <>
      {/* ─── Mobile bottom bar ─── */}
      <Paper
        elevation={0}
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
          flexDirection: 'column',
          borderTop: '1px solid', borderColor: 'divider',
          bgcolor: t.surface,
          pb: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <BottomNavigation
          value={currentTab}
          onChange={(_, val) => router.push(val)}
          sx={{ bgcolor: 'transparent', height: 60 }}
        >
          {PRIMARY_NAV.map(({ href, icon: Icon, label, accent, badge }) => (
            <BottomNavigationAction
              key={href}
              value={href}
              label={label}
              icon={
                accent ? (
                  <Box sx={{
                    width: 52, height: 52, borderRadius: '50%',
                    bgcolor: 'primary.main', mt: -3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 20px rgba(34,255,170,0.4)',
                  }}>
                    <Icon size={22} color={t.bg} />
                  </Box>
                ) : badge && unreadCount > 0 ? (
                  <Badge badgeContent={unreadCount} color="error" max={99}>
                    <Icon size={22} />
                  </Badge>
                ) : (
                  <Icon size={22} />
                )
              }
              sx={{
                color: 'text.disabled',
                '&.Mui-selected': { color: 'primary.main' },
                minWidth: 0, flex: 1,
                '& .MuiBottomNavigationAction-label': { fontSize: 10, fontWeight: 600 },
              }}
            />
          ))}
        </BottomNavigation>
      </Paper>

      {/* ─── Desktop full sidebar (260px) ─── */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'flex' },
          width: 260,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 260,
            boxSizing: 'border-box',
            bgcolor: t.surface,
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ p: 2.5, pb: 2 }}>
          <Link href="/home" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-mark.png"
              alt=""
              style={{ width: 28, height: 28, objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <Typography sx={{ fontSize: 17, fontWeight: 900, color: 'primary.main', letterSpacing: '-0.02em' }}>
              X-Hunt
            </Typography>
          </Link>
        </Box>

        {/* Nav items */}
        <List sx={{ px: 1, flex: 1 }}>
          {PRIMARY_NAV.map(({ href, icon: Icon, label, badge }) => {
            const active = pathname === href || (href !== '/home' && pathname.startsWith(href + '/'));
            return (
              <ListItemButton
                key={href}
                component={Link}
                href={href}
                selected={active}
                sx={{ borderRadius: '12px', mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'text.secondary' }}>
                  {badge && unreadCount > 0 ? (
                    <Badge badgeContent={unreadCount} color="error" max={99}>
                      <Icon size={18} />
                    </Badge>
                  ) : <Icon size={18} />}
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  slotProps={{
                    primary: {
                      sx: {
                        fontSize: 14,
                        fontWeight: active ? 700 : 500,
                        color: active ? 'text.primary' : 'text.secondary',
                      },
                    },
                  }}
                />
                {active && (
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'primary.main' }} />
                )}
              </ListItemButton>
            );
          })}
        </List>

        {/* Secondary — Rewards & Earnings (desktop sidebar only) */}
        <Box sx={{ px: 1, pb: 1, borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
          <ListItemButton
            component={Link}
            href="/rewards"
            selected={pathname === '/rewards' || pathname.startsWith('/rewards/')}
            sx={{ borderRadius: '12px' }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: pathname.startsWith('/rewards') ? 'primary.main' : 'text.secondary' }}>
              <Wallet size={18} />
            </ListItemIcon>
            <ListItemText
              primary="Rewards & Earnings"
              slotProps={{
                primary: {
                  sx: {
                    fontSize: 14,
                    fontWeight: pathname.startsWith('/rewards') ? 700 : 500,
                    color: pathname.startsWith('/rewards') ? 'text.primary' : 'text.secondary',
                  },
                },
              }}
            />
          </ListItemButton>
        </Box>

        {/* User + theme toggle + logout at bottom */}
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
            <Avatar
              src={user?.avatarUrl ?? undefined}
              sx={{
                width: 34, height: 34,
                bgcolor: t.card,
                color: 'primary.main',
                fontSize: 13, fontWeight: 800,
              }}
            >
              {user?.displayName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: 'text.primary', display: 'block', lineHeight: 1.3 }}
                noWrap
              >
                {user?.displayName ?? user?.email?.split('@')[0]}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }} noWrap>
                {user?.email}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <ThemeToggleBtn />
            <IconButton
              size="small"
              onClick={handleSignOut}
              sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
            >
              <LogOut size={15} />
            </IconButton>
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}
