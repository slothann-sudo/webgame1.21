import type { Target } from '../types';

interface Props {
  targets: Target[];
  elapsedMs: number;
  uavActive: boolean;
  uav02Area: string | null; // 裁决后 UAV-02 的侦察区域（'B区'/'C区'/'D区'），用于更新其规划航线
  onTargetClick: (id: string) => void;
}

// 态势图坐标空间：viewBox 0 0 200 100（宽幅，充分利用主区域宽度）
// 有人车行进主路线（从左向右推进）
const ROUTE: [number, number][] = [
  [18, 78],
  [45, 70],
  [72, 62],
  [100, 56],
  [128, 50],
  [158, 44],
  [188, 38],
];

// UAV 协同平台位置（位于有人车右前方，前出侦察）
const UAV_POS: Record<string, [number, number]> = {
  'UAV-01': [66, 30],
  'UAV-02': [105, 22],
  'UAV-03': [144, 30],
};

// 侦察区域节点（位于主路线前方）
const AREAS: { name: string; x: number; y: number }[] = [
  { name: 'B区', x: 90, y: 12 },
  { name: 'C区', x: 128, y: 10 },
  { name: 'D区', x: 166, y: 12 },
];

// 各 UAV 默认规划航线终点（对应侦察区域）；UAV-02 会随裁决结果更新
const UAV_DEFAULT_AREA: Record<string, string> = {
  'UAV-01': 'B区',
  'UAV-02': 'C区',
  'UAV-03': 'D区',
};

function areaOf(uavId: string, uav02Area: string | null): { x: number; y: number } {
  const name = uavId === 'UAV-02' && uav02Area ? uav02Area : UAV_DEFAULT_AREA[uavId];
  return AREAS.find((a) => a.name === name) ?? AREAS[1];
}

// 沿折线插值，t ∈ [0,1) 循环
function routePoint(t: number): [number, number] {
  const tt = ((t % 1) + 1) % 1;
  const segs = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]));
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

// 已走路线折线点串（到当前进度为止）
function traveledPoints(t: number): string {
  const tt = ((t % 1) + 1) % 1;
  const segs = ROUTE.slice(1).map((p, i) => Math.hypot(p[0] - ROUTE[i][0], p[1] - ROUTE[i][1]));
  const total = segs.reduce((a, b) => a + b, 0);
  let dist = tt * total;
  const pts: [number, number][] = [ROUTE[0]];
  for (let i = 0; i < segs.length; i++) {
    if (dist <= segs[i]) {
      const a = ROUTE[i];
      const b = ROUTE[i + 1];
      const f = segs[i] === 0 ? 0 : dist / segs[i];
      pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      break;
    }
    dist -= segs[i];
    pts.push(ROUTE[i + 1]);
  }
  return pts.map((p) => p.join(',')).join(' ');
}

export default function SituationMap({
  targets,
  elapsedMs,
  uavActive,
  uav02Area,
  onTargetClick,
}: Props) {
  const [vx, vy] = routePoint(elapsedMs / 20000);
  const gridX = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200];
  const gridY = [0, 20, 40, 60, 80, 100];

  return (
    <div className="map-panel">
      <div className="section-title">综合协同态势图</div>
      <svg viewBox="0 0 200 100" className="situation-map exp-map">
        <rect x="0" y="0" width="200" height="100" className="map-bg" />

        {/* 轻量网格参考 */}
        {gridX.map((i) => (
          <line key={`v${i}`} x1={i} y1="0" x2={i} y2="100" className="map-grid" />
        ))}
        {gridY.map((i) => (
          <line key={`h${i}`} x1="0" y1={i} x2="200" y2={i} className="map-grid" />
        ))}

        {/* 侦察区域节点 B/C/D */}
        {AREAS.map((a) => (
          <g key={a.name}>
            <rect x={a.x - 5} y={a.y - 3} width="10" height="7" className="map-area" />
            <text x={a.x} y={a.y + 2.5} className="map-area-label" textAnchor="middle">
              {a.name}
            </text>
          </g>
        ))}

        {/* UAV 规划航线（前出侦察） */}
        {Object.entries(UAV_POS).map(([id, [sx, sy]]) => {
          const target = areaOf(id, uav02Area);
          return (
            <g key={id}>
              <line x1={sx} y1={sy} x2={target.x} y2={target.y} className="map-uav-route" />
              <circle cx={target.x} cy={target.y} r="0.9" className="map-uav-route-dot" />
            </g>
          );
        })}

        {/* 有人车主路线：未走（虚线）+ 已走（亮色实线） */}
        <polyline
          points={ROUTE.map((p) => p.join(',')).join(' ')}
          className="map-route-untraveled"
        />
        <polyline points={traveledPoints(elapsedMs / 20000)} className="map-route-traveled" />
        <text x={ROUTE[0][0] - 2} y={ROUTE[0][1] + 4} className="map-route-end" textAnchor="end">
          START
        </text>
        <text x={ROUTE[ROUTE.length - 1][0] + 2} y={ROUTE[ROUTE.length - 1][1]} className="map-route-end">
          END
        </text>

        {/* UAV 平台 */}
        {Object.entries(UAV_POS).map(([id, [ux, uy]]) => (
          <g
            key={id}
            className={`uav-marker ${id === 'UAV-02' && uavActive ? 'uav-marker-active' : ''}`}
          >
            <circle cx={ux} cy={uy} r="2.8" />
            <text x={ux} y={uy - 5} className="map-label" textAnchor="middle">{id}</text>
          </g>
        ))}

        {/* 有人车平台 */}
        <g className="vehicle-marker">
          <circle cx={vx} cy={vy} r="2.4" />
          <text x={vx} y={vy - 4.5} className="map-label" textAnchor="middle">VEH</text>
        </g>

        {/* 威胁目标标记（态势辅助展示，详细判断以底部卡片为准；统一中性色，不随阈值变化泄露答案） */}
        {targets.map((t) => (
          <g key={t.id} className="target-point" onClick={() => onTargetClick(t.id)}>
            <circle cx={t.x} cy={t.y} r="3" className="tp-neutral" />
            <circle cx={t.x} cy={t.y} r="7" className="tp-hit" />
            <text x={t.x} y={t.y - 5} className="map-label" textAnchor="middle">{t.id}</text>
          </g>
        ))}

        <text x="2" y="97.5" className="map-hint">有人车 → UAV 前出侦察 → 任务终点</text>
      </svg>
    </div>
  );
}
