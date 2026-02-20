'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { loginRequest } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      setLoading(true);
      const { token } = await loginRequest(email, password);
      login(token);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2
      }}
    >
      <Paper sx={{ p: { xs: 3, md: 5 }, maxWidth: 420, width: '100%' }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h3">JelBarber</Typography>
            <Typography variant="body2" color="text.secondary">
              เข้าสู่ระบบเพื่อจัดการร้าน
            </Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="อีเมล"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              fullWidth
            />
            <TextField
              label="รหัสผ่าน"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" disabled={loading}>
              เข้าสู่ระบบ
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            ยังไม่มีบัญชี? <Link href="/register">สมัครสมาชิก</Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
