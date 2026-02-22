'use client';

import { useEffect, useMemo, useState } from 'react';
import EntityManager, { StatusChip } from '@/components/EntityManager';
import { listEntities } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthProvider';

type Option = { value: number; label: string };

export default function AppointmentsPage() {
  const { token } = useAuth();
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [memberOptions, setMemberOptions] = useState<Option[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<Option[]>([]);
  const [branches, setBranches] = useState<Record<string, unknown>[]>([]);

  const toLabel = (row: Record<string, unknown>) =>
    String(row.name || row.title || row.email || row.phone || row.id || '-');

  useEffect(() => {
    if (!token) return;
    const loadOptions = async () => {
      const [branches, users] = await Promise.all([
        listEntities<Record<string, unknown> & { id: number }>('branches', token, { limit: 500 }),
        listEntities<Record<string, unknown> & { id: number }>('users', token, { limit: 500 })
      ]);

      setBranches(branches);
      setBranchOptions(
        branches.map((row) => ({
          value: Number(row.id),
          label: toLabel(row)
        }))
      );

      const members = users.filter((row) => String(row.role) === 'member');
      const employees = users.filter((row) => String(row.role) === 'employee');

      setMemberOptions(
        members.map((row) => ({
          value: Number(row.id),
          label: toLabel(row)
        }))
      );

      setEmployeeOptions(
        employees.map((row) => ({
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
  const branchById = useMemo(
    () =>
      Object.fromEntries(
        branches
          .filter((row) => row && (row as { id?: number | string }).id !== undefined)
          .map((row) => [String((row as { id: number | string }).id), row])
      ),
    [branches]
  );
  const memberLabelById = useMemo(
    () => Object.fromEntries(memberOptions.map((option) => [String(option.value), option.label])),
    [memberOptions]
  );
  const employeeLabelById = useMemo(
    () =>
      Object.fromEntries(employeeOptions.map((option) => [String(option.value), option.label])),
    [employeeOptions]
  );

  const resolveLabel = (value: unknown, map: Record<string, string>) => {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'object') {
      return toLabel(value as Record<string, unknown>);
    }
    const key = String(value);
    return map[key] || key;
  };

  const resolveBranchObject = (row: Record<string, unknown>) => {
    const embedded = row.Branch || row.branch;
    if (embedded && typeof embedded === 'object') {
      return embedded as Record<string, unknown>;
    }
    const branchId = row.branchId ?? row.BranchId;
    if (branchId !== undefined && branchId !== null) {
      return branchById[String(branchId)] || null;
    }
    return null;
  };

  const resolveMemberName = (row: Record<string, unknown>) => {
    const embedded = row.Member || row.member;
    if (embedded && typeof embedded === 'object') {
      return toLabel(embedded as Record<string, unknown>);
    }
    const memberId = row.memberId ?? row.MemberId;
    return resolveLabel(memberId, memberLabelById);
  };

  const resolveEmployeeName = (row: Record<string, unknown>) => {
    const embedded = row.Employee || row.employee;
    if (embedded && typeof embedded === 'object') {
      return toLabel(embedded as Record<string, unknown>);
    }
    const employeeId = row.employeeId ?? row.EmployeeId;
    return resolveLabel(employeeId, employeeLabelById);
  };

  return (
    <EntityManager
      title="นัดหมาย"
      endpoint="appointments"
      columns={[
        { key: 'id', label: 'ID' },
        {
          key: 'branchId',
          label: 'สาขา',
          render: (row) => {
            const branch = resolveBranchObject(row);
            return branch ? toLabel(branch) : resolveLabel(row.branchId ?? row.BranchId, branchLabelById);
          }
        },
        {
          key: 'memberId',
          label: 'ลูกค้า',
          render: (row) => resolveMemberName(row)
        },
        {
          key: 'employeeId',
          label: 'ช่าง',
          render: (row) => resolveEmployeeName(row)
        },
        { key: 'startAt', label: 'เริ่ม' },
        { key: 'endAt', label: 'สิ้นสุด' },
        {
          key: 'status',
          label: 'สถานะ',
          render: (row) => <StatusChip value={String(row.status || '')} />
        }
      ]}
      formFields={[
        {
          key: 'branchId',
          label: 'สาขา',
          type: 'autocomplete',
          options: branchOptions,
          required: true
        },
        {
          key: 'memberId',
          label: 'ลูกค้า',
          type: 'autocomplete',
          options: memberOptions,
          required: true
        },
        {
          key: 'employeeId',
          label: 'ช่าง',
          type: 'autocomplete',
          options: employeeOptions
        },
        { key: 'startAt', label: 'เวลาเริ่ม', type: 'datetime', required: true },
        { key: 'endAt', label: 'เวลาสิ้นสุด', type: 'datetime', required: true },
        {
          key: 'status',
          label: 'สถานะ',
          type: 'select',
          options: [
            { value: 'Booked', label: 'จองไว้' },
            { value: 'Successful', label: 'สำเร็จ' },
            { value: 'Cancelled', label: 'ยกเลิก' }
          ]
        },
        { key: 'notes', label: 'หมายเหตุ', type: 'textarea' }
      ]}
      filters={[
        {
          key: 'branchId',
          label: 'สาขา',
          type: 'autocomplete',
          options: branchOptions
        },
        {
          key: 'status',
          label: 'สถานะ',
          type: 'select',
          options: [
            { value: 'Booked', label: 'จองไว้' },
            { value: 'Successful', label: 'สำเร็จ' },
            { value: 'Cancelled', label: 'ยกเลิก' }
          ]
        }
      ]}
      searchKeys={['notes', 'id']}
    />
  );
}
