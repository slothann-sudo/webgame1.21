import type { Target } from '../types';
import { NEAR_THRESHOLD, THRESHOLD } from '../config';

interface Props {
  target: Target;
  onSelect: (id: string) => void;
}

function trendArrow(target: Target): string {
  if (target.threatRate >= 0.4) return '↑';
  if (target.threatRate >= 0.28) return '↗';
  return '→';
}

export default function TargetCard({ target, onSelect }: Props) {
  const over = target.threat >= THRESHOLD;
  const near = !over && target.threat >= NEAR_THRESHOLD;
  const cls = target.confirmed ? 'target-confirmed' : over ? 'target-alert' : 'target-normal';
  const stateText = target.confirmed ? '已确认' : over ? '需确认' : near ? '接近阈值' : '监控中';

  return (
    <button
      className={`target-card ${cls}`}
      onClick={() => onSelect(target.id)}
      disabled={target.confirmed}
    >
      <div className="tc-head">
        <span className="tc-id">{target.id}</span>
        <span className="tc-source">{target.source}</span>
      </div>
      <div className="tc-threat">
        Threat <b>{Math.round(target.threat)}</b>
        <span className="tc-trend">{trendArrow(target)}</span>
      </div>
      <div className="tc-row">距离 {target.distance.toFixed(1)} km</div>
      <div className="tc-row">接近速度 {Math.round(target.speed)} m/s</div>
      <div className="tc-state">{stateText}</div>
      {over && !target.confirmed && <span className="tc-confirm-btn">确认目标</span>}
    </button>
  );
}
