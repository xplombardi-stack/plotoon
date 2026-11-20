// Palco 3D do vídeo do produto (Three.js, no navegador): a foto vira um painel de vidro
// com luz de estúdio, reflexo no chão, feixe de luz e partículas. A câmera muda a cada cena.
// Um único renderizador é compartilhado por todos os players (o 3D carrega sob demanda).
import type * as THREE_NS from 'three'
import type { CenaTipo } from './productVideo'

type T = typeof THREE_NS
export const SW = 720
export const SH = 1280

type Panel = { group: THREE_NS.Group; front: THREE_NS.Mesh; mat: THREE_NS.MeshStandardMaterial; aspect: number }
type Stage = {
  THREE: T
  renderer: THREE_NS.WebGLRenderer
  scene: THREE_NS.Scene
  camera: THREE_NS.PerspectiveCamera
  panel: Panel
  mirror: Panel
  rimA: THREE_NS.PointLight
  rimB: THREE_NS.PointLight
  key: THREE_NS.SpotLight
  beam: THREE_NS.Mesh
  beamMat: THREE_NS.MeshBasicMaterial
  dust: THREE_NS.Points
  dustMat: THREE_NS.PointsMaterial
  floorMat: THREE_NS.MeshStandardMaterial
  textures: WeakMap<object, THREE_NS.Texture>
  current: object | null
}

let stage: Stage | null = null
let loading: Promise<Stage | null> | null = null
let failed = false

export function stageReady() {
  return stage
}

/** Carrega o 3D (uma vez). Se o aparelho não tiver WebGL, o vídeo segue no modo 2D. */
export function loadStage(): Promise<Stage | null> {
  if (stage) return Promise.resolve(stage)
  if (failed) return Promise.resolve(null)
  if (!loading)
    loading = import('three')
      .then((THREE) => {
        try {
          stage = build(THREE)
        } catch {
          failed = true
        }
        return stage
      })
      .catch(() => {
        failed = true
        return null
      })
  return loading
}

function roundedShape(THREE: T, w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

function makePanel(THREE: T, aspect: number, mirrored = false): Panel {
  const maxW = 1.9
  const maxH = 2.3
  let h = maxH
  let w = h * aspect
  if (w > maxW) {
    w = maxW
    h = w / aspect
  }
  const group = new THREE.Group()
  // corpo (vidro escuro com borda)
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedShape(THREE, w + 0.06, h + 0.06, 0.16), { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 }),
    new THREE.MeshStandardMaterial({ color: 0x0b0b0f, roughness: 0.25, metalness: 0.8, transparent: mirrored, opacity: mirrored ? 0.35 : 1, side: mirrored ? THREE.DoubleSide : THREE.FrontSide }),
  )
  body.position.z = -0.08
  group.add(body)
  // frente com a foto (UV normalizado pro retângulo)
  const geo = new THREE.ShapeGeometry(roundedShape(THREE, w, h, 0.13), 8)
  const uv = geo.attributes.uv
  const pos = geo.attributes.position
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5)
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05, transparent: mirrored, opacity: mirrored ? 0.3 : 1, side: mirrored ? THREE.DoubleSide : THREE.FrontSide })
  const front = new THREE.Mesh(geo, mat)
  front.position.z = 0.012
  group.add(front)
  return { group, front, mat, aspect }
}

function softSprite(THREE: T) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, 'rgba(255,255,255,1)')
  gr.addColorStop(0.4, 'rgba(255,255,255,0.35)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function beamTexture(THREE: T) {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 256
  const g = c.getContext('2d')!
  const gr = g.createLinearGradient(0, 0, 0, 256)
  gr.addColorStop(0, 'rgba(255,255,255,0.0)')
  gr.addColorStop(0.15, 'rgba(255,255,255,0.55)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 64, 256)
  const side = g.createLinearGradient(0, 0, 64, 0)
  side.addColorStop(0, 'rgba(0,0,0,1)')
  side.addColorStop(0.5, 'rgba(0,0,0,0)')
  side.addColorStop(1, 'rgba(0,0,0,1)')
  g.globalCompositeOperation = 'destination-out'
  g.fillStyle = side
  g.fillRect(0, 0, 64, 256)
  const t = new THREE.CanvasTexture(c)
  return t
}

function build(THREE: T): Stage {
  const canvas = document.createElement('canvas')
  canvas.width = SW
  canvas.height = SH
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(1)
  renderer.setSize(SW, SH, false)
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.3

  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0x050507, 9, 22)
  const camera = new THREE.PerspectiveCamera(35, SW / SH, 0.1, 60)

  scene.add(new THREE.AmbientLight(0xffffff, 0.35))
  const key = new THREE.SpotLight(0xfff1dc, 60, 30, 0.5, 0.6, 1.4)
  key.position.set(-3, 6, 5)
  scene.add(key)
  scene.add(key.target)
  const fill = new THREE.DirectionalLight(0xffffff, 0.9)
  fill.position.set(2, 2, 6)
  scene.add(fill)
  const rimA = new THREE.PointLight(0xff8a3d, 30, 12, 1.6)
  rimA.position.set(-2.4, 2.2, -1.6)
  scene.add(rimA)
  const rimB = new THREE.PointLight(0xffd000, 26, 12, 1.6)
  rimB.position.set(2.4, 1.2, -1.4)
  scene.add(rimB)

  // chão escuro e meio transparente (deixa o reflexo aparecer)
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x07070a, roughness: 0.28, metalness: 0.7, transparent: true, opacity: 0.82 })
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.0
  scene.add(floor)

  const panel = makePanel(THREE, 1)
  const mirror = makePanel(THREE, 1, true)
  scene.add(panel.group)
  scene.add(mirror.group)

  // feixe de luz de cima
  const beamMat = new THREE.MeshBasicMaterial({ map: beamTexture(THREE), color: 0xffd9a0, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 9, 32, 1, true), beamMat)
  beam.position.set(0, 5.5, -0.4)
  scene.add(beam)

  // poeira de luz
  const N = 260
  const pts = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    pts[i * 3] = (Math.random() - 0.5) * 9
    pts[i * 3 + 1] = Math.random() * 7
    pts[i * 3 + 2] = (Math.random() - 0.5) * 7 - 1
  }
  const dg = new THREE.BufferGeometry()
  dg.setAttribute('position', new THREE.BufferAttribute(pts, 3))
  const dustMat = new THREE.PointsMaterial({ size: 0.07, map: softSprite(THREE), color: 0xffc27a, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })
  const dust = new THREE.Points(dg, dustMat)
  scene.add(dust)

  return { THREE, renderer, scene, camera, panel, mirror, rimA, rimB, key, beam, beamMat, dust, dustMat, floorMat, textures: new WeakMap(), current: null }
}

function setPhoto(s: Stage, img: CanvasImageSource | undefined) {
  const key = (img as object) ?? null
  if (s.current === key) return
  s.current = key
  const { THREE } = s
  let tex: THREE_NS.Texture | undefined
  let aspect = 1
  if (img) {
    tex = s.textures.get(img as object)
    if (!tex) {
      tex = new THREE.Texture(img as HTMLImageElement)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 4
      tex.needsUpdate = true
      s.textures.set(img as object, tex)
    }
    const i = img as { naturalWidth?: number; width?: number; naturalHeight?: number; height?: number }
    aspect = (i.naturalWidth || Number(i.width) || 1) / (i.naturalHeight || Number(i.height) || 1)
  }
  aspect = Math.max(0.6, Math.min(1.25, aspect))
  for (const which of ['panel', 'mirror'] as const) {
    const old = s[which]
    if (Math.abs(old.aspect - aspect) > 0.01) {
      s.scene.remove(old.group)
      old.group.traverse((o) => {
        const m = o as THREE_NS.Mesh
        m.geometry?.dispose?.()
      })
      s[which] = makePanel(THREE, aspect, which === 'mirror')
      s.scene.add(s[which].group)
    }
    s[which].mat.map = tex ?? null
    s[which].mat.color.set(tex ? 0xffffff : 0x2a2d36)
    s[which].mat.needsUpdate = true
  }
}

/* ---------- câmera e painel por tipo de cena ---------- */
type Pose = { cam: [number, number, number]; look: [number, number, number]; pos: [number, number, number]; rot: [number, number, number]; scale: number }
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3)
const easeIO = (x: number) => {
  const k = Math.min(1, Math.max(0, x))
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
}

function pose(tipo: CenaTipo, lt: number, d: number, n: number): Pose {
  const k = Math.min(1, lt / d)
  const e = ease(lt / 0.9)
  const side = n % 2 === 0 ? 1 : -1
  switch (tipo) {
    case 'gancho': {
      // a câmera vem voando de perto e o painel gira entrando
      const z = lerp(3.4, 7.6, ease(lt / 1.2)) + k * 0.4
      return { cam: [lerp(-1.2, 0.3, e), lerp(1.0, 1.7, e), z], look: [0, 1.05, 0], pos: [0, 1.75, 0], rot: [0.05, lerp(-0.9, -0.12, ease(lt / 1.1)) + k * 0.12, 0], scale: 0.85 }
    }
    case 'produto': {
      // volta lenta em volta do produto
      const a = lerp(-0.45, 0.45, easeIO(k))
      const r = 7.4 - e * 0.4
      return { cam: [Math.sin(a) * r, 1.9 + Math.sin(k * Math.PI) * 0.25, Math.cos(a) * r], look: [0, 1.4, 0], pos: [0, 2.0 + Math.sin(lt * 1.2) * 0.04, 0], rot: [0, 0, 0], scale: 0.88 }
    }
    case 'beneficio': {
      return { cam: [side * lerp(1.4, 0.5, e), 2.4, lerp(8.2, 7.6, k)], look: [0, 2.15, 0], pos: [side * 0.18, 2.55 + Math.sin(lt * 1.3) * 0.05, 0], rot: [0.04, side * lerp(0.75, 0.32, e) - side * k * 0.08, side * -0.02], scale: 0.78 }
    }
    case 'prova': {
      return { cam: [lerp(-0.8, 0.4, easeIO(k)), 2.3, 7.9], look: [0, 2.2, 0], pos: [-0.32, 2.5, 0], rot: [0.03, lerp(0.55, 0.25, e), 0.02], scale: 0.72 }
    }
    case 'oferta': {
      // painel girando 360 em cima, mostrando os dois lados
      return { cam: [0, 2.6, 8.4 - k * 0.3], look: [0, 2.45, 0], pos: [0, 2.95, 0], rot: [0.06, lerp(-Math.PI * 1.1, 0, ease(lt / 1.6)) + Math.sin(lt) * 0.06, 0], scale: 0.62 }
    }
    default: {
      // cta: o painel sobe e fica pequeno, dando espaço pro botão
      return { cam: [0, 2.6, lerp(7, 8.6, ease(lt / 1.2))], look: [0, 2.6, 0], pos: [0, lerp(1.9, 3.45, ease(lt / 1.1)), 0], rot: [0, lerp(0.2, 0, e) + Math.sin(lt * 0.9) * 0.08, 0], scale: lerp(0.9, 0.55, ease(lt / 1.1)) }
    }
  }
}

function hex(c: string) {
  const n = parseInt(c.replace('#', '').slice(0, 6), 16)
  return Number.isNaN(n) ? 0xff8a3d : n
}

/**
 * Desenha o 3D do momento e devolve o canvas pronto pra colar no quadro.
 * Retorna null se o 3D ainda não carregou (aí o quadro usa o modo 2D).
 */
export type Render3D = { canvas: HTMLCanvasElement; x: number; y: number; r: number }
export function render3D(o: { tipo: CenaTipo; lt: number; d: number; n: number; t: number; foto?: CanvasImageSource; a: string; b: string; intro: number }): Render3D | null {
  const s = stage
  if (!s) return null
  setPhoto(s, o.foto)
  const p = pose(o.tipo, o.lt, o.d, o.n)
  s.camera.position.set(...p.cam)
  s.camera.lookAt(...p.look)
  // o painel aparece crescendo no começo de cada cena
  const pop = 0.82 + 0.18 * ease(o.intro)
  for (const which of ['panel', 'mirror'] as const) {
    const g = s[which].group
    g.scale.setScalar(p.scale * pop)
    g.rotation.set(...p.rot)
    if (which === 'panel') g.position.set(...p.pos)
    else {
      g.position.set(p.pos[0], -p.pos[1], p.pos[2])
      g.rotation.set(-p.rot[0], p.rot[1], -p.rot[2])
      g.scale.set(p.scale * pop, -p.scale * pop, p.scale * pop)
    }
  }
  // luzes acompanham as cores da marca e se mexem
  s.rimA.color.setHex(hex(o.a))
  s.rimB.color.setHex(hex(o.b))
  s.rimA.position.set(-2.4 + Math.sin(o.t * 0.7) * 0.8, 2.6 + Math.cos(o.t * 0.5) * 0.4, -1.4)
  s.rimB.position.set(2.4 + Math.cos(o.t * 0.6) * 0.8, 1.6, -1.2)
  s.key.target.position.set(p.pos[0], p.pos[1], 0)
  s.key.intensity = 55 + Math.sin(o.t * 1.3) * 6
  s.beam.position.x = p.pos[0]
  s.beam.position.y = p.pos[1] + 4.2
  s.beamMat.color.setHex(hex(o.a)).lerp(new s.THREE.Color(0xffffff), 0.55)
  s.beamMat.opacity = 0.22 + Math.sin(o.t * 0.8) * 0.05
  s.dust.rotation.y = o.t * 0.04
  s.dust.position.y = -((o.t * 0.12) % 1)
  s.dustMat.color.setHex(hex(o.a)).lerp(new s.THREE.Color(0xffffff), 0.35)
  s.renderer.render(s.scene, s.camera)
  // onde o painel caiu na tela (pra luz e brilho em 2D)
  s.camera.updateMatrixWorld()
  const c = new s.THREE.Vector3(...p.pos).project(s.camera)
  const top = new s.THREE.Vector3(p.pos[0], p.pos[1] + 1.1 * p.scale * pop, p.pos[2]).project(s.camera)
  return { canvas: s.renderer.domElement, x: ((c.x + 1) / 2) * 1080, y: ((1 - c.y) / 2) * 1920, r: Math.abs(top.y - c.y) * 960 }
}
