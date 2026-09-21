import { Fragment, useEffect, useRef, useState } from 'react';
import type { Intervention, ModuleStatus, TrainingModuleKey, UavOption } from '../types';
import { THRESHOLD, UAV_OPTIONS } from '../config';
import { clamp } from '../utils/random';

interface Props {
  intervention: Intervention;
  moduleStatus: Record<TrainingModuleKey, ModuleStatus>;
  currentModule: TrainingModuleKey;
  onModuleChange: (key: TrainingModuleKey) => void;
  onModuleComplete: (key: TrainingModuleKey) => void;
  onModuleSkip: (key: TrainingModuleKey) => void;
  onFinish: () => void;
}

type View = 'intro' | 'practice' | 'feedback';

const MODULES: TrainingModuleKey[] = ['main', 'secondary', 'combined'];
const LIMITS: Record<TrainingModuleKey, number> = { main: 2, secondary: 2, combined: 1 };
const MODULE_ORDER: Record<TrainingModuleKey, number> = { main: 1, secondary: 2, combined: 3 };

const MODULE_TITLE: Record<TrainingModuleKey, string> = {
  main: '主任务培训',
  secondary: '次任务培训',
  combined: '主次任务交织训练',
};

const MODULE_FULL_TITLE: Record<TrainingModuleKey, string> = {
  main: '主任务培训：动态威胁目标监控',
  secondary: '次任务培训：UAV资源冲突裁决',
  combined: '主次任务交织训练：主任务与次任务并行',
};

const MODULE_POINTS: Record<TrainingModuleKey, string[]> = {
  main: [
    '屏幕中会出现多个目标；',
    '每个目标有 Threat 威胁值；',
    '当目标 Threat ≥ 80 时，需要点击该目标；',
    '点击达到阈值的目标 = 正确确认；',
    '点击未达到阈值的目标 = 误报；',
    '超过阈值后长时间未点击 = 漏检。',
  ],
  secondary: [
    '实验过程中，UAV 可能出现资源冲突；',
    '系统会提示 UAV-02 需要人工裁决；',
    '你需要在 B区、C区、D区中选择一个任务去向；',
    '选择后次任务结束，返回主任务。',
  ],
  combined: [
    '正式实验中，主任务会持续运行；',
    '你需要持续监控目标 Threat 值；',
    '当 UAV 次任务出现时，主任务不会暂停；',
    '请在完成 UAV 裁决任务的同时，尽量保持主任务表现。',
  ],
};

const FEEDBACK_TEXT: Record<TrainingModuleKey, Record<string, string>> = {
  main: { correct: '已确认威胁目标', miss: '目标确认窗口已结束' },
  secondary: { done: '已完成一次 UAV 任务裁决练习' },
  combined: { done: '主次任务交织训练已完成' },
};

// 模块状态展示文案（导航栏 + 首页共用语义）
const MODULE_STATUS_TEXT: Record<ModuleStatus, string> = {
  not_started: '未完成',
  in_progress: '进行中',
  completed: '已完成',
  skipped: '已跳过',
};
const MODULE_STATUS_CLASS: Record<ModuleStatus, string> = {
  not_started: '',
  in_progress: 'active',
  completed: 'done',
  skipped: 'skipped',
};

export default function TrainingScreen({
  intervention,
  moduleStatus,
  currentModule,
  onModuleChange,
  onModuleComplete,
  onModuleSkip,
  onFinish,
}: Props) {
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [view, setView] = useState<View>('intro');
  const [feedback, setFeedback] = useState('');
  const [showFinish, setShowFinish] = useState(false);

  // 模块内练习结束后的反馈定时器：切换模块 / 卸载时清理，避免旧模块定时器继续运行
  const feedbackTimerRef = useRef<number | null>(null);
  const clearFeedbackTimer = () => {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  };
  useEffect(() => {
    clearFeedbackTimer();
    setPracticeIndex(0);
    setView('intro');
    setFeedback('');
  }, [currentModule]);
  useEffect(() => clearFeedbackTimer, []);

  function startPractice() {
    setView('practice');
  }

  function goToNext() {
    const idx = MODULES.indexOf(currentModule);
    if (idx < MODULES.length - 1) {
      onModuleChange(MODULES[idx + 1]);
    } else {
      onModuleComplete(currentModule);
      setShowFinish(true);
    }
  }

  function goToPrev() {
    const idx = MODULES.indexOf(currentModule);
    if (idx > 0) onModuleChange(MODULES[idx - 1]);
  }

  function skipCurrentModule() {
    onModuleSkip(currentModule);
    const idx = MODULES.indexOf(currentModule);
    if (idx < MODULES.length - 1) {
      onModuleChange(MODULES[idx + 1]);
    } else {
      setShowFinish(true);
    }
  }

  function finishPractice(result: string) {
    if (currentModule === 'combined') {
      // 交织训练仅 1 次，完成后标记完成并进入结束页
      onModuleComplete('combined');
      setShowFinish(true);
      return;
    }
    setFeedback(FEEDBACK_TEXT[currentModule][result] ?? result);
    setView('feedback');
    feedbackTimerRef.current = window.setTimeout(() => {
      feedbackTimerRef.current = null;
      if (practiceIndex + 1 < LIMITS[currentModule]) {
        setPracticeIndex(practiceIndex + 1);
        setView('practice');
      } else {
        onModuleComplete(currentModule);
        goToNext();
      }
    }, 1000);
  }

  function bottomHint(): string {
    if (view === 'feedback') return '已完成本次练习，准备进入下一次';
    if (view === 'intro') return '阅读说明后，点击「开始练习」进入实操';
    if (currentModule === 'main') return '请持续观察 Threat 值，达到阈值（≥ 80）时选择该目标';
    if (currentModule === 'secondary') return '请选择一个任务去向（B / C / D）';
    return '主任务持续运行中，请留意 UAV 次任务';
  }

  const isFirst = currentModule === 'main';
  const isLast = currentModule === 'combined';

  if (showFinish) {
    return (
      <div className="screen training-screen">
        <div className="panel training-complete">
          <h1>预实验培训已结束</h1>
          <p className="subtitle">
            你已完成或跳过了预实验模块，现在可以开始正式实验。
          </p>
          <div className="end-actions">
            <button className="primary-btn" onClick={onFinish}>完成预实验</button>
            <button className="ghost-btn" onClick={onFinish}>返回首页</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="experiment-screen training-screen">
      <nav className="training-nav">
        <span className="training-nav-title">预实验培训</span>
        <div className="training-nav-tabs">
          {MODULES.map((key) => (
            <button
              key={key}
              type="button"
              className={`training-nav-tab${key === currentModule ? ' active' : ''}`}
              onClick={() => onModuleChange(key)}
            >
              <span>{MODULE_TITLE[key]}</span>
              <span className={`tab-status ${MODULE_STATUS_CLASS[moduleStatus[key]]}`}>
                {MODULE_STATUS_TEXT[moduleStatus[key]]}
              </span>
            </button>
          ))}
        </div>
      </nav>

      <div className={`training-body${currentModule === 'combined' ? ' training-body-wide' : ''}`}>
        {view === 'intro' && (
          <div className="training-intro">
            <h2>{MODULE_FULL_TITLE[currentModule]}</h2>
            <ul className="training-points">
              {MODULE_POINTS[currentModule].map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <button className="primary-btn" onClick={startPractice}>开始练习</button>
          </div>
        )}

        {view === 'practice' && (
          <div className={`training-practice${currentModule === 'combined' ? ' training-practice-wide' : ''}`}>
            {currentModule === 'main' && (
              <MainPractice key={practiceIndex} practiceIndex={practiceIndex} onFinish={finishPractice} />
            )}
            {currentModule === 'secondary' && <UavPractice key={practiceIndex} onFinish={finishPractice} />}
            {currentModule === 'combined' && (
              <CombinedPractice key={practiceIndex} onFinish={finishPractice} />
            )}
          </div>
        )}

        {view === 'feedback' && (
          <div className="training-feedback">
            <p className="training-feedback-text">{feedback}</p>
          </div>
        )}
      </div>

      <div className="training-controls">
        <button type="button" className="ghost-btn" onClick={goToPrev} disabled={isFirst}>
          上一个
        </button>
        <button type="button" className="primary-btn" onClick={goToNext}>
          {isLast ? '完成预实验' : '下一个'}
        </button>
        <button type="button" className="ghost-btn" onClick={skipCurrentModule}>
          跳过当前模块
        </button>
        <span className="training-controls-spacer" />
        <button type="button" className="end-btn" onClick={onFinish}>
          返回首页
        </button>
      </div>

      <div className="system-log">
        <div className="log-scroll">
          <div className="log-line log-task">
            <span className="log-time">[培训]</span> {bottomHint()}
            <span className="training-controls-progress">
              （{MODULE_ORDER[currentModule]} / {MODULES.length} · 试玩{' '}
              {Math.min(practiceIndex + 1, LIMITS[currentModule])} / {LIMITS[currentModule]}）
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 主任务培训：动态威胁目标监控 ---------- */
type TrainTargetId = 'T01' | 'T02' | 'T03';
type TrainTrend = 'up' | 'steady' | 'down';

interface MainTrainTarget {
  id: TrainTargetId;
  threat: number;
  trend: TrainTrend;
  distance: string;
  speed: string;
  source: string;
}

// 目标卡片展示所需字段（主任务培训 3 目标 / 交织训练 4 目标共用，id 放宽为 string）
interface TrainCardData {
  id: string;
  threat: number;
  trend: TrainTrend;
  distance: string;
  speed: string;
  source: string;
}

const CONFIRM_FEEDBACK_MS = 1000;

const TREND: Record<TrainTrend, { arrow: string; label: string }> = {
  up: { arrow: '↑', label: '上升' },
  steady: { arrow: '→', label: '稳定' },
  down: { arrow: '↓', label: '下降' },
};

// 每个目标的静态信息（距离/接近速度/来源），训练过程中保持不变
const TARGET_META: Record<TrainTargetId, { distance: string; speed: string; source: string }> = {
  T01: { distance: '1.8 km', speed: '24 km/h', source: 'VEHICLE' },
  T02: { distance: '1.3 km', speed: '31 km/h', source: 'UAV' },
  T03: { distance: '0.9 km', speed: '36 km/h', source: 'VEHICLE' },
};

/* 轨迹工具：ramp 线性过渡，wobble 小幅波动 */
function ramp(t: number, from: number, to: number, start: number, end: number): number {
  if (t <= start) return from;
  if (t >= end) return to;
  return from + (to - from) * ((t - start) / (end - start));
}
function wobble(t: number, amp: number, period: number): number {
  return amp * Math.sin((t / period) * 2 * Math.PI);
}

type Trajectory = (t: number) => number;
interface TrainScenario {
  T01: Trajectory;
  T02: Trajectory;
  T03: Trajectory;
}

// 第 1 次试玩：T03 持续上升跨过 80；T02 升至 78 附近稳住；T01 小幅波动（正确答案：T03）
const SCENARIO_A: TrainScenario = {
  T01: (t) => 63 + wobble(t, 3, 6),
  T02: (t) => 73 + ramp(t, 0, 5, 0, 6) + wobble(t, 1, 3),
  T03: (t) => ramp(t, 69, 82, 2, 8) + wobble(t, 1, 2.5),
};

// 第 2 次试玩：T01 持续上升跨过 80；T03 接近但不超过 80；T02 小幅波动（正确答案：T01）
const SCENARIO_B: TrainScenario = {
  T01: (t) => ramp(t, 72, 83, 1, 7) + wobble(t, 1, 2.5),
  T02: (t) => 66 + wobble(t, 3, 5),
  T03: (t) => 75 + 4 * Math.sin((t / 6) * 2 * Math.PI),
};

const TRAIN_SCENARIOS: TrainScenario[] = [SCENARIO_A, SCENARIO_B];

function trendOf(fn: Trajectory, t: number): TrainTrend {
  const d = fn(t + 0.6) - fn(t - 0.6);
  if (d > 0.6) return 'up';
  if (d < -0.6) return 'down';
  return 'steady';
}

function buildTargets(scenario: TrainScenario, t: number): MainTrainTarget[] {
  return (Object.keys(TARGET_META) as TrainTargetId[]).map((id) => ({
    id,
    threat: clamp(Math.round(scenario[id](t)), 0, 100),
    trend: trendOf(scenario[id], t),
    ...TARGET_META[id],
  }));
}

function MainTrainCard({
  target,
  feedback,
  onSelect,
}: {
  target: TrainCardData;
  feedback: 'correct' | 'wrong' | null;
  onSelect: () => void;
}) {
  const over = target.threat >= THRESHOLD;
  const pct = clamp(target.threat, 0, 100);
  const feedbackText =
    feedback === 'correct'
      ? `✓ 已正确选择 ${target.id}`
      : feedback === 'wrong'
        ? '该目标当前未达到阈值，请继续监控'
        : null;

  return (
    <div className={`main-train-card${over ? ' mt-over' : ''}`}>
      <div className="mtc-head">
        <span className="mtc-id">{target.id}</span>
        <span className="mtc-trend">
          <span className="mtc-trend-arrow">{TREND[target.trend].arrow}</span>
          {TREND[target.trend].label}
        </span>
      </div>

      <div className="mtc-threat-row">
        <div className="mtc-threat">
          <span className="mtc-threat-label">Threat</span>
          <span className="mtc-threat-value">{target.threat}</span>
        </div>
        <div className="mtc-threshold">
          阈值 <b>{THRESHOLD}</b>
        </div>
      </div>

      <div className="mtc-bar">
        <div className="mtc-bar-fill" style={{ width: `${pct}%` }} />
        <div className="mtc-bar-mark" style={{ left: `${THRESHOLD}%` }} />
      </div>

      <div className="mtc-meta">
        <div className="mtc-meta-row">
          <span>距离</span>
          <span>{target.distance}</span>
        </div>
        <div className="mtc-meta-row">
          <span>接近速度</span>
          <span>{target.speed}</span>
        </div>
        <div className="mtc-meta-row">
          <span>来源</span>
          <span>{target.source}</span>
        </div>
      </div>

      {feedbackText ? (
        <div className={`mtc-feedback fb-${feedback}`}>{feedbackText}</div>
      ) : (
        <button className="mtc-select-btn" onClick={onSelect}>选择该目标</button>
      )}
    </div>
  );
}

/* ---------- 主任务培训：威胁目标持续监控 ---------- */
function MainPractice({
  practiceIndex,
  onFinish,
}: {
  practiceIndex: number;
  onFinish: (result: string) => void;
}) {
  const scenario = TRAIN_SCENARIOS[practiceIndex % TRAIN_SCENARIOS.length];
  const [targets, setTargets] = useState<MainTrainTarget[]>(() => buildTargets(scenario, 0));
  const [feedback, setFeedback] = useState<{ id: TrainTargetId; type: 'correct' | 'wrong' } | null>(
    null,
  );
  const [showHint, setShowHint] = useState(false);
  const startRef = useRef(performance.now());
  const doneRef = useRef(false);
  const mountedRef = useRef(true);

  // 卸载（切换模块 / 返回首页）后不再触发回调，避免旧模块定时器继续运行
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  // Threat 值随时间动态变化（每 500ms 更新一次）
  useEffect(() => {
    const iv = window.setInterval(() => {
      const t = (performance.now() - startRef.current) / 1000;
      setTargets(buildTargets(scenario, t));
    }, 500);
    return () => window.clearInterval(iv);
  }, [scenario]);

  // 长时间未操作时给出轻微提示（不指明具体目标）
  useEffect(() => {
    const t = window.setTimeout(() => setShowHint(true), 9000);
    return () => window.clearTimeout(t);
  }, []);

  // 安全兜底：超时未正确选择则结束本次练习，避免卡住流程
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onFinish('miss');
      }
    }, 25000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelect(id: TrainTargetId) {
    if (doneRef.current || feedback) return;
    const target = targets.find((x) => x.id === id);
    if (!target) return;
    if (target.threat >= THRESHOLD) {
      doneRef.current = true;
      setFeedback({ id, type: 'correct' });
      window.setTimeout(() => {
        if (mountedRef.current) onFinish('correct');
      }, CONFIRM_FEEDBACK_MS);
    } else {
      setFeedback({ id, type: 'wrong' });
      window.setTimeout(() => {
        if (mountedRef.current) setFeedback(null);
      }, CONFIRM_FEEDBACK_MS);
    }
  }

  return (
    <div className="main-train-wrap">
      <div className="main-train-banner">
        <h3>主任务｜威胁目标持续监控</h3>
        <p>持续观察各目标 Threat 值。当某一目标 Threat ≥ 80 时，请选择该目标完成处置。</p>
        <span className="main-train-rule">威胁阈值：{THRESHOLD}</span>
      </div>

      <div className="main-train-grid">
        {targets.map((t) => (
          <MainTrainCard
            key={t.id}
            target={t}
            feedback={feedback && feedback.id === t.id ? feedback.type : null}
            onSelect={() => handleSelect(t.id)}
          />
        ))}
      </div>

      {showHint && !feedback && (
        <p className="main-train-hint">请根据 Threat 值继续判断需要处置的目标</p>
      )}
    </div>
  );
}

/* ---------- 次任务培训：UAV 资源冲突裁决 ---------- */
const UAV_MATRIX_ROWS: { label: string; value: (o: UavOption) => string }[] = [
  { label: '任务阶段', value: (o) => o.stage },
  { label: '当前覆盖', value: (o) => `${o.coverage}%` },
  { label: '未确认线索', value: (o) => String(o.unconfirmedCues) },
  { label: '高价值线索', value: (o) => String(o.highValueCues) },
  { label: '到达代价', value: (o) => o.cost },
];

function UavPractice({ onFinish }: { onFinish: (result: string) => void }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const doneRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  function handleChoose(label: string) {
    if (doneRef.current) return;
    doneRef.current = true;
    setChosen(label);
    // 先展示「你选择了：xxx」的简短反馈，再结束本次练习
    window.setTimeout(() => {
      if (mountedRef.current) onFinish('done');
    }, CONFIRM_FEEDBACK_MS);
  }

  return (
    <div className="uav-train-wrap">
      <div className="uav-train-banner">
        <h3>次任务培训｜UAV资源冲突裁决</h3>
        <p>UAV-02 出现资源冲突，请比较三个方案的信息，并选择一个任务去向。</p>
        <span className="uav-train-rule">
          比较维度：任务阶段 · 当前覆盖 · 未确认线索 · 高价值线索 · 到达代价
        </span>
      </div>

      <div className="uav-matrix-scroll">
        <div className="uav-matrix">
          <div className="um-corner" aria-hidden="true"></div>
          {UAV_OPTIONS.map((o) => (
            <div key={`h-${o.key}`} className="um-colhead">{o.label}</div>
          ))}

          {UAV_MATRIX_ROWS.map((r) => (
            <Fragment key={r.label}>
              <div className="um-rowhead">{r.label}</div>
              {UAV_OPTIONS.map((o) => (
                <div key={`${r.label}-${o.key}`} className="um-cell">{r.value(o)}</div>
              ))}
            </Fragment>
          ))}

          <div className="um-corner" aria-hidden="true"></div>
          {UAV_OPTIONS.map((o) => (
            <button
              key={`a-${o.key}`}
              className={`um-action${chosen === o.label ? ' is-chosen' : ''}`}
              onClick={() => handleChoose(o.label)}
              disabled={chosen !== null}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {chosen && <p className="uav-train-feedback">你选择了：{chosen}</p>}
    </div>
  );
}

/* ---------- 正式实验任务培训：默认协同任务界面 + 主次任务并行 ---------- */

// 并行训练时间参数
const SECONDARY_ONSET_S = 8; // 次任务约在第 8 秒出现
const PRIMARY_TICK_MS = 500; // 主任务 Threat 更新间隔（400–600ms）
const SECONDARY_FEEDBACK_MS = 1000; // 次任务裁决反馈时长（800–1200ms）
const TRAIN_COMPLETE_MS = 1200; // 完成提示展示时长
const COMBINED_FALLBACK_MS = 40000; // 安全兜底：超时自动结束

function fmtTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// 交织训练使用 4 个目标（T01–T04），与主任务培训（3 目标）相互独立
type CombinedTargetId = 'T01' | 'T02' | 'T03' | 'T04';

const COMBINED_META: Record<CombinedTargetId, { distance: string; speed: string; source: string }> = {
  T01: { distance: '1.8 km', speed: '24 km/h', source: 'VEHICLE' },
  T02: { distance: '1.3 km', speed: '31 km/h', source: 'UAV' },
  T03: { distance: '0.9 km', speed: '36 km/h', source: 'VEHICLE' },
  T04: { distance: '2.2 km', speed: '19 km/h', source: 'UAV-03' },
};

// 交织训练场景：次任务出现（t≈8s）后 T02 继续上升并在约 11s 跨过 80；其余目标接近但不超过 80
const COMBINED_SCENARIO: Record<CombinedTargetId, Trajectory> = {
  T01: (t) => 70 + ramp(t, 0, 4, 0, 15) + wobble(t, 3, 6), // 70 → 74，不跨 80
  T02: (t) => 69 + ramp(t, 0, 14, 2, 13) + wobble(t, 1, 3), // 约 11s 跨过 80
  T03: (t) => 66 + wobble(t, 2, 4), // 66 附近平稳
  T04: (t) => 74 + wobble(t, 3, 5), // 74 附近波动，最高约 77，不跨 80
};

function buildCombinedTargets(t: number): TrainCardData[] {
  return (Object.keys(COMBINED_META) as CombinedTargetId[]).map((id) => ({
    id,
    threat: clamp(Math.round(COMBINED_SCENARIO[id](t)), 0, 100),
    trend: trendOf(COMBINED_SCENARIO[id], t),
    ...COMBINED_META[id],
  }));
}

type SecondaryStatus = 'pending' | 'active' | 'done';

// 协同态势图坐标（宽屏 0–100 × 0–40）
const TRAIN_ROUTE: [number, number][] = [
  [6, 28],
  [24, 26],
  [42, 23],
  [60, 20],
  [78, 17],
  [94, 15],
];

const TRAIN_AREAS: { id: string; x: number; y: number }[] = [
  { id: 'B区', x: 36, y: 3 },
  { id: 'C区', x: 56, y: 3 },
  { id: 'D区', x: 76, y: 3 },
];

const TRAIN_UAV_POS: Record<string, [number, number]> = {
  'UAV-01': [42, 14],
  'UAV-02': [62, 14],
  'UAV-03': [82, 14],
};

const TRAIN_TARGET_POS: Record<CombinedTargetId, [number, number]> = {
  T01: [48, 24],
  T02: [64, 21],
  T03: [82, 19],
  T04: [30, 27],
};

// 沿折线插值，t ∈ [0,1) 循环
function routePointAt(points: [number, number][], t: number): [number, number] {
  const tt = ((t % 1) + 1) % 1;
  const segs = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  const total = segs.reduce((a, b) => a + b, 0);
  let dist = tt * total;
  for (let i = 0; i < segs.length; i++) {
    if (dist <= segs[i]) {
      const a = points[i];
      const b = points[i + 1];
      const f = segs[i] === 0 ? 0 : dist / segs[i];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    dist -= segs[i];
  }
  return points[points.length - 1];
}

// 已走过路线：起点 → 当前车辆位置（路线 x 单调递增，按 x 切分）
function traveledPoints(points: [number, number][], vx: number, vy: number): [number, number][] {
  const res: [number, number][] = [];
  for (const p of points) {
    if (p[0] <= vx) res.push(p);
    else break;
  }
  res.push([vx, vy]);
  return res;
}

function TrainingSituationMap({
  targets,
  uavActive,
  elapsedMs,
}: {
  targets: TrainCardData[];
  uavActive: boolean;
  elapsedMs: number;
}) {
  const [vx, vy] = routePointAt(TRAIN_ROUTE, elapsedMs / 24000);
  const traveled = traveledPoints(TRAIN_ROUTE, vx, vy);
  const gridX = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const gridY = [0, 1, 2, 3, 4];

  return (
    <div className="map-panel">
      <div className="section-title">综合协同态势图</div>
      <svg viewBox="0 0 100 40" className="situation-map">
        <rect x="0" y="0" width="100" height="40" className="map-bg" />

        {gridX.map((i) => (
          <line key={`v${i}`} x1={i * 10} y1="0" x2={i * 10} y2="40" className="map-grid" />
        ))}
        {gridY.map((i) => (
          <line key={`h${i}`} x1="0" y1={i * 10} x2="100" y2={i * 10} className="map-grid" />
        ))}

        {/* 侦察区域 B/C/D */}
        {TRAIN_AREAS.map((a) => (
          <g key={a.id}>
            <rect x={a.x} y={a.y} width="12" height="8" className="map-area" />
            <text x={a.x + 6} y={a.y + 5.5} className="map-area-label" textAnchor="middle">{a.id}</text>
          </g>
        ))}

        {/* 有人车规划路线：未走（虚线）+ 已走（实线亮色） */}
        <polyline points={TRAIN_ROUTE.map((p) => p.join(',')).join(' ')} className="map-route-untraveled" />
        <polyline points={traveled.map((p) => p.join(',')).join(' ')} className="map-route-traveled" />
        <text x={6} y={31.5} className="map-route-end">START</text>
        <text x={94} y={12.5} className="map-route-end" textAnchor="end">END</text>

        {/* 有人车（沿路线行进） */}
        <g className="vehicle-marker">
          <circle cx={vx} cy={vy} r="2.6" />
          <text x={vx} y={vy - 4} className="map-label">VEH</text>
        </g>

        {/* 三架 UAV 及其规划航线（前出侦察） */}
        {Object.entries(TRAIN_UAV_POS).map(([id, [ux, uy]]) => (
          <g key={id}>
            <line x1={ux} y1={uy} x2={ux} y2={uy - 6} className="map-uav-route" />
            <g className={`uav-marker ${id === 'UAV-02' && uavActive ? 'uav-marker-active' : ''}`}>
              <circle cx={ux} cy={uy} r="2.4" />
              <text x={ux} y={uy + 5} className="map-label" textAnchor="middle">{id}</text>
            </g>
          </g>
        ))}

        {/* 目标点 */}
        {targets.map((t) => {
          const [tx, ty] = TRAIN_TARGET_POS[t.id as CombinedTargetId];
          return (
            <g key={t.id} className="target-point">
              <circle cx={tx} cy={ty} r="2.8" className={t.threat >= THRESHOLD ? 'tp-alert' : 'tp-normal'} />
              <text x={tx} y={ty - 4} className="map-label">{t.id}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// 右侧 UAV 状态区 / 次任务裁决区（固定预留，仅在此区域内切换，不遮挡主任务）
function uav02Resolved(chosen: UavOption | null): { status: string; area: string } {
  if (!chosen) return { status: '侦察中', area: 'C区' };
  if (chosen.key === 'B') return { status: '保持 B 区 / 执行中', area: 'B区' };
  return { status: `转派 ${chosen.area} / 执行中`, area: chosen.area };
}

function uav02FeedbackText(chosen: UavOption): string {
  return chosen.key === 'B' ? `UAV-02 保持 ${chosen.area}` : `UAV-02 已转派至 ${chosen.area}`;
}

function UavTrainingPanel({
  status,
  chosen,
  onChoose,
}: {
  status: SecondaryStatus;
  chosen: UavOption | null;
  onChoose: (o: UavOption) => void;
}) {
  // 裁决反馈（点击后短暂显示）
  if (status === 'active' && chosen) {
    return (
      <div className="uav-panel">
        <div className="section-title">UAV 前出侦察状态</div>
        <div className="uav-task-box uav-task-box-center">
          <p className="uav-decision-feedback">✓ 裁决完成</p>
          <p className="uav-decision-detail">{uav02FeedbackText(chosen)}</p>
        </div>
      </div>
    );
  }

  // 次任务出现：在右侧区域内切换为决策矩阵
  if (status === 'active') {
    return (
      <div className="uav-panel tdi-uav-active">
        <div className="section-title">UAV 前出侦察状态</div>
        <div className="uav-task-box">
          <div className="uav-task-tag">NEW TASK</div>
          <div className="uav-task-title">UAV-02 任务冲突待裁决</div>
          <p className="uav-desc">请比较候选方案，选择 UAV-02 下一阶段任务。</p>
          <div className="uav-matrix-scroll">
            <div className="uav-matrix uav-matrix-compact">
              <div className="um-corner" aria-hidden="true"></div>
              {UAV_OPTIONS.map((o) => (
                <div key={`h-${o.key}`} className="um-colhead">{o.label}</div>
              ))}
              {UAV_MATRIX_ROWS.map((r) => (
                <Fragment key={r.label}>
                  <div className="um-rowhead">{r.label}</div>
                  {UAV_OPTIONS.map((o) => (
                    <div key={`${r.label}-${o.key}`} className="um-cell">{r.value(o)}</div>
                  ))}
                </Fragment>
              ))}
              <div className="um-corner" aria-hidden="true"></div>
              {UAV_OPTIONS.map((o) => (
                <button key={`a-${o.key}`} className="um-action" onClick={() => onChoose(o)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 默认 / 裁决后恢复：UAV 状态列表
  const u02 = uav02Resolved(status === 'done' ? chosen : null);
  return (
    <div className="uav-panel">
      <div className="section-title">UAV 前出侦察状态</div>
      <div className="uav-row">
        <span className="uav-label">UAV-01</span>
        <span className="uav-status">侦察中 · B区</span>
      </div>
      <div className="uav-row">
        <span className="uav-label">UAV-02</span>
        <span className="uav-status">{u02.status} · {u02.area}</span>
      </div>
      <div className="uav-row">
        <span className="uav-label">UAV-03</span>
        <span className="uav-status">侦察中 · D区</span>
      </div>
      <div className="uav-monitor-footer">待处理任务：0</div>
    </div>
  );
}

function CombinedPractice({ onFinish }: { onFinish: (result: string) => void }) {
  const [targets, setTargets] = useState<TrainCardData[]>(() => buildCombinedTargets(0));
  const [elapsedMs, setElapsedMs] = useState(0);
  const [secondaryStatus, setSecondaryStatus] = useState<SecondaryStatus>('pending');
  const [chosen, setChosen] = useState<UavOption | null>(null);
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const startRef = useRef(0);
  const doneRef = useRef(false);
  const mountedRef = useRef(true);
  const prevThreatRef = useRef<Record<string, number>>({});
  const timesRef = useRef({
    trialStart: 0,
    secondaryOnset: 0,
    threshold: 0,
    primaryResponse: 0,
    secondaryResponse: 0,
  });

  // 卸载（切换模块 / 返回首页）后不再触发回调，避免旧模块定时器继续运行
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  function pushLog(e: string) {
    setLog((p) => [...p, e]);
    // 预实验训练临时日志，仅调试用，不写入正式实验 CSV
    console.log('[training]', e);
  }

  function completeTraining() {
    if (doneRef.current) return;
    doneRef.current = true;
    pushLog('training_complete');
    setCompleted(true);
    window.setTimeout(() => {
      if (mountedRef.current) onFinish('done');
    }, TRAIN_COMPLETE_MS);
  }

  // 训练开始
  useEffect(() => {
    startRef.current = performance.now();
    timesRef.current.trialStart = startRef.current;
    pushLog('training_start');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 主任务 Threat 持续变化（次任务出现 / 处理中均不暂停）
  useEffect(() => {
    const iv = window.setInterval(() => {
      const now = performance.now() - startRef.current;
      setElapsedMs(now);
      const next = buildCombinedTargets(now / 1000);
      setTargets(next);
      if (timesRef.current.threshold === 0) {
        (Object.keys(COMBINED_META) as CombinedTargetId[]).forEach((id) => {
          const nt = next.find((x) => x.id === id);
          if (!nt) return;
          if (prevThreatRef.current[id] < THRESHOLD && nt.threat >= THRESHOLD) {
            timesRef.current.threshold = Math.round(now);
            pushLog(`${id}_threshold`);
          }
          prevThreatRef.current[id] = nt.threat;
        });
      }
    }, PRIMARY_TICK_MS);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 次任务约第 8 秒出现（无声音、无引导动效）
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSecondaryStatus('active');
      timesRef.current.secondaryOnset = Math.round(performance.now() - startRef.current);
      pushLog('secondary_onset');
    }, SECONDARY_ONSET_S * 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 安全兜底：超时未完成则自动结束，避免卡住流程
  useEffect(() => {
    const t = window.setTimeout(() => completeTraining(), COMBINED_FALLBACK_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 完成条件：完成一次 UAV 裁决 + 至少一次正确的主任务目标选择
  useEffect(() => {
    if (!doneRef.current && confirmed.length >= 1 && secondaryStatus === 'done') {
      completeTraining();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed, secondaryStatus]);

  function handleSelectPrimary(id: string) {
    if (doneRef.current || confirmed.includes(id) || wrongId === id) return;
    const target = targets.find((t) => t.id === id);
    if (!target) return;
    if (target.threat >= THRESHOLD) {
      timesRef.current.primaryResponse = Math.round(performance.now() - startRef.current);
      setConfirmed((p) => [...p, id]);
      pushLog(`${id}_confirm`);
    } else {
      setWrongId(id);
      window.setTimeout(() => {
        if (mountedRef.current) setWrongId(null);
      }, CONFIRM_FEEDBACK_MS);
      pushLog(`${id}_false`);
    }
  }

  function handleChooseSecondary(o: UavOption) {
    if (doneRef.current || secondaryStatus !== 'active' || chosen) return;
    timesRef.current.secondaryResponse = Math.round(performance.now() - startRef.current);
    setChosen(o);
    pushLog(`secondary_option_${o.key}`);
    // 反馈约 1s 后，右侧恢复 UAV 状态监控，并标记次任务完成
    window.setTimeout(() => {
      if (!mountedRef.current) return;
      setSecondaryStatus('done');
      pushLog('secondary_complete');
    }, SECONDARY_FEEDBACK_MS);
  }

  const uavStatusText: Record<SecondaryStatus, string> = {
    pending: '待出现',
    active: '待处理',
    done: '已完成',
  };

  if (completed) {
    return (
      <div className="training-default-interface tdi-complete">
        <div className="training-complete">
          <h1>正式实验任务培训完成</h1>
          <p className="subtitle">你已完成主次任务并行练习，现在可以开始正式实验。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="training-default-interface">
      {/* 区域 1：顶部系统状态栏 */}
      <header className="topbar tdi-statusbar">
        <div className="tb-item">有人车—多无人机协同前出侦察</div>
        <div className="tb-item">预实验｜正式实验任务培训</div>
        <div className="tb-item">任务状态：训练中</div>
        <div className="tb-item">主任务：运行中</div>
        <div className="tb-item">UAV任务：{uavStatusText[secondaryStatus]}</div>
        <div className="tb-item tb-time">{fmtTime(elapsedMs)}</div>
      </header>

      {/* 区域 2 + 3：中央态势图 + 右侧 UAV 状态区 */}
      <div className="tdi-content">
        <div className="tdi-map">
          <TrainingSituationMap
            targets={targets}
            uavActive={secondaryStatus === 'active'}
            elapsedMs={elapsedMs}
          />
        </div>
        <aside className="tdi-uav">
          <UavTrainingPanel status={secondaryStatus} chosen={chosen} onChoose={handleChooseSecondary} />
        </aside>
      </div>

      {/* 区域 4：底部主任务威胁目标持续监控区 */}
      <section className="tdi-primary">
        <div className="section-title">主任务｜威胁目标持续监控</div>
        <p className="tdi-hint">持续观察 Threat 值；当 Threat ≥ {THRESHOLD} 时，选择对应目标。</p>
        <div className="main-train-grid">
          {targets.map((t) => (
            <MainTrainCard
              key={t.id}
              target={t}
              feedback={confirmed.includes(t.id) ? 'correct' : wrongId === t.id ? 'wrong' : null}
              onSelect={() => handleSelectPrimary(t.id)}
            />
          ))}
        </div>
      </section>

      {/* 临时交互日志（调试用，不写正式 CSV） */}
      <details className="tdi-debug">
        <summary>训练事件日志（调试）</summary>
        <div className="tdi-debug-body">
          <div className="tdi-debug-times">
            开始 {timesRef.current.trialStart}ms · 次任务出现 {timesRef.current.secondaryOnset || '—'}ms ·{' '}
            跨阈值 {timesRef.current.threshold || '—'}ms · 主任务响应 {timesRef.current.primaryResponse || '—'}ms ·{' '}
            次任务响应 {timesRef.current.secondaryResponse || '—'}ms
          </div>
          <ul className="tdi-debug-log">
            {log.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
}
