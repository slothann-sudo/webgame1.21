import { useState } from 'react';
import type { ExperimentConfig, Intervention, Workload } from '../types';

interface Props {
  onStart: (participantId: string, config: ExperimentConfig) => void;
}

export default function StartScreen({ onStart }: Props) {
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

  return (
    <div className="screen start-screen">
      <div className="panel start-panel">
        <h1>有人车—多无人机协同前出侦察</h1>
        <p className="subtitle">注意力分配实验 · 原型</p>

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
                普通负荷（3 目标）
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
          <button type="submit" className="primary-btn">开始实验</button>
        </form>
      </div>
    </div>
  );
}
