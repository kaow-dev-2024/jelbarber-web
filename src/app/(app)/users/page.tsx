'use client';

import { Alert, Stack } from '@mui/material';
import EntityManager from '@/components/EntityManager';
import { useAuth } from '@/components/auth/AuthProvider';

export default function UsersPage() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <Stack spacing={2}>
        <Alert severity="warning">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</Alert>
      </Stack>
    );
  }

  return (
    <EntityManager
      title="ผู้ใช้งาน"
      endpoint="users"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'email', label: 'อีเมล' },
        { key: 'name', label: 'ชื่อ' },
        { key: 'phone', label: 'โทรศัพท์' },
        { key: 'role', label: 'บทบาท' },
        { key: 'isActive', label: 'สถานะ' }
      ]}
      formFields={[
        { key: 'email', label: 'อีเมล', type: 'text', required: true, showOn: 'create' },
        { key: 'password', label: 'รหัสผ่าน', type: 'password', showOn: 'both' },
        { key: 'name', label: 'ชื่อ', type: 'text', required: true },
        { key: 'phone', label: 'โทรศัพท์', type: 'text' },
        {
          key: 'role',
          label: 'บทบาท',
          type: 'select',
          options: [
            { value: 'member', label: 'ลูกค้า' },
            { value: 'employee', label: 'ช่าง' },
            { value: 'admin', label: 'ผู้ดูแล' }
          ]
        },
        { key: 'isActive', label: 'สถานะ', type: 'boolean' }
      ]}
      filters={[
        {
          key: 'role',
          label: 'บทบาท',
          type: 'select',
          options: [
            { value: 'member', label: 'ลูกค้า' },
            { value: 'employee', label: 'ช่าง' },
            { value: 'admin', label: 'ผู้ดูแล' }
          ]
        },
        {
          key: 'isActive',
          label: 'สถานะ',
          type: 'select',
          options: [
            { value: 'true', label: 'ใช้งาน' },
            { value: 'false', label: 'ไม่ใช้งาน' }
          ]
        }
      ]}
      searchKeys={['email', 'name', 'phone']}
    />
  );
}
