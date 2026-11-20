// Filme de exemplo feito à mão no mesmo motor (decant de perfume, dourado e verde-escuro).
// Serve de demonstração na prévia e de referência de qualidade pro Claude.
import type { Filme } from './film'

const fios = String.raw`
// Fios dourados se desenhando no escuro + manchete revelada letra por letra
const P = S.colors
const fios = []
for (let i = 0; i < 6; i++) {
  fios.push({
    a: [S.rand(i) * 1080, -100 + S.rand(i + 9) * 300],
    b: [S.rand(i + 1) * 1400 - 200, 500 + S.rand(i + 2) * 600],
    c: [S.rand(i + 3) * 1400 - 200, 900 + S.rand(i + 4) * 600],
    d: [S.rand(i + 5) * 1080, 2000],
    cor: i % 3 === 2 ? P[1] : P[0],
    w: 2 + S.rand(i + 7) * 3,
    atraso: i * 0.12,
  })
}
function bez(f, k) {
  const u = 1 - k
  return [
    u*u*u*f.a[0] + 3*u*u*k*f.b[0] + 3*u*k*k*f.c[0] + k*k*k*f.d[0],
    u*u*u*f.a[1] + 3*u*u*k*f.b[1] + 3*u*k*k*f.c[1] + k*k*k*f.d[1],
  ]
}
return function (ctx, t, p, d) {
  ctx.fillStyle = '#050605'
  ctx.fillRect(0, 0, S.W, S.H)
  const halo = ctx.createRadialGradient(540, 820, 0, 540, 820, 900)
  halo.addColorStop(0, S.hexA(P[1], 0.22))
  halo.addColorStop(1, S.hexA(P[1], 0))
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, S.W, S.H)
  // bokeh
  for (let i = 0; i < 40; i++) {
    const x = S.rand(i * 3.1) * 1080 + Math.sin(t * 0.6 + i) * 20
    const y = S.rand(i * 7.7) * 1920 - t * (10 + S.rand(i) * 30)
    const r = 4 + S.rand(i * 1.3) * 14
    ctx.fillStyle = S.hexA(i % 4 ? P[0] : '#ffffff', 0.05 + S.rand(i * 2.1) * 0.12)
    ctx.beginPath(); ctx.arc(x, ((y % 1920) + 1920) % 1920, r, 0, Math.PI * 2); ctx.fill()
  }
  // fios se desenhando
  ctx.lineCap = 'round'
  for (const f of fios) {
    const k = S.prog(t, f.atraso, f.atraso + 2.2, S.ease.inOut)
    if (k <= 0) continue
    ctx.strokeStyle = f.cor
    ctx.lineWidth = f.w
    ctx.shadowColor = f.cor
    ctx.shadowBlur = 18
    ctx.beginPath()
    for (let j = 0; j <= 60; j++) {
      const q = (j / 60) * k
      const pt = bez(f, q)
      if (j === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1])
    }
    ctx.stroke()
    // ponta brilhando
    const tip = bez(f, k)
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.arc(tip[0], tip[1], f.w * 1.6, 0, Math.PI * 2); ctx.fill()
  }
  ctx.shadowBlur = 0
  // manchete
  const linhas = [['CHEIRO DE', 'Barlow Condensed', 110, '#ffffff'], ['perfume caro', 'Instrument Serif', 150, P[0]], ['PAGANDO POUCO?', 'Barlow Condensed', 132, '#ffffff']]
  let y = 760
  linhas.forEach(function (l, li) {
    const ini = 0.7 + li * 0.35
    const k = S.prog(t, ini, ini + 0.7, S.ease.out)
    ctx.save()
    ctx.globalAlpha = k
    ctx.textAlign = 'center'
    ctx.font = (l[1] === 'Instrument Serif' ? 'italic 400 ' : '800 ') + l[2] + 'px "' + l[1] + '"'
    try { ctx.letterSpacing = ((1 - k) * 30) + 'px' } catch (e) {}
    if (l[3] !== '#ffffff') {
      const g = ctx.createLinearGradient(0, y - l[2], 0, y)
      g.addColorStop(0, '#fff6d2'); g.addColorStop(0.5, l[3]); g.addColorStop(1, S.hexA(l[3], 0.75))
      ctx.fillStyle = g
      ctx.shadowColor = S.hexA(l[3], 0.6); ctx.shadowBlur = 30
    } else ctx.fillStyle = '#ffffff'
    ctx.fillText(l[0], 540, y + (1 - k) * 40)
    ctx.restore()
    y += l[2] * 1.02
  })
  // fade de saída
  const out = S.prog(t, d - 0.4, d)
  if (out > 0) { ctx.fillStyle = 'rgba(0,0,0,' + out * 0.6 + ')'; ctx.fillRect(0, 0, S.W, S.H) }
}
`

const pedestal = String.raw`
// O frasco num painel de vidro girando sobre um pedestal com anel de luz, câmera chegando perto
const T = THREE
const P = S.colors
const scene = new T.Scene()
scene.fog = new T.Fog(0x050605, 8, 20)
const cam = new T.PerspectiveCamera(32, S.W / S.H, 0.1, 50)
scene.add(new T.AmbientLight(0xffffff, 0.25))
const key = new T.SpotLight(0xfff0d8, 80, 25, 0.45, 0.6, 1.2)
key.position.set(0, 8, 3); scene.add(key); scene.add(key.target)
const rim = new T.PointLight(new T.Color(P[0]), 25, 10); rim.position.set(-2, 2.5, -1.5); scene.add(rim)
const rim2 = new T.PointLight(new T.Color(P[1]), 18, 10); rim2.position.set(2, 1.5, -1); scene.add(rim2)
// pedestal
const ped = new T.Mesh(new T.CylinderGeometry(1.25, 1.35, 0.32, 64), new T.MeshStandardMaterial({ color: 0x0b0b0b, metalness: 0.8, roughness: 0.3 }))
ped.position.y = 0.16; scene.add(ped)
const anel = new T.Mesh(new T.TorusGeometry(1.3, 0.015, 8, 128), new T.MeshBasicMaterial({ color: new T.Color(P[0]) }))
anel.rotation.x = Math.PI / 2; anel.position.y = 0.33; scene.add(anel)
const chao = new T.Mesh(new T.CircleGeometry(12, 64), new T.MeshStandardMaterial({ color: 0x060706, metalness: 0.6, roughness: 0.4 }))
chao.rotation.x = -Math.PI / 2; scene.add(chao)
// painel com a foto
const tex = S.texture(0)
const img = S.photo(0)
const asp = img ? img.width / img.height : 0.8
const h = 2.1, w = Math.min(1.7, h * asp)
const painel = new T.Group()
const vidro = new T.Mesh(new T.BoxGeometry(w + 0.08, h + 0.08, 0.06), new T.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.15 }))
painel.add(vidro)
const foto = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: tex, roughness: 0.4 }))
foto.position.z = 0.032; painel.add(foto)
painel.position.y = 0.33 + h / 2 + 0.05
scene.add(painel)
// poeira de luz
const N = 200, pos = new Float32Array(N * 3)
for (let i = 0; i < N; i++) { pos[i*3] = (S.rand(i) - 0.5) * 7; pos[i*3+1] = S.rand(i + 0.5) * 5; pos[i*3+2] = (S.rand(i + 0.7) - 0.5) * 5 }
const pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pos, 3))
const pts = new T.Points(pg, new T.PointsMaterial({ color: new T.Color(P[0]), size: 0.035, transparent: true, opacity: 0.8 }))
scene.add(pts)
return function (ctx, t, p, d) {
  ctx.fillStyle = '#050605'; ctx.fillRect(0, 0, S.W, S.H)
  const lg = ctx.createRadialGradient(540, 700, 0, 540, 700, 1000)
  lg.addColorStop(0, S.hexA(P[1], 0.35)); lg.addColorStop(1, S.hexA(P[1], 0))
  ctx.fillStyle = lg; ctx.fillRect(0, 0, S.W, S.H)
  const k = S.ease.inOut(p)
  cam.position.set(Math.sin(k * 0.8 - 0.4) * 8.5, 2.2 + k * 0.3, Math.cos(k * 0.8 - 0.4) * 8.5 - k * 1.4)
  cam.lookAt(0, 1.35, 0)
  painel.rotation.y = -0.6 + S.ease.out(t / 2) * 0.6 + Math.sin(t * 0.8) * 0.06
  anel.material.color.set(P[0]).multiplyScalar(1 + Math.sin(t * 3) * 0.3)
  pts.position.y = -(t * 0.15) % 1
  key.target.position.set(0, 1.4, 0)
  S.render3D(ctx, scene, cam)
  // textos
  const a = S.prog(t, 0.6, 1.3)
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'
  ctx.font = '500 26px "JetBrains Mono"'
  try { ctx.letterSpacing = '10px' } catch (e) {}
  ctx.fillStyle = P[0]
  ctx.fillText('ORIGINAL • LACRADO', 540, 300)
  ctx.restore()
  const b = S.prog(t, 1.1, 1.9)
  ctx.save(); ctx.globalAlpha = b; ctx.textAlign = 'center'
  ctx.font = 'italic 400 120px "Instrument Serif"'; ctx.fillStyle = '#fff'
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20
  ctx.fillText('o seu perfume', 540, 1430 + (1 - b) * 30)
  ctx.font = '800 108px "Barlow Condensed"'
  const g = ctx.createLinearGradient(0, 1470, 0, 1570)
  g.addColorStop(0, '#fff3c4'); g.addColorStop(0.55, P[0]); g.addColorStop(1, S.hexA(P[0], 0.8))
  ctx.fillStyle = g
  ctx.fillText('EM TAMANHO DE BOLSO', 540, 1555 + (1 - b) * 30)
  ctx.restore()
}
`

const beneficios = String.raw`
// Foto bem de perto, com a câmera passeando, e três benefícios entrando como etiquetas costuradas
const P = S.colors
const itens = ['Testa antes de comprar o frasco', 'Fixação de perfume original', 'Cabe em qualquer bolsa']
return function (ctx, t, p, d) {
  const img = S.photo(0)
  ctx.fillStyle = '#060706'; ctx.fillRect(0, 0, S.W, S.H)
  if (img) {
    ctx.save()
    ctx.filter = 'brightness(0.55)'
    S.cover(ctx, img, -60, 0, 1200, 1920, 1.6 - p * 0.25, 0.5 + Math.sin(t * 0.4) * 0.08, 0.35)
    ctx.restore()
  }
  const vg = ctx.createLinearGradient(0, 600, 0, 1920)
  vg.addColorStop(0, 'rgba(5,6,5,0)'); vg.addColorStop(0.5, 'rgba(5,6,5,0.85)'); vg.addColorStop(1, 'rgba(5,6,5,0.97)')
  ctx.fillStyle = vg; ctx.fillRect(0, 0, S.W, S.H)
  // título
  const k0 = S.prog(t, 0.2, 0.9)
  ctx.save(); ctx.globalAlpha = k0; ctx.textAlign = 'left'
  ctx.font = '500 24px "JetBrains Mono"'; try { ctx.letterSpacing = '8px' } catch (e) {}
  ctx.fillStyle = P[0]; ctx.fillText('POR QUE DECANT?', 110, 930)
  ctx.restore()
  itens.forEach(function (txt, i) {
    const ini = 0.6 + i * 0.55
    const k = S.prog(t, ini, ini + 0.6, S.ease.back)
    if (k <= 0) return
    const y = 990 + i * 170
    ctx.save()
    ctx.translate((1 - k) * -300, 0); ctx.globalAlpha = Math.min(1, k * 1.5)
    S.roundRect(ctx, 90, y, 900, 136, 28)
    ctx.fillStyle = 'rgba(20,22,20,0.82)'; ctx.fill()
    ctx.strokeStyle = S.hexA(P[0], 0.55); ctx.lineWidth = 2
    ctx.setLineDash([10, 9]); ctx.lineDashOffset = -t * 30; ctx.stroke(); ctx.setLineDash([])
    // número
    ctx.fillStyle = P[0]
    ctx.beginPath(); ctx.arc(170, y + 68, 38, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#0a0a0a'; ctx.textAlign = 'center'; ctx.font = '800 44px "Barlow Condensed"'
    ctx.fillText(String(i + 1), 170, y + 84)
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'
    const s = S.fit(ctx, txt, 720, 50, 'Inter Tight', '800')
    ctx.font = '800 ' + s + 'px "Inter Tight"'
    ctx.fillText(txt, 240, y + 68 + s * 0.35)
    ctx.restore()
  })
}
`

const oferta = String.raw`
// Preço gigante em dourado subindo, raios girando e um selo
const P = S.colors
return function (ctx, t, p, d) {
  ctx.fillStyle = '#050605'; ctx.fillRect(0, 0, S.W, S.H)
  ctx.save(); ctx.translate(540, 900); ctx.rotate(t * 0.18)
  for (let i = 0; i < 24; i++) {
    ctx.rotate(Math.PI * 2 / 24)
    ctx.fillStyle = S.hexA(i % 2 ? P[0] : P[1], 0.06)
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-60, -1300); ctx.lineTo(60, -1300); ctx.closePath(); ctx.fill()
  }
  ctx.restore()
  // foto num círculo com anel girando
  const img = S.photo(0)
  const k = S.prog(t, 0, 0.7, S.ease.back)
  ctx.save(); ctx.translate(540, 640); ctx.scale(k, k)
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 230, 0, Math.PI * 2); ctx.clip()
  if (img) S.cover(ctx, img, -230, -230, 460, 460, 1.15)
  ctx.restore()
  ctx.strokeStyle = P[0]; ctx.lineWidth = 6
  ctx.beginPath(); ctx.arc(0, 0, 252, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * S.prog(t, 0.2, 1.4)); ctx.stroke()
  ctx.setLineDash([4, 14]); ctx.rotate(t * 0.5); ctx.strokeStyle = S.hexA(P[0], 0.6); ctx.lineWidth = 3
  ctx.beginPath(); ctx.arc(0, 0, 285, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
  // preço contando
  const c = S.prog(t, 0.5, 1.6, S.ease.out)
  const v = (39.9 * c).toFixed(2).replace('.', ',')
  ctx.save(); ctx.textAlign = 'center'
  ctx.font = '700 70px "Barlow Condensed"'; ctx.fillStyle = '#fff'; ctx.globalAlpha = S.prog(t, 0.4, 0.9)
  ctx.fillText('POR APENAS', 540, 1080)
  ctx.globalAlpha = 1
  ctx.font = '800 250px "Barlow Condensed"'
  const g = ctx.createLinearGradient(0, 1100, 0, 1340)
  g.addColorStop(0, '#fff6d6'); g.addColorStop(0.45, P[0]); g.addColorStop(0.62, S.hexA(P[0], 0.75)); g.addColorStop(1, '#fff0b0')
  ctx.fillStyle = g; ctx.shadowColor = S.hexA(P[0], 0.55); ctx.shadowBlur = 50
  ctx.fillText('R$ ' + v, 540, 1330)
  ctx.restore()
  // selo
  const s = S.prog(t, 1.4, 1.9, S.ease.back)
  if (s > 0) {
    ctx.save(); ctx.translate(540, 1460); ctx.scale(s, s)
    S.roundRect(ctx, -300, -48, 600, 96, 48); ctx.fillStyle = P[1]; ctx.fill()
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '800 44px "Inter Tight"'
    ctx.fillText('5 ml • pronto pra usar', 0, 15)
    ctx.restore()
  }
}
`

const fechamento = String.raw`
// Cartão final claro, como assinatura de marca: arcos dourados se desenhando em volta do nome
const P = S.colors
return function (ctx, t, p, d) {
  const bg = ctx.createRadialGradient(540, 800, 0, 540, 800, 1300)
  bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#ecece8')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, S.W, S.H)
  const k = S.prog(t, 0, 1.6, S.ease.inOut)
  ctx.lineCap = 'round'
  ;[[P[0], 330, 0], [P[1], 360, 1.9], [P[0], 300, 3.7]].forEach(function (a, i) {
    ctx.strokeStyle = a[0]; ctx.lineWidth = 7 - i * 1.5
    const st = a[2] + t * 0.15
    ctx.beginPath(); ctx.arc(540, 760, a[1], st, st + Math.PI * 1.35 * k); ctx.stroke()
  })
  const m = S.prog(t, 0.5, 1.2, S.ease.back)
  ctx.save(); ctx.translate(540, 760); ctx.scale(m, m); ctx.textAlign = 'center'
  if (S.logo) {
    ctx.save(); ctx.beginPath(); ctx.arc(0, -40, 150, 0, Math.PI * 2); ctx.clip()
    S.cover(ctx, S.logo, -150, -190, 300, 300); ctx.restore()
  } else {
    ctx.font = '800 150px "Barlow Condensed"'; ctx.fillStyle = P[1]
    ctx.fillText((S.marca.nome || 'SUA MARCA').slice(0, 2).toUpperCase(), 0, 10)
  }
  ctx.restore()
  const n = S.prog(t, 0.9, 1.5)
  ctx.save(); ctx.globalAlpha = n; ctx.textAlign = 'center'
  ctx.font = '800 78px "Barlow Condensed"'
  const g = ctx.createLinearGradient(0, 1100, 0, 1180); g.addColorStop(0, P[0]); g.addColorStop(1, S.hexA(P[0], 0.7))
  ctx.fillStyle = g; ctx.fillText((S.marca.nome || 'Sua marca').toUpperCase(), 540, 1200)
  ctx.fillStyle = P[1]; ctx.fillRect(540 - 180 * n, 1235, 360 * n, 3)
  ctx.font = '700 34px "Inter Tight"'; try { ctx.letterSpacing = '6px' } catch (e) {}
  ctx.fillStyle = '#2a2a2a'; ctx.fillText('PERFUME ORIGINAL. PREÇO JUSTO.', 540, 1300)
  ctx.restore()
  const b = S.prog(t, 1.4, 2, S.ease.back)
  if (b > 0) {
    ctx.save(); ctx.translate(540, 1440); const pulse = 1 + Math.sin(t * 5) * 0.02; ctx.scale(b * pulse, b * pulse)
    S.roundRect(ctx, -330, -66, 660, 132, 66); ctx.fillStyle = '#1faa59'; ctx.shadowColor = 'rgba(31,170,89,0.45)'; ctx.shadowBlur = 40; ctx.fill()
    ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '800 54px "Barlow Condensed"'
    ctx.fillText((S.marca.chamada || 'CHAMA NO WHATSAPP').toUpperCase(), 0, 18)
    ctx.restore()
  }
}
`

export const FILME_EXEMPLO: Filme = {
  titulo: 'Decant de perfume original',
  conceito: 'Fios dourados costurando a história: do luxo inacessível ao perfume original em tamanho de bolso.',
  legenda: 'Perfume original em tamanho de bolso. Chama no WhatsApp e garanta o seu!',
  paleta: ['#d9a441', '#0f5132', '#f5e6c8'],
  trilha: 'luxo',
  cenas: [
    { titulo: 'Gancho', descricao: 'Fios dourados se desenhando e a pergunta que prende.', code: fios, dur: 4.2, transicao: 'corte', texto: 'Cheiro de perfume caro pagando pouco?' },
    { titulo: 'Revelação', descricao: 'O frasco num pedestal com anel de luz, câmera chegando perto.', code: pedestal, dur: 5.5, transicao: 'zoom', texto: 'O seu perfume em tamanho de bolso' },
    { titulo: 'Por que decant', descricao: 'Foto de perto e três benefícios entrando.', code: beneficios, dur: 5.2, transicao: 'deslize', texto: 'Testa antes de comprar o frasco' },
    { titulo: 'Oferta', descricao: 'Preço subindo em dourado, com raios e selo.', code: oferta, dur: 4.6, transicao: 'flash', texto: 'R$ 39,90' },
    { titulo: 'Assinatura', descricao: 'Cartão final claro com a marca e o botão do WhatsApp.', code: fechamento, dur: 5, transicao: 'fade', texto: 'Chama no WhatsApp' },
  ],
}

// os códigos, pra mostrar ao Claude como referência de nível
export const EXEMPLO_CODIGO = { fios, pedestal, beneficios, oferta, fechamento }
