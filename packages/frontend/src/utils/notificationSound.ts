/**
 * Two-tone ascending chime via Web Audio API.
 */
export function playNotificationSound(): void {
  try {
    const ctx = new AudioContext();
    const play = () => {
      const frequencies = [587.33, 880];

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.value = freq;
        osc.type = "sine";

        const start = ctx.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);

        osc.start(start);
        osc.stop(start + 0.5);
      });
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(play);
    } else {
      play();
    }
  } catch {
    // Audio not available in this environment
  }
}
