// Atendente WhatsApp (QR code via Evolution API)
//  POST com login:   { acao: "conectar" | "status" | "desconectar" | "simular" | "enviar" | "ler_cardapio" }
//  POST ?hook=TOKEN: avisos da Evolution (mensagem nova, conexão, QR)  -> a IA responde como gente
// Segredos: EVOLUTION_URL, EVOLUTION_API_KEY, ANTHROPIC_API_KEY (GEMINI_API_KEY pra ouvir áudio)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

type J = Record<string, unknown>;
const MODEL = "claude-sonnet-5-5";
const USD_IN = 2 / 1e6, USD_OUT = 10 / 1e6;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
const obj = (v: unknown): J => (v && typeof v === "object" ? (v as J) : {});
const str = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const EVO_URL = (Deno.env.get("EVOLUTION_URL") ?? "").replace(/\/+$/, "");
const EVO_KEY = Deno.env.get("EVOLUTION_API_KEY") ?? "";
const SUPA_URL = Deno.env.get("SUPABASE_URL")!;

async function evo(path: string, method = "GET", body?: unknown) {
  if (!EVO_URL || !EVO_KEY) throw new Error("evolution_nao_configurada");
  const r = await fetch(`${EVO_URL}${path}`, { method, headers: { apikey: EVO_KEY, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text();
  let data: unknown = txt;
  try {
    data = JSON.parse(txt);
  } catch {
    /* texto */
  }
  return { ok: r.ok, status: r.status, data: data as J };
}

// token do aviso: só quem tem a chave da Evolution sabe gerar
async function hookToken(instance: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${EVO_KEY}:${instance}:plotoon`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}
const hookUrl = async (instance: string) => `${SUPA_URL}/functions/v1/whatsapp?hook=${await hookToken(instance)}&i=${instance}`;

/* ---------------- o atendente ---------------- */
type Treino = {
  apresentacao?: string; produtos?: string; perguntas?: string; horario?: string; regras?: string; tom?: string; nome_atendente?: string;
  observacoes?: string; endereco?: string; referencia?: string; mapa?: string; fora_area?: string;
  entregas?: Array<{ local?: string; taxa?: string; prazo?: string }>;
  licoes?: Array<{ cliente?: string; certo?: string }>;
};
const bloco = (titulo: string, txt?: string) => (txt && txt.trim() ? `${titulo}\n${txt.trim().slice(0, 6000)}\n\n` : "");

function sistema(neg: J | null, t: Treino) {
  const n = neg ?? {};
  const empresa = String(n.name || "empresa");
  const entregas = (Array.isArray(t.entregas) ? t.entregas : [])
    .filter((e) => str(e?.local).trim())
    .slice(0, 80)
    .map((e) => `${str(e.local).trim()}: taxa ${str(e.taxa).trim() || "não informada"}${str(e.prazo).trim() ? `, prazo ${str(e.prazo).trim()}` : ""}`)
    .join("\n");
  const loja = [t.endereco && `Endereço: ${t.endereco}`, t.referencia && `Ponto de referência: ${t.referencia}`, t.mapa && `Link do mapa (mande quando perguntarem onde fica ou como chegar): ${t.mapa}`].filter(Boolean).join("\n");
  const licoes = (Array.isArray(t.licoes) ? t.licoes : [])
    .filter((l) => str(l?.certo).trim())
    .slice(-40)
    .map((l) => (str(l.cliente).trim() ? `Quando o cliente disse "${str(l.cliente).trim()}", o certo é responder assim: ${str(l.certo).trim()}` : `Responda assim: ${str(l.certo).trim()}`))
    .join("\n");

  return `Você é ${t.nome_atendente || "a pessoa do atendimento"} da ${empresa} respondendo clientes no WhatsApp. Você conversa como uma pessoa de verdade da loja, nunca como robô.

Sobre o negócio: ${empresa}${n.niche ? ` (${n.niche})` : ""}. Vende: ${n.sells || "ver produtos abaixo"}. Público: ${n.audience || "geral"}.

${t.apresentacao ? `Apresentação: ${t.apresentacao}\n\n` : ""}${bloco("Produtos, cardápio e preços (a única fonte de preço que vale):", t.produtos)}${bloco("Perguntas frequentes e respostas:", t.perguntas)}${t.horario ? `Horário de atendimento: ${t.horario}\n\n` : ""}${bloco("Onde fica a loja:", loja)}${bloco("Lugares de entrega, taxa e prazo de cada um (use a taxa do lugar do cliente e some no total):", entregas)}${t.fora_area ? `Se o cliente estiver fora desses lugares: ${t.fora_area}\n\n` : ""}${bloco("Regras do dono (siga sempre):", t.regras)}${bloco("Observações do dono (leve tudo em conta):", t.observacoes)}${bloco("Correções do dono. Em situações parecidas, responda desse jeito, que vale mais que qualquer outra instrução acima:", licoes)}Jeito de escrever: ${t.tom || "simpático, próximo e direto"}. Português do Brasil, natural de WhatsApp.
- Mensagens curtas, como gente digita: 1 a 3 frases. Se precisar falar mais, separe em até 3 mensagens com uma linha em branco entre elas.
- Sem markdown, sem listas com hífen, sem negrito. No máximo 1 emoji quando fizer sentido.
- Use o nome do cliente às vezes, não em toda mensagem. Não repita saudação se já cumprimentou.
- Faça uma pergunta por vez pra entender o que a pessoa quer e conduza pra venda com naturalidade (quantidade, tamanho, entrega, forma de pagamento).
- Quando somar um pedido, confira a conta com cuidado e inclua a taxa de entrega do lugar do cliente.
- Se o cliente falar um bairro ou lugar que não está na lista de entrega, não chute a taxa: use a regra de fora da área, ou diga que vai verificar.
- NUNCA invente preço, prazo, estoque, desconto, taxa ou informação que não está acima. Se não souber, diga algo como "vou verificar aqui, só um minuto" e termine com [CHAMAR_DONO].
- Se o cliente quiser fechar o pedido, pagar, reclamar, ou estiver irritado: responda com cuidado, diga que vai verificar/confirmar e que é só um minutinho, e termine com [CHAMAR_DONO].
- NUNCA diga "vou falar com a equipe", "vou chamar alguém", "vou passar pro responsável", "um atendente vai te responder" ou parecido. Fale sempre em primeira pessoa: "vou verificar", "já confirmo pra você", "só um minuto".
- Não diga que é uma IA, a menos que perguntem diretamente; se perguntarem, seja honesto e diga que é o atendente virtual da ${empresa}.
- Nunca fale de assuntos fora do negócio por muito tempo; traga a conversa de volta com gentileza.`;
}

type Hist = Array<{ de: string; texto: string }>;
async function responder(neg: J | null, t: Treino, hist: Hist, imagem?: { b64: string; mime: string } | null) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("sem_chave");
  const msgs: Array<{ role: string; content: unknown }> = [];
  for (const h of hist) {
    const role = h.de === "cliente" ? "user" : "assistant";
    const texto = h.de === "dono" ? `(mensagem enviada por uma pessoa da equipe) ${h.texto}` : h.texto;
    const last = msgs[msgs.length - 1];
    if (last && last.role === role) last.content = `${last.content}\n${texto}`;
    else msgs.push({ role, content: texto });
  }
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return null;
  if (imagem) {
    const last = msgs[msgs.length - 1];
    last.content = [{ type: "image", source: { type: "base64", media_type: imagem.mime, data: imagem.b64 } }, { type: "text", text: String(last.content) }];
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 3000, output_config: { effort: "low" }, system: sistema(neg, t), messages: msgs }),
  });
  if (!res.ok) throw new Error(`anthropic_${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = ((data.content ?? []) as J[]).filter((b) => b.type === "text").map((b) => String(b.text)).join("\n").trim();
  const custo = Number(data.usage?.input_tokens ?? 0) * USD_IN + Number(data.usage?.output_tokens ?? 0) * USD_OUT;
  const chamar = /\[CHAMAR_DONO\]/.test(text);
  const limpo = text.replace(/\[CHAMAR_DONO\]/g, "").replace(/\*\*/g, "").trim();
  const partes = limpo.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).slice(0, 3);
  return { partes, chamar, custo, i: Number(data.usage?.input_tokens ?? 0), o: Number(data.usage?.output_tokens ?? 0) };
}

async function transcrever(b64: string, mime: string) {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return "";
  for (const model of ["gemini-3.1-flash", "gemini-2.5-flash"]) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: mime.split(";")[0] || "audio/ogg", data: b64 } }, { text: "Transcreva exatamente o que a pessoa fala neste áudio, em português. Responda só com a transcrição." }] }] }),
    });
    if (r.status === 404) continue;
    if (!r.ok) return "";
    const d = await r.json();
    return String(d?.candidates?.[0]?.content?.parts?.map((p: J) => p.text ?? "").join("") ?? "").trim();
  }
  return "";
}

/* ---------------- avisos da Evolution ---------------- */
async function aviso(db: SupabaseClient, body: J, instance: string) {
  const { data: bot } = await db.from("whatsapp_bots").select("user_id, ativo, treino, instance").eq("instance", instance).maybeSingle();
  if (!bot) return;
  const ev = str(body.event).toLowerCase().replace(/_/g, ".");
  const d = obj(body.data);

  if (ev === "qrcode.updated") {
    const qr = str(obj(d.qrcode).base64) || str(d.base64);
    if (qr) await db.from("whatsapp_bots").update({ qr, status: "aguardando_qr", updated_at: new Date().toISOString() }).eq("instance", instance);
    return;
  }
  if (ev === "connection.update") {
    const st = str(d.state);
    const patch: J = { updated_at: new Date().toISOString() };
    if (st === "open") Object.assign(patch, { status: "conectado", qr: null, numero: str(d.wuid).split("@")[0] || null, nome_perfil: str(d.profileName) || null });
    else if (st === "close") Object.assign(patch, { status: "desconectado", qr: null });
    await db.from("whatsapp_bots").update(patch).eq("instance", instance);
    return;
  }
  if (ev !== "messages.upsert") return;

  const k = obj(d.key);
  const jid = str(k.remoteJid);
  if (!jid || jid.endsWith("@g.us") || jid.includes("broadcast") || jid.endsWith("@newsletter")) return; // grupos e status: nunca
  const waId = str(k.id);
  const m = obj(d.message);
  const tipoMsg = str(d.messageType);
  let texto = str(m.conversation) || str(obj(m.extendedTextMessage).text) || str(obj(m.imageMessage).caption) || str(obj(m.videoMessage).caption);
  let tipo = "texto";
  let imagem: { b64: string; mime: string } | null = null;
  const b64 = str(m.base64);
  if (tipoMsg === "audioMessage" || m.audioMessage) {
    tipo = "audio";
    texto = b64 ? await transcrever(b64, str(obj(m.audioMessage).mimetype) || "audio/ogg") : "";
    texto = texto ? `[áudio] ${texto}` : "[mandou um áudio]";
  } else if (tipoMsg === "imageMessage" || m.imageMessage) {
    tipo = "imagem";
    if (b64) imagem = { b64, mime: (str(obj(m.imageMessage).mimetype) || "image/jpeg").split(";")[0] };
    texto = texto ? `[foto] ${texto}` : "[mandou uma foto]";
  } else if (!texto) {
    texto = tipoMsg === "stickerMessage" ? "[figurinha]" : tipoMsg === "documentMessage" ? "[mandou um documento]" : tipoMsg === "videoMessage" ? "[mandou um vídeo]" : "";
    tipo = "outro";
  }
  if (!texto) return;
  const fromMe = k.fromMe === true;
  const uid = bot.user_id as string;

  // conversa
  const nome = fromMe ? undefined : str(d.pushName) || undefined;
  const { data: conv } = await db
    .from("whatsapp_conversas")
    .upsert({ user_id: uid, jid, ...(nome ? { nome } : {}), ultima_msg: texto.slice(0, 160), ultima_em: new Date().toISOString() }, { onConflict: "user_id,jid" })
    .select("id, ia_pausada, nao_lidas")
    .single();
  if (!conv) return;

  if (fromMe) {
    // mensagem que saiu do número: se foi a IA, já está gravada; se foi o dono pelo celular, a IA dá um tempo nessa conversa
    await sleep(3000); // dá tempo da IA gravar o que ela mesma mandou
    const { data: ja } = await db.from("whatsapp_mensagens").select("id").eq("user_id", uid).eq("wa_id", waId).maybeSingle();
    if (ja) return;
    await db.from("whatsapp_mensagens").insert({ conversa_id: conv.id, user_id: uid, de: "dono", texto, tipo, wa_id: waId });
    await db.from("whatsapp_conversas").update({ ia_pausada: true }).eq("id", conv.id);
    return;
  }

  const ins = await db.from("whatsapp_mensagens").insert({ conversa_id: conv.id, user_id: uid, de: "cliente", texto, tipo, wa_id: waId }).select("id, created_at").single();
  if (ins.error) return; // repetido
  await db.from("whatsapp_conversas").update({ nao_lidas: Number(conv.nao_lidas ?? 0) + 1 }).eq("id", conv.id);
  if (!bot.ativo || conv.ia_pausada) return;

  // espera o cliente terminar de digitar (gente manda em várias mensagens)
  await sleep(7000);
  const { data: mais } = await db.from("whatsapp_mensagens").select("id").eq("conversa_id", conv.id).eq("de", "cliente").gt("created_at", ins.data.created_at).limit(1);
  if (mais?.length) return; // a mensagem mais nova responde por todas
  const { data: c2 } = await db.from("whatsapp_conversas").select("ia_pausada").eq("id", conv.id).single();
  if (c2?.ia_pausada) return;

  // cobra antes de responder
  const { data: pr } = await db.from("settings").select("value").eq("key", "credits_per_whatsapp_reply").maybeSingle();
  const custoCred = Number(pr?.value ?? 1);
  const cob = await db.rpc("spend_credits", { p_user: uid, p_amount: custoCred, p_reason: "WhatsApp: resposta", p_story: null });
  if (cob.error) {
    await db.from("whatsapp_conversas").update({ precisa_dono: true }).eq("id", conv.id);
    return; // sem créditos: o dono responde
  }
  try {
    const { data: hist } = await db.from("whatsapp_mensagens").select("de, texto, created_at").eq("conversa_id", conv.id).order("created_at", { ascending: false }).limit(24);
    const { data: neg } = await db.from("business_profiles").select("name, niche, sells, audience, tone").eq("user_id", uid).maybeSingle();
    const r = await responder(neg, obj(bot.treino) as Treino, (hist ?? []).reverse(), imagem);
    if (!r || !r.partes.length) throw new Error("sem_resposta");
    for (const parte of r.partes) {
      const espera = Math.min(6000, 900 + parte.length * 45); // tempo de "digitando…" de gente
      await evo(`/chat/sendPresence/${instance}`, "POST", { number: jid, presence: "composing", delay: espera }).catch(() => null);
      await sleep(espera);
      const env = await evo(`/message/sendText/${instance}`, "POST", { number: jid, text: parte });
      const id = str(obj(obj(env.data).key).id);
      await db.from("whatsapp_mensagens").insert({ conversa_id: conv.id, user_id: uid, de: "ia", texto: parte, wa_id: id || null });
    }
    await db.from("whatsapp_conversas").update({ ultima_msg: r.partes[r.partes.length - 1].slice(0, 160), ultima_em: new Date().toISOString(), ...(r.chamar ? { precisa_dono: true, ia_pausada: true } : {}) }).eq("id", conv.id);
    await db.from("ai_usage").insert({ user_id: uid, modulo: "whatsapp", ref: conv.id, input_tokens: r.i, output_tokens: r.o, custo_usd: r.custo, creditos: custoCred });
  } catch (e) {
    console.error(e);
    await db.rpc("refund_credits", { p_user: uid, p_amount: custoCred, p_reason: "WhatsApp: resposta (devolvido)" });
  }
}

/* ---------------- servidor ---------------- */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: true });
  const db = createClient(SUPA_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const url = new URL(req.url);

  // aviso da Evolution
  const hook = url.searchParams.get("hook");
  if (hook) {
    const instance = url.searchParams.get("i") ?? "";
    if (!instance || hook !== (await hookToken(instance))) return json({ ok: false }, 401);
    let body: J = {};
    try {
      body = await req.json();
    } catch {
      return json({ ok: false }, 400);
    }
    // responde rápido pra Evolution e trabalha em segundo plano
    // @ts-ignore EdgeRuntime existe no Supabase
    EdgeRuntime.waitUntil(aviso(db, body, instance).catch((e) => console.error(e)));
    return json({ ok: true });
  }

  // ações do app (precisa estar logado)
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: who } = await db.auth.getUser(token);
  const user = who?.user;
  if (!user) return json({ error: "nao_autenticado" }, 401);
  let body: J = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "corpo_invalido" }, 400);
  }
  const acao = str(body.acao);
  const instance = `pl${user.id.replace(/-/g, "").slice(0, 22)}`;

  try {
    if (acao === "simular") {
      // conversa de teste com o atendente (não usa o WhatsApp)
      const hist = (Array.isArray(body.historico) ? body.historico : []).slice(-20).map((h) => ({ de: str(obj(h).de) === "cliente" ? "cliente" : "ia", texto: str(obj(h).texto).slice(0, 1500) }));
      const { data: neg } = await db.from("business_profiles").select("name, niche, sells, audience, tone").eq("user_id", user.id).maybeSingle();
      const treino = (obj(body.treino) as Treino) ?? {};
      const r = await responder(neg, treino, hist);
      if (r) await db.from("ai_usage").insert({ user_id: user.id, modulo: "whatsapp_teste", ref: "simulador", input_tokens: r.i, output_tokens: r.o, custo_usd: r.custo, creditos: 0 });
      return json({ partes: r?.partes ?? [], chamar: r?.chamar ?? false });
    }

    if (acao === "ler_cardapio") {
      // lê a foto do cardápio / tabela de preços e devolve em texto
      const imagem = str(body.imagem).replace(/^data:[^,]+,/, "");
      if (!imagem || imagem.length > 7_000_000) return json({ error: "imagem_invalida" }, 400);
      const { data: pr } = await db.from("settings").select("value").eq("key", "credits_per_menu_photo").maybeSingle();
      const custoCred = Number(pr?.value ?? 2);
      const cob = await db.rpc("spend_credits", { p_user: user.id, p_amount: custoCred, p_reason: "Atendente: leitura do cardápio", p_story: null });
      if (cob.error) return json({ error: "creditos_insuficientes" }, 402);
      try {
        const key = Deno.env.get("ANTHROPIC_API_KEY");
        if (!key) throw new Error("sem_chave");
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 8000,
            output_config: { effort: "low" },
            messages: [{
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imagem } },
                { type: "text", text: `Essa é a foto de um cardápio, catálogo ou tabela de preços. Transcreva tudo o que dá pra vender, em português, em texto simples:
- Um item por linha, no formato "Nome do item (detalhes como tamanho, sabor, ingredientes): R$ 0,00".
- Se o mesmo item tem preços diferentes por tamanho, escreva os tamanhos na mesma linha, por exemplo "Pizza calabresa: broto R$ 30,00, grande R$ 52,90".
- Quando houver seções (ex.: PIZZAS, BEBIDAS), escreva o nome da seção em maiúsculas numa linha antes dos itens.
- Inclua também adicionais, combos, taxas e observações de preço que aparecerem.
- Copie os preços exatamente como estão. Se algum preço ou nome estiver ilegível, escreva "(confirmar)" no lugar, nunca chute.
- Sem markdown, sem asteriscos, sem comentários seus antes ou depois. Se a foto não for de cardápio ou preços, responda só: NADA` },
              ],
            }],
          }),
        });
        if (!res.ok) throw new Error(`anthropic_${res.status}: ${(await res.text()).slice(0, 300)}`);
        const data = await res.json();
        const texto = ((data.content ?? []) as J[]).filter((b) => b.type === "text").map((b) => String(b.text)).join("\n").replace(/\*\*/g, "").trim();
        const custo = Number(data.usage?.input_tokens ?? 0) * USD_IN + Number(data.usage?.output_tokens ?? 0) * USD_OUT;
        await db.from("ai_usage").insert({ user_id: user.id, modulo: "whatsapp_cardapio", ref: "foto", input_tokens: data.usage?.input_tokens ?? 0, output_tokens: data.usage?.output_tokens ?? 0, custo_usd: custo, creditos: custoCred });
        if (!texto || /^NADA\b/i.test(texto)) {
          await db.rpc("refund_credits", { p_user: user.id, p_amount: custoCred, p_reason: "Atendente: leitura do cardápio (devolvido)" });
          return json({ error: "sem_itens" }, 422);
        }
        return json({ texto });
      } catch (e) {
        console.error(e);
        await db.rpc("refund_credits", { p_user: user.id, p_amount: custoCred, p_reason: "Atendente: leitura do cardápio (devolvido)" });
        return json({ error: "falhou" }, 502);
      }
    }

    if (acao === "conectar") {
      await db.from("whatsapp_bots").upsert({ user_id: user.id, instance, status: "aguardando_qr", updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      const webhook = { url: await hookUrl(instance), byEvents: false, base64: true, enabled: true, events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"] };
      let r = await evo("/instance/create", "POST", { instanceName: instance, integration: "WHATSAPP-BAILEYS", qrcode: true, groupsIgnore: true, alwaysOnline: false, readMessages: true, syncFullHistory: false, webhook });
      let qr = str(obj(r.data.qrcode).base64);
      if (!r.ok) {
        // já existe: garante o aviso e pede um QR novo
        await evo(`/webhook/set/${instance}`, "POST", { webhook });
        r = await evo(`/instance/connect/${instance}`);
        qr = str(r.data.base64);
        if (!qr && str(obj(r.data.instance).state) === "open") {
          await db.from("whatsapp_bots").update({ status: "conectado", qr: null }).eq("user_id", user.id);
          return json({ status: "conectado" });
        }
      }
      if (qr) await db.from("whatsapp_bots").update({ qr }).eq("user_id", user.id);
      return json({ status: "aguardando_qr", qr });
    }

    if (acao === "status") {
      const r = await evo(`/instance/connectionState/${instance}`);
      const st = str(obj(r.data.instance).state) || str(r.data.state);
      const status = st === "open" ? "conectado" : st === "connecting" ? "aguardando_qr" : "desconectado";
      const patch: J = { status, updated_at: new Date().toISOString() };
      if (status === "conectado") {
        const f = await evo(`/instance/fetchInstances?instanceName=${instance}`);
        const it = obj(Array.isArray(f.data) ? f.data[0] : f.data);
        Object.assign(patch, { qr: null, numero: str(it.ownerJid).split("@")[0] || null, nome_perfil: str(it.profileName) || null });
      }
      await db.from("whatsapp_bots").update(patch).eq("user_id", user.id);
      return json({ status, numero: patch.numero ?? null });
    }

    if (acao === "desconectar") {
      await evo(`/instance/logout/${instance}`, "DELETE");
      await db.from("whatsapp_bots").update({ status: "desconectado", qr: null, numero: null }).eq("user_id", user.id);
      return json({ status: "desconectado" });
    }

    if (acao === "enviar") {
      // o dono responde pela caixa de conversas
      const { data: conv } = await db.from("whatsapp_conversas").select("id, jid").eq("id", str(body.conversa_id)).eq("user_id", user.id).maybeSingle();
      const texto = str(body.texto).trim().slice(0, 4000);
      if (!conv || !texto) return json({ error: "invalido" }, 400);
      const env = await evo(`/message/sendText/${instance}`, "POST", { number: conv.jid, text: texto });
      if (!env.ok) return json({ error: "nao_enviou" }, 502);
      const id = str(obj(obj(env.data).key).id);
      await db.from("whatsapp_mensagens").insert({ conversa_id: conv.id, user_id: user.id, de: "dono", texto, wa_id: id || null });
      await db.from("whatsapp_conversas").update({ ultima_msg: texto.slice(0, 160), ultima_em: new Date().toISOString(), ia_pausada: body.pausar !== false, precisa_dono: false, nao_lidas: 0 }).eq("id", conv.id);
      return json({ ok: true });
    }

    return json({ error: "acao_invalida" }, 400);
  } catch (e) {
    console.error(e);
    const msg = String((e as Error)?.message ?? e);
    return json({ error: msg.includes("evolution_nao_configurada") ? "evolution_nao_configurada" : "falhou" }, msg.includes("evolution_nao_configurada") ? 503 : 502);
  }
});
