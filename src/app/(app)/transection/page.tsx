'use client';

import EntityManager, { StatusChip } from '@/components/EntityManager';

export default function TransectionPage() {
  return (
    <EntityManager
      title="รายรับ-รายจ่าย"
      endpoint="transection"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'type', label: 'ประเภท' },
        { key: 'title', label: 'รายการ' },
        { key: 'amount', label: 'จำนวนเงิน' },
        { key: 'currency', label: 'สกุลเงิน' },
        {
          key: 'status',
          label: 'สถานะ',
          render: (row) => <StatusChip value={String(row.status || '')} />
        },
        { key: 'occurredAt', label: 'วันที่' },
        { key: 'notes', label: 'หมายเหตุ' }
      ]}
      formFields={[
        {
          key: 'type',
          label: 'ประเภท',
          type: 'select',
          options: [
            { value: 'income', label: 'รายรับ' },
            { value: 'expense', label: 'รายจ่าย' }
          ],
          required: true
        },
        { key: 'title', label: 'รายการ', type: 'text', required: true },
        { key: 'amount', label: 'จำนวนเงิน', type: 'number', step: '0.01', required: true },
        { key: 'currency', label: 'สกุลเงิน', type: 'text' },
        {
          key: 'status',
          label: 'สถานะ',
          type: 'select',
          options: [
            { value: 'pending', label: 'รอดำเนินการ' },
            { value: 'paid', label: 'ชำระแล้ว' },
            { value: 'refunded', label: 'คืนเงิน' }
          ]
        },
        { key: 'occurredAt', label: 'วันที่', type: 'datetime', required: true },
        { key: 'notes', label: 'หมายเหตุ', type: 'textarea' }
      ]}
      filters={[
        {
          key: 'type',
          label: 'ประเภท',
          type: 'select',
          options: [
            { value: 'income', label: 'รายรับ' },
            { value: 'expense', label: 'รายจ่าย' }
          ]
        },
        {
          key: 'status',
          label: 'สถานะ',
          type: 'select',
          options: [
            { value: 'pending', label: 'รอดำเนินการ' },
            { value: 'paid', label: 'ชำระแล้ว' },
            { value: 'refunded', label: 'คืนเงิน' }
          ]
        }
      ]}
      searchKeys={['title', 'notes']}
    />
  );
}
