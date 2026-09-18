import type { Target } from '../types';
import { THRESHOLD } from '../config';

interface Props {
  targets: Target[];
  elapsedMs: number;
  uavActive: boolean;
  onTargetClick: (id: string) => void;
}

// 有人车行进路线（SVG 坐标，0-100）
const ROUTE: [number, number][] = [
  [12, 88],
  [28, 70],
  [30, 52],
  [46, 44],
  [58, 30],
  [72, 28],
  [86, 20],
];

const UAV_POS: Record<string, [number, number]> = {
  'UAV-01': [20, 22],
  'UAV-02': [50, 60],
  'UAV-03': [80, 78],
};

// 沿折线插值，t ∈ [0,1) 循环
function routePoint(t: number): [number, number] {
  const tt = ((t % 1) + 1) % 1;
  const segs = ROUTE.slice(1).map((p, i) => {
    const a = ROUTE[i];
    return Math.hypot(p[0] - a[0], p[1] - a[1]);
  });
  const total = segs.reduce((a, b) => a + b, 0);
  let dist = tt * total;
  for (let i = 0; i < segs.length; i++) {
    if (dist <= segs[i]) {
      const a = ROUTE[i];
      const b = ROUTE[i + 1];
      const f = segs[i] === 0 ? 0 : dist / segs[i];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    dist -= segs[i];
  }
  return ROUTE[ROUTE.length - 1];
}

export default function SituationMap({ targets, elapsedMs, uavActive, onTargetClick }: Props) {
  const [vx, vy] = routePoint(elapsedMs / 20000);
  const grid = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  return (
    <div className="map-panel">
      <div className="section-title">态势图</div>
      <svg viewBox="0 0 100 100" className="situation-map">
        <rect x="0" y="0" width="100" height="100" className="map-bg" />

        {grid.map((i) => (
          <line key={`v${i}`} x1={i * 10} y1="0" x2={i * 10} y2="100" className="map-grid" />
        ))}
        {grid.map((i) => (
          <line key={`h${i}`} x1="0" y1={i * 10} x2="100" y2={i * 10} className="map-grid" />
        ))}

        <polyline points={ROUTE.map((p) => p.join(',')).join(' ')} className="map-route" />

        {Object.entries(UAV_POS).map(([id, [ux, uy]]) => (
          <g key={id} className={`uav-marker ${id === 'UAV-02' && uavActive ? 'uav-marker-active' : ''}`}>
            <circle cx={ux} cy={uy} r="3.2" />
            <text x={ux} y={uy - 5} className="map-label">{id}</text>
          </g>
        ))}

        <g className="vehicle-marker">
          <circle cx={vx} cy={vy} r="2.6" />
          <text x={vx} y={vy - 4} className="map-label">VEH</text>
        </g>

        {targets.map((t) => (
          <g key={t.id} className="target-point" onClick={() => onTargetClick(t.id)}>
            <circle
              cx={t.x}
              cy={t.y}
              r="3.6"
              className={t.threat >= THRESHOLD ? 'tp-alert' : 'tp-normal'}
            />
            <circle cx={t.x} cy={t.y} r="7" className="tp-hit" />
            <text x={t.x} y={t.y - 6} className="map-label">{t.id}</text>
          </g>
        ))}

        <text x="2" y="97" className="map-hint">有人车行进路线</text>
      </svg>
    </div>
  );
}
