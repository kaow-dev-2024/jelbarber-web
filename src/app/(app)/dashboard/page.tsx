'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { listEntities } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthProvider';

const sections = [
  { label: 'นัดหมาย', endpoint: 'appointments', href: '/appointments' },
  { label: 'สาขา', endpoint: 'branches', href: '/branches' },
  { label: 'คลังสินค้า', endpoint: 'inventory', href: '/inventory' },
  { label: 'รายรับ-รายจ่าย', endpoint: 'transection', href: '/transection' },
  { label: 'ผู้ใช้งาน', endpoint: 'users', href: '/users' }
];

export default function DashboardPage() {
  const { token, user } = useAuth();
  const API_LIMIT = 100;
  const [counts, setCounts] = useState<Record<string, number | string>>({});
  const [kpi, setKpi] = useState({
    income: 0,
    expense: 0,
    net: 0,
    transectionCount: 0,
    appointmentCount: 0
  });
  const [netSeries, setNetSeries] = useState<number[]>([]);
  const [netLabels, setNetLabels] = useState<string[]>([]);
  const [appointmentStatus, setAppointmentStatus] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      const results = await Promise.all(
        sections.map(async (section) => {
          try {
            const data = await listEntities<{ id: number }>(section.endpoint, token, {
              limit: API_LIMIT
            });
            const count = data.length >= API_LIMIT ? `${API_LIMIT}+` : data.length;
            return [section.endpoint, count] as const;
          } catch {
            return [section.endpoint, 0] as const;
          }
        })
      );
      setCounts(Object.fromEntries(results));
    };
    load();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const loadKpi = async () => {
      try {
        const [transectionRows, appointmentRows] = await Promise.all([
          listEntities<Record<string, unknown> & { id: number }>('transection', token, {
            limit: 500
          }),
          listEntities<Record<string, unknown> & { id: number }>('appointments', token, {
            limit: 500
          })
        ]);

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const { labels, seriesMap } = buildLastDays(14);

        let income = 0;
        let expense = 0;
        let transectionCount = 0;
        for (const row of transectionRows) {
          const amountRaw = row.amount;
          const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw);
          if (Number.isNaN(amount)) continue;
          const dateValue = new Date(String(row.occurredAt));
          if (Number.isNaN(dateValue.getTime())) continue;

          transectionCount += 1;
          if (dateValue >= monthStart && dateValue <= now) {
            if (row.type === 'income') income += amount;
            if (row.type === 'expense') expense += amount;
          }

          const key = toDateKey(dateValue);
          const bucket = seriesMap.get(key);
          if (bucket) {
            if (row.type === 'income') bucket.income += amount;
            if (row.type === 'expense') bucket.expense += amount;
          }
        }

        const net = income - expense;
        const netSeriesNext = labels.map((labelKey) => {
          const bucket = seriesMap.get(labelKey);
          if (!bucket) return 0;
          return bucket.income - bucket.expense;
        });

        const statusCounts: Record<string, number> = {};
        appointmentRows.forEach((row) => {
          const status = String(row.status || 'unknown');
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        setKpi({
          income,
          expense,
          net,
          transectionCount,
          appointmentCount: appointmentRows.length
        });
        setNetSeries(netSeriesNext);
        setNetLabels(labels.map((key) => formatShortDate(key)));
        setAppointmentStatus(statusCounts);
      } catch {
        setKpi((prev) => ({ ...prev }));
        setNetSeries([]);
        setNetLabels([]);
        setAppointmentStatus({});
      }
    };

    loadKpi();
  }, [token]);

  const kpiCards = useMemo(
    () => [
      {
        label: 'รายรับเดือนนี้',
        value: kpi.income,
        color: 'success.main'
      },
      {
        label: 'รายจ่ายเดือนนี้',
        value: kpi.expense,
        color: 'error.main'
      },
      {
        label: 'สุทธิเดือนนี้',
        value: kpi.net,
        color: kpi.net >= 0 ? 'success.main' : 'error.main'
      },
      {
        label: 'รายการทั้งหมด',
        value: kpi.transectionCount,
        color: 'text.primary',
        isCount: true
      },
      {
        label: 'นัดหมายทั้งหมด',
        value: kpi.appointmentCount,
        color: 'text.primary',
        isCount: true
      }
    ],
    [kpi]
  );

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(135deg, rgba(202,161,90,0.12), rgba(0,0,0,0))'
        }}
      >
        <Typography variant="h2">ศูนย์ควบคุมร้านตัดผม</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520 }}>
          สวัสดี {user?.email || 'ช่างตัดผม'} ยินดีต้อนรับสู่ระบบบริหารจัดการร้านตัดผมแบบครบวงจร
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }
        }}
      >
        {sections
          .filter((section) => section.endpoint !== 'users' || user?.role === 'admin')
          .map((section) => (
            <Card key={section.endpoint} sx={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h5">{section.label}</Typography>
                    <Typography variant="h3">{counts[section.endpoint] ?? '-'}</Typography>
                  </Box>
                  <Button variant="outlined" component={Link} href={section.href}>
                    จัดการข้อมูล
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(5, 1fr)' }
        }}
      >
        {kpiCards.map((card) => (
          <Card key={card.label} sx={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {card.label}
              </Typography>
              <Typography variant="h5" color={card.color}>
                {card.isCount
                  ? Number(card.value).toLocaleString('th-TH')
                  : Number(card.value).toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }
        }}
      >
        <Card sx={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <CardContent>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h5">สุทธิรายวัน 14 วันล่าสุด</Typography>
                <Typography variant="body2" color="text.secondary">
                  รายรับลบรายจ่าย ตามรายการที่แสดงในระบบ
                </Typography>
              </Box>
              <LineChart labels={netLabels} data={netSeries} />
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <CardContent>
            <Stack spacing={2} alignItems="center">
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5">สถานะนัดหมาย</Typography>
                <Typography variant="body2" color="text.secondary">
                  สัดส่วนจากข้อมูลในระบบ
                </Typography>
              </Box>
              <DonutChart data={appointmentStatus} />
              <Stack spacing={1} sx={{ width: '100%' }}>
                {Object.entries(appointmentStatus).map(([key, value]) => (
                  <Stack key={key} direction="row" spacing={1} justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      {statusLabel(key)}
                    </Typography>
                    <Typography variant="body2">{value}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}

function toDateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function buildLastDays(days: number) {
  const labels: string[] = [];
  const seriesMap = new Map<string, { income: number; expense: number }>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const key = toDateKey(date);
    labels.push(key);
    seriesMap.set(key, { income: 0, expense: 0 });
  }
  return { labels, seriesMap };
}

function formatShortDate(dateKey: string) {
  const [yyyy, mm, dd] = dateKey.split('-');
  return `${dd}/${mm}`;
}

function LineChart({ data, labels }: { data: number[]; labels: string[] }) {
  if (!data.length) {
    return (
      <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
        ไม่มีข้อมูลสำหรับแสดงกราฟ
      </Box>
    );
  }

  const width = 600;
  const height = 180;
  const padding = 18;
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 0);
  const range = max - min || 1;
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = padding + ((max - value) / range) * (height - padding * 2);
    return { x, y };
  });

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ');

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="180">
        <defs>
          <linearGradient id="netFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#7ad7ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7ad7ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${path} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
          fill="url(#netFill)"
        />
        <path d={path} stroke="#7ad7ff" strokeWidth="2" fill="none" />
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="rgba(255,255,255,0.12)"
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="rgba(255,255,255,0.12)"
        />
      </svg>
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {labels[0]}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {labels[labels.length - 1]}
        </Typography>
      </Stack>
    </Box>
  );
}

function DonutChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const colors = {
    scheduled: '#7ad7ff',
    completed: '#3ddc84',
    cancelled: '#ff6b6b',
    unknown: '#b0b7c3'
  };

  if (!total) {
    return (
      <Box sx={{ py: 4, color: 'text.secondary' }}>
        ไม่มีข้อมูลสำหรับแสดงกราฟ
      </Box>
    );
  }

  let offset = 0;
  return (
    <svg viewBox="0 0 36 36" width="160" height="160">
      <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
      {entries.map(([key, value]) => {
        const pct = (value / total) * 100;
        const strokeDasharray = `${pct} ${100 - pct}`;
        const strokeDashoffset = 25 - offset;
        offset += pct;
        return (
          <circle
            key={key}
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke={colors[key as keyof typeof colors] || colors.unknown}
            strokeWidth="6"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        );
      })}
      <text x="18" y="20" textAnchor="middle" fontSize="6" fill="#ffffff">
        {total}
      </text>
    </svg>
  );
}

function statusLabel(status: string) {
  if (status === 'scheduled') return 'จองไว้';
  if (status === 'completed') return 'สำเร็จ';
  if (status === 'cancelled') return 'ยกเลิก';
  return status;
}
