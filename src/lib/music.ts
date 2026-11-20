// Trilha sonora gerada no navegador (Web Audio), sem arquivo de música e sem direitos autorais.
// Três climas: suave, animada e luxo. Toca com "offset" pra acompanhar o vídeo quando pula no tempo.
export type Trilha = 'suave' | 'animada' | 'luxo' | 'nenhuma'

export const TRILHAS: Array<{ id: Trilha; label: string; sub: string }> = [
  { id: 'animada', label: 'Animada', sub: 'Batida pra cima' },
  { id: 'suave', label: 'Suave', sub: 'Leve e gostosa' },
  { id: 'luxo', label: 'Luxo', sub: 'Piano elegante' },
  { id: 'nenhuma', label: 'Sem música', sub: 'Você põe a sua' },
]

type Style = {
  bpm: number
  chords: number[][] // notas MIDI de cada compasso (repete)
  roots: number[]
  verb: number // segundos de reverb
  drumsFrom: number // compasso em que a batida entra
}

const STYLES: Record<Exclude<Trilha, 'nenhuma'>, Style> = {
  suave: { bpm: 86, chords: [[60, 64, 67, 71], [59, 62, 67, 74], [60, 64, 69, 72], [60, 65, 69, 72]], roots: [36, 43, 45, 41], verb: 2.2, drumsFrom: 2 },
  animada: { bpm: 116, chords: [[57, 60, 64, 69], [57, 60, 65, 69], [55, 60, 64, 67], [55, 59, 62, 67]], roots: [45, 41, 36, 43], verb: 1.2, drumsFrom: 1 },
  luxo: { bpm: 70, chords: [[62, 65, 69, 74], [62, 65, 70, 74], [60, 65, 69, 72], [60, 64, 67, 72]], roots: [38, 34, 41, 36], verb: 3.2, drumsFrom: 4 },
}

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

function impulse(ac: BaseAudioContext, secs: number) {
  const len = Math.floor(ac.sampleRate * secs)
  const buf = ac.createBuffer(2, len, ac.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
  }
  return buf
}

function noiseBuffer(ac: BaseAudioContext) {
  const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return buf
}

/** Começa a tocar e devolve a função que para. `offset` = de que segundo do vídeo começar. */
export function playMusic(ac: AudioContext, out: AudioNode, trilha: Trilha, dur: number, offset = 0): () => void {
  if (trilha === 'nenhuma') return () => {}
  const st = STYLES[trilha]
  const beat = 60 / st.bpm
  const bar = beat * 4
  const t0 = ac.currentTime + 0.06 - offset // instante (no relógio do áudio) que equivale ao segundo 0 do vídeo

  const master = ac.createGain()
  const comp = ac.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.ratio.value = 3
  master.connect(comp).connect(out)
  const vol = 0.85
  const now = ac.currentTime
  master.gain.setValueAtTime(0, now)
  master.gain.linearRampToValueAtTime(vol, now + (offset < 1 ? 1.2 : 0.25))
  const fadeAt = t0 + Math.max(dur - 1.8, offset + 0.5)
  if (fadeAt > now) {
    master.gain.setValueAtTime(vol, fadeAt)
    master.gain.linearRampToValueAtTime(0, t0 + dur)
  }

  const verb = ac.createConvolver()
  verb.buffer = impulse(ac, st.verb)
  const wet = ac.createGain()
  wet.gain.value = trilha === 'animada' ? 0.18 : 0.38
  verb.connect(wet).connect(master)
  const noise = noiseBuffer(ac)

  const env = (g: GainNode, at: number, peak: number, attack: number, decay: number) => {
    g.gain.setValueAtTime(0.0001, at)
    g.gain.linearRampToValueAtTime(peak, at + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  }
  const send = (node: AudioNode, amount = 1) => {
    node.connect(master)
    if (amount > 0) {
      const s = ac.createGain()
      s.gain.value = amount
      node.connect(s).connect(verb)
    }
  }

  function pad(notes: number[], at: number, len: number) {
    if (at < ac.currentTime - 0.02) return
    const g = ac.createGain()
    const f = ac.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = trilha === 'animada' ? 1400 : 950
    g.gain.setValueAtTime(0.0001, at)
    g.gain.linearRampToValueAtTime(trilha === 'animada' ? 0.035 : 0.05, at + 0.7)
    g.gain.setValueAtTime(trilha === 'animada' ? 0.035 : 0.05, at + len - 0.4)
    g.gain.linearRampToValueAtTime(0.0001, at + len + 0.5)
    f.connect(g)
    send(g, 0.8)
    for (const n of notes)
      for (const det of [-7, 7]) {
        const o = ac.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = hz(n)
        o.detune.value = det
        o.connect(f)
        o.start(at)
        o.stop(at + len + 0.6)
      }
  }

  function pluck(n: number, at: number, peak = 0.11, decay = 0.4) {
    if (at < ac.currentTime - 0.02) return
    const o = ac.createOscillator()
    o.type = trilha === 'animada' ? 'square' : 'triangle'
    o.frequency.value = hz(n)
    const f = ac.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(trilha === 'animada' ? 2600 : 3200, at)
    f.frequency.exponentialRampToValueAtTime(500, at + decay)
    const g = ac.createGain()
    env(g, at, trilha === 'animada' ? peak * 0.55 : peak, 0.006, decay)
    o.connect(f).connect(g)
    send(g, 0.6)
    o.start(at)
    o.stop(at + decay + 0.05)
  }

  function piano(n: number, at: number, peak = 0.14) {
    if (at < ac.currentTime - 0.02) return
    const g = ac.createGain()
    env(g, at, peak, 0.005, 2.4)
    send(g, 0.9)
    for (const [mult, type, lvl] of [
      [1, 'triangle', 1],
      [2, 'sine', 0.35],
      [3, 'sine', 0.12],
    ] as const) {
      const o = ac.createOscillator()
      o.type = type
      o.frequency.value = hz(n) * mult
      const lg = ac.createGain()
      lg.gain.value = lvl
      o.connect(lg).connect(g)
      o.start(at)
      o.stop(at + 2.5)
    }
  }

  function bass(n: number, at: number, len: number, peak = 0.22) {
    if (at < ac.currentTime - 0.02) return
    const o = ac.createOscillator()
    o.type = 'sine'
    o.frequency.value = hz(n)
    const g = ac.createGain()
    g.gain.setValueAtTime(0.0001, at)
    g.gain.linearRampToValueAtTime(peak, at + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, at + len)
    o.connect(g)
    send(g, 0)
    o.start(at)
    o.stop(at + len + 0.05)
  }

  function kick(at: number, peak = 0.75) {
    if (at < ac.currentTime - 0.02) return
    const o = ac.createOscillator()
    o.frequency.setValueAtTime(140, at)
    o.frequency.exponentialRampToValueAtTime(42, at + 0.16)
    const g = ac.createGain()
    env(g, at, peak, 0.003, 0.32)
    o.connect(g)
    send(g, 0)
    o.start(at)
    o.stop(at + 0.4)
  }

  function hit(at: number, type: 'hat' | 'clap', peak: number) {
    if (at < ac.currentTime - 0.02) return
    const s = ac.createBufferSource()
    s.buffer = noise
    const f = ac.createBiquadFilter()
    f.type = type === 'hat' ? 'highpass' : 'bandpass'
    f.frequency.value = type === 'hat' ? 7500 : 1600
    const g = ac.createGain()
    env(g, at, peak, 0.002, type === 'hat' ? 0.05 : 0.18)
    s.connect(f).connect(g)
    send(g, type === 'clap' ? 0.5 : 0)
    s.start(at, Math.random() * 0.5)
    s.stop(at + 0.3)
  }

  // um compasso inteiro, no tempo "m" (segundos do vídeo)
  function scheduleBar(i: number, m: number) {
    const at = t0 + m
    const chord = st.chords[i % st.chords.length]
    const root = st.roots[i % st.roots.length]
    const drums = i >= st.drumsFrom
    if (trilha === 'luxo') {
      pad(chord.map((n) => n - 12), at, bar)
      piano(chord[0] - 12, at, 0.12)
      chord.forEach((n, k) => piano(n, at + k * beat, 0.1 - k * 0.012))
      if (i % 2 === 1) piano(chord[3] + 12, at + beat * 3.5, 0.06)
      bass(root, at, bar * 0.95, 0.2)
      if (drums) kick(at, 0.35)
      return
    }
    pad(chord, at, bar)
    const arp = [0, 1, 2, 3, 2, 1, 2, 3]
    for (let k = 0; k < 8; k++) pluck(chord[arp[k]] + 12, at + k * (beat / 2), trilha === 'animada' ? 0.1 : 0.07, trilha === 'animada' ? 0.25 : 0.5)
    if (trilha === 'suave') {
      bass(root, at, bar * 0.9, 0.2)
      if (drums) {
        kick(at, 0.45)
        kick(at + beat * 2, 0.35)
        hit(at + beat, 'clap', 0.05)
        hit(at + beat * 3, 'clap', 0.05)
      }
      return
    }
    // animada
    for (let k = 0; k < 8; k++) bass(k % 4 === 3 ? root + 12 : root, at + k * (beat / 2), beat / 2 - 0.02, 0.18)
    if (drums)
      for (let b = 0; b < 4; b++) {
        kick(at + b * beat, 0.7)
        hit(at + b * beat + beat / 2, 'hat', 0.07)
        if (b % 2 === 1) hit(at + b * beat, 'clap', 0.22)
      }
  }

  // agenda aos poucos (só o que está pra tocar), assim parar é instantâneo
  let next = Math.max(0, Math.floor(offset / bar))
  let stopped = false
  const tick = () => {
    if (stopped) return
    const horizon = ac.currentTime - t0 + 1.2
    while (next * bar < Math.min(dur, horizon)) {
      const m = next * bar
      if (m + bar > offset - 0.01) scheduleBar(next, m)
      next++
    }
  }
  tick()
  const id = window.setInterval(tick, 250)
  return () => {
    stopped = true
    window.clearInterval(id)
    const n = ac.currentTime
    master.gain.cancelScheduledValues(n)
    master.gain.setValueAtTime(master.gain.value, n)
    master.gain.linearRampToValueAtTime(0, n + 0.12)
    window.setTimeout(() => master.disconnect(), 300)
  }
}
