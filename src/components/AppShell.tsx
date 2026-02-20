'use client';

import React, { useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery
} from '@mui/material';
import {
  CalendarMonth,
  Storefront,
  Inventory2,
  People,
  Dashboard,
  Menu as MenuIcon
} from '@mui/icons-material';
import { AccountBalanceWallet } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

const drawerWidth = 260;

const navItems = [
  { label: 'แดชบอร์ด', href: '/dashboard', icon: <Dashboard /> },
  { label: 'นัดหมาย', href: '/appointments', icon: <CalendarMonth /> },
  { label: 'สาขา', href: '/branches', icon: <Storefront /> },
  { label: 'คลังสินค้า', href: '/inventory', icon: <Inventory2 /> },
  { label: 'รายรับ-รายจ่าย', href: '/transection', icon: <AccountBalanceWallet /> },
  { label: 'ผู้ใช้งาน', href: '/users', icon: <People /> }
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNav = navItems.filter((item) => {
    if (item.href === '/users' && user?.role !== 'admin') return false;
    return true;
  });

  const drawerContent = (
    <>
      <Toolbar />
      <Box sx={{ px: 2, py: 3 }}>
        <Typography variant="subtitle2" color="text.secondary">
          เมนูหลัก
        </Typography>
      </Box>
      <List sx={{ px: 1 }}>
        {filteredNav.map((item) => (
          <ListItemButton
            key={item.href}
            selected={pathname === item.href}
            onClick={() => {
              router.push(item.href);
              setMobileOpen(false);
            }}
            sx={{
              borderRadius: 2,
              mb: 1,
              '&.Mui-selected': {
                background: 'rgba(202,161,90,0.2)'
              }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ mt: 2, opacity: 0.2 }} />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          บทบาท: {user?.role || 'guest'}
        </Typography>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(120deg, rgba(22,19,16,0.9), rgba(41,32,24,0.95))',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            {!isMdUp && (
              <IconButton color="inherit" onClick={() => setMobileOpen(true)}>
                <MenuIcon />
              </IconButton>
            )}
            <Box>
              <Typography variant="h4">JelBarber Shop</Typography>
              <Typography variant="caption" color="text.secondary">
                ศูนย์ควบคุมร้าน
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="outlined"
            onClick={() => {
              logout();
              router.replace('/login');
            }}
          >
            ออกจากระบบ
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: 'rgba(24, 20, 16, 0.98)',
            borderRight: '1px solid rgba(255,255,255,0.08)'
          }
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: 'rgba(24, 20, 16, 0.95)',
            borderRight: '1px solid rgba(255,255,255,0.08)'
          }
        }}
      >
        {drawerContent}
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 4 },
          minHeight: '100vh',
          marginLeft: { xs: 0, md: `${drawerWidth}px` },
          pt: { xs: 10, md: 12 }
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
