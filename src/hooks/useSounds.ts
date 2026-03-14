/**
 * NTXUVA – useSounds hook
 *
 * All sounds generated procedurally via the Web Audio API.
 * No external files. Lazy AudioContext (requires a user gesture first).
 *
 * Exported sounds:
 *   playSelect       – subtle click when a house is clicked
 *   playPlace        – woody knock for each piece distributed
 *   playContinuation – ascending two-note cue for "pick-1" continuation
 *   playCapture      – sharp impact + low rumble on a successful capture
 *   playWin          – four-note ascending victory fanfare
 *   playLose         – four-note descending lament
 *   playAIThink      – short pulse while AI decides
 */

import { useCallback, useRef } from 'react';

type OscType = OscillatorType; // 'sine'|'square'|'sawtooth'|'triangle'

export interface Sounds {
  playSelect: () => void;
  playPlace: () => void;
  playContinuation: () => void;
  playCapture: () => void;
  playWin: () => void;
  playLose: () => void;
  playAIThink: () => void;
}

export function useSounds(enabled: boolean): Sounds {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext | null => {
    if (!enabled) return null;
    try {
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new AudioContext();
      }
      if (ctxRef.current.state === 'suspended') void ctxRef.current.resume();
      return ctxRef.current;
    } catch {
      return null;
    }
  }, [enabled]);

  /**
   * Schedule one oscillator burst.
   * @param freq     Frequency in Hz
   * @param dur      Duration in seconds
   * @param type     Waveform type
   * @param vol      Peak gain (0–1)
   * @param delay    Start offset from AudioContext.currentTime (seconds)
   * @param freqEnd  Optional glide target (linear ramp over dur)
   */
  const tone = useCallback(
    (
      freq: number,
      dur: number,
      type: OscType = 'sine',
      vol = 0.25,
      delay = 0,
      freqEnd?: number,
    ): void => {
      const ac = getCtx();
      if (!ac) return;
      try {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.type = type;
        const t0 = ac.currentTime + delay;
        osc.frequency.setValueAtTime(freq, t0);
        if (freqEnd !== undefined) {
          osc.frequency.linearRampToValueAtTime(freqEnd, t0 + dur);
        }
        gain.gain.setValueAtTime(vol, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.start(t0);
        osc.stop(t0 + dur + 0.01);
      } catch { /* ignore */ }
    },
    [getCtx],
  );

  const playSelect = useCallback(() => {
    tone(520, 0.06, 'triangle', 0.18);
    tone(380, 0.05, 'triangle', 0.10, 0.04);
  }, [tone]);

  const playPlace = useCallback(() => {
    tone(280, 0.10, 'triangle', 0.22);
    tone(180, 0.08, 'triangle', 0.12, 0.04);
  }, [tone]);

  const playContinuation = useCallback(() => {
    tone(440, 0.10, 'sine', 0.20);
    tone(587, 0.12, 'sine', 0.18, 0.09);
  }, [tone]);

  const playCapture = useCallback(() => {
    tone(220, 0.04, 'sawtooth', 0.35);
    tone(160, 0.40, 'square',   0.22, 0.03, 80);
    tone(320, 0.25, 'sine',     0.18, 0.08);
    tone(480, 0.15, 'sine',     0.10, 0.18);
  }, [tone]);

  const playWin = useCallback(() => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.30, 'sine', 0.28, i * 0.14));
    [523, 784].forEach((f) => tone(f, 0.60, 'triangle', 0.12, 4 * 0.14));
  }, [tone]);

  const playLose = useCallback(() => {
    [392, 349, 294, 220].forEach((f, i) => tone(f, 0.40, 'sine', 0.22, i * 0.16));
  }, [tone]);

  const playAIThink = useCallback(() => {
    tone(330, 0.08, 'sine', 0.10);
  }, [tone]);

  return { playSelect, playPlace, playContinuation, playCapture, playWin, playLose, playAIThink };
}
