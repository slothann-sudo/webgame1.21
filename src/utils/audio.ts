// 短促提示音（Web Audio）。仅在用户点击“开始实验”后初始化，满足浏览器自动播放限制。
// 第一版用简单 beep；若后续需要更真实音效可在此替换。
let audioCtx: AudioContext | null = null;

export function initAudio(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
  } catch {
    audioCtx = null;
  }
}

export function playBeep(): void {
  if (!audioCtx) return;
  try {
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.18);
  } catch {
    // 音频失败不影响实验流程
  }
}
