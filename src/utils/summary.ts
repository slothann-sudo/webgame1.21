import type { LogEvent, Summary } from '../types';

export function computeSummary(logs: LogEvent[]): Summary {
  const hits = logs.filter((e) => e.event_type === 'target_hit');
  const misses = logs.filter((e) => e.event_type === 'target_missed');
  const falseAlarms = logs.filter((e) => e.event_type === 'target_false_alarm');
  const uavShown = logs.filter((e) => e.event_type === 'uav_task_show').length;
  const uavResponses = logs.filter((e) => e.event_type === 'uav_task_response');
  const uavTimeouts = logs.filter((e) => e.event_type === 'uav_task_timeout');
  const uavCorrect = uavResponses.filter((e) => e.correct === true).length;

  const hitRt = hits
    .map((e) => e.rt_ms)
    .filter((n): n is number => typeof n === 'number' && n > 0);
  const mainAvgRt = hitRt.length ? hitRt.reduce((a, b) => a + b, 0) / hitRt.length : 0;

  const uavRtAll = [...uavResponses, ...uavTimeouts]
    .map((e) => e.rt_ms)
    .filter((n): n is number => typeof n === 'number');
  const uavAvgRt = uavRtAll.length ? uavRtAll.reduce((a, b) => a + b, 0) / uavRtAll.length : 0;

  // 主任务正确率 = 命中 / (命中 + 漏检 + 误报)
  const totalMain = hits.length + misses.length + falseAlarms.length;
  const accuracy = totalMain ? hits.length / totalMain : 0;

  // UAV 正确率 = 正确 / 出现次数（超时记为错误）
  const uavAccuracy = uavShown ? uavCorrect / uavShown : 0;

  const firstClick = logs.find((e) => e.event_type === 'main_click');

  return {
    hits: hits.length,
    misses: misses.length,
    falseAlarms: falseAlarms.length,
    accuracy,
    mainAvgRt,
    uavShown,
    uavCorrect,
    uavAccuracy,
    uavAvgRt,
    firstMainClickTimeMs: firstClick ? firstClick.experiment_time_ms : null,
  };
}
