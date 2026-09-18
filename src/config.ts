import type { UavOption, Workload } from './types';

// 主任务威胁阈值
export const THRESHOLD = 80;
// 超过阈值后多少毫秒内点击算命中，否则漏检
export const MISS_TIMEOUT_MS = 3000;
// 次任务超时时间
export const UAV_TIMEOUT_MS = 15000;
// 实验总时长（毫秒），到时自动结束
export const EXPERIMENT_DURATION_MS = 120000;
// 次任务总次数
export const MAX_UAV_TASKS = 4;
// 主循环 tick 间隔
export const TICK_MS = 100;
// 命中后“已确认”状态显示时长
export const CONFIRM_DURATION_MS = 800;

// 各负荷的目标数量
export const TARGET_COUNT: Record<Workload, number> = { normal: 3, high: 5 };

// 首个次任务出现时间范围（实验开始后，ms）
export const UAV_FIRST_DELAY_RANGE: [number, number] = [15000, 25000];
// 相邻次任务间隔范围（ms），保证至少间隔 10 秒
export const UAV_GAP_RANGE: [number, number] = [10000, 18000];

// UAV-02 资源冲突裁决的固定选项
export const UAV_OPTIONS: UavOption[] = [
  { key: 'B', area: 'B区', type: '当前任务', stage: '后续', coverage: 35, unconfirmedCues: 1, highValueCues: 0, cost: '低', label: '保持 B 区' },
  { key: 'C', area: 'C区', type: '候选任务', stage: '近期', coverage: 20, unconfirmedCues: 2, highValueCues: 0, cost: '中', label: '转派 C 区' },
  { key: 'D', area: 'D区', type: '候选任务', stage: '近期', coverage: 25, unconfirmedCues: 3, highValueCues: 1, cost: '中', label: '转派 D 区' },
];

// 正确答案（作为变量保留，方便后续随机化）
export const correctOption: UavOption['key'] = 'D';
