let audioContext: AudioContext | null = null

function getAudioContext() {
  audioContext ??= new AudioContext()
  if (audioContext.state === 'suspended') void audioContext.resume()
  return audioContext
}

function playTone(frequency: number, start: number, duration: number, type: OscillatorType = 'sine') {
  const context = getAudioContext()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.16, start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

let noiseBuffer: AudioBuffer | null = null

function playNoise(
  start: number,
  duration: number,
  { type, from, to, peak, q = 1, sustain = false }: { type: BiquadFilterType; from: number; to: number; peak: number; q?: number; sustain?: boolean },
) {
  const context = getAudioContext()
  if (!noiseBuffer) {
    noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()
  source.buffer = noiseBuffer
  source.loop = true
  filter.type = type
  filter.Q.value = q
  filter.frequency.setValueAtTime(from, start)
  filter.frequency.exponentialRampToValueAtTime(to, start + duration)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.01)
  if (sustain) gain.gain.setValueAtTime(peak, start + duration - 0.05)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  source.connect(filter).connect(gain).connect(context.destination)
  source.start(start)
  source.stop(start + duration + 0.02)
}

function playSweep(from: number, to: number, start: number, duration: number, type: OscillatorType, peak: number) {
  const context = getAudioContext()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(from, start)
  oscillator.frequency.exponentialRampToValueAtTime(to, start + duration)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

/** Lâmpada piscando: zumbido de 120 Hz ligando e desligando de forma irregular, com estalo a cada piscada. */
export function playDrawSound(enabled: boolean) {
  if (!enabled) return
  const now = getAudioContext().currentTime
  for (const [offset, length] of [[0, 0.04], [0.07, 0.025], [0.13, 0.05], [0.23, 0.02], [0.28, 0.07]]) {
    playNoise(now + offset, 0.02, { type: 'bandpass', from: 4_000, to: 2_500, peak: 0.2, q: 2 })
    playSweep(120, 118, now + offset, length, 'square', 0.1)
    playSweep(240, 236, now + offset, length, 'sawtooth', 0.04)
  }
}

/** Chuvisco de TV: "xiiiii" agudo e contínuo, com volume constante até um fade curto no fim. */
export function playTuningSound(enabled: boolean) {
  if (!enabled) return
  const now = getAudioContext().currentTime
  playNoise(now, 0.9, { type: 'highpass', from: 1_500, to: 1_500, peak: 0.25, q: 0.5, sustain: true })
  playNoise(now, 0.9, { type: 'bandpass', from: 4_500, to: 4_500, peak: 0.12, q: 0.7, sustain: true })
}

export function playTickSound(enabled: boolean) {
  if (!enabled) return
  playTone(1_400, getAudioContext().currentTime, 0.03, 'square')
}

export function playExplosionSound(enabled: boolean) {
  if (!enabled) return
  const now = getAudioContext().currentTime
  playNoise(now, 0.5, { type: 'lowpass', from: 1_200, to: 80, peak: 0.5 })
  playSweep(140, 40, now, 0.35, 'sine', 0.4)
}

export function playSuccessHorn(enabled: boolean) {
  if (!enabled) return
  const context = getAudioContext()
  const now = context.currentTime
  playTone(523, now, 0.18, 'sawtooth')
  playTone(659, now + 0.08, 0.18, 'sawtooth')
  playTone(784, now + 0.16, 0.42, 'sawtooth')
}

export function playStopwatchStartSound(enabled: boolean) {
  if (!enabled) return
  const context = getAudioContext()
  playTone(1_000, context.currentTime, 0.06, 'square')
}

export function playTimerEndSound(enabled: boolean) {
  if (!enabled) return
  const context = getAudioContext()
  const now = context.currentTime
  playTone(1_400, now, 0.12, 'triangle')
  playTone(1_800, now + 0.14, 0.24, 'triangle')
}

export function playStopwatchStopSound(enabled: boolean) {
  if (!enabled) return
  const context = getAudioContext()
  playTone(760, context.currentTime, 0.06, 'square')
}

/** Cavar: raspada de ruído grave seguida de um baque surdo. */
export function playDigSound(enabled: boolean) {
  if (!enabled) return
  const now = getAudioContext().currentTime
  playNoise(now, 0.14, { type: 'bandpass', from: 900, to: 350, peak: 0.3, q: 1.2 })
  playNoise(now + 0.1, 0.12, { type: 'bandpass', from: 700, to: 300, peak: 0.22, q: 1.2 })
  playSweep(110, 55, now + 0.04, 0.12, 'sine', 0.3)
}
