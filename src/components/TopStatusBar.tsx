import type { Intervention, Workload } from '../types';

interface Props {
  participantId: string;
  workload: Workload;
  intervention: Intervention;
  elapsedMs: number;
  hits: number;
  misses: number;
  falseAlarms: number;
  uavShown: number;
  onEnd: () => void;
}

function fmtTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TopStatusBar(props: Props) {
  return (
    <header className="topbar">
      <div className="tb-item">被试 {props.participantId}</div>
      <div className="tb-item">
        {props.workload === 'high' ? '高负荷' : '普通负荷'} · {props.intervention}
      </div>
      <div className="tb-item tb-time">{fmtTime(props.elapsedMs)}</div>
      <div className="tb-item tb-stat">命中 {props.hits}</div>
      <div className="tb-item tb-stat">漏检 {props.misses}</div>
      <div className="tb-item tb-stat">误报 {props.falseAlarms}</div>
      <div className="tb-item tb-stat">UAV {props.uavShown}</div>
      <button className="end-btn" onClick={props.onEnd}>结束实验</button>
    </header>
  );
}
