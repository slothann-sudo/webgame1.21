import type { LogEvent } from '../types';

// CSV 表头顺序
const HEADER: (keyof LogEvent)[] = [
  'participant_id',
  'condition_workload',
  'condition_intervention',
  'block_id',
  'event_type',
  'event_id',
  'target_id',
  'uav_id',
  'response',
  'correct',
  'error_type',
  'threat_value',
  'threshold',
  'rt_ms',
  'timestamp_ms',
  'experiment_time_ms',
  'screen_state',
  'extra_json',
];

function escapeCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function buildCsv(logs: LogEvent[]): string {
  const lines = [HEADER.join(',')];
  for (const l of logs) {
    lines.push(HEADER.map((k) => escapeCell(l[k])).join(','));
  }
  // 加 UTF-8 BOM，保证 Excel 打开中文不乱码
  return '﻿' + lines.join('\r\n');
}

export function downloadCsv(logs: LogEvent[], filename: string): void {
  const csv = buildCsv(logs);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
