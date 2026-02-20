'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { listEntities } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthProvider';

const sections = [
  { label: 'นัดหมาย', endpoint: 'appointments', href: '/appointments' },
  { label: 'สาขา', endpoint: 'branches', href: '/branches' },
  { label: 'คลังสินค้า', endpoint: 'inventory', href: '/inventory' },
  { label: 'รายรับ-รายจ่าย', endpoint: 'transection', href: '/transection' },
  { label: 'ผู้ใช้งาน', endpoint: 'users', href: '/users' }
];

export default function DashboardPage() {
  const { token, user } = useAuth();
  const API_LIMIT = 100;
  const [counts, setCounts] = useState<Record<string, number | string>>({});

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      const results = await Promise.all(
        sections.map(async (section) => {
          try {
            const data = await listEntities<{ id: number }>(section.endpoint, token, {
              limit: API_LIMIT
            });
            const count = data.length >= API_LIMIT ? `${API_LIMIT}+` : data.length;
            return [section.endpoint, count] as const;
          } catch {
            return [section.endpoint, 0] as const;
          }
        })
      );
      setCounts(Object.fromEntries(results));
    };
    load();
  }, [token]);

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(135deg, rgba(202,161,90,0.12), rgba(0,0,0,0))'
        }}
      >
        <Typography variant="h2">ศูนย์ควบคุมร้านตัดผม</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520 }}>
          สวัสดี {user?.email || 'ช่างตัดผม'} ยินดีต้อนรับสู่ระบบบริหารจัดการร้านตัดผมแบบครบวงจร
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }
        }}
      >
        {sections
          .filter((section) => section.endpoint !== 'users' || user?.role === 'admin')
          .map((section) => (
            <Card key={section.endpoint} sx={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h5">{section.label}</Typography>
                    <Typography variant="h3">{counts[section.endpoint] ?? '-'}</Typography>
                  </Box>
                  <Button variant="outlined" component={Link} href={section.href}>
                    จัดการข้อมูล
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
      </Box>
    </Stack>
  );
}
