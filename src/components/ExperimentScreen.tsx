import { useEffect, useReducer, useRef } from 'react';
import type { ExperimentConfig, Source, SystemMessage, Target, UavTask } from '../types';
import {
  CONFIRM_DURATION_MS,
  DEBUG_MODE,
  DECISION_FEEDBACK_MS,
  EXPERIMENT_DURATION_MS,
  MAX_UAV_TASKS,
  MISS_TIMEOUT_MS,
  TARGET_COUNT,
  THRESHOLD,
  TICK_MS,
  UAV_FIRST_DELAY_RANGE,
  UAV_GAP_RANGE,
  UAV_OPTIONS,
  UAV_TIMEOUT_MS,
  correctOption,
} from '../config';
import { clamp, pick, randFloat, randInRange } from '../utils/random';
import { logEvent } from '../utils/logger';
import { initAudio, playBeep } from '../utils/audio';
import TopStatusBar from './TopStatusBar';
import SituationMap from './SituationMap';
import TargetCard from './TargetCard';
import UavTaskPanel from './UavTaskPanel';
import SystemLog from './SystemLog';

interface Props {
  participantId: string;
  config: ExperimentConfig;
  onEnd: () => void;
}

interface ExpState {
  targets: Target[];
  uavTask: UavTask | null;
  messages: SystemMessage[];
  elapsedMs: number;
  hits: number;
  misses: number;
  falseAlarms: number;
  uavShown: number;
  nextTaskAtMs: number;
  msgSeq: number;
  ended: boolean;
  // 次任务裁决后的去向文案（'保持 B 区' / '转派 C 区' / '转派 D 区'），用于 UAV-02 状态恢复
  uav02Assignment: string | null;
  // 裁决后 UAV-02 的侦察区域（'B区'/'C区'/'D区'），用于更新态势图中的规划航线
  uav02Area: string | null;
  // 次任务裁决后的短暂反馈，until 到期后清除
  lastDecision: { key: string; area: string; label: string; until: number } | null;
}

const SOURCES: Source[] = ['VEH', 'UAV-01', 'UAV-02', 'UAV-03'];

function makeTarget(id: string, elapsedMs: number): Target {
  return {
    id,
    threat: randFloat(15, 45),
    distance: randFloat(1.5, 10),
    speed: randFloat(8, 25),
    source: pick(SOURCES),
    x: randFloat(20, 180),
    y: randFloat(18, 80),
    vx: randFloat(-0.6, 0.6),
    vy: randFloat(-0.6, 0.6),
    active: true,
    thresholdCrossed: false,
    thresholdCrossTime: null,
    clicked: false,
    missed: false,
    threatRate: randFloat(0.2, 0.55),
    confirmed: false,
    confirmedUntil: null,
    spawnTime: elapsedMs,
  };
}

export default function ExperimentScreen({ participantId, config, onEnd }: Props) {
  const count = TARGET_COUNT[config.workload];
  const intervention = config.intervention;

  const stateRef = useRef<ExpState | null>(null);
  if (stateRef.current === null) {
    const initialTargets = Array.from({ length: count }, (_, i) =>
      makeTarget(`T${String(i + 1).padStart(2, '0')}`, 0),
    );
    stateRef.current = {
      targets: initialTargets,
      uavTask: null,
      messages: [{ id: 0, timeMs: 0, text: '实验开始，主任务目标已生成。', kind: 'info' }],
      elapsedMs: 0,
      hits: 0,
      misses: 0,
      falseAlarms: 0,
      uavShown: 0,
      nextTaskAtMs: randInRange(UAV_FIRST_DELAY_RANGE),
      msgSeq: 1,
      ended: false,
      uav02Assignment: null,
      uav02Area: null,
      lastDecision: null,
    };
  }

  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    initAudio();
    const s = stateRef.current!;
    for (const t of s.targets) {
      logEvent({
        event_type: 'target_spawn',
        target_id: t.id,
        threat_value: Math.round(t.threat),
        threshold: THRESHOLD,
        screen_state: 'main_task',
      });
    }
    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addMessage(text: string, kind: SystemMessage['kind']) {
    const s = stateRef.current!;
    s.messages.push({ id: s.msgSeq++, timeMs: s.elapsedMs, text, kind });
    if (s.messages.length > 60) {
      s.messages = s.messages.slice(-60);
    }
  }

  function resetTargetInPlace(s: ExpState, t: Target, now: number) {
    logEvent({ event_type: 'target_reset', target_id: t.id, screen_state: 'main_task' });
    Object.assign(t, makeTarget(t.id, now));
    logEvent({
      event_type: 'target_spawn',
      target_id: t.id,
      threat_value: Math.round(t.threat),
      threshold: THRESHOLD,
      screen_state: 'main_task',
    });
  }

  function showUavTask(s: ExpState, now: number) {
    s.uavShown += 1;
    s.uavTask = { uavId: 'UAV-02', shownAt: now, responded: false, timedOut: false };
    logEvent({
      event_type: 'uav_task_show',
      uav_id: 'UAV-02',
      extra_json: JSON.stringify({ intervention, correctOption }),
      screen_state: 'uav_task',
    });
    addMessage('UAV-02 资源冲突待裁决。', 'task');
    if (intervention === 'guidance_audiovisual') {
      playBeep();
    }
  }

  function timeoutUavTask(s: ExpState, now: number) {
    const task = s.uavTask!;
    task.timedOut = true;
    logEvent({
      event_type: 'uav_task_timeout',
      uav_id: task.uavId,
      response: 'B',
      correct: false,
      error_type: 'timeout',
      rt_ms: UAV_TIMEOUT_MS,
      screen_state: 'uav_task',
    });
    logEvent({ event_type: 'uav_task_close', uav_id: task.uavId, screen_state: 'main_task' });
    addMessage('UAV-02 裁决超时，默认保持 B 区。', 'error');
    s.uavTask = null;
    s.nextTaskAtMs = now + randInRange(UAV_GAP_RANGE);
  }

  function finishExperiment() {
    const s = stateRef.current!;
    if (s.ended) return;
    s.ended = true;
    if (s.uavTask && !s.uavTask.responded && !s.uavTask.timedOut) {
      timeoutUavTask(s, s.elapsedMs);
    }
    onEnd();
  }

  function tick() {
    const s = stateRef.current!;
    if (s.ended) return;

    if (s.elapsedMs >= EXPERIMENT_DURATION_MS) {
      finishExperiment();
      return;
    }

    s.elapsedMs += TICK_MS;
    const now = s.elapsedMs;

    for (const t of s.targets) {
      if (t.confirmed) {
        if (t.confirmedUntil !== null && now >= t.confirmedUntil) {
          resetTargetInPlace(s, t, now);
        }
        continue;
      }

      t.x = clamp(t.x + t.vx, 8, 192);
      t.y = clamp(t.y + t.vy, 8, 92);
      if (t.x <= 8 || t.x >= 192) t.vx = -t.vx;
      if (t.y <= 8 || t.y >= 92) t.vy = -t.vy;

      t.threat = clamp(t.threat + t.threatRate + randFloat(-0.08, 0.08), 0, 100);
      t.distance = clamp(t.distance + randFloat(-0.015, 0.015), 0.5, 12);
      t.speed = clamp(t.speed + randFloat(-0.08, 0.08), 5, 40);

      if (!t.thresholdCrossed && !t.clicked && !t.missed && t.threat >= THRESHOLD) {
        t.thresholdCrossed = true;
        t.thresholdCrossTime = now;
        logEvent({
          event_type: 'target_threshold_cross',
          target_id: t.id,
          threat_value: Math.round(t.threat),
          threshold: THRESHOLD,
          screen_state: 'main_task',
        });
        addMessage(`${t.id} 威胁值超过阈值，需确认。`, 'warn');
      }

      if (
        t.thresholdCrossed &&
        !t.clicked &&
        !t.missed &&
        t.thresholdCrossTime !== null &&
        now - t.thresholdCrossTime >= MISS_TIMEOUT_MS
      ) {
        t.missed = true;
        s.misses += 1;
        logEvent({
          event_type: 'target_missed',
          target_id: t.id,
          correct: false,
          error_type: 'miss',
          threat_value: Math.round(t.threat),
          threshold: THRESHOLD,
          rt_ms: MISS_TIMEOUT_MS,
          screen_state: 'main_task',
        });
        addMessage(`${t.id} 确认超时，记录漏检。`, 'error');
        resetTargetInPlace(s, t, now);
      }
    }

    if (s.uavTask === null && s.uavShown < MAX_UAV_TASKS && now >= s.nextTaskAtMs) {
      showUavTask(s, now);
    }

    if (
      s.uavTask !== null &&
      !s.uavTask.responded &&
      !s.uavTask.timedOut &&
      now - s.uavTask.shownAt >= UAV_TIMEOUT_MS
    ) {
      timeoutUavTask(s, now);
    }

    if (s.lastDecision !== null && now >= s.lastDecision.until) {
      s.lastDecision = null;
    }

    forceRender();
  }

  function handleTargetClick(targetId: string) {
    const s = stateRef.current!;
    const t = s.targets.find((x) => x.id === targetId);
    if (!t || !t.active || t.confirmed || t.missed) return;
    const now = s.elapsedMs;

    if (t.threat >= THRESHOLD && !t.clicked) {
      const rt = t.thresholdCrossTime !== null ? now - t.thresholdCrossTime : 0;
      logEvent({
        event_type: 'main_click',
        target_id: t.id,
        threat_value: Math.round(t.threat),
        threshold: THRESHOLD,
        screen_state: 'main_task',
      });
      logEvent({
        event_type: 'target_hit',
        target_id: t.id,
        correct: true,
        threat_value: Math.round(t.threat),
        threshold: THRESHOLD,
        rt_ms: rt,
        screen_state: 'main_task',
      });
      t.clicked = true;
      t.confirmed = true;
      t.confirmedUntil = now + CONFIRM_DURATION_MS;
      s.hits += 1;
      addMessage(`${t.id} 已确认命中（${rt}ms）。`, 'success');
    } else {
      logEvent({
        event_type: 'main_click',
        target_id: t.id,
        threat_value: Math.round(t.threat),
        threshold: THRESHOLD,
        screen_state: 'main_task',
      });
      logEvent({
        event_type: 'target_false_alarm',
        target_id: t.id,
        correct: false,
        error_type: 'false_alarm',
        threat_value: Math.round(t.threat),
        threshold: THRESHOLD,
        rt_ms: 0,
        screen_state: 'main_task',
      });
      s.falseAlarms += 1;
      addMessage(`${t.id} 未达阈值被点击，记录误报。`, 'error');
    }
    forceRender();
  }

  function handleUavSelect(optionKey: string) {
    const s = stateRef.current!;
    const task = s.uavTask;
    if (!task || task.responded || task.timedOut) return;
    const now = s.elapsedMs;
    const rt = now - task.shownAt;
    const correct = optionKey === correctOption;
    const option = UAV_OPTIONS.find((o) => o.key === optionKey);
    task.responded = true;
    logEvent({
      event_type: 'uav_task_response',
      uav_id: task.uavId,
      response: optionKey,
      correct,
      error_type: correct ? '' : 'wrong_option',
      rt_ms: rt,
      screen_state: 'uav_task',
    });
    logEvent({ event_type: 'uav_task_close', uav_id: task.uavId, screen_state: 'main_task' });
    addMessage(
      `UAV-02 裁决完成：选择 ${optionKey}（${correct ? '正确' : '错误'}）。`,
      correct ? 'success' : 'warn',
    );
    s.uav02Assignment = option ? option.label : optionKey;
    s.uav02Area = option ? option.area : optionKey;
    s.lastDecision = {
      key: optionKey,
      area: option ? option.area : optionKey,
      label: option ? option.label : optionKey,
      until: now + DECISION_FEEDBACK_MS,
    };
    s.uavTask = null;
    s.nextTaskAtMs = now + randInRange(UAV_GAP_RANGE);
    forceRender();
  }

  const s = stateRef.current!;
  const isDirect = config.intervention === 'direct_visual';
  const directActive = isDirect && (s.uavTask !== null || s.lastDecision !== null);

  return (
    <div className={`experiment-screen${directActive ? ' direct-active' : ''}`}>
      <TopStatusBar
        participantId={participantId}
        workload={config.workload}
        intervention={config.intervention}
        elapsedMs={s.elapsedMs}
        hits={s.hits}
        misses={s.misses}
        falseAlarms={s.falseAlarms}
        uavShown={s.uavShown}
        onEnd={finishExperiment}
      />
      <div className="workspace">
        <main className="primary-workspace">
          <SituationMap
            targets={s.targets}
            elapsedMs={s.elapsedMs}
            uavActive={s.uavTask !== null}
            uav02Area={s.uav02Area}
            onTargetClick={handleTargetClick}
          />
          <section className="primary-target-panel">
            <div className="section-title">主任务 · 威胁目标持续监控</div>
            <div className="target-grid">
              {s.targets.map((t) => (
                <TargetCard key={t.id} target={t} onSelect={handleTargetClick} />
              ))}
            </div>
          </section>
        </main>
        <aside className="secondary-panel">
          <UavTaskPanel
            task={s.uavTask}
            uav02Assignment={s.uav02Assignment}
            lastDecision={s.lastDecision}
            onSelect={handleUavSelect}
          />
        </aside>
      </div>
      {DEBUG_MODE && <SystemLog messages={s.messages} />}
    </div>
  );
}
