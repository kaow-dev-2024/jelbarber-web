'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography
} from '@mui/material';
import EntityManager from '@/components/EntityManager';
import { listEntities } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthProvider';

type Option = { value: string | number; label: string };

export default function TransectionPage() {
  const { token } = useAuth();
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [summaryMode, setSummaryMode] = useState<'day' | 'month' | 'year'>('month');
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

  const summaryRows = useMemo(() => {
    const formatKey = (value: unknown) => {
      if (!value) return '';
      const date = new Date(String(value));
      if (Number.isNaN(date.getTime())) return '';
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      if (summaryMode === 'year') return `${yyyy}`;
      if (summaryMode === 'month') return `${yyyy}-${mm}`;
      return `${yyyy}-${mm}-${dd}`;
    };
    const formatLabel = (key: string) => {
      if (!key) return '';
      if (summaryMode === 'year') return key;
      if (summaryMode === 'month') {
        const [y, m] = key.split('-');
        return `${m}/${y}`;
      }
      const [y, m, d] = key.split('-');
      return `${d}/${m}/${y}`;
    };

    return (rows: Record<string, unknown>[]) => {
      const map = new Map<string, { income: number; expense: number; count: number }>();
      rows.forEach((row) => {
        const key = formatKey(row.occurredAt);
        if (!key) return;
        if (!map.has(key)) map.set(key, { income: 0, expense: 0, count: 0 });
        const bucket = map.get(key)!;
        const amountRaw = row.amount;
        const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw);
        if (Number.isNaN(amount)) return;
        bucket.count += 1;
        if (row.type === 'income') bucket.income += amount;
        if (row.type === 'expense') bucket.expense += amount;
      });
      return Array.from(map.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([key, value]) => ({
          key,
          label: formatLabel(key),
          ...value,
          net: value.income - value.expense
        }));
    };
  }, [summaryMode]);

  return (
    <EntityManager
      title="รายรับ-รายจ่าย"
      endpoint="transection"
      accentColor="#D9B46C"
      formHeader={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box
            component="img"
            src="/icons/icon-pwa.png"
            alt="JelBarber"
            sx={{ width: 48, height: 48, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}
          />
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              JelBarber Studio
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ฟอร์มบันทึกรายรับ-รายจ่าย
            </Typography>
          </Box>
        </Box>
      }
      exportMeta={{
        title: 'JelBarber Studio',
        subtitle: 'รายงานรายรับ-รายจ่าย',
        logoUrl: '/icons/icon-pwa.png',
        accentColor: '#D9B46C'
      }}
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
        const format = (value: number) =>
          value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const items = summaryRows(rows);
        return (
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', md: 'center' }}
              sx={{ px: { xs: 0.5, sm: 0 }, pb: { xs: 0.5, sm: 0 } }}
            >
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#D9B46C' }}>
                สรุปผลตามช่วงเวลา
              </Typography>
              <FormControl sx={{ minWidth: 200, px: { xs: 0.5, sm: 0 } }}>
                <InputLabel>รูปแบบสรุป</InputLabel>
                <Select
                  label="รูปแบบสรุป"
                  value={summaryMode}
                  onChange={(event) =>
                    setSummaryMode(event.target.value as 'day' | 'month' | 'year')
                  }
                >
                  <MenuItem value="day">รายวัน</MenuItem>
                  <MenuItem value="month">รายเดือน</MenuItem>
                  <MenuItem value="year">รายปี</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: '1fr 1fr',
                  lg: 'repeat(4, minmax(200px, 1fr))'
                },
                gap: 2,
                px: { xs: 0.5, sm: 0 }
              }}
            >
              {items.map((item) => (
                <Card
                  key={item.key}
                  sx={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    height: '100%'
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      {item.label || item.key}
                    </Typography>
                    <Typography variant="body2">
                      รวม {item.count.toLocaleString('th-TH')} รายการ
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      รายรับ {format(item.income)}
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      รายจ่าย {format(item.expense)}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{ color: item.net >= 0 ? 'success.main' : 'error.main' }}
                    >
                      สุทธิ {format(item.net)}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
              {items.length === 0 && (
                <Card sx={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      ไม่มีข้อมูลสำหรับช่วงนี้
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Stack>
        );
      }}
      searchKeys={['note', 'category']}
    />
  );
}
