import { useState } from 'react';
import type { ExperimentConfig, Intervention, ModuleStatus, TrainingModuleKey, Workload } from '../types';

interface Props {
  trainingCompleted: boolean;
  trainingSkipped: boolean;
  canStartExperiment: boolean;
  moduleStatus: Record<TrainingModuleKey, ModuleStatus>;
  onStartTraining: (intervention: Intervention) => void;
  onSkipTraining: () => void;
  onStart: (participantId: string, config: ExperimentConfig) => void;
}

const MODULE_ORDER: TrainingModuleKey[] = ['main', 'secondary', 'combined'];
const MODULE_LABEL: Record<TrainingModuleKey, string> = {
  main: '主任务培训',
  secondary: '次任务培训',
  combined: '主次任务交织训练',
};

function moduleStatusText(status: ModuleStatus): string {
  switch (status) {
    case 'completed':
      return '已完成';
    case 'skipped':
      return '已跳过';
    case 'in_progress':
      return '进行中';
    default:
      return '未完成';
  }
}

function moduleStatusClass(status: ModuleStatus): string {
  switch (status) {
    case 'completed':
      return 'done';
    case 'skipped':
      return 'skipped';
    case 'in_progress':
      return 'active';
    default:
      return '';
  }
}

export default function StartScreen({
  trainingCompleted,
  trainingSkipped,
  canStartExperiment,
  moduleStatus,
  onStartTraining,
  onSkipTraining,
  onStart,
}: Props) {
  const [participantId, setParticipantId] = useState('');
  const [workload, setWorkload] = useState<Workload>('normal');
  const [intervention, setIntervention] = useState<Intervention>('direct_visual');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!participantId.trim()) {
      setError('请输入被试编号');
      return;
    }
    setError('');
    onStart(participantId.trim(), { workload, intervention });
  }

  // 预实验整体状态：已跳过 > 已完成 > 进行中 > 未开始
  let overallStatus = '未开始';
  let overallClass = '';
  if (trainingSkipped) {
    overallStatus = '已跳过';
    overallClass = 'skipped';
  } else if (trainingCompleted) {
    overallStatus = '已完成';
    overallClass = 'done';
  } else if (Object.values(moduleStatus).some((s) => s === 'in_progress')) {
    overallStatus = '进行中';
    overallClass = 'active';
  }

  let statusText = '预实验未全部完成，但当前允许跳过训练并开始正式实验';
  if (trainingSkipped) statusText = '已跳过预实验，可开始正式实验';
  else if (trainingCompleted) statusText = '预实验已结束，可开始正式实验';

  return (
    <div className="screen start-screen">
      <div className="panel start-panel">
        <h1>有人车—多无人机协同前出侦察</h1>
        <p className="subtitle">注意力分配实验 · 原型</p>

        <div className="training-module">
          <div className="training-module-head">
            <h2 className="training-title">预实验培训</h2>
            <span className={`training-status ${overallClass}`}>{overallStatus}</span>
          </div>
          <p className="hint">可自由进入任意模块练习；跳过训练不影响正式实验流程与数据记录。</p>

          <div className="training-module-list">
            {MODULE_ORDER.map((key) => (
              <div key={key} className="training-module-row">
                <span>{MODULE_LABEL[key]}</span>
                <span className={`module-status ${moduleStatusClass(moduleStatus[key])}`}>
                  {moduleStatusText(moduleStatus[key])}
                </span>
              </div>
            ))}
          </div>

          <p
            className={`training-status-text ${trainingCompleted ? 'done' : trainingSkipped ? 'skipped' : ''}`}
          >
            {statusText}
          </p>

          <div className="training-actions">
            <button type="button" className="ghost-btn" onClick={() => onStartTraining(intervention)}>
              开始预实验培训
            </button>
            <button type="button" className="ghost-btn" onClick={onSkipTraining}>
              跳过预实验，直接开始正式实验
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>被试编号</span>
            <input
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="例如 P001"
              autoFocus
            />
          </label>

          <div className="field">
            <span>主任务负荷</span>
            <div className="options">
              <button
                type="button"
                className={workload === 'normal' ? 'selected' : ''}
                onClick={() => setWorkload('normal')}
              >
                普通负荷（4 目标）
              </button>
              <button
                type="button"
                className={workload === 'high' ? 'selected' : ''}
                onClick={() => setWorkload('high')}
              >
                高负荷（5 目标）
              </button>
            </div>
          </div>

          <div className="field">
            <span>次任务介入方式</span>
            <div className="options">
              <button
                type="button"
                className={intervention === 'direct_visual' ? 'selected' : ''}
                onClick={() => setIntervention('direct_visual')}
              >
                直接介入 + 视觉
              </button>
              <button
                type="button"
                className={intervention === 'guidance_visual' ? 'selected' : ''}
                onClick={() => setIntervention('guidance_visual')}
              >
                注意引导 + 视觉
              </button>
              <button
                type="button"
                className={intervention === 'guidance_audiovisual' ? 'selected' : ''}
                onClick={() => setIntervention('guidance_audiovisual')}
              >
                注意引导 + 视听
              </button>
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="primary-btn" disabled={!canStartExperiment}>
            开始实验
          </button>
        </form>
      </div>
    </div>
  );
}
