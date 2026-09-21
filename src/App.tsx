import { useState } from 'react';
import type {
  ExperimentConfig,
  Intervention,
  ModuleStatus,
  Phase,
  Summary,
  TrainingModuleKey,
} from './types';
import StartScreen from './components/StartScreen';
import ExperimentScreen from './components/ExperimentScreen';
import EndScreen from './components/EndScreen';
import TrainingScreen from './components/TrainingScreen';
import { initLogger, logEvent, getLogs } from './utils/logger';
import { computeSummary } from './utils/summary';
import { initAudio } from './utils/audio';

// 开发/调试阶段允许跳过预实验直接进入正式实验；仅放宽训练门槛，不影响正式实验逻辑与 CSV 记录
const ALLOW_SKIP_TRAINING = true;

const INITIAL_MODULE_STATUS: Record<TrainingModuleKey, ModuleStatus> = {
  main: 'not_started',
  secondary: 'not_started',
  combined: 'not_started',
};

export default function App() {
  const [phase, setPhase] = useState<Phase>('start');
  const [participantId, setParticipantId] = useState('');
  const [config, setConfig] = useState<ExperimentConfig>({
    workload: 'normal',
    intervention: 'direct_visual',
  });
  const [summary, setSummary] = useState<Summary | null>(null);

  // 预实验模块状态：三个模块独立维护，可自由切换、可跳过
  const [trainingModuleStatus, setTrainingModuleStatus] =
    useState<Record<TrainingModuleKey, ModuleStatus>>(INITIAL_MODULE_STATUS);
  const [currentTrainingModule, setCurrentTrainingModule] = useState<TrainingModuleKey>('main');
  const [trainingSkipped, setTrainingSkipped] = useState(false);

  // 所有模块均为 completed 或 skipped 时，预实验视为 finished
  const allTrainingFinished = (Object.keys(trainingModuleStatus) as TrainingModuleKey[]).every(
    (k) => trainingModuleStatus[k] === 'completed' || trainingModuleStatus[k] === 'skipped',
  );
  const trainingCompleted = allTrainingFinished;
  const canStartExperiment = trainingCompleted || trainingSkipped || ALLOW_SKIP_TRAINING;

  function handleStartTraining(intervention: Intervention) {
    // 点击“开始预实验培训”属于用户手势，此时初始化音频可保证后续 beep 可用
    initAudio();
    setConfig((c) => ({ ...c, intervention }));
    setTrainingModuleStatus((prev) => ({
      ...prev,
      [currentTrainingModule]:
        prev[currentTrainingModule] === 'not_started' ? 'in_progress' : prev[currentTrainingModule],
    }));
    setPhase('training');
  }

  function handleSkipTraining() {
    setTrainingSkipped(true);
  }

  function handleModuleChange(key: TrainingModuleKey) {
    setCurrentTrainingModule(key);
    setTrainingModuleStatus((prev) => ({
      ...prev,
      [key]: prev[key] === 'not_started' ? 'in_progress' : prev[key],
    }));
  }

  function handleModuleComplete(key: TrainingModuleKey) {
    setTrainingModuleStatus((prev) => ({ ...prev, [key]: 'completed' }));
  }

  function handleModuleSkip(key: TrainingModuleKey) {
    setTrainingModuleStatus((prev) => ({ ...prev, [key]: 'skipped' }));
  }

  function handleTrainingReturn() {
    setPhase('start');
  }

  function handleStart(id: string, cfg: ExperimentConfig) {
    if (!canStartExperiment) return;
    setParticipantId(id);
    setConfig(cfg);
    initLogger(id, cfg.workload, cfg.intervention);
    logEvent({ event_type: 'experiment_start', screen_state: 'start' });
    setSummary(null);
    setPhase('experiment');
  }

  function handleEnd() {
    logEvent({ event_type: 'experiment_end', screen_state: 'end' });
    setSummary(computeSummary(getLogs()));
    setPhase('end');
  }

  function handleRestart() {
    setPhase('start');
    setSummary(null);
  }

  if (phase === 'start') {
    return (
      <StartScreen
        trainingCompleted={trainingCompleted}
        trainingSkipped={trainingSkipped}
        canStartExperiment={canStartExperiment}
        moduleStatus={trainingModuleStatus}
        onStartTraining={handleStartTraining}
        onSkipTraining={handleSkipTraining}
        onStart={handleStart}
      />
    );
  }
  if (phase === 'training') {
    return (
      <TrainingScreen
        intervention={config.intervention}
        moduleStatus={trainingModuleStatus}
        currentModule={currentTrainingModule}
        onModuleChange={handleModuleChange}
        onModuleComplete={handleModuleComplete}
        onModuleSkip={handleModuleSkip}
        onFinish={handleTrainingReturn}
      />
    );
  }
  if (phase === 'experiment') {
    return <ExperimentScreen participantId={participantId} config={config} onEnd={handleEnd} />;
  }
  return (
    <EndScreen
      summary={summary}
      participantId={participantId}
      config={config}
      onRestart={handleRestart}
    />
  );
}
