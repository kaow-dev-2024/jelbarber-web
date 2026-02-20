'use client';

import EntityManager from '@/components/EntityManager';

export default function InventoryPage() {
  return (
    <EntityManager
      title="คลังสินค้า"
      endpoint="inventory"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'branchId', label: 'สาขา' },
        { key: 'sku', label: 'SKU' },
        { key: 'name', label: 'สินค้า' },
        { key: 'quantity', label: 'จำนวน' },
        { key: 'unit', label: 'หน่วย' },
        { key: 'cost', label: 'ต้นทุน' }
      ]}
      formFields={[
        { key: 'branchId', label: 'รหัสสาขา', type: 'number', required: true },
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
          type: 'number'
        }
      ]}
      searchKeys={['sku', 'name']}
    />
  );
}
