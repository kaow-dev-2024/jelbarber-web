'use client';

import { useEffect, useMemo, useState } from 'react';
import EntityManager from '@/components/EntityManager';
import { listEntities } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthProvider';

type Option = { value: number; label: string };

export default function InventoryPage() {
  const { token } = useAuth();
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

  return (
    <EntityManager
      title="คลังสินค้า"
      endpoint="inventory"
      enableExport
      columns={[
        { key: 'id', label: 'ID' },
        {
          key: 'branchId',
          label: 'สาขา',
          render: (row) => resolveLabel(row.branchId ?? row.BranchId, branchLabelById)
        },
        { key: 'sku', label: 'SKU' },
        { key: 'name', label: 'สินค้า' },
        { key: 'quantity', label: 'จำนวน' },
        { key: 'unit', label: 'หน่วย' },
        { key: 'cost', label: 'ต้นทุน' }
      ]}
      formFields={[
        {
          key: 'branchId',
          label: 'สาขา',
          type: 'autocomplete',
          options: branchOptions,
          required: true
        },
        { key: 'sku', label: 'SKU', type: 'text', required: true },
        { key: 'name', label: 'ชื่อสินค้า', type: 'text', required: true },
        { key: 'quantity', label: 'จำนวน', type: 'number', step: '1' },
        { key: 'unit', label: 'หน่วย', type: 'text' },
        { key: 'cost', label: 'ต้นทุน', type: 'number', step: '0.01' }
      ]}
      filters={[
        {
          key: 'branchId',
          label: 'สาขา',
          type: 'autocomplete',
          options: branchOptions
        }
      ]}
      searchKeys={['sku', 'name']}
    />
  );
}
