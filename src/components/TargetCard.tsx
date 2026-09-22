import type { Target } from '../types';
import { THRESHOLD } from '../config';

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
  // 关键：不根据 threat 是否越阈值改变任何文案/颜色/按钮，避免向被试泄露答案。
  // 命中与误报在界面上一律只显示中性反馈“已记录选择”，正确/错误仅写入后台日志。
  const feedbackActive = target.confirmed || target.feedbackUntil !== null;
  const stateText = feedbackActive ? '已记录选择' : '跟踪中';

  return (
    <div className="target-card">
      <div className="tc-head">
        <span className="tc-id">{target.id}</span>
        <span className="tc-source">{target.source}</span>
      </div>

      <div className="tc-threat-row">
        <div className="tc-threat">
          <span className="tc-threat-label">Threat</span>
          <b>{Math.round(target.threat)}</b>
          <span className="tc-trend">{trendArrow(target)}</span>
        </div>
        <span className="tc-threshold">阈值 {THRESHOLD}</span>
      </div>

      <div className="tc-bar">
        <div className="tc-bar-fill" style={{ width: `${Math.max(0, Math.min(100, target.threat))}%` }} />
        <div className="tc-bar-mark" style={{ left: `${THRESHOLD}%` }} />
      </div>

      <div className="tc-meta">
        <div className="tc-row">距离 {target.distance.toFixed(1)} km</div>
        <div className="tc-row">接近速度 {Math.round(target.speed)} m/s</div>
        <div className="tc-row">来源 {target.source}</div>
      </div>

      <div className={`tc-state${feedbackActive ? ' tc-state-feedback' : ''}`}>
        状态：{stateText}
      </div>

      <button
        type="button"
        className="tc-select-btn"
        onClick={() => onSelect(target.id)}
        disabled={feedbackActive}
      >
        {feedbackActive ? '已记录选择' : '选择该目标'}
      </button>
    </div>
  );
}
