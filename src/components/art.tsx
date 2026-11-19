// Ilustrações provisórias (SVG próprios), até entrarem as imagens de verdade.
import { useId } from 'react'

export type HairStyle = 'curto' | 'cacheado' | 'longo' | 'careca'

export type ToonLook = {
  skin: string
  hair: string
  shirt: string
  hairStyle: HairStyle
  glasses: boolean
}

const skins = ['#f2c9a5', '#e3ad84', '#c98a5c', '#9e6743', '#6f452a']
const hairs = ['#1e1612', '#3b2416', '#7a3b1c', '#c4622c', '#e2bd72', '#2c2c34']
const shirts = ['#ff8a3d', '#5ab0ff', '#9b7bff', '#3fcf8e', '#ff5da2', '#f2f4f7', '#2e3442']
const styles: HairStyle[] = ['curto', 'cacheado', 'longo', 'careca', 'curto']

function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)]
}

export function randomLook(): ToonLook {
  return { skin: pick(skins), hair: pick(hairs), shirt: pick(shirts), hairStyle: pick(styles), glasses: Math.random() < 0.3 }
}

export const sampleLooks: ToonLook[] = [
  { skin: '#e3ad84', hair: '#1e1612', shirt: '#ff8a3d', hairStyle: 'curto', glasses: false },
  { skin: '#9e6743', hair: '#1e1612', shirt: '#5ab0ff', hairStyle: 'cacheado', glasses: false },
  { skin: '#f2c9a5', hair: '#c4622c', shirt: '#3fcf8e', hairStyle: 'curto', glasses: true },
  { skin: '#c98a5c', hair: '#3b2416', shirt: '#ff5da2', hairStyle: 'longo', glasses: false },
  { skin: '#f2c9a5', hair: '#e2bd72', shirt: '#9b7bff', hairStyle: 'longo', glasses: false },
]

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16)
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt))))
  const r = f(n >> 16)
  const g = f((n >> 8) & 255)
  const b = f(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

function useSvgId() {
  return useId().replace(/[^a-zA-Z0-9_-]/g, '')
}

// Boneco 3D estilizado (busto). Desenho original.
function ToonShapes({ look, uid }: { look: ToonLook; uid: string }) {
  const { skin, hair, shirt, hairStyle, glasses } = look
  return (
    <g>
      <defs>
        <radialGradient id={`${uid}-skin`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor={shade(skin, 0.28)} />
          <stop offset="0.65" stopColor={skin} />
          <stop offset="1" stopColor={shade(skin, -0.18)} />
        </radialGradient>
        <linearGradient id={`${uid}-shirt`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(shirt, 0.15)} />
          <stop offset="1" stopColor={shade(shirt, -0.35)} />
        </linearGradient>
        <radialGradient id={`${uid}-hair`} cx="40%" cy="25%" r="80%">
          <stop offset="0" stopColor={shade(hair, 0.3)} />
          <stop offset="1" stopColor={hair} />
        </radialGradient>
      </defs>
      {hairStyle === 'longo' && <path d="M44 96 C38 150 58 178 72 182 L128 182 C142 178 162 150 156 96 Z" fill={`url(#${uid}-hair)`} />}
      <path d="M26 220 C30 178 62 158 100 158 C138 158 170 178 174 220 Z" fill={`url(#${uid}-shirt)`} />
      <rect x="87" y="134" width="26" height="32" rx="11" fill={shade(skin, -0.15)} />
      <path d="M82 160 Q100 180 118 160" fill={shade(skin, -0.08)} />
      <circle cx="49" cy="104" r="11" fill={shade(skin, -0.05)} />
      <circle cx="151" cy="104" r="11" fill={shade(skin, -0.05)} />
      <ellipse cx="100" cy="98" rx="53" ry="57" fill={`url(#${uid}-skin)`} />
      {hairStyle === 'curto' && (
        <path d="M46 94 C42 50 72 32 100 32 C132 32 160 50 154 94 C150 76 136 62 112 60 C96 59 84 66 72 58 C64 72 54 78 46 94 Z" fill={`url(#${uid}-hair)`} />
      )}
      {hairStyle === 'longo' && (
        <path d="M45 102 C38 48 72 30 100 30 C130 30 164 48 155 102 C152 80 140 64 100 62 C62 64 50 80 45 102 Z" fill={`url(#${uid}-hair)`} />
      )}
      {hairStyle === 'cacheado' && (
        <g fill={`url(#${uid}-hair)`}>
          <circle cx="56" cy="74" r="17" />
          <circle cx="70" cy="54" r="19" />
          <circle cx="91" cy="43" r="20" />
          <circle cx="113" cy="43" r="20" />
          <circle cx="133" cy="53" r="19" />
          <circle cx="146" cy="72" r="17" />
          <circle cx="150" cy="90" r="11" />
          <circle cx="50" cy="90" r="11" />
        </g>
      )}
      {hairStyle === 'careca' && <ellipse cx="82" cy="58" rx="14" ry="7" fill="#fff" opacity="0.18" />}
      <rect x="68" y="78" width="22" height="6" rx="3" fill={shade(hair, -0.2)} />
      <rect x="110" y="78" width="22" height="6" rx="3" fill={shade(hair, -0.2)} />
      <ellipse cx="80" cy="101" rx="11.5" ry="13.5" fill="#fff" />
      <ellipse cx="120" cy="101" rx="11.5" ry="13.5" fill="#fff" />
      <circle cx="82" cy="103" r="7" fill="#1b1b22" />
      <circle cx="122" cy="103" r="7" fill="#1b1b22" />
      <circle cx="85" cy="99.5" r="2.4" fill="#fff" />
      <circle cx="125" cy="99.5" r="2.4" fill="#fff" />
      {glasses && (
        <g fill="none" stroke="#1b1b22" strokeWidth="3.5">
          <circle cx="80" cy="101" r="16" fill="#fff" fillOpacity="0.07" />
          <circle cx="120" cy="101" r="16" fill="#fff" fillOpacity="0.07" />
          <path d="M96 99 Q100 95 104 99" />
        </g>
      )}
      <ellipse cx="100" cy="117" rx="5.5" ry="4" fill={shade(skin, -0.16)} />
      <ellipse cx="69" cy="122" rx="8" ry="5" fill="#ff6f6f" opacity="0.22" />
      <ellipse cx="131" cy="122" rx="8" ry="5" fill="#ff6f6f" opacity="0.22" />
      <path d="M86 129 Q100 142 114 129" fill="none" stroke="#5a2a20" strokeWidth="3.6" strokeLinecap="round" />
    </g>
  )
}

export function Toon({ look, className }: { look: ToonLook; className?: string }) {
  const uid = useSvgId()
  return (
    <svg viewBox="0 0 200 220" className={className} aria-hidden>
      <ToonShapes look={look} uid={uid} />
    </svg>
  )
}

export type Backdrop = 'noite' | 'quarto' | 'loja' | 'rua' | 'escritorio'
export const backdrops: Backdrop[] = ['noite', 'quarto', 'loja', 'rua', 'escritorio']

function BackdropShapes({ kind, uid }: { kind: Backdrop; uid: string }) {
  switch (kind) {
    case 'noite':
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2b1e5e" />
              <stop offset="1" stopColor="#0d0f1c" />
            </linearGradient>
          </defs>
          <rect x="-200" width="580" height="320" fill={`url(#${uid}-bg)`} />
          <circle cx="140" cy="52" r="26" fill="#ffe2a8" opacity="0.12" />
          <circle cx="140" cy="52" r="15" fill="#ffe2a8" />
          {[
            [0, 150, 40, 170],
            [36, 120, 34, 200],
            [68, 160, 30, 160],
            [96, 104, 40, 216],
            [134, 140, 46, 180],
          ].map(([x, y, w, h], i) => (
            <g key={i}>
              <rect x={x} y={y} width={w} height={h} fill="#151935" />
              {Array.from({ length: 5 }).map((_, j) => (
                <rect key={j} x={x + 7 + (j % 2) * 14} y={y + 12 + j * 18} width="7" height="9" rx="1.5" fill={j % 3 === 0 ? '#7cc4ff' : '#ffb36b'} opacity={0.75} />
              ))}
            </g>
          ))}
        </g>
      )
    case 'quarto':
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3b2a4d" />
              <stop offset="1" stopColor="#1a1424" />
            </linearGradient>
          </defs>
          <rect x="-200" width="580" height="320" fill={`url(#${uid}-bg)`} />
          <rect x="18" y="40" width="64" height="76" rx="4" fill="#25406b" stroke="#5a4772" strokeWidth="4" />
          <path d="M50 40 V116 M18 78 H82" stroke="#5a4772" strokeWidth="3" />
          <circle cx="146" cy="84" r="40" fill="#ff9c59" opacity="0.14" />
          <path d="M136 64 h20 l-6 18 h-8 z" fill="#ffb98a" />
          <rect x="144" y="82" width="4" height="40" fill="#5a4772" />
          <rect x="-200" y="270" width="580" height="50" fill="#2a1f36" />
        </g>
      )
    case 'loja':
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2f1c12" />
              <stop offset="1" stopColor="#120b08" />
            </linearGradient>
            <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          <rect x="-200" width="580" height="320" fill={`url(#${uid}-bg)`} />
          <rect x="36" y="36" width="108" height="34" rx="10" fill="none" stroke="#ff8a3d" strokeWidth="4" filter={`url(#${uid}-glow)`} />
          <rect x="36" y="36" width="108" height="34" rx="10" fill="none" stroke="#ffc79e" strokeWidth="2" />
          <text x="90" y="59" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="15" fill="#ffd9bd" letterSpacing="2">
            ABERTO
          </text>
          {[96, 132].map((y) => (
            <g key={y}>
              <rect x="10" y={y} width="160" height="5" rx="2" fill="#4a2e1b" />
              {[18, 44, 70, 118, 146].map((x, i) => (
                <rect key={x} x={x} y={y - 18} width="14" height="18" rx="3" fill={['#5ab0ff', '#ff8a3d', '#9b7bff', '#3fcf8e', '#ff5da2'][i]} opacity="0.7" />
              ))}
            </g>
          ))}
        </g>
      )
    case 'rua':
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ff9a57" />
              <stop offset="0.5" stopColor="#7b3bbf" />
              <stop offset="1" stopColor="#1b1440" />
            </linearGradient>
          </defs>
          <rect x="-200" width="580" height="320" fill={`url(#${uid}-bg)`} />
          <circle cx="90" cy="120" r="34" fill="#ffd27a" opacity="0.9" />
          <path d="M0 150 L40 128 L76 146 L118 120 L180 148 V320 H0 Z" fill="#2a1a4f" />
          <path d="M60 320 L84 170 L96 170 L120 320 Z" fill="#1a1230" />
        </g>
      )
    case 'escritorio':
      return (
        <g>
          <defs>
            <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#13344d" />
              <stop offset="1" stopColor="#0a1520" />
            </linearGradient>
          </defs>
          <rect x="-200" width="580" height="320" fill={`url(#${uid}-bg)`} />
          <rect x="16" y="44" width="70" height="46" rx="5" fill="#0e2233" stroke="#5ab0ff" strokeWidth="2.5" />
          <path d="M24 78 L38 64 L50 72 L64 56 L78 62" fill="none" stroke="#5ab0ff" strokeWidth="3" strokeLinecap="round" />
          <rect x="96" y="44" width="68" height="46" rx="5" fill="#0e2233" stroke="#3fcf8e" strokeWidth="2.5" />
          <rect x="104" y="56" width="40" height="5" rx="2" fill="#3fcf8e" opacity="0.8" />
          <rect x="104" y="68" width="28" height="5" rx="2" fill="#3fcf8e" opacity="0.5" />
          <rect x="-200" y="276" width="580" height="44" fill="#0d1e2c" />
        </g>
      )
  }
}

// Cena vertical 9:16 com fundo e personagem
export function Scene({ backdrop, look, className, label, crop }: { backdrop: Backdrop; look?: ToonLook; className?: string; label?: string; crop?: 'face' }) {
  const uid = useSvgId()
  return (
    <svg viewBox={crop === 'face' ? '-70 125 320 180' : '0 0 180 320'} preserveAspectRatio="xMidYMid slice" className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <BackdropShapes kind={backdrop} uid={uid} />
      {look && (
        <svg x="0" y="118" width="180" height="202" viewBox="0 0 200 220">
          <ToonShapes look={look} uid={`${uid}-t`} />
        </svg>
      )}
    </svg>
  )
}

/* ---------- Ilustrações didáticas ---------- */

export function ArtStory({ className }: { className?: string }) {
  const uid = useSvgId()
  return (
    <svg viewBox="0 0 320 240" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a2216" />
          <stop offset="1" stopColor="#140d09" />
        </linearGradient>
      </defs>
      <rect width="320" height="240" fill={`url(#${uid}-bg)`} />
      <circle cx="250" cy="40" r="70" fill="#ff8a3d" opacity="0.12" />
      <g className="art-float">
        <rect x="70" y="34" width="180" height="176" rx="14" fill="#f2f4f7" />
        <rect x="90" y="54" width="100" height="10" rx="5" fill="#1a1e28" />
        {[
          ['1', '#ff8a3d', 84],
          ['2', '#5ab0ff', 124],
          ['3', '#9b7bff', 164],
        ].map(([n, c, y]) => (
          <g key={n as string}>
            <circle cx="102" cy={(y as number) + 10} r="12" fill={c as string} />
            <text x="102" y={(y as number) + 15} textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="13" fill="#1a0e05">
              {n}
            </text>
            <rect x="124" y={(y as number) + 3} width="104" height="7" rx="3.5" fill="#c9ced8" />
            <rect x="124" y={(y as number) + 15} width="70" height="7" rx="3.5" fill="#dfe3ea" />
          </g>
        ))}
      </g>
    </svg>
  )
}

export function ArtCharacter({ className, look = sampleLooks[0] }: { className?: string; look?: ToonLook }) {
  const uid = useSvgId()
  return (
    <svg viewBox="0 0 320 240" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#173352" />
          <stop offset="1" stopColor="#0b1520" />
        </linearGradient>
      </defs>
      <rect width="320" height="240" fill={`url(#${uid}-bg)`} />
      <circle cx="160" cy="130" r="88" fill="#5ab0ff" opacity="0.14" />
      <g className="art-float">
        <svg x="80" y="40" width="160" height="200" viewBox="0 0 200 220">
          <ToonShapes look={look} uid={`${uid}-t`} />
        </svg>
      </g>
      <g transform="translate(222 46)">
        <rect width="62" height="26" rx="13" fill="#0a1a2b" stroke="#5ab0ff" strokeWidth="1.5" />
        <rect x="12" y="11" width="11" height="9" rx="2" fill="#8ec8ff" />
        <path d="M14 11 V8 a3.5 3.5 0 0 1 7 0 V11" fill="none" stroke="#8ec8ff" strokeWidth="2" />
        <rect x="29" y="11" width="22" height="4" rx="2" fill="#8ec8ff" />
      </g>
    </svg>
  )
}

export function ArtVideos({ className }: { className?: string }) {
  const uid = useSvgId()
  return (
    <svg viewBox="0 0 320 240" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a1f45" />
          <stop offset="1" stopColor="#100c1b" />
        </linearGradient>
      </defs>
      <rect width="320" height="240" fill={`url(#${uid}-bg)`} />
      <g transform="rotate(-10 110 130)">
        <rect x="70" y="48" width="78" height="140" rx="12" fill="#5ab0ff" opacity="0.85" />
      </g>
      <g transform="rotate(9 210 130)">
        <rect x="172" y="48" width="78" height="140" rx="12" fill="#9b7bff" opacity="0.85" />
      </g>
      <g className="art-float">
        <rect x="120" y="34" width="84" height="152" rx="13" fill="#ff8a3d" />
        <circle cx="162" cy="110" r="18" fill="#1a0e05" opacity="0.85" />
        <path d="M157 101 L171 110 L157 119 Z" fill="#ffb98a" />
      </g>
    </svg>
  )
}

export function ArtLessons({ className }: { className?: string }) {
  const uid = useSvgId()
  return (
    <svg viewBox="0 0 320 240" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#163a2b" />
          <stop offset="1" stopColor="#0a1611" />
        </linearGradient>
      </defs>
      <rect width="320" height="240" fill={`url(#${uid}-bg)`} />
      <g className="art-float">
        <rect x="58" y="44" width="204" height="128" rx="12" fill="#0e231a" stroke="#3fcf8e" strokeWidth="3" />
        <circle cx="160" cy="104" r="24" fill="#3fcf8e" />
        <path d="M153 92 L172 104 L153 116 Z" fill="#0a1611" />
        <rect x="78" y="150" width="164" height="6" rx="3" fill="#1d4434" />
        <rect x="78" y="150" width="70" height="6" rx="3" fill="#3fcf8e" />
        <rect x="140" y="172" width="40" height="22" fill="#163a2b" />
        <rect x="112" y="192" width="96" height="8" rx="4" fill="#1d4434" />
      </g>
    </svg>
  )
}

export function ArtCredits({ className }: { className?: string }) {
  const uid = useSvgId()
  return (
    <svg viewBox="0 0 320 240" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a2610" />
          <stop offset="1" stopColor="#140d06" />
        </linearGradient>
      </defs>
      <rect width="320" height="240" fill={`url(#${uid}-bg)`} />
      <g className="art-float">
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${120 + i * 26} ${150 - i * 30})`}>
            <ellipse cx="0" cy="12" rx="34" ry="12" fill="#c46a1c" />
            <rect x="-34" y="0" width="68" height="12" fill="#c46a1c" />
            <ellipse cx="0" cy="0" rx="34" ry="12" fill="#ffb347" />
            <ellipse cx="0" cy="0" rx="20" ry="6" fill="none" stroke="#c46a1c" strokeWidth="2.5" />
          </g>
        ))}
      </g>
    </svg>
  )
}
