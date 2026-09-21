import { Fragment } from 'react';
import type { UavOption, UavTask } from '../types';
import { UAV_OPTIONS } from '../config';

interface Props {
  task: UavTask | null;
  uav02Assignment: string | null; // 裁决后的去向文案，如 '转派 C 区'
  lastDecision: { key: string; area: string; label: string } | null;
  onSelect: (key: string) => void;
}

const MATRIX_ROWS: { label: string; value: (o: UavOption) => string }[] = [
  { label: '任务阶段', value: (o) => o.stage },
  { label: '当前覆盖', value: (o) => `${o.coverage}%` },
  { label: '未确认线索', value: (o) => String(o.unconfirmedCues) },
  { label: '高价值线索', value: (o) => String(o.highValueCues) },
  { label: '到达代价', value: (o) => o.cost },
];

function DecisionMatrix({ onSelect }: { onSelect: (key: string) => void }) {
  return (
    <div className="uav-matrix-scroll">
      <div className="uav-matrix uav-matrix-compact">
        <div className="um-corner" aria-hidden="true"></div>
        {UAV_OPTIONS.map((o) => (
          <div key={`h-${o.key}`} className="um-colhead">{o.label}</div>
        ))}

        {MATRIX_ROWS.map((r) => (
          <Fragment key={r.label}>
            <div className="um-rowhead">{r.label}</div>
            {UAV_OPTIONS.map((o) => (
              <div key={`${r.label}-${o.key}`} className="um-cell">{r.value(o)}</div>
            ))}
          </Fragment>
        ))}

        <div className="um-corner" aria-hidden="true"></div>
        {UAV_OPTIONS.map((o) => (
          <button key={`a-${o.key}`} className="um-action" onClick={() => onSelect(o.key)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function UavTaskPanel({ task, uav02Assignment, lastDecision, onSelect }: Props) {
  const pending = task !== null && !task.responded && !task.timedOut;
  const uav02Status = pending
    ? '资源冲突 · 待裁决'
    : uav02Assignment
      ? `${uav02Assignment} / 执行中`
      : '侦察中';

  return (
    <div className="uav-panel">
      <div className="section-title">UAV 协同状态</div>
      <div className="uav-row">
        <span className="uav-label">UAV-01</span>
        <span className="uav-status">侦察中</span>
      </div>
      <div className={`uav-row${pending ? ' uav-row-active' : ''}`}>
        <span className="uav-label">UAV-02</span>
        <span className="uav-status">{uav02Status}</span>
      </div>
      <div className="uav-row">
        <span className="uav-label">UAV-03</span>
        <span className="uav-status">侦察中</span>
      </div>

      {lastDecision ? (
        <div className="uav-task-box uav-task-box-center">
          <div className="uav-decision-feedback">✓ 裁决完成</div>
          <div className="uav-decision-detail">
            {lastDecision.key === 'B'
              ? `UAV-02 保持 ${lastDecision.area}`
              : `UAV-02 已转派至 ${lastDecision.area}`}
          </div>
        </div>
      ) : pending ? (
        <div className="uav-task-box">
          <div className="uav-task-tag">NEW TASK</div>
          <div className="uav-task-title">UAV-02 任务冲突待裁决</div>
          <div className="uav-desc">请比较三个候选方案并选择 UAV-02 下一阶段任务</div>
          <DecisionMatrix onSelect={onSelect} />
        </div>
      ) : (
        <div className="uav-monitor-footer">待处理任务：0</div>
      )}
    </div>
  );
}
