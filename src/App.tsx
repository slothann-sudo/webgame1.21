import { useState } from 'react';
import type { ExperimentConfig, Phase, Summary } from './types';
import StartScreen from './components/StartScreen';
import ExperimentScreen from './components/ExperimentScreen';
import EndScreen from './components/EndScreen';
import { initLogger, logEvent, getLogs } from './utils/logger';
import { computeSummary } from './utils/summary';

export default function App() {
  const [phase, setPhase] = useState<Phase>('start');
  const [participantId, setParticipantId] = useState('');
  const [config, setConfig] = useState<ExperimentConfig>({
    workload: 'normal',
    intervention: 'direct_visual',
  });
  const [summary, setSummary] = useState<Summary | null>(null);

  function handleStart(id: string, cfg: ExperimentConfig) {
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
    return <StartScreen onStart={handleStart} />;
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
