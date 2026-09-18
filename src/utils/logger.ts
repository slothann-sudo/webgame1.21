import type { LogEvent, Workload, Intervention } from '../types';

// 全局事件日志数组（仅存内存，刷新即清空）
let logs: LogEvent[] = [];

let context = {
  participant_id: '',
  condition_workload: 'normal' as Workload,
  condition_intervention: 'direct_visual' as Intervention,
  block_id: '1',
};

let eventSeq = 0;
let startWall = 0; // Date.now() 基准
let startPerf = 0; // performance.now() 基准

export function initLogger(
  participant_id: string,
  condition_workload: Workload,
  condition_intervention: Intervention,
): void {
  logs = [];
  eventSeq = 0;
  startWall = Date.now();
  startPerf = performance.now();
  context = { participant_id, condition_workload, condition_intervention, block_id: '1' };
}

// 相对实验开始的时间（ms）
export function experimentTimeMs(): number {
  return Math.round(performance.now() - startPerf);
}

export function logEvent(partial: Partial<LogEvent> & { event_type: string }): LogEvent {
  eventSeq += 1;
  const t = experimentTimeMs();
  const e: LogEvent = {
    participant_id: context.participant_id,
    condition_workload: context.condition_workload,
    condition_intervention: context.condition_intervention,
    block_id: context.block_id,
    event_type: partial.event_type,
    event_id: String(eventSeq),
    target_id: partial.target_id ?? '',
    uav_id: partial.uav_id ?? '',
    response: partial.response ?? '',
    correct: partial.correct ?? '',
    error_type: partial.error_type ?? '',
    threat_value: partial.threat_value ?? '',
    threshold: partial.threshold ?? '',
    rt_ms: partial.rt_ms ?? '',
    timestamp_ms: startWall + t,
    experiment_time_ms: t,
    screen_state: partial.screen_state ?? '',
    extra_json: partial.extra_json ?? '',
  };
  logs.push(e);
  return e;
}

export function getLogs(): LogEvent[] {
  return logs;
}
