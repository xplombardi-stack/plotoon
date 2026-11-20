// Diretor de vídeo com IA: nada de modelo pronto. O Claude olha as fotos, cria o conceito e a oferta,
// e escreve o código de cada cena do zero (2D + 3D). O vídeo é montado e gravado no navegador.
//  etapa "plano": cobra os créditos, vê as fotos e devolve o roteiro do filme (cenas, paleta, textos)
//  etapa "cena":  escreve (ou conserta / ajusta) o código de uma cena
// Precisa do segredo ANTHROPIC_API_KEY.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const MODEL = "claude-sonnet-5-5";
const TRANSICOES = ["corte", "fade", "zoom", "flash", "deslize"];
const TRILHAS = ["luxo", "animada", "suave"];
const TONS: Record<string, string> = {
  amigavel: "amigável e próximo",
  divertido: "divertido e cheio de energia",
  profissional: "profissional e direto",
  luxo: "sofisticado e premium",
  urgente: "vendedor, com chamada forte pra ação",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function claudeText(key: string, body: Record<string, unknown>) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, ...body }),
  });
  if (!res.ok) throw new Error(`anthropic_${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = ((data.content ?? []) as Array<Record<string, unknown>>)
    .filter((b) => b.type === "text")
    .map((b) => String(b.text))
    .join("\n");
  if (data.stop_reason !== "end_turn") console.error("parou por:", data.stop_reason, "tamanho:", text.length, JSON.stringify(data.usage ?? {}));
  // resposta cortada no meio: código incompleto não serve
  if (data.stop_reason === "max_tokens") throw new Error("resposta_cortada");
  return text;
}

// pega o primeiro objeto JSON do texto
function parseJson(txt: string): Record<string, unknown> | null {
  const bloco = txt.match(/```(?:json)?\s*([\s\S]*?)```/);
  const fonte = bloco ? bloco[1] : txt;
  const a = fonte.indexOf("{");
  const b = fonte.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(fonte.slice(a, b + 1));
  } catch {
    return null;
  }
}

// pega o código do bloco ```js (com ou sem o fechamento)
function parseCode(txt: string) {
  const m = txt.match(/```(?:js|javascript)?[ \t]*\n([\s\S]*?)\n?```/);
  let code = m ? m[1] : txt.replace(/^[\s\S]*?```(?:js|javascript)?[ \t]*\n/, "");
  code = code.replace(/```\s*$/, "");
  return code.trim();
}

/* ---------------- etapa 1: o plano do filme ---------------- */
function planoSystem(neg: Record<string, unknown> | null, duracao: number, cores: string[] | null) {
  const p = neg ?? {};
  return `Você é diretor de criação de uma produtora de filmes publicitários premium (motion design + 3D), especialista em Reels e Stories que vendem.
Vai criar um filme vertical 9:16 de ${duracao} segundos, 100% original pra esse negócio. Nada de modelo pronto: cada filme tem conceito próprio, um fio condutor visual que liga as cenas (ex.: fios dourados costurando a história de uma confecção, gotas formando o frasco de um perfume, o vapor virando o logo de uma cafeteria), cenas que constroem a história do produto e um fechamento de marca.

Negócio: ${p.name || "não informado"} | Nicho: ${p.niche || "não informado"} | Vende: ${p.sells || "não informado"} | Público: ${p.audience || "não informado"} | Tom: ${TONS[String(p.tone)] ?? "amigável"}.

Como pensar:
- Olhe as fotos com atenção: o produto é o herói. Descreva em "produto_visual" exatamente como ele é.
- Monte a oferta com o que a pessoa informou (preço, condição, chamada). Não invente preço, desconto, prazo, garantia, número de clientes ou prêmio.
- Estrutura que funciona: gancho forte nos 2 primeiros segundos, revelação do produto, 1 a 3 cenas de valor (benefício, como é feito, prova de qualidade), oferta (se houver), fechamento de marca com chamada pra ação.
- Pense como um filme: cenas variadas entre si (3D com câmera passeando, tipografia cinética gigante, close na foto com luz, objetos do universo do produto modelados em 3D simples, partículas, linhas de luz). Evite duas cenas com a mesma composição.
- O produto aparece sempre pela FOTO real (em painel, moldura, cartão, recorte com luz), nunca remodelado em 3D. O 3D é pro universo em volta: pedestal, anéis de luz, gotas, fios, partículas, formas abstratas, feitos com formas simples (caixas, cilindros, esferas, toros, curvas). Nada que dependa de modelo 3D complexo pronto.
- Em cada cena, deixe claro onde fica o texto (faixa de cima ou de baixo) e onde fica o objeto (meio da tela), sem um cobrir o outro.
- Texto na tela: curto, forte, português correto com acentos.
- ${cores?.length ? `Paleta OBRIGATÓRIA, exatamente estas cores: ${cores.join(", ")}. Use-as na paleta nessa ordem.` : "Escolha uma paleta de 2 ou 3 cores que combine com o produto e o nicho e fique premium."}
- A soma das durações das cenas tem que dar ${duracao} segundos.
- Nada de conteúdo adulto, apostas, cassino ou promessa de saúde/resultado garantido.

Responda SÓ com um JSON válido (sem texto antes ou depois), neste formato:
{"titulo": "nome curto", "conceito": "a grande ideia visual em 1-2 frases", "produto_visual": "como o produto é nas fotos: forma, cores, material, detalhes", "paleta": ["#rrggbb", "#rrggbb"], "trilha": "luxo|animada|suave", "legenda": "legenda do post com chamada e até 3 hashtags", "cenas": [{"titulo": "nome curto", "visual": "direção de arte e animação bem detalhada, 60 a 140 palavras: fundo, objetos 2D/3D, como a foto aparece, câmera, luz, partículas, tipografia, o que entra e quando", "texto": "texto exato na tela, até 8 palavras", "duracao": 4.5, "transicao": "corte|fade|zoom|flash|deslize"}]}
De 4 a 7 cenas.`;
}

/* ---------------- etapa 2: o código de cada cena ---------------- */
const API = `Você escreve o código de UMA cena de um filme vertical 1080x1920, em JavaScript puro, que roda num motor próprio (Canvas 2D + Three.js r170).

O código é o CORPO de uma função que recebe (S, THREE). Na parte de cima você prepara o que precisa (objetos 3D, materiais, dados) e no fim faz:
  return function (ctx, t, p, d) { ... desenha o quadro ... }
- ctx: OffscreenCanvasRenderingContext2D em coordenadas lógicas 1080x1920 (já escalado; desenhe sempre como se fosse 1080x1920).
- t: segundos desde o começo da cena (0 até d, e um pouco além durante a transição). p: progresso 0..1. d: duração.
- O quadro precisa ser função só de t (o vídeo é pulado pra frente e pra trás): nada de estado que acumula entre quadros, nada de Math.random dentro do quadro (use S.rand(seed)). Pode criar objetos 3D uma vez na preparação e só mudar posição/rotação no quadro.
- Desenhe o quadro inteiro, inclusive o fundo (pinte o fundo primeiro). Fica tudo opaco.

O que existe em S:
- S.W=1080, S.H=1920. S.SAFE = {top:250, bottom:1570, left:80, right:1000}: textos e coisas importantes DENTRO dessa área (o Reels cobre as bordas).
- S.colors: a paleta (array de hex). Use essas cores de verdade.
- S.marca = {nome, arroba, whatsapp, chamada}. S.logo: ImageBitmap da logo ou null.
- S.photos: array de ImageBitmap com as fotos do produto. S.photo(i) devolve a foto i (circular). S.texture(i): THREE.Texture pronta (sRGB) da foto i. S.logoTexture().
- S.render3D(ctx, scene, camera): renderiza a cena Three.js e cola no quadro inteiro, com fundo transparente (o que você desenhou antes no ctx aparece atrás). Use câmera com aspect S.W/S.H. Pode chamar mais de uma vez e desenhar 2D por cima depois.
- S.toScreen(vector3, camera) => {x, y}: onde um ponto 3D aparece na tela (pra posicionar texto, brilho ou seta perto do objeto).
- S.distPara(camera, alturaDoObjeto, fracao) => distância da câmera pra o objeto ocupar essa fração da altura da tela (ex.: 0.38). Use pra enquadrar certo, sem objeto gigante.
- S.renderer: o WebGLRenderer (já com ACES e sombras ligadas) se quiser mexer em algo.
- Fontes carregadas (use exatamente estes nomes entre aspas no ctx.font): "Barlow Condensed" (700, 800; manchete condensada), "Inter Tight" (400, 600, 800), "Instrument Serif" (400 normal e italic; elegante), "JetBrains Mono" (500; rótulos técnicos), "Unbounded" (800; display forte e arredondado), "Sora" (400, 700). S.fonts tem esses nomes.
- Ajudantes: S.ease.out/in/inOut/back/elastic/expo(x), S.prog(t, a, b, ease?) => 0..1 eased entre os segundos a e b, S.clamp, S.lerp, S.rand(seed) => 0..1 fixo, S.noise(x, y), S.hexA(hex, alpha) => 'rgba(...)', S.roundRect(ctx,x,y,w,h,r) (só o caminho), S.cover(ctx, img, x, y, w, h, zoom=1, focoX=0.5, focoY=0.5), S.wrap(ctx, texto, larguraMax) => linhas, S.fit(ctx, texto, larguraMax, tamanho, fonte, peso) => tamanho que cabe.
- Também existem ctx.letterSpacing, ctx.filter ('blur(8px)', 'brightness()' etc.), sombras, gradientes, globalCompositeOperation ('lighter', 'screen'...).
- Não existe: document, window, fetch, imagens externas, setTimeout, requestAnimationFrame. Nada de importar nada. Tudo que precisar, desenhe ou modele.

Padrão de qualidade (isso é um comercial premium, não um slide):
- Profundidade: luz de fundo (gradientes radiais), partículas/bokeh, vinheta, sombras, brilhos que passam, desfoque em camadas.
- Movimento o tempo todo: câmera 3D passeando (dolly, órbita lenta), parallax, nada parado. Entradas com easing (S.ease.out/back), nunca linear.
- Tipografia cinética: letras ou palavras entrando com espaçamento fechando, máscaras, sublinhados se desenhando, contadores subindo. Hierarquia forte: 1 ou 2 palavras gigantes.
- 3D quando fizer sentido: modele o universo do produto com formas simples e materiais bons (MeshStandardMaterial/MeshPhysicalMaterial com metalness/roughness/clearcoat, emissive pra brilho), luzes de recorte coloridas com a paleta, chão reflexivo, pedestal com anel de luz, a foto do produto como textura num painel/cartão/caixa.
- A foto do produto é sagrada: mostre bonita, com luz, nunca esticada (use S.cover ou respeite a proporção photo.width/photo.height).
- Enquadramento (siga à risca): o objeto/foto principal fica no meio, entre y≈480 e y≈1250, e no máximo ~70% da largura (até ~760px). Texto principal fica numa faixa só dele: em cima (y 280 a 460) ou embaixo (y 1300 a 1560), nunca por cima do objeto. Confira com S.toScreen onde o objeto cai na tela.
- Texto sempre legível: cor com contraste forte com o que está atrás (claro sobre escuro), sombra ou faixa escura suave atrás.
- O produto em si aparece pela FOTO real (S.photo / S.texture): em painel, cartão, moldura, recorte com luz. Não tente remodelar o produto em 3D com caixas (fica falso e barato). Em 3D, modele só o universo em volta: pedestal, anéis de luz, gotas, fios, partículas, formas abstratas da marca.
- Chão 3D: nada de plano infinito que vira uma faixa/horizonte duro. Use um disco que some nas bordas, ou fog exatamente da cor do fundo, ou só o reflexo/sombra.
- Saídas: nos últimos ~0,3 s a cena pode começar a sair (o motor faz a transição pra próxima).
- Português correto, com acentos. Use o texto da cena que foi pedido.
- Código enxuto e sem erro: NO MÁXIMO 170 linhas, sem comentários longos (o código é cortado se passar disso). Teste mentalmente: nada de variável não declarada, nada de propriedade inexistente do Three r170.`;

function cenaSystem(exemplo: string) {
  return `${API}

Exemplo de cena bem feita nesse motor (só pra mostrar o nível e o jeito de usar a API; NÃO copie, crie a sua):
\`\`\`js
${exemplo}
\`\`\`

Responda com o código dentro de um único bloco \`\`\`js (só o corpo da função, terminando com return function (ctx, t, p, d) { ... }). Nada além do bloco.`;
}

const EXEMPLO = String.raw`const T = THREE
const P = S.colors
const scene = new T.Scene()
scene.fog = new T.Fog(0x050605, 9, 22)
const cam = new T.PerspectiveCamera(32, S.W / S.H, 0.1, 50)
scene.add(new T.AmbientLight(0xffffff, 0.25))
const key = new T.SpotLight(0xfff0d8, 80, 25, 0.45, 0.6, 1.2)
key.position.set(0, 8, 3); scene.add(key); scene.add(key.target)
const rim = new T.PointLight(new T.Color(P[0]), 25, 10); rim.position.set(-2, 2.5, -1.5); scene.add(rim)
const ped = new T.Mesh(new T.CylinderGeometry(1.25, 1.35, 0.32, 64), new T.MeshStandardMaterial({ color: 0x0b0b0b, metalness: 0.8, roughness: 0.3 }))
ped.position.y = 0.16; scene.add(ped)
const anel = new T.Mesh(new T.TorusGeometry(1.3, 0.015, 8, 128), new T.MeshBasicMaterial({ color: new T.Color(P[0]) }))
anel.rotation.x = Math.PI / 2; anel.position.y = 0.33; scene.add(anel)
const img = S.photo(0)
const asp = img ? img.width / img.height : 0.8
const h = 2.1, w = Math.min(1.7, h * asp)
const painel = new T.Group()
painel.add(new T.Mesh(new T.BoxGeometry(w + 0.08, h + 0.08, 0.06), new T.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.15 })))
const foto = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: S.texture(0), roughness: 0.4 }))
foto.position.z = 0.032; painel.add(foto)
painel.position.y = 0.38 + h / 2; scene.add(painel)
return function (ctx, t, p, d) {
  ctx.fillStyle = '#050605'; ctx.fillRect(0, 0, S.W, S.H)
  const lg = ctx.createRadialGradient(540, 760, 0, 540, 760, 1000)
  lg.addColorStop(0, S.hexA(P[1], 0.35)); lg.addColorStop(1, S.hexA(P[1], 0))
  ctx.fillStyle = lg; ctx.fillRect(0, 0, S.W, S.H)
  const k = S.ease.inOut(p)
  cam.position.set(Math.sin(k * 0.8 - 0.4) * 8.5, 2.2 + k * 0.3, Math.cos(k * 0.8 - 0.4) * 8.5 - k * 1.4)
  cam.lookAt(0, 1.3, 0)
  painel.rotation.y = -0.6 + S.ease.out(t / 2) * 0.6 + Math.sin(t * 0.8) * 0.06
  key.target.position.set(0, 1.4, 0)
  S.render3D(ctx, scene, cam)
  const b = S.prog(t, 1.1, 1.9)
  ctx.save(); ctx.globalAlpha = b; ctx.textAlign = 'center'
  ctx.font = 'italic 400 120px "Instrument Serif"'; ctx.fillStyle = '#fff'
  ctx.fillText('o seu perfume', 540, 1430 + (1 - b) * 30)
  ctx.font = '800 108px "Barlow Condensed"'
  const g = ctx.createLinearGradient(0, 1470, 0, 1570)
  g.addColorStop(0, '#fff3c4'); g.addColorStop(0.55, P[0]); g.addColorStop(1, S.hexA(P[0], 0.8))
  ctx.fillStyle = g
  ctx.fillText('EM TAMANHO DE BOLSO', 540, 1555 + (1 - b) * 30)
  ctx.restore()
}`;

const HEX = /^#[0-9a-fA-F]{6}$/;
// às vezes a lista vem como texto JSON dentro da ferramenta
function arr<T = unknown>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === "string") {
    try {
      const j = JSON.parse(v);
      return Array.isArray(j) ? (j as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "metodo" }, 405);
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "sem_chave" }, 503);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: who } = await admin.auth.getUser(token);
  const user = who?.user;
  if (!user) return json({ error: "nao_autenticado" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "corpo_invalido" }, 400);
  }
  const { data: precos } = await admin.from("settings").select("key, value").in("key", ["credits_per_custom_video", "credits_per_scene_fix"]);
  const preco = Object.fromEntries((precos ?? []).map((r) => [r.key, Number(r.value)]));

  /* ---------- PLANO ---------- */
  if (body.etapa === "plano") {
    const produto = String(body.produto ?? "").trim().slice(0, 200);
    const oferta = String(body.oferta ?? "").trim().slice(0, 200);
    const pedido = String(body.pedido ?? "").trim().slice(0, 1200);
    const chamada = String(body.chamada ?? "").trim().slice(0, 60);
    const duracao = [20, 30, 40].includes(Number(body.duracao)) ? Number(body.duracao) : 30;
    const cores = Array.isArray(body.cores) ? (body.cores as unknown[]).map(String).filter((c) => HEX.test(c)).slice(0, 3) : [];
    const fotosPaths = (Array.isArray(body.fotos_paths) ? body.fotos_paths : []).map(String).filter((s) => s.startsWith(`${user.id}/`)).slice(0, 4);
    // fotos: do armazenamento da pessoa (o app sobe antes) ou, pra teste, do próprio site
    const imagens: Array<[string, string, string]> = [];
    for (const path of fotosPaths) {
      const { data: f } = await admin.storage.from("media").download(path);
      if (!f || f.size > 4_000_000) continue;
      const mime = /png/.test(f.type) ? "image/png" : /webp/.test(f.type) ? "image/webp" : "image/jpeg";
      imagens.push(["", mime, encodeBase64(new Uint8Array(await f.arrayBuffer()))]);
    }
    const urls = (Array.isArray(body.imagens_urls) ? body.imagens_urls : []).map(String).filter((u) => u.startsWith("https://plotoon.netlify.app/")).slice(0, 4 - imagens.length);
    for (const u of urls) {
      try {
        const r = await fetch(u);
        const b = new Uint8Array(await r.arrayBuffer());
        if (b.length < 4_000_000) imagens.push(["", r.headers.get("content-type")?.includes("png") ? "image/png" : "image/jpeg", encodeBase64(b)]);
      } catch {
        /* foto não veio */
      }
    }
    if (produto.length < 2 && pedido.length < 3) return json({ error: "pedido_vazio" }, 400);

    const custo = preco.credits_per_custom_video ?? 15;
    const cob = await admin.rpc("spend_credits", { p_user: user.id, p_amount: custo, p_reason: "Vídeo com IA", p_story: null });
    if (cob.error) {
      const sem = String(cob.error.message).includes("creditos_insuficientes");
      return json({ error: sem ? "creditos_insuficientes" : "cobranca_falhou" }, sem ? 402 : 500);
    }
    try {
      const { data: neg } = await admin.from("business_profiles").select("name, niche, sells, audience, tone, socials").eq("user_id", user.id).maybeSingle();
      const content: Array<Record<string, unknown>> = imagens.map(([, mime, b64]) => ({ type: "image", source: { type: "base64", media_type: mime, data: b64 } }));
      content.push({
        type: "text",
        text: `${imagens.length ? `Acima: ${imagens.length} foto(s) do produto.\n` : "Sem foto do produto (crie o filme com tipografia, formas e 3D).\n"}Produto: ${produto || "ver pedido"}\n${oferta ? `Preço/oferta: ${oferta}\n` : "Sem preço informado (não invente).\n"}${pedido ? `O que a pessoa quer: ${pedido}\n` : ""}Chamada final: ${chamada || "Chama no WhatsApp"}\n\nCrie o plano e responda só com o JSON.`,
      });
      const bruto = await claudeText(key, { max_tokens: 16000, system: planoSystem(neg, duracao, cores.length >= 2 ? cores : null), messages: [{ role: "user", content }] });
      const plano = parseJson(bruto) ?? {};
      if (!arr(plano.cenas).length) console.error("plano sem cenas:", bruto.slice(0, 1500));
      let cenas = arr<Record<string, unknown>>(plano.cenas).slice(0, 7).map((c) => ({
        titulo: String(c.titulo ?? "").slice(0, 60),
        visual: String(c.visual ?? "").slice(0, 1400),
        texto: String(c.texto ?? "").slice(0, 90),
        duracao: Math.min(8, Math.max(2.5, Number(c.duracao) || 4)),
        transicao: TRANSICOES.includes(String(c.transicao)) ? String(c.transicao) : "fade",
      }));
      if (cenas.length < 3) throw new Error("plano_curto");
      const soma = cenas.reduce((s, c) => s + c.duracao, 0);
      cenas = cenas.map((c) => ({ ...c, duracao: Math.round(((c.duracao * duracao) / soma) * 10) / 10 }));
      cenas[0].transicao = "corte";
      let paleta = arr<string>(plano.paleta).map(String).filter((c) => HEX.test(c)).slice(0, 3);
      if (cores.length >= 2) paleta = cores;
      if (paleta.length < 2) paleta = ["#d9a441", "#111111"];
      const final = {
        titulo: String(plano.titulo ?? produto).slice(0, 60),
        conceito: String(plano.conceito ?? "").slice(0, 400),
        produto_visual: String(plano.produto_visual ?? "").slice(0, 800),
        paleta,
        trilha: TRILHAS.includes(String(plano.trilha)) ? String(plano.trilha) : "luxo",
        legenda: String(plano.legenda ?? "").slice(0, 400),
        chamada: chamada || "Chama no WhatsApp",
        oferta,
        cenas,
      };
      const { data: proj, error } = await admin
        .from("video_projects")
        .insert({ user_id: user.id, titulo: final.titulo, pedido: { produto, oferta, pedido, chamada, duracao, cores, fotos: imagens.length }, plano: final, fotos: fotosPaths, cenas: cenas.map(() => ({ code: null, geracoes: 0 })) })
        .select("id")
        .single();
      if (error) throw error;
      const { data: perfil } = await admin.from("profiles").select("credits").eq("id", user.id).single();
      return json({ projeto_id: proj.id, plano: final, creditos: perfil?.credits ?? null });
    } catch (e) {
      console.error(e);
      await admin.rpc("refund_credits", { p_user: user.id, p_amount: custo, p_reason: "Vídeo com IA (devolvido)" });
      return json({ error: "falha_plano" }, 502);
    }
  }

  /* ---------- CENA ---------- */
  if (body.etapa === "cena") {
    const id = String(body.projeto_id ?? "");
    const i = Number(body.cena);
    const ajuste = String(body.ajuste ?? "").trim().slice(0, 600);
    const erro = String(body.erro ?? "").trim().slice(0, 500);
    const { data: proj } = await admin.from("video_projects").select("id, plano, cenas, pedido").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (!proj?.plano) return json({ error: "projeto_nao_achado" }, 404);
    const plano = proj.plano as Record<string, unknown> & { cenas: Array<Record<string, unknown>>; paleta: string[] };
    if (!(i >= 0 && i < plano.cenas.length)) return json({ error: "cena_invalida" }, 400);
    const estado = ((proj.cenas as Array<{ code: string | null; geracoes: number }>) ?? [])[i] ?? { code: null, geracoes: 0 };

    // a 1ª versão e 2 consertos automáticos vêm no preço do vídeo; ajuste pedido pela pessoa cobra
    let custo = 0;
    if (ajuste) custo = preco.credits_per_scene_fix ?? 2;
    else if (estado.geracoes >= 3) return json({ error: "limite_cena" }, 429);
    if (custo) {
      const cob = await admin.rpc("spend_credits", { p_user: user.id, p_amount: custo, p_reason: "Vídeo com IA: ajuste de cena", p_story: null });
      if (cob.error) {
        const sem = String(cob.error.message).includes("creditos_insuficientes");
        return json({ error: sem ? "creditos_insuficientes" : "cobranca_falhou" }, sem ? 402 : 500);
      }
    }
    try {
      const { data: neg } = await admin.from("business_profiles").select("name, tone").eq("user_id", user.id).maybeSingle();
      const c = plano.cenas[i];
      const roteiro = plano.cenas.map((x, k) => `${k + 1}. ${x.titulo} (${x.duracao}s) — "${x.texto}"${k === i ? "  <= ESTA CENA" : ""}`).join("\n");
      let pedidoTxt = `FILME: ${plano.titulo}
Conceito (fio condutor): ${plano.conceito}
Produto nas fotos: ${plano.produto_visual}
Paleta (S.colors): ${plano.paleta.join(", ")}
Marca: ${neg?.name || "a marca"} | Tom: ${TONS[String(neg?.tone)] ?? "amigável"}
${plano.oferta ? `Oferta: ${plano.oferta}\n` : ""}Chamada final: ${plano.chamada}
Número de fotos disponíveis: ${(proj.pedido as { fotos?: number })?.fotos ?? "1 ou mais"}

Roteiro completo:
${roteiro}

Escreva a CENA ${i + 1}: ${c.titulo}
Duração: ${c.duracao}s | Entra com: ${c.transicao} | Texto na tela: "${c.texto}"
Direção: ${c.visual}`;
      if (i === plano.cenas.length - 1) pedidoTxt += "\nÉ A ÚLTIMA CENA: a marca e a chamada ficam firmes na tela até o último quadro (nada de sumir ou escurecer no fim).";
      else if (i === 0) pedidoTxt += "\nÉ A PRIMEIRA CENA: o gancho. Nos primeiros 0,5 s já tem algo bonito e em movimento no meio da tela (nada de tela vazia).";
      if (ajuste && estado.code) pedidoTxt += `\n\nEsta é a versão atual da cena:\n\`\`\`js\n${estado.code}\n\`\`\`\nA pessoa pediu este ajuste: "${ajuste}". Reescreva a cena aplicando o ajuste e mantendo o que estava bom.`;
      if (erro && estado.code) pedidoTxt += `\n\nA versão anterior deu este erro ao rodar: "${erro}".\nCódigo anterior:\n\`\`\`js\n${estado.code}\n\`\`\`\nCorrija o erro (pode reescrever).`;
      pedidoTxt += "\n\nResponda só com o bloco ```js.";
      const bruto = await claudeText(key, { max_tokens: 32000, output_config: { effort: "medium" }, system: cenaSystem(EXEMPLO), messages: [{ role: "user", content: pedidoTxt }] });
      const code = parseCode(bruto);
      if (code.length < 80 || !/return\s+function/.test(code)) {
        console.error("cena sem código:", bruto.slice(0, 800));
        throw new Error("codigo_invalido");
      }
      // confere se o código ao menos compila (sem rodar)
      try {
        new Function("S", "THREE", code);
      } catch (e) {
        if (e instanceof SyntaxError) {
          console.error("cena com erro de sintaxe:", e.message);
          throw new Error("codigo_invalido");
        }
      }
      // grava só esta cena (as outras podem estar sendo escritas ao mesmo tempo)
      const up = await admin.rpc("video_set_cena", { p_id: id, p_i: i, p_code: code });
      if (up.error) throw up.error;
      const { data: perfil } = await admin.from("profiles").select("credits").eq("id", user.id).single();
      return json({ cena: i, codigo: code, creditos: perfil?.credits ?? null });
    } catch (e) {
      console.error(e);
      if (custo) await admin.rpc("refund_credits", { p_user: user.id, p_amount: custo, p_reason: "Vídeo com IA: ajuste (devolvido)" });
      return json({ error: "falha_cena" }, 502);
    }
  }

  return json({ error: "etapa_invalida" }, 400);
});
