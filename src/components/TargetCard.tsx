import type { Target } from '../types';
import { THRESHOLD } from '../config';

interface Props {
  target: Target;
  onSelect: (id: string) => void;
}

export default function TargetCard({ target, onSelect }: Props) {
  const over = target.threat >= THRESHOLD;
  const cls = target.confirmed ? 'target-confirmed' : over ? 'target-alert' : 'target-normal';

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
      </div>
      <div className="tc-row">{target.distance.toFixed(1)} km</div>
      <div className="tc-row">↑{Math.round(target.speed)} m/s</div>
      <div className="tc-state">{target.confirmed ? '已确认' : over ? '需确认' : '监控中'}</div>
    </button>
  );
}
