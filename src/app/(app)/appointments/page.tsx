'use client';

import EntityManager, { StatusChip } from '@/components/EntityManager';

export default function AppointmentsPage() {
  return (
    <EntityManager
      title="นัดหมาย"
      endpoint="appointments"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'branchId', label: 'สาขา' },
        { key: 'memberId', label: 'ลูกค้า' },
        { key: 'employeeId', label: 'ช่าง' },
        { key: 'startAt', label: 'เริ่ม' },
        { key: 'endAt', label: 'สิ้นสุด' },
        {
          key: 'status',
          label: 'สถานะ',
          render: (row) => <StatusChip value={String(row.status || '')} />
        }
      ]}
      formFields={[
        { key: 'branchId', label: 'รหัสสาขา', type: 'number', required: true },
        { key: 'memberId', label: 'รหัสลูกค้า', type: 'number', required: true },
        { key: 'employeeId', label: 'รหัสช่าง', type: 'number' },
        { key: 'startAt', label: 'เวลาเริ่ม', type: 'datetime', required: true },
        { key: 'endAt', label: 'เวลาสิ้นสุด', type: 'datetime', required: true },
        {
          key: 'status',
          label: 'สถานะ',
          type: 'select',
          options: [
            { value: 'scheduled', label: 'จองไว้' },
            { value: 'completed', label: 'สำเร็จ' },
            { value: 'cancelled', label: 'ยกเลิก' }
          ]
        },
        { key: 'notes', label: 'หมายเหตุ', type: 'textarea' }
      ]}
      filters={[
        {
          key: 'status',
          label: 'สถานะ',
          type: 'select',
          options: [
            { value: 'scheduled', label: 'จองไว้' },
            { value: 'completed', label: 'สำเร็จ' },
            { value: 'cancelled', label: 'ยกเลิก' }
          ]
        }
      ]}
      searchKeys={['notes', 'id']}
    />
  );
}
