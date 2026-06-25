/**
 * Two-tone Web Audio chime — no asset, no dep. Browser autoplay policies
 * block AudioContext until the user has interacted with the page, so the
 * first chime after a fresh navigation may be silent; the catch swallows
 * that and subsequent chimes play after any interaction.
 */
export function playNotificationChime(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Autoplay-blocked or unsupported — silent fail is fine.
  }
}
