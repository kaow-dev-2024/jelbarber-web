'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import EntityManager from '@/components/EntityManager';
import { listEntities } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthProvider';

type Option = { value: string | number; label: string };

export default function TransectionPage() {
  const { token } = useAuth();
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const categoryOptionsByType = useMemo<Record<string, Option[]>>(
    () => ({
      income: [
        { value: 'รายได้ค่าตัดผมชาย', label: 'รายได้ค่าตัดผมชาย' },
        { value: 'รายได้โกนหนวด/กันเครา', label: 'รายได้โกนหนวด/กันเครา' },
        { value: 'รายได้สระผม', label: 'รายได้สระผม' },
        { value: 'รายได้แพ็กเกจ/สมาชิก', label: 'รายได้แพ็กเกจ/สมาชิก' },
        { value: 'รายได้บริการนอกสถานที่', label: 'รายได้บริการนอกสถานที่' },
        { value: 'รายได้ขายสินค้า (แว็กซ์/โพเมด/แชมพู)', label: 'รายได้ขายสินค้า (แว็กซ์/โพเมด/แชมพู)' },
        { value: 'รายได้ทิป', label: 'รายได้ทิป' },
        { value: 'รายได้อื่นๆ', label: 'รายได้อื่นๆ' }
      ],
      expense: [
        { value: 'ต้นทุนสินค้าเพื่อขาย (แว็กซ์/โพเมด/แชมพู)', label: 'ต้นทุนสินค้าเพื่อขาย (แว็กซ์/โพเมด/แชมพู)' },
        { value: 'วัสดุสิ้นเปลือง (ใบมีด/โฟมโกนหนวด/แอลกอฮอล์)', label: 'วัสดุสิ้นเปลือง (ใบมีด/โฟมโกนหนวด/แอลกอฮอล์)' },
        { value: 'ของใช้ทำความสะอาด/ซักรีด', label: 'ของใช้ทำความสะอาด/ซักรีด' },
        { value: 'เงินเดือนพนักงาน', label: 'เงินเดือนพนักงาน' },
        { value: 'ค่าคอมมิชชั่นช่าง', label: 'ค่าคอมมิชชั่นช่าง' },
        { value: 'สวัสดิการ/ประกันสังคม', label: 'สวัสดิการ/ประกันสังคม' },
        { value: 'ค่าเช่าร้าน', label: 'ค่าเช่าร้าน' },
        { value: 'ค่าส่วนกลาง/ค่าที่จอดรถ', label: 'ค่าส่วนกลาง/ค่าที่จอดรถ' },
        { value: 'ค่าไฟ', label: 'ค่าไฟ' },
        { value: 'ค่าน้ำ', label: 'ค่าน้ำ' },
        { value: 'ค่าอินเทอร์เน็ต/โทรศัพท์', label: 'ค่าอินเทอร์เน็ต/โทรศัพท์' },
        { value: 'ค่าซ่อมบำรุงอุปกรณ์', label: 'ค่าซ่อมบำรุงอุปกรณ์' },
        { value: 'ค่าซ่อมบำรุงร้าน', label: 'ค่าซ่อมบำรุงร้าน' },
        { value: 'ค่าโฆษณา/การตลาด', label: 'ค่าโฆษณา/การตลาด' },
        { value: 'ค่าทำป้าย/สื่อสิ่งพิมพ์', label: 'ค่าทำป้าย/สื่อสิ่งพิมพ์' },
        { value: 'ค่าคอมแพลตฟอร์มจองคิว', label: 'ค่าคอมแพลตฟอร์มจองคิว' },
        { value: 'ค่าธรรมเนียมธนาคาร/พร้อมเพย์', label: 'ค่าธรรมเนียมธนาคาร/พร้อมเพย์' },
        { value: 'ค่าธรรมเนียมบัตร/QR', label: 'ค่าธรรมเนียมบัตร/QR' },
        { value: 'ค่าวัสดุสำนักงาน', label: 'ค่าวัสดุสำนักงาน' },
        { value: 'ค่าเดินทาง/ขนส่ง', label: 'ค่าเดินทาง/ขนส่ง' },
        { value: 'ค่าบริการบัญชี/ที่ปรึกษา', label: 'ค่าบริการบัญชี/ที่ปรึกษา' },
        { value: 'ค่าระบบ POS/Subscription', label: 'ค่าระบบ POS/Subscription' },
        { value: 'ภาษี/ค่าธรรมเนียมราชการ', label: 'ภาษี/ค่าธรรมเนียมราชการ' },
        { value: 'ค่าเสื่อมราคาอุปกรณ์ร้าน', label: 'ค่าเสื่อมราคาอุปกรณ์ร้าน' },
        { value: 'ซื้ออุปกรณ์ถาวร (ปัตตาเลี่ยน/กรรไกร/เก้าอี้)', label: 'ซื้ออุปกรณ์ถาวร (ปัตตาเลี่ยน/กรรไกร/เก้าอี้)' },
        { value: 'ปรับปรุง/ตกแต่งร้าน', label: 'ปรับปรุง/ตกแต่งร้าน' }
      ]
    }),
    []
  );

  const toLabel = (row: Record<string, unknown>) =>
    String(row.name || row.title || row.email || row.phone || row.id || '-');

  useEffect(() => {
    if (!token) return;
    const loadOptions = async () => {
      const [branches] = await Promise.all([
        listEntities<Record<string, unknown> & { id: number }>('branches', token, { limit: 500 })
      ]);
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

  const defaultFilters = useMemo(() => {
    const today = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = `${year}-${pad(month + 1)}-01`;
    const todayInput = `${year}-${pad(month + 1)}-${pad(today.getDate())}`;
    return {
      occurredAtFrom: firstDay,
      occurredAtTo: todayInput
    };
  }, []);

  return (
    <EntityManager
      title="รายรับ-รายจ่าย"
      endpoint="transection"
      columns={[
        { key: 'id', label: 'ID' },
        {
          key: 'branchId',
          label: 'สาขา',
          render: (row) => resolveLabel(row.branchId ?? row.BranchId, branchLabelById)
        },
        { key: 'type', label: 'ประเภท' },
        { key: 'category', label: 'หมวดหมู่' },
        { key: 'amount', label: 'จำนวนเงิน' },
        { key: 'occurredAt', label: 'วันที่' },
        { key: 'note', label: 'หมายเหตุ' }
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
          key: 'type',
          label: 'ประเภท',
          type: 'select',
          options: [
            { value: 'income', label: 'รายรับ' },
            { value: 'expense', label: 'รายจ่าย' }
          ],
          required: true
        },
        {
          key: 'category',
          label: 'หมวดหมู่',
          type: 'autocomplete',
          options: (values) => {
            const type = values.type ? String(values.type) : '';
            if (type && categoryOptionsByType[type]) return categoryOptionsByType[type];
            return [];
          },
          required: true
        },
        { key: 'amount', label: 'จำนวนเงิน', type: 'number', step: '0.01', required: true },
        { key: 'occurredAt', label: 'วันที่', type: 'datetime', required: true },
        { key: 'note', label: 'หมายเหตุ', type: 'textarea' }
      ]}
      filters={[
        {
          key: 'branchId',
          label: 'สาขา',
          type: 'autocomplete',
          options: branchOptions
        },
        {
          key: 'type',
          label: 'ประเภท',
          type: 'select',
          options: [
            { value: 'income', label: 'รายรับ' },
            { value: 'expense', label: 'รายจ่าย' }
          ],
          onChange: () => ({ category: '' })
        },
        {
          key: 'category',
          label: 'หมวดหมู่',
          type: 'autocomplete',
          options: (values) => {
            const type = values.type ? String(values.type) : '';
            if (type && categoryOptionsByType[type]) return categoryOptionsByType[type];
            return [];
          },
          disabled: (values) => !values.type
        },
        {
          key: 'occurredAt',
          label: 'ช่วงวันที่',
          type: 'dateRange'
        }
      ]}
      defaultFilters={defaultFilters}
      summary={(rows) => {
        let income = 0;
        let expense = 0;
        let count = 0;
        rows.forEach((row) => {
          const amountRaw = row.amount;
          const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw);
          if (Number.isNaN(amount)) return;
          count += 1;
          if (row.type === 'income') {
            income += amount;
          } else if (row.type === 'expense') {
            expense += amount;
          }
        });
        const net = income - expense;
        const format = (value: number) =>
          value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Card sx={{ flex: 1, border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  รวมรายการ
                </Typography>
                <Typography variant="h5">{count.toLocaleString('th-TH')}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  รายรับรวม
                </Typography>
                <Typography variant="h5" color="success.main">
                  {format(income)}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  รายจ่ายรวม
                </Typography>
                <Typography variant="h5" color="error.main">
                  {format(expense)}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  สุทธิ
                </Typography>
                <Typography
                  variant="h5"
                  color={net >= 0 ? 'success.main' : 'error.main'}
                >
                  {format(net)}
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        );
      }}
      searchKeys={['note']}
    />
  );
}
