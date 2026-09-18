import type { SystemMessage } from '../types';

function fmtTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SystemLog({ messages }: { messages: SystemMessage[] }) {
  return (
    <div className="system-log">
      <div className="log-scroll">
        {messages.map((m) => (
          <div key={m.id} className={`log-line log-${m.kind}`}>
            <span className="log-time">[{fmtTime(m.timeMs)}]</span> {m.text}
          </div>
        ))}
      </div>
    </div>
  );
}
