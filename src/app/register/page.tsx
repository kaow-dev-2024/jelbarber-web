'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { registerRequest, loginRequest } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthProvider';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'member'
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (key: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      setLoading(true);
      await registerRequest({
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone,
        role: form.role
      });
      const { token } = await loginRequest(form.email, form.password);
      login(token);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สมัครสมาชิกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Paper sx={{ p: { xs: 3, md: 5 }, maxWidth: 520, width: '100%' }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h3">สมัครสมาชิก</Typography>
            <Typography variant="body2" color="text.secondary">
              สร้างบัญชีใหม่เพื่อใช้งานระบบ
            </Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="อีเมล"
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              required
              fullWidth
            />
            <TextField
              label="รหัสผ่าน"
              type="password"
              value={form.password}
              onChange={handleChange('password')}
              required
              fullWidth
            />
            <TextField
              label="ชื่อ"
              value={form.name}
              onChange={handleChange('name')}
              required
              fullWidth
            />
            <TextField
              label="เบอร์โทร"
              value={form.phone}
              onChange={handleChange('phone')}
              fullWidth
            />
            <TextField
              label="บทบาท"
              select
              value={form.role}
              onChange={handleChange('role')}
              fullWidth
            >
              <MenuItem value="member">ลูกค้า</MenuItem>
              <MenuItem value="employee">ช่าง</MenuItem>
              <MenuItem value="admin">ผู้ดูแล</MenuItem>
            </TextField>
            <Button type="submit" variant="contained" size="large" disabled={loading}>
              สมัครสมาชิก
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary">
            มีบัญชีแล้ว? <Link href="/login">เข้าสู่ระบบ</Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
