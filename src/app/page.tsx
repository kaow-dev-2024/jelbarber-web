'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/components/auth/AuthProvider';

export default function HomePage() {
  const router = useRouter();
  const { token, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    router.replace(token ? '/dashboard' : '/login');
  }, [token, ready, router]);

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress color="secondary" />
    </Box>
  );
}
