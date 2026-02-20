'use client';

import EntityManager from '@/components/EntityManager';

export default function BranchesPage() {
  return (
    <EntityManager
      title="สาขา"
      endpoint="branches"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'ชื่อสาขา' },
        { key: 'address', label: 'ที่อยู่' },
        { key: 'phone', label: 'โทรศัพท์' },
        { key: 'isActive', label: 'สถานะ' }
      ]}
      formFields={[
        { key: 'name', label: 'ชื่อสาขา', type: 'text', required: true },
        { key: 'address', label: 'ที่อยู่', type: 'text' },
        { key: 'phone', label: 'โทรศัพท์', type: 'text' },
        { key: 'isActive', label: 'สถานะ', type: 'boolean' }
      ]}
      filters={[
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
      searchKeys={['name', 'address', 'phone']}
    />
  );
}
