// 实验条件
export type Workload = 'normal' | 'high';
export type Intervention = 'direct_visual' | 'guidance_visual' | 'guidance_audiovisual';
export type Phase = 'start' | 'experiment' | 'end';

// 目标信息来源
export type Source = 'VEH' | 'UAV-01' | 'UAV-02' | 'UAV-03';

export interface ExperimentConfig {
  workload: Workload;
  intervention: Intervention;
}

// 主任务目标
export interface Target {
  id: string;
  threat: number; // 0-100
  distance: number; // km
  speed: number; // m/s
  source: Source;
  x: number; // 态势图坐标 0-100
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  thresholdCrossed: boolean;
  thresholdCrossTime: number | null; // 实验时间 ms
  clicked: boolean;
  missed: boolean;
  threatRate: number; // 每 tick 威胁增长率
  confirmed: boolean; // 命中后短暂“已确认”
  confirmedUntil: number | null;
  spawnTime: number;
}

// UAV 次任务选项
export interface UavOption {
  key: 'B' | 'C' | 'D';
  area: string;
  type: string;
  stage: string;
  coverage: number;
  unconfirmedCues: number;
  highValueCues: number;
  cost: string;
  label: string;
}

// UAV 次任务状态
export interface UavTask {
  uavId: string;
  shownAt: number; // 实验时间 ms
  responded: boolean;
  timedOut: boolean;
}

// 事件日志
export interface LogEvent {
  participant_id: string;
  condition_workload: Workload;
  condition_intervention: Intervention;
  block_id: string;
  event_type: string;
  event_id: string;
  target_id: string;
  uav_id: string;
  response: string;
  correct: boolean | '';
  error_type: string;
  threat_value: number | '';
  threshold: number | '';
  rt_ms: number | '';
  timestamp_ms: number;
  experiment_time_ms: number;
  screen_state: string;
  extra_json: string;
}

// 底部系统消息
export interface SystemMessage {
  id: number;
  timeMs: number;
  text: string;
  kind: 'info' | 'warn' | 'success' | 'error' | 'task';
}

// 结束页统计
export interface Summary {
  hits: number;
  misses: number;
  falseAlarms: number;
  accuracy: number;
  mainAvgRt: number;
  uavShown: number;
  uavCorrect: number;
  uavAccuracy: number;
  uavAvgRt: number;
  firstMainClickTimeMs: number | null;
}
