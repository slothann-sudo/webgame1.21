import type { Intervention, UavTask } from '../types';
import { UAV_OPTIONS } from '../config';

interface Props {
  task: UavTask | null;
  intervention: Intervention;
  onSelect: (key: string) => void;
}

function OptionList({ onSelect }: { onSelect: (key: string) => void }) {
  return (
    <div className="uav-options">
      {UAV_OPTIONS.map((o) => (
        <button key={o.key} className="uav-option" onClick={() => onSelect(o.key)}>
          <div className="opt-head">
            <span className="opt-key">{o.key}</span>
            <span className="opt-label">{o.label}</span>
          </div>
          <div className="opt-detail">
            <span>{o.area} · {o.type}</span>
            <span>任务阶段：{o.stage}</span>
            <span>当前覆盖：{o.coverage}%</span>
            <span>未确认线索：{o.unconfirmedCues}</span>
            <span>高价值线索：{o.highValueCues}</span>
            <span>到达代价：{o.cost}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function UavTaskPanel({ task, intervention, onSelect }: Props) {
  const isDirect = intervention === 'direct_visual';
  const isGuidance = !isDirect;
  const active = task !== null;

  return (
    <>
      <div className="uav-panel">
        <div className="section-title">UAV 协同态势</div>
        <div className="uav-row">
          <span className="uav-label">UAV-01</span>
          <span className="uav-status">巡航中</span>
        </div>
        <div className={`uav-row ${active && isGuidance ? 'uav-row-active' : ''}`}>
          <span className="uav-label">UAV-02</span>
          <span className="uav-status">{active ? '资源冲突 · 待裁决' : '巡航中'}</span>
        </div>
        <div className="uav-row">
          <span className="uav-label">UAV-03</span>
          <span className="uav-status">巡航中</span>
        </div>

        {active && isGuidance && (
          <div className="uav-task-box">
            <div className="uav-task-tag">NEW TASK</div>
            <div className="uav-task-title">UAV-02 资源冲突待裁决</div>
            <OptionList onSelect={onSelect} />
          </div>
        )}
      </div>

      {active && isDirect && (
        <div className="uav-overlay">
          <div className="uav-task-box overlay-box">
            <div className="uav-task-tag">NEW TASK</div>
            <div className="uav-task-title">UAV-02 资源冲突待裁决</div>
            <OptionList onSelect={onSelect} />
          </div>
        </div>
      )}
    </>
  );
}
