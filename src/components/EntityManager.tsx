'use client';

import React, { useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Card,
  CardContent,
  TextField,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add, Delete, Edit, Refresh, FileDownload, PictureAsPdf } from '@mui/icons-material';
import { createEntity, deleteEntity, listEntities, updateEntity } from '@/lib/api';
import { useAuth } from '@/components/auth/AuthProvider';

type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'datetime'
  | 'boolean'
  | 'textarea'
  | 'password'
  | 'autocomplete';

type FieldOption = {
  value: string | number;
  label: string;
};

type FieldOptionsResolver = (values: Record<string, unknown>) => FieldOption[];

export type FieldConfig = {
  key: string;
  label: string;
  type: FieldType;
  options?: FieldOption[] | FieldOptionsResolver;
  required?: boolean;
  step?: string;
  showOn?: 'create' | 'edit' | 'both';
  sendNullWhenEmpty?: boolean;
  grid?: { xs?: number; md?: number };
};

export type ColumnConfig = {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
};

export type FilterConfig = {
  key: string;
  label: string;
  type: 'text' | 'select' | 'boolean' | 'number' | 'dateRange' | 'autocomplete';
  options?: FieldOption[] | FieldOptionsResolver;
  disabled?: boolean | ((values: Record<string, unknown>) => boolean);
  onChange?: (
    value: unknown,
    values: Record<string, unknown>
  ) => Record<string, unknown> | void;
};

export type EntityManagerProps = {
  title: string;
  endpoint: string;
  columns: ColumnConfig[];
  formFields: FieldConfig[];
  filters?: FilterConfig[];
  defaultFilters?: Record<string, unknown>;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  summary?: (rows: Record<string, unknown>[]) => React.ReactNode;
  defaultFormValues?: Record<string, unknown>;
  searchKeys?: string[];
  accentColor?: string;
  formHeader?: React.ReactNode;
  exportMeta?: {
    title?: string;
    subtitle?: string;
    logoUrl?: string;
    accentColor?: string;
  };
  enableExport?: boolean;
};

function formatDateTime(value: unknown) {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('th-TH');
}

function toDateTimeLocal(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const pad = (num: number) => String(num).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function fromDateTimeLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseDateInput(value: unknown, isEnd: boolean) {
  if (!value) return null;
  const date = new Date(`${String(value)}T${isEnd ? '23:59:59.999' : '00:00:00'}`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function normalizeBoolean(value: unknown) {
  if (value === true || value === false) return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  }
  return null;
}

function shallowEqualFilters(
  a: Record<string, unknown>,
  b: Record<string, unknown>
) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

export default function EntityManager({
  title,
  endpoint,
  columns,
  formFields,
  filters = [],
  defaultFilters,
  sortKey = 'id',
  sortOrder = 'desc',
  summary,
  defaultFormValues = {},
  searchKeys = [],
  accentColor,
  formHeader,
  exportMeta,
  enableExport = true
}: EntityManagerProps) {
  const LAZY_PAGE_SIZE = 20;
  const API_LIMIT = 100;
  const { token } = useAuth();
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');
  const resolvedDefaultFilters = defaultFilters ?? {};
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>(resolvedDefaultFilters);
  const [visibleCount, setVisibleCount] = useState(LAZY_PAGE_SIZE);

  const visibleFields = useMemo(() => {
    if (!editingRow) return formFields.filter((f) => f.showOn !== 'edit');
    return formFields.filter((f) => f.showOn !== 'create');
  }, [editingRow, formFields]);

  const fetchRows = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await listEntities<Record<string, unknown> & { id: number }>(endpoint, token, {
        limit: API_LIMIT
      });
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchRows();
  }, [token]);

  React.useEffect(() => {
    if (defaultFilters === undefined) return;
    if (Object.keys(defaultFilters).length === 0) return;
    setFilterValues((prev) =>
      shallowEqualFilters(prev, defaultFilters) ? prev : defaultFilters
    );
  }, [defaultFilters]);

  const handleOpenCreate = () => {
    setEditingRow(null);
    setFormValues(defaultFormValues);
    setFormOpen(true);
  };

  const handleOpenEdit = (row: Record<string, unknown>) => {
    const nextValues: Record<string, unknown> = { ...row };
    formFields.forEach((field) => {
      if (field.type === 'datetime') {
        nextValues[field.key] = toDateTimeLocal(row[field.key]);
        return;
      }
      if (field.type === 'autocomplete') {
        const direct = row[field.key];
        if (direct !== undefined && direct !== null && direct !== '') {
          nextValues[field.key] = direct;
          return;
        }
        const altKey = `${field.key.charAt(0).toUpperCase()}${field.key.slice(1)}`;
        const alt = row[altKey];
        if (alt !== undefined && alt !== null && alt !== '') {
          nextValues[field.key] = alt;
          return;
        }
        if (field.key.endsWith('Id')) {
          const baseKey = field.key.slice(0, -2);
          const embedded =
            (row[baseKey] as Record<string, unknown> | undefined) ??
            (row[`${baseKey.charAt(0).toUpperCase()}${baseKey.slice(1)}`] as
              | Record<string, unknown>
              | undefined);
          if (embedded && typeof embedded === 'object' && 'id' in embedded) {
            nextValues[field.key] = (embedded as { id: unknown }).id;
            return;
          }
        }
        nextValues[field.key] = '';
      }
    });
    setEditingRow(row);
    setFormValues(nextValues);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingRow(null);
  };

  const handleSave = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const payload: Record<string, unknown> = {};
      visibleFields.forEach((field) => {
        let value = formValues[field.key];
        if (field.type === 'datetime') {
          value = fromDateTimeLocal(String(value || ''));
        }
        if (field.type === 'autocomplete' && value !== '' && value !== null && value !== undefined) {
          const numeric = Number(value);
          if (!Number.isNaN(numeric) && String(value).trim() !== '') {
            value = numeric;
          }
        }
        if (field.type === 'number' && value !== '' && value !== null && value !== undefined) {
          value = Number(value);
        }
        if (field.type === 'boolean') {
          if (value === '' || value === undefined || value === null) return;
          value = Boolean(value);
        }
        if (value === '' || value === undefined) {
          if (field.sendNullWhenEmpty) payload[field.key] = null;
          return;
        }
        if (value === null) {
          if (field.sendNullWhenEmpty) payload[field.key] = null;
          return;
        }
        if (field.type === 'number' && Number.isNaN(value)) return;
        payload[field.key] = value;
      });

      if (editingRow?.id) {
        await updateEntity(endpoint, token, Number(editingRow.id), payload);
        setSuccess('อัปเดตสำเร็จ');
      } else {
        await createEntity(endpoint, token, payload);
        setSuccess('สร้างสำเร็จ');
      }
      await fetchRows();
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !editingRow?.id) return;
    try {
      setLoading(true);
      await deleteEntity(endpoint, token, Number(editingRow.id));
      setSuccess('ลบสำเร็จ');
      await fetchRows();
      setDeleteOpen(false);
      setEditingRow(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const resolveFieldOptions = (field: FieldConfig, values: Record<string, unknown>) => {
    if (!field.options) return [];
    return typeof field.options === 'function' ? field.options(values) : field.options;
  };

  const resolveFilterOptions = (filter: FilterConfig, values: Record<string, unknown>) => {
    if (!filter.options) return [];
    return typeof filter.options === 'function' ? filter.options(values) : filter.options;
  };

  const resolveFilterDisabled = (filter: FilterConfig, values: Record<string, unknown>) => {
    if (filter.disabled === undefined) return false;
    return typeof filter.disabled === 'function' ? filter.disabled(values) : Boolean(filter.disabled);
  };

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (search) {
        const query = search.toLowerCase();
        const targetKeys = searchKeys.length ? searchKeys : Object.keys(row);
        const hit = targetKeys.some((key) => {
          const value = row[key];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(query);
        });
        if (!hit) return false;
      }

      for (const filter of filters) {
        const rowValue = row[filter.key];
        if (filter.type === 'dateRange') {
          const fromValue = filterValues[`${filter.key}From`];
          const toValue = filterValues[`${filter.key}To`];
          if (!fromValue && !toValue) continue;
          const rowDate = new Date(String(rowValue));
          if (Number.isNaN(rowDate.getTime())) return false;
          const fromDate = parseDateInput(fromValue, false);
          const toDate = parseDateInput(toValue, true);
          if (fromDate && rowDate < fromDate) return false;
          if (toDate && rowDate > toDate) return false;
          continue;
        }

        const value = filterValues[filter.key];
        if (value === '' || value === undefined || value === null) continue;
        if (filter.type === 'boolean') {
          const rowBool = normalizeBoolean(rowValue);
          const filterBool = normalizeBoolean(value);
          if (rowBool === null || filterBool === null) {
            if (String(rowValue) !== String(value)) return false;
          } else if (rowBool !== filterBool) {
            return false;
          }
        } else if (filter.type === 'number') {
          if (Number(rowValue) !== Number(value)) return false;
        } else if (filter.type === 'text') {
          if (!String(rowValue || '').toLowerCase().includes(String(value).toLowerCase())) return false;
        } else {
          if (String(rowValue) !== String(value)) return false;
        }
      }
      return true;
    });
  }, [rows, search, filterValues, filters, searchKeys]);

  React.useEffect(() => {
    setVisibleCount(Math.min(LAZY_PAGE_SIZE, filteredRows.length));
  }, [filteredRows.length]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const nextRows = [...filteredRows];
    const direction = sortOrder === 'desc' ? -1 : 1;
    nextRows.sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      if (aValue === null || aValue === undefined) return 1 * direction;
      if (bValue === null || bValue === undefined) return -1 * direction;

      const aNum = Number(aValue);
      const bNum = Number(bValue);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return (aNum - bNum) * direction;
      }

      const aDate = new Date(String(aValue));
      const bDate = new Date(String(bValue));
      if (!Number.isNaN(aDate.getTime()) && !Number.isNaN(bDate.getTime())) {
        return (aDate.getTime() - bDate.getTime()) * direction;
      }

      return String(aValue).localeCompare(String(bValue)) * direction;
    });
    return nextRows;
  }, [filteredRows, sortKey, sortOrder]);

  const visibleRows = useMemo(
    () => sortedRows.slice(0, visibleCount),
    [sortedRows, visibleCount]
  );

  const formatExportValue = (value: unknown) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'ใช่' : 'ไม่';
    if (value instanceof Date) return formatDateTime(value.toISOString());
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const candidate =
        record.name ?? record.title ?? record.email ?? record.phone ?? record.id ?? null;
      if (candidate !== null && candidate !== undefined) return String(candidate);
      try {
        return JSON.stringify(record);
      } catch {
        return String(value);
      }
    }
    const text = String(value);
    if (text.match(/\d{4}-\d{2}-\d{2}T/)) {
      return formatDateTime(text);
    }
    return text;
  };

  const buildExportData = () => {
    const headers = columns.map((column) => column.label);
    const keys = columns.map((column) => column.key);
    const rows = filteredRows.map((row) => keys.map((key) => formatExportValue(row[key])));
    return { headers, rows };
  };

  const handleExportExcel = async () => {
    const { headers, rows } = buildExportData();
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Export');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${endpoint}-export.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const { headers, rows } = buildExportData();
    const exportTitle = exportMeta?.title || 'JelBarber Studio';
    const exportSubtitle = exportMeta?.subtitle || title;
    const exportAccent = exportMeta?.accentColor || accentColor || '#D9B46C';
    const logoUrl = exportMeta?.logoUrl || '/icons/icon-pwa.png';
    const exportNavy = '#0f1f3d';
    const exportGold = exportAccent;
    const exportGray = '#6b7280';
    const exportLight = '#f5f5f5';
    const dateFrom = filterValues['occurredAtFrom'];
    const dateTo = filterValues['occurredAtTo'];
    const dateRangeText =
      dateFrom || dateTo
        ? `${dateFrom ? String(dateFrom) : '-'} ถึง ${dateTo ? String(dateTo) : '-'}`
        : 'ทั้งหมด';
    const nowText = new Date().toLocaleString('th-TH');

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const exportLogoHtml = logoUrl
      ? `<img src="${escapeHtml(logoUrl)}" alt="logo" style="width:48px;height:48px;border-radius:8px;border:1px solid #ddd;" />`
      : '';

    if (endpoint === 'branches') {
      const statusLabel = (value: unknown) => (value ? 'Active' : 'Inactive');
      const statusClass = (value: unknown) => (value ? 'status-active' : 'status-inactive');

      const html = `
        <!doctype html>
        <html lang="th">
          <head>
            <meta charset="utf-8" />
            <title>${escapeHtml(exportTitle)} Export</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #111; background: #f7f7f8; }
              .topbar { background: #0f1f3d; color: white; padding: 16px; border-radius: 8px; }
              h1 { font-size: 18px; margin: 0; color: ${escapeHtml(exportAccent)}; }
              .subtitle { font-size: 12px; color: #cbd5e1; margin-top: 4px; }
              .header { display: flex; gap: 12px; align-items: center; }
              .meta { display: flex; justify-content: space-between; margin-top: 12px; font-size: 12px; color: #e5e7eb; }
              .branch-card { background: white; border-radius: 10px; padding: 12px; border: 1px solid #e5e7eb; margin-top: 12px; }
              .section { margin-top: 10px; padding-top: 10px; border-top: 1px solid ${escapeHtml(exportAccent)}33; }
              .section-title { font-size: 12px; font-weight: 700; color: #0f1f3d; margin-bottom: 6px; }
              .label { font-size: 11px; color: #6b7280; }
              .value { font-size: 13px; font-weight: 600; }
              .status { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
              .status-active { background: #dcfce7; color: #166534; }
              .status-inactive { background: #e5e7eb; color: #374151; }
              .meta-text { font-size: 10px; color: #9ca3af; }
              .danger { color: #b91c1c; font-weight: 700; }
            </style>
          </head>
          <body>
            <div class="topbar">
              <div class="header">
                ${exportLogoHtml}
                <div>
                  <h1>${escapeHtml(exportTitle)}</h1>
                  ${exportSubtitle ? `<div class="subtitle">${escapeHtml(exportSubtitle)}</div>` : ''}
                </div>
              </div>
              <div class="meta">
                <div>จำนวนสาขา: ${filteredRows.length}</div>
                <div>พิมพ์เมื่อ: ${escapeHtml(nowText)}</div>
              </div>
            </div>

            ${filteredRows
              .map((row) => {
                const name = String(row.name || '-');
                const address = String(row.address || '-');
                const phone = String(row.phone || '-');
                const id = String(row.id ?? '-');
                const createdAt = String(row.createdAt ?? '-');
                const updatedAt = String(row.updatedAt ?? '-');
                const status = statusLabel(row.isActive);
                const statusCls = statusClass(row.isActive);
                return `
                  <div class="branch-card">
                    <div class="value">${escapeHtml(name)}</div>
                    <div class="label">Branch ID: ${escapeHtml(id)}</div>
                    <div class="section">
                      <div class="section-title">สถานะสาขา</div>
                      <div class="value"><span class="status ${statusCls}">${escapeHtml(status)}</span></div>
                    </div>
                    <div class="section">
                      <div class="section-title">Contact Information</div>
                      <div class="label">ที่อยู่</div>
                      <div class="value">${escapeHtml(address)}</div>
                      <div class="label">เบอร์โทร</div>
                      <div class="value">${escapeHtml(phone)}</div>
                    </div>
                    <div class="section">
                      <div class="section-title">System Metadata</div>
                      <div class="meta-text">createdAt: ${escapeHtml(createdAt)}</div>
                      <div class="meta-text">updatedAt: ${escapeHtml(updatedAt)}</div>
                      <div class="meta-text">Admin Control: <span class="danger">ปิดสาขา / ลบสาขา</span></div>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </body>
        </html>
      `;

      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 250);
      return;
    }

    if (endpoint === 'inventory') {
      const statusClass = (quantity: number) => {
        if (quantity <= 5) return 'stock-low';
        if (quantity <= 15) return 'stock-warning';
        return 'stock-ok';
      };

      const html = `
        <!doctype html>
        <html lang="th">
          <head>
            <meta charset="utf-8" />
            <title>${escapeHtml(exportTitle)} Export</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #111; background: #f7f7f8; }
              .topbar { background: #0f1f3d; color: white; padding: 16px; border-radius: 8px; }
              h1 { font-size: 18px; margin: 0; color: ${escapeHtml(exportAccent)}; }
              .subtitle { font-size: 12px; color: #cbd5e1; margin-top: 4px; }
              .header { display: flex; gap: 12px; align-items: center; }
              .meta { display: flex; justify-content: space-between; margin-top: 12px; font-size: 12px; color: #e5e7eb; }
              .stock-card { background: white; border-radius: 12px; padding: 14px; border: 1px solid #e5e7eb; margin-top: 12px; }
              .primary { display: flex; justify-content: space-between; gap: 12px; }
              .name { font-size: 16px; font-weight: 700; }
              .qty { font-size: 18px; font-weight: 700; }
              .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
              .stock-ok { background: #dcfce7; color: #166534; }
              .stock-warning { background: #fef9c3; color: #854d0e; }
              .stock-low { background: #fee2e2; color: #991b1b; }
              .section { margin-top: 10px; padding-top: 10px; border-top: 1px solid ${escapeHtml(exportAccent)}33; }
              .section-title { font-size: 12px; font-weight: 700; color: #0f1f3d; margin-bottom: 6px; }
              .label { font-size: 11px; color: #6b7280; }
              .value { font-size: 13px; font-weight: 600; }
              .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
              .meta-text { font-size: 10px; color: #9ca3af; }
              .total { font-size: 14px; font-weight: 700; color: #0f1f3d; }
            </style>
          </head>
          <body>
            <div class="topbar">
              <div class="header">
                ${exportLogoHtml}
                <div>
                  <h1>${escapeHtml(exportTitle)}</h1>
                  ${exportSubtitle ? `<div class="subtitle">${escapeHtml(exportSubtitle)}</div>` : ''}
                </div>
              </div>
              <div class="meta">
                <div>จำนวนสินค้า: ${filteredRows.length}</div>
                <div>พิมพ์เมื่อ: ${escapeHtml(nowText)}</div>
              </div>
            </div>

            ${filteredRows
              .map((row) => {
                const name = String(row.name || '-');
                const sku = String(row.sku || '-');
                const unit = String(row.unit || '-');
                const quantityRaw = row.quantity;
                const quantity = typeof quantityRaw === 'number' ? quantityRaw : Number(quantityRaw);
                const costRaw = row.cost;
                const cost = typeof costRaw === 'number' ? costRaw : Number(costRaw);
                const total = !Number.isNaN(quantity) && !Number.isNaN(cost) ? quantity * cost : 0;
                const branch = String(row.branch?.name ?? row.Branch?.name ?? row.branchId ?? row.BranchId ?? '-');
                const createdAt = String(row.createdAt ?? '-');
                const updatedAt = String(row.updatedAt ?? '-');
                const qtyClass = statusClass(Number.isNaN(quantity) ? 0 : quantity);
                return `
                  <div class="stock-card">
                    <div class="primary">
                      <div>
                        <div class="name">${escapeHtml(name)}</div>
                        <div class="label mono">SKU: ${escapeHtml(sku)}</div>
                        <div class="label">สาขา: ${escapeHtml(branch)}</div>
                      </div>
                      <div style="text-align:right;">
                        <div class="qty">${Number.isNaN(quantity) ? '-' : quantity} ${escapeHtml(unit)}</div>
                        <div class="badge ${qtyClass}">สถานะสต็อก</div>
                      </div>
                    </div>

                    <div class="section">
                      <div class="section-title">Stock Information</div>
                      <div class="label">จำนวนคงเหลือ</div>
                      <div class="value">${Number.isNaN(quantity) ? '-' : quantity} ${escapeHtml(unit)}</div>
                      <div class="label">มูลค่าสต็อกรวม</div>
                      <div class="total">${total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</div>
                    </div>

                    <div class="section">
                      <div class="section-title">Cost Information</div>
                      <div class="label">ต้นทุนต่อหน่วย</div>
                      <div class="value">${Number.isNaN(cost) ? '-' : cost.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</div>
                    </div>

                    <div class="section">
                      <div class="section-title">System Metadata</div>
                      <div class="meta-text">createdAt: ${escapeHtml(createdAt)}</div>
                      <div class="meta-text">updatedAt: ${escapeHtml(updatedAt)}</div>
                      <div class="meta-text">Stock Movement: ➕ รับเข้า · ➖ ตัดออก · 🔄 ปรับปรุง</div>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </body>
        </html>
      `;

      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 250);
      return;
    }

    if (endpoint === 'users') {
      const roleLabel = (value: unknown) => {
        const v = String(value || '').toLowerCase();
        if (v === 'admin') return 'Admin';
        if (v === 'manager') return 'Manager';
        if (v === 'employee') return 'Employee';
        return String(value || '-');
      };
      const roleClass = (value: unknown) => {
        const v = String(value || '').toLowerCase();
        if (v === 'admin') return 'role-admin';
        if (v === 'manager') return 'role-manager';
        return 'role-employee';
      };
      const statusLabel = (value: unknown) => (value ? 'Active' : 'Inactive');
      const statusClass = (value: unknown) => (value ? 'status-active' : 'status-inactive');
      const branchLabel = (row: Record<string, unknown>) => {
        const embedded = row.Branch as Record<string, unknown> | undefined;
        if (embedded && typeof embedded === 'object') {
          return (
            String(
              embedded.name ||
                embedded.title ||
                embedded.email ||
                embedded.phone ||
                embedded.id ||
                ''
            ) || '-'
          );
        }
        const branchId = row.branchId ?? row.BranchId;
        if (branchId === null || branchId === undefined || branchId === '') {
          return 'สิทธิ์ทุกสาขา (Global Access)';
        }
        return String(branchId);
      };

      const html = `
        <!doctype html>
        <html lang="th">
          <head>
            <meta charset="utf-8" />
            <title>${escapeHtml(exportTitle)} Export</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #111; background: #f7f7f8; }
              .topbar { background: #0f1f3d; color: white; padding: 16px; border-radius: 8px; }
              h1 { font-size: 18px; margin: 0; color: ${escapeHtml(exportAccent)}; }
              .subtitle { font-size: 12px; color: #cbd5e1; margin-top: 4px; }
              .header { display: flex; gap: 12px; align-items: center; }
              .meta { display: flex; justify-content: space-between; margin-top: 12px; font-size: 12px; color: #e5e7eb; }
              .user-card { background: white; border-radius: 10px; padding: 12px; border: 1px solid #e5e7eb; margin-top: 12px; }
              .row { display: flex; justify-content: space-between; gap: 12px; }
              .section { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e5e7eb; }
              .section-title { font-size: 12px; font-weight: 700; color: #0f1f3d; margin-bottom: 6px; }
              .label { font-size: 11px; color: #6b7280; }
              .value { font-size: 13px; font-weight: 600; }
              .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
              .role-admin { background: #dbeafe; color: #1e3a8a; }
              .role-manager { background: #dcfce7; color: #166534; }
              .role-employee { background: #e5e7eb; color: #1f2937; }
              .status-active { background: #dcfce7; color: #166534; }
              .status-inactive { background: #e5e7eb; color: #374151; }
              .meta-text { font-size: 10px; color: #9ca3af; }
              .danger { color: #b91c1c; font-weight: 700; }
            </style>
          </head>
          <body>
            <div class="topbar">
              <div class="header">
                ${exportLogoHtml}
                <div>
                  <h1>${escapeHtml(exportTitle)}</h1>
                  ${exportSubtitle ? `<div class="subtitle">${escapeHtml(exportSubtitle)}</div>` : ''}
                </div>
              </div>
              <div class="meta">
                <div>จำนวนผู้ใช้: ${filteredRows.length}</div>
                <div>พิมพ์เมื่อ: ${escapeHtml(nowText)}</div>
              </div>
            </div>

            ${filteredRows
              .map((row) => {
                const name = String(row.name || '-');
                const email = String(row.email || '-');
                const phone = String(row.phone || '-');
                const role = roleLabel(row.role);
                const roleCls = roleClass(row.role);
                const status = statusLabel(row.isActive);
                const statusCls = statusClass(row.isActive);
                const branch = branchLabel(row);
                const id = String(row.id ?? '-');
                const createdAt = String(row.createdAt ?? '-');
                const updatedAt = String(row.updatedAt ?? '-');
                return `
                  <div class="user-card">
                    <div class="row">
                      <div>
                        <div class="value">${escapeHtml(name)}</div>
                        <div class="label">${escapeHtml(email)}</div>
                      </div>
                      <div>
                        <span class="badge ${roleCls}">${escapeHtml(role)}</span>
                        <span class="badge ${statusCls}" style="margin-left:6px;">${escapeHtml(status)}</span>
                      </div>
                    </div>

                    <div class="section">
                      <div class="section-title">User Identity</div>
                      <div class="label">ชื่อ</div>
                      <div class="value">${escapeHtml(name)}</div>
                      <div class="label">อีเมล (Login)</div>
                      <div class="value">${escapeHtml(email)}</div>
                      <div class="label">เบอร์โทร</div>
                      <div class="value">${escapeHtml(phone)}</div>
                    </div>

                    <div class="section">
                      <div class="section-title">Access Control</div>
                      <div class="label">Role</div>
                      <div class="value"><span class="badge ${roleCls}">${escapeHtml(role)}</span></div>
                      <div class="label">สาขาที่ผูก</div>
                      <div class="value">${escapeHtml(branch)}</div>
                      <div class="label">สถานะการใช้งาน</div>
                      <div class="value"><span class="badge ${statusCls}">${escapeHtml(status)}</span></div>
                      <div class="label">Admin-only Controls</div>
                      <div class="meta-text">Reset Password · Force Logout · <span class="danger">Deactivate Account</span></div>
                    </div>

                    <div class="section">
                      <div class="section-title">System Metadata</div>
                      <div class="meta-text">User ID: ${escapeHtml(id)}</div>
                      <div class="meta-text">createdAt: ${escapeHtml(createdAt)}</div>
                      <div class="meta-text">updatedAt: ${escapeHtml(updatedAt)}</div>
                    </div>
                  </div>
                `;
              })
              .join('')}
          </body>
        </html>
      `;

      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 250);
      return;
    }

    if (endpoint === 'appointments') {
      const labelStatus = (value: unknown) => {
        const v = String(value || '');
        if (v === 'Booked') return 'Booked';
        if (v === 'Successful') return 'Successful';
        if (v === 'Cancelled') return 'Cancelled';
        return v || '-';
      };
      const statusClass = (value: unknown) => {
        const v = String(value || '');
        if (v === 'Booked') return 'status-booked';
        if (v === 'Successful') return 'status-success';
        if (v === 'Cancelled') return 'status-cancel';
        return 'status-default';
      };
      const labelPerson = (row: Record<string, unknown>, key: string) => {
        const embedded = row[key] as Record<string, unknown> | undefined;
        if (embedded && typeof embedded === 'object') {
          return (
            String(
              embedded.name ||
                embedded.title ||
                embedded.email ||
                embedded.phone ||
                embedded.id ||
                ''
            ) || '-'
          );
        }
        const alt = row[`${key}Id` as keyof typeof row] ?? row[`${key.toLowerCase()}Id` as keyof typeof row];
        return alt ? String(alt) : '-';
      };
      const labelBranch = (row: Record<string, unknown>) =>
        labelPerson(row, 'Branch') || String(row.branchId ?? row.BranchId ?? '-');

      const formatTimeRange = (row: Record<string, unknown>) => {
        const start = row.startAt ? new Date(String(row.startAt)) : null;
        const end = row.endAt ? new Date(String(row.endAt)) : null;
        const formatTime = (date: Date | null) =>
          date && !Number.isNaN(date.getTime())
            ? date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
            : '-';
        return `${formatTime(start)}–${formatTime(end)}`;
      };

      const byBranch = new Map<string, Record<string, unknown>[]>();
      filteredRows.forEach((row) => {
        const branch = labelBranch(row);
        if (!byBranch.has(branch)) byBranch.set(branch, []);
        byBranch.get(branch)!.push(row);
      });

      const branchSections = Array.from(byBranch.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([branch, items]) => {
          const sorted = items.slice().sort((a, b) => {
            const aTime = new Date(String(a.startAt)).getTime();
            const bTime = new Date(String(b.startAt)).getTime();
            return aTime - bTime;
          });
          const rowsHtml = sorted
            .map((row) => {
              const customer = labelPerson(row, 'Member');
              const employee = labelPerson(row, 'Employee');
              const service = String(row.notes || '-');
              const status = labelStatus(row.status);
              const statusCls = statusClass(row.status);
              const timeRange = formatTimeRange(row);
              const audit = `ID: ${row.id ?? '-'} | สร้าง: ${row.createdAt ?? '-'} | อัปเดต: ${
                row.updatedAt ?? '-'
              }`;
              return `
                <div class="booking-row">
                  <div class="time">${timeRange}</div>
                  <div class="main">
                    <div class="primary">${customer} · ${employee}</div>
                    <div class="secondary">${service}</div>
                  </div>
                  <div class="branch">${branch}</div>
                  <div class="status ${statusCls}">${status}</div>
                  <div class="audit">${audit}</div>
                </div>
              `;
            })
            .join('');
          return `
            <div class="branch-section">
              <div class="branch-title">${branch}</div>
              ${rowsHtml || '<div class="empty">ไม่มีข้อมูล</div>'}
            </div>
          `;
        })
        .join('');

      const summarizeBy = (key: (row: Record<string, unknown>) => string) => {
        const map = new Map<string, { total: number; booked: number; success: number; cancel: number }>();
        filteredRows.forEach((row) => {
          const k = key(row) || '-';
          if (!map.has(k)) map.set(k, { total: 0, booked: 0, success: 0, cancel: 0 });
          const bucket = map.get(k)!;
          bucket.total += 1;
          if (String(row.status) === 'Booked') bucket.booked += 1;
          if (String(row.status) === 'Successful') bucket.success += 1;
          if (String(row.status) === 'Cancelled') bucket.cancel += 1;
        });
        return Array.from(map.entries()).map(([k, v]) => ({
          key: k,
          ...v,
          cancelRate: v.total ? (v.cancel / v.total) * 100 : 0
        }));
      };

      const summaryByBranch = summarizeBy((row) => labelBranch(row));
      const summaryByEmployee = summarizeBy((row) => labelPerson(row, 'Employee'));
      const summaryByService = summarizeBy((row) => String(row.notes || '-'));

      const groupByMonth = () => {
        const map = new Map<string, { total: number; cancel: number }>();
        filteredRows.forEach((row) => {
          const date = new Date(String(row.startAt));
          if (Number.isNaN(date.getTime())) return;
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!map.has(key)) map.set(key, { total: 0, cancel: 0 });
          const bucket = map.get(key)!;
          bucket.total += 1;
          if (String(row.status) === 'Cancelled') bucket.cancel += 1;
        });
        return Array.from(map.entries()).map(([k, v]) => ({
          key: k,
          total: v.total,
          cancelRate: v.total ? (v.cancel / v.total) * 100 : 0
        }));
      };

      const monthSummary = groupByMonth();

      const renderSummaryTable = (
        titleText: string,
        rows: { key: string; total: number; booked?: number; success?: number; cancel?: number; cancelRate?: number }[]
      ) => {
        const body = rows
          .map(
            (row, index) => `
            <tr class="${index % 2 === 0 ? 'zebra' : ''}">
              <td>${escapeHtml(row.key)}</td>
              <td>${row.total}</td>
              ${row.booked !== undefined ? `<td>${row.booked}</td>` : ''}
              ${row.success !== undefined ? `<td>${row.success}</td>` : ''}
              ${row.cancel !== undefined ? `<td>${row.cancel}</td>` : ''}
              ${row.cancelRate !== undefined ? `<td>${row.cancelRate.toFixed(1)}%</td>` : ''}
            </tr>`
          )
          .join('');
        return `
          <div class="section">
            <div class="section-title">${escapeHtml(titleText)}</div>
            <table class="summary-table">
              <thead>
                <tr>
                  <th>รายการ</th>
                  <th>จำนวนคิว</th>
                  ${rows.length && rows[0].booked !== undefined ? '<th>Booked</th>' : ''}
                  ${rows.length && rows[0].success !== undefined ? '<th>Successful</th>' : ''}
                  ${rows.length && rows[0].cancel !== undefined ? '<th>Cancelled</th>' : ''}
                  ${rows.length && rows[0].cancelRate !== undefined ? '<th>% ยกเลิก</th>' : ''}
                </tr>
              </thead>
              <tbody>${body || '<tr><td colspan="6">ไม่มีข้อมูล</td></tr>'}</tbody>
            </table>
          </div>
        `;
      };

      const html = `
        <!doctype html>
        <html lang="th">
          <head>
            <meta charset="utf-8" />
            <title>${escapeHtml(exportTitle)} Export</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #111; background: #f7f7f8; }
              .topbar { background: #0f1f3d; color: white; padding: 16px; border-radius: 8px; }
              h1 { font-size: 18px; margin: 0; color: ${escapeHtml(exportAccent)}; }
              .subtitle { font-size: 12px; color: #cbd5e1; margin-top: 4px; }
              .header { display: flex; gap: 12px; align-items: center; }
              .meta { display: flex; justify-content: space-between; margin-top: 12px; font-size: 12px; color: #e5e7eb; }
              .section { margin-top: 16px; background: white; border-radius: 10px; padding: 12px; border: 1px solid #e5e7eb; }
              .section-title { font-size: 13px; font-weight: 700; color: #0f1f3d; margin-bottom: 8px; }
              .branch-title { font-size: 12px; font-weight: 700; color: #0f1f3d; margin: 8px 0; }
              .booking-row { display: grid; grid-template-columns: 110px 1.5fr 1fr 120px; gap: 10px; padding: 8px 0; border-bottom: 1px dashed #e5e7eb; }
              .booking-row:last-child { border-bottom: none; }
              .time { font-weight: 700; color: #111827; }
              .primary { font-weight: 600; }
              .secondary { color: #6b7280; font-size: 12px; }
              .branch { color: #374151; font-size: 12px; }
              .status { text-align: center; font-weight: 700; border-radius: 999px; padding: 4px 8px; font-size: 12px; align-self: start; }
              .status-booked { background: #e5e7eb; color: #1f2937; }
              .status-success { background: #dcfce7; color: #166534; }
              .status-cancel { background: #fee2e2; color: #991b1b; }
              .status-default { background: #e5e7eb; color: #1f2937; }
              .audit { grid-column: 2 / -1; font-size: 11px; color: #9ca3af; }
              .summary-table { width: 100%; border-collapse: collapse; }
              .summary-table th, .summary-table td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; text-align: left; }
              .summary-table th { background: #0f1f3d; color: white; }
              .zebra { background: #f9fafb; }
              .empty { color: #9ca3af; font-size: 12px; padding: 8px 0; }
            </style>
          </head>
          <body>
            <div class="topbar">
              <div class="header">
                ${exportLogoHtml}
                <div>
                  <h1>${escapeHtml(exportTitle)}</h1>
                  ${exportSubtitle ? `<div class="subtitle">${escapeHtml(exportSubtitle)}</div>` : ''}
                </div>
              </div>
              <div class="meta">
                <div>ช่วงข้อมูล: ${escapeHtml(dateRangeText)}</div>
                <div>พิมพ์เมื่อ: ${escapeHtml(nowText)}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">คิวนัดหมาย (เรียงตามเวลา)</div>
              ${branchSections}
            </div>

            ${renderSummaryTable('สรุปต่อสาขา', summaryByBranch)}
            ${renderSummaryTable('สรุปตามช่าง', summaryByEmployee)}
            ${renderSummaryTable('สรุปตามบริการ', summaryByService)}
            ${renderSummaryTable('แนวโน้มรายเดือน', monthSummary)}
          </body>
        </html>
      `;

      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 250);
      return;
    }
    const baseHeaders = headers.slice();
    const addColIfMissing = (key: string, label: string) => {
      if (!baseHeaders.includes(label)) baseHeaders.push(label);
    };
    addColIfMissing('paymentMethod', 'ช่องทางรับ/จ่าย');
    addColIfMissing('vat', 'VAT 7%');
    addColIfMissing('totalWithVat', 'รวม VAT');

    const labelType = (value: unknown) => {
      const v = String(value || '').toLowerCase();
      if (v === 'income') return 'รายรับ';
      if (v === 'expense') return 'รายจ่าย';
      return String(value || '-');
    };
    const labelPayment = (value: unknown) => {
      const v = String(value || '').toLowerCase();
      if (v === 'cash') return 'เงินสด';
      if (v === 'transfer') return 'โอน';
      if (v === 'qr') return 'QR';
      return String(value || '-');
    };

    const dataRows = filteredRows.map((row) => {
      const rowMap: Record<string, string> = {};
      columns.forEach((column) => {
        const raw = row[column.key];
        let value = formatExportValue(raw);
        if (column.key === 'type') value = labelType(raw);
        rowMap[column.label] = value;
      });
      const amountRaw = row.amount;
      const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw);
      const vatRaw = row.vat ?? 7;
      const vat = typeof vatRaw === 'number' ? vatRaw : Number(vatRaw);
      const vatValue = !Number.isNaN(amount) ? (amount * (Number.isNaN(vat) ? 7 : vat)) / 100 : 0;
      const totalWithVat = !Number.isNaN(amount) ? amount + vatValue : 0;

      rowMap['ช่องทางรับ/จ่าย'] = labelPayment(row.paymentMethod ?? row.payment_method ?? '');
      rowMap['VAT 7%'] = Number.isNaN(vatValue) ? '-' : vatValue.toFixed(2);
      rowMap['รวม VAT'] = Number.isNaN(totalWithVat) ? '-' : totalWithVat.toFixed(2);
      return baseHeaders.map((header) => rowMap[header] ?? '');
    });

    const headerHtml = baseHeaders.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
    const bodyHtml = dataRows
      .map(
        (row, index) =>
          `<tr class="${index % 2 === 0 ? 'zebra' : ''}">${row
            .map((cell) => `<td>${escapeHtml(cell)}</td>`)
            .join('')}</tr>`
      )
      .join('');
    const sumBy = <T extends string>(
      key: (row: Record<string, unknown>) => string,
      isIncome: (row: Record<string, unknown>) => boolean
    ) => {
      const map = new Map<string, { income: number; expense: number }>();
      filteredRows.forEach((row) => {
        const k = key(row) || '-';
        const amountRaw = row.amount;
        const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw);
        if (Number.isNaN(amount)) return;
        if (!map.has(k)) map.set(k, { income: 0, expense: 0 });
        const bucket = map.get(k)!;
        if (isIncome(row)) bucket.income += amount;
        else bucket.expense += amount;
      });
      return Array.from(map.entries()).map(([k, v]) => ({
        key: k,
        income: v.income,
        expense: v.expense,
        net: v.income - v.expense
      }));
    };

    const summaryByPayment = sumBy(
      (row) => labelPayment(row.paymentMethod ?? row.payment_method ?? ''),
      (row) => String(row.type) === 'income'
    );
    const summaryByBranch = sumBy(
      (row) => formatExportValue(row.branch?.name ?? row.Branch?.name ?? row.branchId ?? row.BranchId),
      (row) => String(row.type) === 'income'
    );

    const groupByPeriod = (mode: 'day' | 'month' | 'year') => {
      const map = new Map<string, { income: number; expense: number; count: number }>();
      filteredRows.forEach((row) => {
        const date = new Date(String(row.occurredAt));
        if (Number.isNaN(date.getTime())) return;
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const key = mode === 'year' ? `${yyyy}` : mode === 'month' ? `${yyyy}-${mm}` : `${yyyy}-${mm}-${dd}`;
        if (!map.has(key)) map.set(key, { income: 0, expense: 0, count: 0 });
        const bucket = map.get(key)!;
        const amountRaw = row.amount;
        const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw);
        if (Number.isNaN(amount)) return;
        bucket.count += 1;
        if (String(row.type) === 'income') bucket.income += amount;
        if (String(row.type) === 'expense') bucket.expense += amount;
      });
      return Array.from(map.entries())
        .sort(([a], [b]) => (a > b ? 1 : -1))
        .map(([key, value]) => ({
          key,
          ...value,
          net: value.income - value.expense
        }));
    };

    const daily = groupByPeriod('day');
    const monthly = groupByPeriod('month');
    const yearly = groupByPeriod('year');

    const renderSummaryTable = (titleText: string, rows: { key: string; income: number; expense: number; net: number; count?: number }[]) => {
      const body = rows
        .map(
          (row, index) => `
          <tr class="${index % 2 === 0 ? 'zebra' : ''}">
            <td>${escapeHtml(row.key)}</td>
            ${row.count !== undefined ? `<td>${row.count}</td>` : ''}
            <td>${row.income.toFixed(2)}</td>
            <td>${row.expense.toFixed(2)}</td>
            <td class="${row.net >= 0 ? 'pos' : 'neg'}">${row.net.toFixed(2)}</td>
          </tr>`
        )
        .join('');
      const countHeader = rows.length && rows[0].count !== undefined ? '<th>จำนวนรายการ</th>' : '';
      return `
        <div class="section">
          <div class="section-title">${escapeHtml(titleText)}</div>
          <table class="summary-table">
            <thead>
              <tr>
                <th>ช่วงเวลา</th>
                ${countHeader}
                <th>รายรับ</th>
                <th>รายจ่าย</th>
                <th>สุทธิ</th>
              </tr>
            </thead>
            <tbody>${body || '<tr><td colspan="5">ไม่มีข้อมูล</td></tr>'}</tbody>
          </table>
        </div>
      `;
    };

    const renderKeySummaryTable = (titleText: string, rows: { key: string; income: number; expense: number; net: number }[]) => {
      const body = rows
        .map(
          (row, index) => `
          <tr class="${index % 2 === 0 ? 'zebra' : ''}">
            <td>${escapeHtml(row.key)}</td>
            <td>${row.income.toFixed(2)}</td>
            <td>${row.expense.toFixed(2)}</td>
            <td class="${row.net >= 0 ? 'pos' : 'neg'}">${row.net.toFixed(2)}</td>
          </tr>`
        )
        .join('');
      return `
        <div class="section">
          <div class="section-title">${escapeHtml(titleText)}</div>
          <table class="summary-table">
            <thead>
              <tr>
                <th>รายการ</th>
                <th>รายรับ</th>
                <th>รายจ่าย</th>
                <th>สุทธิ</th>
              </tr>
            </thead>
            <tbody>${body || '<tr><td colspan="4">ไม่มีข้อมูล</td></tr>'}</tbody>
          </table>
        </div>
      `;
    };

    const sumAmount = (predicate: (row: Record<string, unknown>) => boolean) =>
      filteredRows.reduce((sum, row) => {
        if (!predicate(row)) return sum;
        const amountRaw = row.amount;
        const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw);
        if (Number.isNaN(amount)) return sum;
        return sum + amount;
      }, 0);

    const incomeTotal = sumAmount((row) => String(row.type) === 'income');
    const expenseTotal = sumAmount((row) => String(row.type) === 'expense');
    const netTotal = incomeTotal - expenseTotal;

    const html = `
      <!doctype html>
      <html lang="th">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(exportTitle)} Export</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            .topbar { background: ${exportNavy}; color: white; padding: 16px; border-radius: 8px; }
            h1 { font-size: 18px; margin: 0; color: ${escapeHtml(exportGold)}; }
            .subtitle { font-size: 12px; color: ${exportGray}; margin-top: 4px; }
            .header { display: flex; gap: 12px; align-items: center; }
            .meta { display: flex; justify-content: space-between; margin-top: 12px; font-size: 12px; color: #e5e7eb; }
            .kpi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
            .kpi-card { background: ${exportLight}; border-radius: 8px; padding: 12px; border: 1px solid #e5e7eb; }
            .kpi-title { font-size: 12px; color: ${exportGray}; }
            .kpi-value { font-size: 16px; font-weight: 700; }
            .section { margin-top: 16px; }
            .section-title { font-size: 13px; font-weight: 700; color: ${exportNavy}; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; vertical-align: top; }
            th { background: #f3f4f6; text-align: left; }
            .zebra { background: #fafafa; }
            .summary-table th { background: ${exportNavy}; color: white; }
            .pos { color: #0f8a5f; font-weight: 700; }
            .neg { color: #b91c1c; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="topbar">
            <div class="header">
            ${exportLogoHtml}
              <div>
                <h1>${escapeHtml(exportTitle)}</h1>
                ${exportSubtitle ? `<div class="subtitle">${escapeHtml(exportSubtitle)}</div>` : ''}
              </div>
            </div>
            <div class="meta">
              <div>ช่วงข้อมูล: ${escapeHtml(dateRangeText)}</div>
              <div>พิมพ์เมื่อ: ${escapeHtml(nowText)}</div>
            </div>
          </div>
          <div class="kpi">
            <div class="kpi-card">
              <div class="kpi-title">รายรับรวม</div>
              <div class="kpi-value pos">${incomeTotal.toFixed(2)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">รายจ่ายรวม</div>
              <div class="kpi-value neg">${expenseTotal.toFixed(2)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">สุทธิ</div>
              <div class="kpi-value">${netTotal.toFixed(2)}</div>
            </div>
          </div>
          ${renderSummaryTable('สรุปรายวัน', daily)}
          ${renderSummaryTable('สรุปรายเดือน', monthly)}
          ${renderSummaryTable('สรุปรายปี', yearly)}
          ${renderKeySummaryTable('สรุปตามช่องทางรับ/จ่าย', summaryByPayment)}
          ${renderKeySummaryTable('สรุปตามสาขา', summaryByBranch)}
          <table>
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${bodyHtml}</tbody>
          </table>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ p: { xs: 2, md: 3 }, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={accentColor ? { color: accentColor } : undefined}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              จัดการข้อมูลทั้งหมด พร้อมตัวกรองและการค้นหา
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ minWidth: 200 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchRows}
              sx={{ width: { xs: '100%', md: 'auto' } }}
            >
              รีเฟรช
            </Button>
            {enableExport && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<FileDownload />}
                  onClick={handleExportExcel}
                  sx={{ width: { xs: '100%', md: 'auto' } }}
                >
                  ส่งออก Excel
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdf />}
                  onClick={handleExportPdf}
                  sx={{ width: { xs: '100%', md: 'auto' } }}
                >
                  ส่งออก PDF
                </Button>
              </>
            )}
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenCreate}
              sx={
                accentColor
                  ? {
                      backgroundColor: accentColor,
                      '&:hover': { backgroundColor: accentColor },
                      width: { xs: '100%', md: 'auto' }
                    }
                  : { width: { xs: '100%', md: 'auto' } }
              }
            >
              เพิ่มรายการ
            </Button>
          </Stack>
        </Stack>
        <Divider sx={{ my: 2, opacity: 0.2 }} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="ค้นหา"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            fullWidth
          />
          {filters.map((filter) => {
            if (filter.type === 'text' || filter.type === 'number') {
              const disabled = resolveFilterDisabled(filter, filterValues);
              return (
                <TextField
                  key={filter.key}
                  label={filter.label}
                  type={filter.type === 'number' ? 'number' : 'text'}
                  value={filterValues[filter.key] ?? ''}
                  onChange={(event) =>
                    setFilterValues((prev) => {
                      const next = { ...prev, [filter.key]: event.target.value };
                      const extra = filter.onChange?.(event.target.value, next);
                      return extra ? { ...next, ...extra } : next;
                    })
                  }
                  sx={{ minWidth: 160 }}
                  disabled={disabled}
                />
              );
            }

            if (filter.type === 'dateRange') {
              const fromKey = `${filter.key}From`;
              const toKey = `${filter.key}To`;
              const disabled = resolveFilterDisabled(filter, filterValues);
              return (
                <Stack key={filter.key} direction={{ xs: 'column', md: 'row' }} spacing={1}>
                  <TextField
                    label={`${filter.label} (เริ่ม)`}
                    type="date"
                  value={filterValues[fromKey] ?? ''}
                  onChange={(event) =>
                    setFilterValues((prev) => {
                      const next = { ...prev, [fromKey]: event.target.value };
                      const extra = filter.onChange?.(event.target.value, next);
                      return extra ? { ...next, ...extra } : next;
                    })
                  }
                  sx={{ minWidth: 160 }}
                  InputLabelProps={{ shrink: true }}
                  disabled={disabled}
                />
                  <TextField
                    label={`${filter.label} (สิ้นสุด)`}
                  type="date"
                  value={filterValues[toKey] ?? ''}
                  onChange={(event) =>
                    setFilterValues((prev) => {
                      const next = { ...prev, [toKey]: event.target.value };
                      const extra = filter.onChange?.(event.target.value, next);
                      return extra ? { ...next, ...extra } : next;
                    })
                  }
                  sx={{ minWidth: 160 }}
                  InputLabelProps={{ shrink: true }}
                  disabled={disabled}
                />
                </Stack>
              );
            }

            if (filter.type === 'autocomplete') {
              const filterOptions = resolveFilterOptions(filter, filterValues);
              const disabled = resolveFilterDisabled(filter, filterValues);
              const selected =
                filterOptions.find(
                  (option) => String(option.value) === String(filterValues[filter.key])
                ) || null;
              return (
                <Autocomplete
                  key={filter.key}
                  options={filterOptions}
                  getOptionLabel={(option) => option.label}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  value={selected}
                  disabled={disabled}
                  onChange={(_, nextValue) =>
                    setFilterValues((prev) => {
                      const value = nextValue?.value ?? '';
                      const next = { ...prev, [filter.key]: value };
                      const extra = filter.onChange?.(value, next);
                      return extra ? { ...next, ...extra } : next;
                    })
                  }
                  renderInput={(params) => (
                    <TextField {...params} label={filter.label} fullWidth sx={{ minWidth: 200 }} />
                  )}
                />
              );
            }

            const disabled = resolveFilterDisabled(filter, filterValues);
            return (
              <FormControl key={filter.key} sx={{ minWidth: 160 }}>
                <InputLabel>{filter.label}</InputLabel>
                <Select
                  label={filter.label}
                  value={filterValues[filter.key] ?? ''}
                  disabled={disabled}
                  onChange={(event) =>
                    setFilterValues((prev) => {
                      const next = { ...prev, [filter.key]: event.target.value };
                      const extra = filter.onChange?.(event.target.value, next);
                      return extra ? { ...next, ...extra } : next;
                    })
                  }
                >
                  <MenuItem value="">ทั้งหมด</MenuItem>
                  {resolveFilterOptions(filter, filterValues).map((option) => (
                    <MenuItem key={String(option.value)} value={String(option.value)}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          })}
        </Stack>
      </Paper>

      <Box>
        {summary ? (
          summary(filteredRows)
        ) : (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Card sx={{ flex: 1, border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  ทั้งหมด
                </Typography>
                <Typography variant="h5">{rows.length.toLocaleString('th-TH')}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, border: '1px solid rgba(255,255,255,0.08)' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  ตามเงื่อนไข
                </Typography>
                <Typography variant="h5">
                  {filteredRows.length.toLocaleString('th-TH')}
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        )}
      </Box>

      <Paper sx={{ p: { xs: 1, md: 2 }, border: '1px solid rgba(255,255,255,0.08)' }}>
        {loading ? (
          <Box
            sx={{
              minHeight: 240,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              px: { xs: 1, md: 2 },
              py: { xs: 2, md: 3 },
              '@keyframes shimmer': {
                '0%': { backgroundPosition: '-400px 0' },
                '100%': { backgroundPosition: '400px 0' }
              }
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              กำลังโหลดข้อมูล...
            </Typography>
            {[0, 1, 2, 3, 4].map((index) => (
              <Box
                key={index}
                sx={{
                  height: 36,
                  borderRadius: 2,
                  backgroundImage:
                    'linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.18) 40px, rgba(255,255,255,0.08) 80px)',
                  backgroundSize: '400px 100%',
                  animation: 'shimmer 1.2s infinite'
                }}
              />
            ))}
            <Box
              sx={{
                height: 120,
                borderRadius: 3,
                backgroundImage:
                  'linear-gradient(90deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.18) 40px, rgba(255,255,255,0.08) 80px)',
                backgroundSize: '400px 100%',
                animation: 'shimmer 1.2s infinite'
              }}
            />
          </Box>
        ) : isMdUp ? (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell key={column.key}>{column.label}</TableCell>
                  ))}
                  <TableCell align="right">การทำงาน</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRows.map((row) => (
                  <TableRow key={String(row.id)} hover>
                    {columns.map((column) => (
                      <TableCell key={column.key}>
                        {column.render ? column.render(row) : renderValue(row[column.key])}
                      </TableCell>
                    ))}
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<Edit />}
                          onClick={() => handleOpenEdit(row)}
                        >
                          แก้ไข
                        </Button>
                        <Button
                          size="small"
                          variant="text"
                          color="error"
                          startIcon={<Delete />}
                          onClick={() => {
                            setEditingRow(row);
                            setDeleteOpen(true);
                          }}
                        >
                          ลบ
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 6 }}>
                      ไม่มีข้อมูล
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Stack spacing={2}>
            {visibleRows.map((row) => (
              <Card key={String(row.id)} sx={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        รหัส
                      </Typography>
                      <Typography variant="h6">{renderValue(row.id)}</Typography>
                    </Box>
                    <Stack spacing={1}>
                      {columns.map((column) => (
                        <Stack key={column.key} direction="row" spacing={1} alignItems="baseline">
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120 }}>
                            {column.label}
                          </Typography>
                          <Box sx={{ typography: 'body2' }}>
                            {column.render ? column.render(row) : renderValue(row[column.key])}
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                    <Divider sx={{ opacity: 0.2 }} />
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      justifyContent="flex-end"
                      flexWrap="wrap"
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={() => handleOpenEdit(row)}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        แก้ไข
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<Delete />}
                        onClick={() => {
                          setEditingRow(row);
                          setDeleteOpen(true);
                        }}
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
                      >
                        ลบ
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
            {filteredRows.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body2">ไม่มีข้อมูล</Typography>
              </Box>
            )}
          </Stack>
        )}
        {filteredRows.length > visibleCount && (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
            <Button
              variant="outlined"
              onClick={() =>
                setVisibleCount((prev) => Math.min(prev + LAZY_PAGE_SIZE, filteredRows.length))
              }
            >
              โหลดเพิ่ม
            </Button>
          </Box>
        )}
      </Paper>

      <Dialog
        open={formOpen}
        onClose={handleCloseForm}
        fullWidth
        maxWidth="md"
        fullScreen={!isMdUp}
      >
        <DialogTitle sx={accentColor ? { color: accentColor } : undefined}>
          {editingRow ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {formHeader}
          <Typography variant="subtitle1" fontWeight={600}>
            รายละเอียดข้อมูล
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ช่องที่มีเครื่องหมาย * จำเป็นต้องกรอก
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: 'repeat(1, minmax(0, 1fr))', md: 'repeat(12, minmax(0, 1fr))' }
            }}
          >
            {visibleFields.map((field, index) => {
            const autoFocus = index === 0;
            if (field.type === 'select') {
              const fieldOptions = resolveFieldOptions(field, formValues);
              return (
                <Box
                  key={field.key}
                  sx={{
                    gridColumn: {
                      xs: `span ${field.grid?.xs ?? 12}`,
                      md: `span ${field.grid?.md ?? 6}`
                    }
                  }}
                >
                  <FormControl fullWidth>
                    <InputLabel>{field.label}</InputLabel>
                    <Select
                      label={field.label}
                      value={formValues[field.key] ?? ''}
                      autoFocus={autoFocus}
                      onChange={(event) =>
                        setFormValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                      }
                    >
                      {fieldOptions.map((option) => (
                        <MenuItem key={String(option.value)} value={String(option.value)}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              );
            }

            if (field.type === 'boolean') {
              return (
                <Box
                  key={field.key}
                  sx={{
                    gridColumn: {
                      xs: `span ${field.grid?.xs ?? 12}`,
                      md: `span ${field.grid?.md ?? 6}`
                    }
                  }}
                >
                  <FormControl fullWidth>
                    <InputLabel>{field.label}</InputLabel>
                    <Select
                      label={field.label}
                      value={String(formValues[field.key] ?? '')}
                      autoFocus={autoFocus}
                      onChange={(event) =>
                        setFormValues((prev) => ({
                          ...prev,
                          [field.key]: event.target.value === 'true'
                        }))
                      }
                    >
                      <MenuItem value="true">ใช้งาน</MenuItem>
                      <MenuItem value="false">ไม่ใช้งาน</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              );
            }

            if (field.type === 'autocomplete') {
              const fieldOptions = resolveFieldOptions(field, formValues);
              const selected =
                fieldOptions.find((option) => String(option.value) === String(formValues[field.key])) ||
                null;
              return (
                <Box
                  key={field.key}
                  sx={{
                    gridColumn: {
                      xs: `span ${field.grid?.xs ?? 12}`,
                      md: `span ${field.grid?.md ?? 6}`
                    }
                  }}
                >
                  <Autocomplete
                    options={fieldOptions}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) => option.value === value.value}
                    value={selected}
                    onChange={(_, nextValue) =>
                      setFormValues((prev) => ({ ...prev, [field.key]: nextValue?.value ?? '' }))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label={field.label}
                        required={field.required}
                        fullWidth
                        autoFocus={autoFocus}
                      />
                    )}
                  />
                </Box>
              );
            }

            return (
              <Box
                key={field.key}
                sx={{
                  gridColumn: {
                    xs: `span ${field.grid?.xs ?? 12}`,
                    md: `span ${field.grid?.md ?? (field.type === 'textarea' ? 12 : 6)}`
                  }
                }}
              >
                <TextField
                  label={field.label}
                  type={field.type === 'datetime' ? 'datetime-local' : field.type}
                  required={field.required}
                  value={formValues[field.key] ?? ''}
                  autoFocus={autoFocus}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                  }
                  fullWidth
                  multiline={field.type === 'textarea'}
                  minRows={field.type === 'textarea' ? 3 : undefined}
                  inputProps={field.type === 'number' ? { step: field.step || '1' } : undefined}
                />
              </Box>
            );
          })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: 1, p: 2 }}>
          <Button onClick={handleCloseForm} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>ยืนยันการลบ</DialogTitle>
        <DialogContent>ต้องการลบรายการนี้ใช่หรือไม่?</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>ยกเลิก</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            ลบ
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(error)} autoHideDuration={4000} onClose={() => setError(null)}>
        <Alert severity="error" variant="filled" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={Boolean(success)} autoHideDuration={3000} onClose={() => setSuccess(null)}>
        <Alert severity="success" variant="filled" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function renderValue(value: unknown) {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'ใช่' : 'ไม่';
  if (value instanceof Date) return formatDateTime(value.toISOString());
  const text = String(value);
  if (text.match(/\d{4}-\d{2}-\d{2}T/)) {
    return formatDateTime(text);
  }
  if (text.length > 32) return `${text.slice(0, 32)}...`;
  return text;
}

export function StatusChip({ value }: { value: string }) {
  const colorMap: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
    scheduled: 'warning',
    completed: 'success',
    cancelled: 'error',
    pending: 'warning',
    paid: 'success',
    refunded: 'error'
  };

  const labelMap: Record<string, string> = {
    scheduled: 'จองไว้',
    completed: 'สำเร็จ',
    cancelled: 'ยกเลิก',
    pending: 'รอดำเนินการ',
    paid: 'ชำระแล้ว',
    refunded: 'คืนเงิน'
  };

  const backgroundMap: Record<string, string> = {
    warning: 'rgba(255, 193, 7, 0.2)',
    success: 'rgba(46, 204, 113, 0.2)',
    error: 'rgba(231, 76, 60, 0.2)',
    default: 'rgba(255,255,255,0.12)'
  };

  const textColorMap: Record<string, string> = {
    warning: '#f7c942',
    success: '#3ddc84',
    error: '#ff6b6b',
    default: '#cbd5e1'
  };

  const tone = colorMap[value] || 'default';

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1,
        py: 0.25,
        borderRadius: 999,
        fontSize: '0.75rem',
        lineHeight: 1.4,
        fontWeight: 600,
        backgroundColor: backgroundMap[tone],
        color: textColorMap[tone],
        border: '1px solid rgba(255,255,255,0.12)'
      }}
    >
      {labelMap[value] || value}
    </Box>
  );
}
