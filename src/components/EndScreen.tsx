import { useState } from 'react';
import type { ExperimentConfig, Summary } from '../types';
import { getLogs, logEvent } from '../utils/logger';
import { downloadCsv } from '../utils/csv';

interface Props {
  participantId: string;
  config: ExperimentConfig;
  summary: Summary | null;
  onRestart: () => void;
}

function fmtPct(v: number): string {
  return (v * 100).toFixed(1) + '%';
}

function fmtMs(v: number): string {
  return v.toFixed(0) + ' ms';
}

export default function EndScreen({ participantId, config, summary, onRestart }: Props) {
  const [exported, setExported] = useState(false);

  function handleExport() {
    logEvent({ event_type: 'export_csv', screen_state: 'end' });
    const logs = getLogs();
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const filename = `${participantId}_${config.workload}_${config.intervention}_${ts}.csv`;
    downloadCsv(logs, filename);
    setExported(true);
  }

  if (!summary) {
    return (
      <div className="screen">
        <div className="panel">暂无实验数据。</div>
      </div>
    );
  }

  return (
    <div className="screen end-screen">
      <div className="panel end-panel">
        <h1>实验结束</h1>
        <p className="subtitle">
          被试 {participantId} · {config.workload === 'high' ? '高负荷' : '普通负荷'} · {config.intervention}
        </p>

        <div className="summary-grid">
          <Stat label="主任务命中" value={String(summary.hits)} />
          <Stat label="主任务漏检" value={String(summary.misses)} />
          <Stat label="主任务误报" value={String(summary.falseAlarms)} />
          <Stat label="主任务正确率" value={fmtPct(summary.accuracy)} />
          <Stat label="主任务平均反应时" value={fmtMs(summary.mainAvgRt)} />
          <Stat label="UAV 次任务出现" value={String(summary.uavShown)} />
          <Stat label="UAV 次任务正确" value={String(summary.uavCorrect)} />
          <Stat label="UAV 次任务正确率" value={fmtPct(summary.uavAccuracy)} />
          <Stat label="UAV 次任务平均反应时" value={fmtMs(summary.uavAvgRt)} />
        </div>

        {summary.firstMainClickTimeMs !== null && (
          <p className="hint">首次主任务点击时间：{fmtMs(summary.firstMainClickTimeMs)}</p>
        )}

        <div className="end-actions">
          <button className="primary-btn" onClick={handleExport}>导出 CSV</button>
          <button className="ghost-btn" onClick={onRestart}>重新开始</button>
        </div>
        {exported && <p className="hint">CSV 已导出。</p>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-box">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
