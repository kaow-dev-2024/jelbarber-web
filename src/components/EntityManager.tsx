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
import { Add, Delete, Edit, Refresh } from '@mui/icons-material';
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
  searchKeys = []
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ p: { xs: 2, md: 3 }, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4">{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              จัดการข้อมูลทั้งหมด พร้อมตัวกรองและการค้นหา
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchRows}>
              รีเฟรช
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate}>
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
          <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
            <CircularProgress color="secondary" />
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
                    <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={() => handleOpenEdit(row)}
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

      <Dialog open={formOpen} onClose={handleCloseForm} fullWidth maxWidth="sm">
        <DialogTitle>{editingRow ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {visibleFields.map((field, index) => {
            const autoFocus = index === 0;
            if (field.type === 'select') {
              const fieldOptions = resolveFieldOptions(field, formValues);
              return (
                <FormControl key={field.key} fullWidth>
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
              );
            }

            if (field.type === 'boolean') {
              return (
                <FormControl key={field.key} fullWidth>
                  <InputLabel>{field.label}</InputLabel>
                  <Select
                    label={field.label}
                    value={String(formValues[field.key] ?? '')}
                    autoFocus={autoFocus}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, [field.key]: event.target.value === 'true' }))
                    }
                  >
                    <MenuItem value="true">ใช้งาน</MenuItem>
                    <MenuItem value="false">ไม่ใช้งาน</MenuItem>
                  </Select>
                </FormControl>
              );
            }

            if (field.type === 'autocomplete') {
              const fieldOptions = resolveFieldOptions(field, formValues);
              const selected =
                fieldOptions.find((option) => String(option.value) === String(formValues[field.key])) ||
                null;
              return (
                <Autocomplete
                  key={field.key}
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
              );
            }

            return (
              <TextField
                key={field.key}
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
            );
          })}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading}>
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
