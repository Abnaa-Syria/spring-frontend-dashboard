import { api } from './api';

export interface CsvColumn<T> { title: string; value: (row: T) => string | number | null | undefined }

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Downloads rows as a UTF-8 CSV that Excel opens with Arabic intact (BOM). */
export function downloadCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]) {
  const lines = [columns.map((c) => cell(c.title)).join(','), ...rows.map((r) => columns.map((c) => cell(c.value(r))).join(','))];
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Fetches every page of a paged list endpoint (up to `max` rows) for export. */
export async function fetchAll<T>(url: string, params: Record<string, unknown> = {}, max = 5000): Promise<T[]> {
  const out: T[] = [];
  const pageSize = 100;
  for (let page = 1; out.length < max; page++) {
    const { data } = await api.get<{ items: T[]; total: number }>(url, { params: { ...params, page, pageSize } });
    out.push(...data.items);
    if (out.length >= data.total || data.items.length < pageSize) break;
  }
  return out;
}
