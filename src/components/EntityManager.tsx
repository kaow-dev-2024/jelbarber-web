'use client';

import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
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

type FieldType = 'text' | 'number' | 'select' | 'datetime' | 'boolean' | 'textarea' | 'password';

type FieldOption = {
  value: string | number;
  label: string;
};

export type FieldConfig = {
  key: string;
  label: string;
  type: FieldType;
  options?: FieldOption[];
  required?: boolean;
  step?: string;
  showOn?: 'create' | 'edit' | 'both';
};

export type ColumnConfig = {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
};

export type FilterConfig = {
  key: string;
  label: string;
  type: 'text' | 'select' | 'boolean' | 'number';
  options?: FieldOption[];
};

export type EntityManagerProps = {
  title: string;
  endpoint: string;
  columns: ColumnConfig[];
  formFields: FieldConfig[];
  filters?: FilterConfig[];
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

export default function EntityManager({
  title,
  endpoint,
  columns,
  formFields,
  filters = [],
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
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
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

  const handleOpenCreate = () => {
    setEditingRow(null);
    setFormValues({});
    setFormOpen(true);
  };

  const handleOpenEdit = (row: Record<string, unknown>) => {
    const nextValues: Record<string, unknown> = { ...row };
    formFields.forEach((field) => {
      if (field.type === 'datetime') {
        nextValues[field.key] = toDateTimeLocal(row[field.key]);
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
        if (field.type === 'number' && value !== '' && value !== null && value !== undefined) {
          value = Number(value);
        }
        if (field.type === 'boolean') {
          if (value === '' || value === undefined || value === null) return;
          value = Boolean(value);
        }
        if (value !== undefined) payload[field.key] = value;
      });

      if (editingRow?.id) {
        await updateEntity(endpoint, token, Number(editingRow.id), payload);
      } else {
        await createEntity(endpoint, token, payload);
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
      await fetchRows();
      setDeleteOpen(false);
      setEditingRow(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
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
        const value = filterValues[filter.key];
        if (value === '' || value === undefined || value === null) continue;
        const rowValue = row[filter.key];
        if (filter.type === 'boolean') {
          if (String(rowValue) !== String(value)) return false;
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

  const visibleRows = useMemo(
    () => filteredRows.slice(0, visibleCount),
    [filteredRows, visibleCount]
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
              return (
                <TextField
                  key={filter.key}
                  label={filter.label}
                  type={filter.type === 'number' ? 'number' : 'text'}
                  value={filterValues[filter.key] ?? ''}
                  onChange={(event) =>
                    setFilterValues((prev) => ({ ...prev, [filter.key]: event.target.value }))
                  }
                  sx={{ minWidth: 160 }}
                />
              );
            }

            return (
              <FormControl key={filter.key} sx={{ minWidth: 160 }}>
                <InputLabel>{filter.label}</InputLabel>
                <Select
                  label={filter.label}
                  value={filterValues[filter.key] ?? ''}
                  onChange={(event) =>
                    setFilterValues((prev) => ({ ...prev, [filter.key]: event.target.value }))
                  }
                >
                  <MenuItem value="">ทั้งหมด</MenuItem>
                  {filter.options?.map((option) => (
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
                          <Typography variant="body2">
                            {column.render ? column.render(row) : renderValue(row[column.key])}
                          </Typography>
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
          {visibleFields.map((field) => {
            if (field.type === 'select') {
              return (
                <FormControl key={field.key} fullWidth>
                  <InputLabel>{field.label}</InputLabel>
                  <Select
                    label={field.label}
                    value={formValues[field.key] ?? ''}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  >
                    {field.options?.map((option) => (
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

            return (
              <TextField
                key={field.key}
                label={field.label}
                type={field.type === 'datetime' ? 'datetime-local' : field.type}
                required={field.required}
                value={formValues[field.key] ?? ''}
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

  return (
    <Chip
      label={labelMap[value] || value}
      color={colorMap[value] || 'default'}
      size="small"
    />
  );
}
