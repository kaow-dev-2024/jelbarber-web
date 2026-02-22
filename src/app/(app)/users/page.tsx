'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Stack } from '@mui/material';
import EntityManager from '@/components/EntityManager';
import { listEntities } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthProvider';

type Option = { value: number; label: string };

export default function UsersPage() {
  const { user, token } = useAuth();
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);

  const toLabel = (row: Record<string, unknown>) =>
    String(row.name || row.title || row.email || row.phone || row.id || '-');

  useEffect(() => {
    if (!token) return;
    const loadOptions = async () => {
      const branches = await listEntities<Record<string, unknown> & { id: number }>(
        'branches',
        token,
        { limit: 500 }
      );
      setBranchOptions(
        branches.map((row) => ({
          value: Number(row.id),
          label: toLabel(row)
        }))
      );
    };
    loadOptions();
  }, [token]);

  const branchLabelById = useMemo(
    () => Object.fromEntries(branchOptions.map((option) => [String(option.value), option.label])),
    [branchOptions]
  );
  const resolveLabel = (value: unknown, map: Record<string, string>) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'object') {
      return toLabel(value as Record<string, unknown>);
    }
    const key = String(value);
    return map[key] || key;
  };

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
        {
          key: 'branchId',
          label: 'สาขา',
          render: (row) => resolveLabel(row.branchId ?? row.BranchId, branchLabelById)
        },
        { key: 'email', label: 'อีเมล' },
        { key: 'name', label: 'ชื่อ' },
        { key: 'phone', label: 'โทรศัพท์' },
        { key: 'role', label: 'บทบาท' },
        { key: 'isActive', label: 'สถานะ' }
      ]}
      formFields={[
        {
          key: 'branchId',
          label: 'สาขา',
          type: 'autocomplete',
          options: branchOptions
        },
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
          type: 'boolean',
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
