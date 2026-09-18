# 有人车—多无人机协同前出侦察 · 注意力分配实验（原型）

网页端人因实验小游戏原型：模拟操作员在有人车主任务（多目标威胁监控）与 UAV 突发次任务（资源冲突裁决）之间分配注意力，并自动记录所有操作事件、支持导出 CSV。

- 技术栈：Vite + React + TypeScript + 原生 CSS（无 UI 框架、无后端）
- 数据只保存在内存中，**刷新页面即清空**，无需后端服务器

---

## 一、运行方式

```bash
npm install
npm run dev
```

终端会输出本地地址（默认 `http://localhost:5173`），用浏览器打开即可。

构建验证（可选）：

```bash
npm run build
```

---

## 二、实验操作说明

1. **开始页**：输入被试编号，选择「主任务负荷」（普通 3 目标 / 高负荷 5 目标）和「次任务介入方式」（直接介入+视觉 / 注意引导+视觉 / 注意引导+视听），点「开始实验」。
2. **实验页**：
   - 顶部：被试编号、条件、任务时间、命中/漏检/误报/UAV 计数，以及「结束实验」按钮。
   - 左侧态势图：有人车沿路线行进、UAV-01/02/03 位置、目标点。点击目标点等同点击目标卡片。
   - 中央主任务：目标卡片，显示 `T01 / Threat 值 / 距离 km / ↑速度 m/s / 信息来源`。
   - 右侧 UAV 协同区：次任务出现位置（三种介入方式呈现不同）。
   - 底部系统消息日志。
3. **主任务规则**：目标 `threat >= 80` 进入「需确认」，需点击它；3 秒内点击算命中（hit），超时算漏检（miss）；点击 `threat < 80` 的目标算误报（false_alarm）。命中后短暂显示「已确认」，随后重置为新目标。
4. **次任务**：UAV-02 资源冲突裁决，实验中共出现 4 次，间隔至少 10 秒，主任务**不暂停**。点击 B/C/D 任一项即裁决；15 秒未选自动超时（默认保持 B 区）。
5. **结束页**：实验到 120 秒自动结束（或手动点「结束实验」），显示统计结果，可「导出 CSV」或「重新开始」。

---

## 三、三种介入方式差异

| 条件 | 呈现 |
| --- | --- |
| `direct_visual` | 屏幕中央偏右弹出任务面板（不遮挡主任务），面板内直接展示 B/C/D 选项 |
| `guidance_visual` | 不弹中央面板，仅在右侧高亮 UAV-02，右侧区域内展开小型 B/C/D 面板 |
| `guidance_audiovisual` | 同 `guidance_visual`，额外播放一声短促 beep（点击开始后初始化音频上下文，失败不影响流程） |

---

## 四、测试清单（每个功能怎么测）

按编号逐项验证：

1. **输入被试编号并开始**：开始页不填编号点「开始实验」→ 出现红色提示；填写后能进入实验页。
2. **选择普通/高负荷**：普通负荷中央显示 3 张目标卡片，高负荷显示 5 张。
3. **目标威胁值变化**：观察中央卡片 `Threat` 数值随时间缓慢上升（约每 0.1s 刷新）。
4. **达到阈值点击=命中**：等某目标 `Threat` 变黄（≥80）后点击它 → 底部出现「已确认命中」，顶部「命中 +1」，卡片短暂显示「已确认」后重置。
5. **未达阈值点击=误报**：点击一张 `Threat < 80` 的绿色卡片 → 顶部「误报 +1」，底部提示误报。
6. **超时未点=漏检**：某目标变黄后 3 秒内不点 → 顶部「漏检 +1」，底部提示漏检，目标重置。
7. **UAV 次任务随机出现**：开始后约 15–25 秒出现第一次，共 4 次，两次间隔 ≥10 秒；主任务持续运行不暂停。
8. **三种介入方式呈现不同**：分别用三种条件各跑一段，对比次任务出现位置（中央面板 vs 右侧高亮；视听条件多一声 beep）。
9. **UAV 点击记录反应时与正确性**：点 D 区 → 底部提示「正确」；点 B/C → 提示「错误」；结束后正确率/平均反应时统计正确。
10. **UAV 超时记录 timeout**：次任务出现后 15 秒不点 → 底部提示「超时，默认保持 B 区」，下次任务正常继续。
11. **实验结束显示统计**：等 120 秒自动结束，或点「结束实验」→ 跳转到结束页，显示 9 项统计。
12. **导出 CSV**：结束页点「导出 CSV」→ 下载文件，文件名形如 `P001_normal_direct_visual_20260918_123456.csv`。
13. **CSV 内容完整**：用 Excel 打开导出的 CSV，中文不乱码；表头 18 列；包含 `experiment_start`、`target_spawn`、`target_threshold_cross`、`main_click`、`target_hit`、`target_false_alarm`、`target_missed`、`target_reset`、`uav_task_show`、`uav_task_response`、`uav_task_timeout`、`uav_task_close`、`experiment_end`、`export_csv` 等事件。
14. **无报错**：浏览器控制台（F12）无红色报错。
15. **刷新不保留数据**：实验中途刷新页面 → 回到开始页，之前的日志清空。

> 快速验证捷径：把 `src/config.ts` 里的 `EXPERIMENT_DURATION_MS` 调小（如 `30000`）、`UAV_FIRST_DELAY_RANGE` 调小（如 `[3000, 5000]`）可加速跑完一轮；正式实验再改回。

---

## 五、数据字段说明（CSV 表头）

`participant_id` / `condition_workload` / `condition_intervention` / `block_id` / `event_type` / `event_id` / `target_id` / `uav_id` / `response` / `correct` / `error_type` / `threat_value` / `threshold` / `rt_ms` / `timestamp_ms` / `experiment_time_ms` / `screen_state` / `extra_json`

- `rt_ms`：主任务=从 `target_threshold_cross` 到点击的时间；误报为 0；次任务=从 `uav_task_show` 到点击的时间，超时为 15000。
- `error_type`：`false_alarm` / `miss` / `timeout` / `wrong_option`。
- `screen_state`：`start` / `main_task` / `uav_task` / `end`。

## 六、可调参数（均在 `src/config.ts`）

| 常量 | 含义 | 默认 |
| --- | --- | --- |
| `THRESHOLD` | 威胁阈值 | 80 |
| `MISS_TIMEOUT_MS` | 主任务确认超时 | 3000 |
| `UAV_TIMEOUT_MS` | 次任务超时 | 15000 |
| `EXPERIMENT_DURATION_MS` | 实验总时长 | 120000 |
| `MAX_UAV_TASKS` | 次任务次数 | 4 |
| `TICK_MS` | 主循环间隔 | 100 |
| `UAV_FIRST_DELAY_RANGE` | 首个次任务出现时间范围 | [15000, 25000] |
| `UAV_GAP_RANGE` | 相邻次任务间隔范围 | [10000, 18000] |
| `correctOption` | 次任务正确答案（变量，可后续随机化） | `'D'` |

## 七、目录结构

```
src/
  main.tsx
  App.tsx                 # 阶段状态机（开始 / 实验 / 结束）
  styles.css
  types.ts                # 类型定义
  config.ts               # 实验参数（阈值、时长、节奏、正确答案等）
  utils/
    logger.ts             # 全局日志数组 + 事件记录
    csv.ts                # CSV 生成与下载（含 UTF-8 BOM）
    random.ts             # 随机工具
    audio.ts              # 提示音（Web Audio）
    summary.ts            # 结束页统计计算
  components/
    StartScreen.tsx
    ExperimentScreen.tsx  # 主循环 + 主/次任务逻辑
    EndScreen.tsx
    TargetCard.tsx
    SituationMap.tsx
    UavTaskPanel.tsx
    TopStatusBar.tsx
    SystemLog.tsx
```
