/**
 * Tiny synthesised-sound layer for the Game screen. No audio files — every
 * effect is a few oscillators routed through the Web Audio API. Keeps the
 * bundle small and dodges the "audio file format support" mess across iOS
 * Safari / Android Chrome.
 *
 * iOS requires the AudioContext to be created (or resumed) in response to a
 * user gesture. We lazy-create it on the first sound call, which is always
 * triggered by a tap.
 */

const STORAGE_KEY = 'checkout_sounds_muted'

let audioContext: AudioContext | null = null
let muted = false
let initialised = false

const ensureContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null
  if (!audioContext) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    try {
      audioContext = new Ctx()
    } catch {
      return null
    }
  }
  if (audioContext.state === 'suspended') {
    void audioContext.resume()
  }
  return audioContext
}

interface ToneOpts {
  /** Hz. Single value or sweep [start, end]. */
  freq: number | [number, number]
  /** Duration in ms. */
  durationMs: number
  type?: OscillatorType
  /** 0..1. Defaults to 0.08. */
  volume?: number
  /** Start offset in ms. */
  delayMs?: number
}

const playTone = (opts: ToneOpts) => {
  if (muted) return
  const ctx = ensureContext()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)

  const startTime = ctx.currentTime + (opts.delayMs ?? 0) / 1000
  const dur = opts.durationMs / 1000
  const vol = opts.volume ?? 0.08
  osc.type = opts.type ?? 'sine'

  if (Array.isArray(opts.freq)) {
    const [from, to] = opts.freq
    osc.frequency.setValueAtTime(from, startTime)
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), startTime + dur)
  } else {
    osc.frequency.setValueAtTime(opts.freq, startTime)
  }

  // Small attack/release envelope so the sound doesn't click on its own
  // edges (which on some devices is louder than the tone itself).
  const attack = 0.004
  const release = 0.025
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(vol, startTime + attack)
  gain.gain.setValueAtTime(vol, startTime + Math.max(attack, dur - release))
  gain.gain.linearRampToValueAtTime(0, startTime + dur)

  osc.start(startTime)
  osc.stop(startTime + dur + 0.05)
}

export const initSounds = () => {
  if (initialised) return
  initialised = true
  if (typeof window === 'undefined') return
  try {
    muted = window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    /* localStorage may be blocked */
  }
}

export const setSoundsMuted = (next: boolean) => {
  muted = next
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, String(next))
  } catch {
    /* ignore */
  }
}

export const isSoundsMuted = (): boolean => {
  if (!initialised) initSounds()
  return muted
}

// -----------------------------------------------------------------------------
// Effect presets
// -----------------------------------------------------------------------------

/** Short, dry tick — generic digit / number tap. */
export const playClickSound = () => {
  initSounds()
  playTone({ freq: 760, durationMs: 30, type: 'square', volume: 0.04 })
}

/** Slightly heavier downward thunk — Clear / Reset action. */
export const playClearSound = () => {
  initSounds()
  playTone({ freq: [420, 260], durationMs: 90, type: 'square', volume: 0.07 })
}

/** Pleasant two-note ascending blip — OK / Submit. */
export const playOkSound = () => {
  initSounds()
  playTone({ freq: 660, durationMs: 60, type: 'triangle', volume: 0.07 })
  playTone({ freq: 990, durationMs: 90, type: 'triangle', volume: 0.07, delayMs: 60 })
}

/** Dull thud — Miss button (player threw a 0). */
export const playMissSound = () => {
  initSounds()
  playTone({ freq: [180, 110], durationMs: 110, type: 'sawtooth', volume: 0.09 })
}

/** Triumphant arpeggio for a leg / match win. */
export const playCheckoutSound = () => {
  initSounds()
  const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    playTone({ freq, durationMs: 160, type: 'triangle', volume: 0.09, delayMs: i * 70 })
  })
}

/** Sour falling tone for a bust. */
export const playBustSound = () => {
  initSounds()
  playTone({ freq: [380, 90], durationMs: 280, type: 'sawtooth', volume: 0.1 })
}

// -----------------------------------------------------------------------------
// Haptics
// -----------------------------------------------------------------------------

/**
 * Tiny haptic pulse — a single short vibration that adds physical
 * feedback to button taps on Android (and the few iOS browsers that
 * expose navigator.vibrate). iOS Safari ignores it silently, which is
 * fine: the visual `:active` state on the buttons still gives the user
 * a clear "I pressed something" confirmation.
 *
 * Pass a different ms value for stronger actions (Clear / OK) so the
 * Clear/Submit feel a bit "heavier" than a plain digit tap.
 */
export const triggerHaptic = (ms = 10) => {
  if (typeof navigator === 'undefined') return
  if (typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(ms)
  } catch {
    /* unsupported / blocked → silently ignore */
  }
}
