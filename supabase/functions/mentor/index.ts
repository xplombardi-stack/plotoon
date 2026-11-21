// Mentor do Plotoon: conversa sobre vendas e estratégia, conhecendo o perfil do negócio.
// Lê prints (ex.: do Instagram), responde e sugere ações que abrem o módulo certo já preenchido.
// Precisa do segredo ANTHROPIC_API_KEY no Supabase (Edge Functions → Secrets).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-sonnet-5-5";
const TIPOS = ["video", "copy", "imagem", "calendario", "whatsapp", "anuncios", "instagram"];
const STATUS = ["bom", "melhorar", "falta", "nao_vi"];
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

function fromBase64(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

type Contexto = { treino: Record<string, unknown> | null; zap: { conversas: number; pedidos: number } | null; anuncios: Record<string, unknown> | null };
const TIPO_NOME: Record<string, string> = {
  alimentacao: "alimentação e delivery",
  varejo: "loja e varejo",
  fabrica: "fábrica e produção sob encomenda",
  servicos: "serviços com horário marcado",
  digital: "produtos digitais e serviços online",
};

function regras(neg: Record<string, unknown> | null, ctx: Contexto) {
  const p = neg ?? {};
  const t = ctx.treino ?? {};
  const redes = Object.entries((p.socials as Record<string, string>) ?? {})
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  const tipo = p.tipo === "outro" ? String(t.nicho_outro ?? "") : TIPO_NOME[String(p.tipo ?? t.nicho ?? "")] ?? "";
  const corta = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
  const extras = [
    corta(t.produtos, 1500) && `- Produtos e preços:\n${corta(t.produtos, 1500)}`,
    corta(t.horario, 120) && `- Horário: ${corta(t.horario, 120)}`,
    corta(t.endereco, 160) && `- Endereço: ${corta(t.endereco, 160)}`,
    corta(t.observacoes, 600) && `- Observações do dono: ${corta(t.observacoes, 600)}`,
  ].filter(Boolean).join("\n");
  const zap = ctx.zap && (ctx.zap.conversas || ctx.zap.pedidos) ? `- WhatsApp nos últimos 30 dias (atendente do Plotoon): ${ctx.zap.conversas} conversas e ${ctx.zap.pedidos} pedidos/agendamentos fechados.` : "";
  const ads = ctx.anuncios ? `- Última análise de anúncios: ${corta(ctx.anuncios.resumo, 300)}` : "";

  return `Você é o Mentor do Plotoon: o estrategista de marketing e de soluções do negócio dessa pessoa. Pensa como um dono de agência experiente que já fez muito pequeno negócio vender: com conteúdo, anúncios, WhatsApp, oferta, preço, atendimento e pós-venda (fazer o cliente voltar).
Seu trabalho é entender o problema e entregar a estratégia certa pra ESSE negócio, não conselho genérico. Português do Brasil, direto, próximo e sem jargão.

O negócio (cada conta é um negócio diferente: use SÓ estes dados e exemplos do ramo dele, nunca de outro ramo):
- Nome: ${p.name || "não informado"}
- Tipo de negócio: ${tipo || "não informado"}
- Nicho: ${p.niche || "não informado"}
- O que vende: ${p.sells || "não informado"}
- Público: ${p.audience || "não informado"}
- Tom da marca: ${TONS[String(p.tone)] ?? "não informado"}
- Redes: ${redes || "não informadas"}
${extras}
${zap}
${ads}

Como responder:
- Curto e limpo: no máximo uns 150 palavras. Sem textão, sem lista enorme. Fale como numa conversa.
- Pense como estrategista: 1) o que está acontecendo (o diagnóstico em 1 frase), 2) a estratégia (2 a 4 passos práticos, do mais importante pro menos), 3) o primeiro passo pra fazer hoje.
- Se faltar uma informação que muda a estratégia (ticket médio, cidade, de onde vêm os clientes, quanto investe em anúncio), faça UMA pergunta antes, curta.
- Use números e exemplos concretos do ramo dele (ex.: barbearia fala de horário vago e pacote; pizzaria fala de combo, terça fraca e taxa de entrega).
- Instagram: você não abre links. Se a pessoa quiser análise do perfil, peça o @ e 3 prints (perfil com bio, feed, um post com curtidas) e use a ação "instagram". Quando vierem os prints, preencha "diagnostico" (nota de 0 a 10 e 6 a 9 itens com status bom, melhorar, falta ou nao_vi e uma dica de 1 frase) e no texto diga só as 3 coisas mais urgentes.
- Ações: no máximo 2, e só quando a pessoa puder fazer agora no Plotoon: video (formato "produto" ou "historinha"), copy, imagem, calendario, whatsapp, anuncios. No detalhe, escreva o pedido já pronto pra ferramenta.
- Nada de promessa de resultado garantido, conteúdo adulto, apostas ou cassino.`;
}

const TOOL = {
  name: "responder",
  description: "Entrega a resposta do Mentor e as ações sugeridas.",
  input_schema: {
    type: "object",
    properties: {
      texto: { type: "string", description: "Resposta pra pessoa, em português do Brasil. Pode usar listas com '- ' e **negrito**." },
      acoes: {
        type: "array",
        maxItems: 2,
        items: {
          type: "object",
          properties: {
            tipo: { type: "string", enum: TIPOS },
            titulo: { type: "string", description: "Rótulo curto da ação, até 7 palavras." },
            detalhe: { type: "string", description: "O pedido pronto pra ferramenta." },
            formato: { type: "string", description: "Pra video: produto ou historinha. Pra copy: legenda, gancho, anuncio ou venda. Pra imagem: produto, post, banner ou capa." },
          },
          required: ["tipo", "titulo", "detalhe"],
        },
      },
      diagnostico: {
        type: "object",
        description: "Só quando analisar prints do Instagram.",
        properties: {
          nota: { type: "number", description: "De 0 a 10." },
          itens: {
            type: "array",
            maxItems: 10,
            items: {
              type: "object",
              properties: {
                area: { type: "string", description: "Ex.: Nome e bio" },
                status: { type: "string", enum: STATUS },
                dica: { type: "string", description: "Dica prática, 1 frase." },
              },
              required: ["area", "status", "dica"],
            },
          },
        },
        required: ["nota", "itens"],
      },
    },
    required: ["texto"],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "metodo" }, 405);
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "mentor_sem_chave" }, 503);

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
  const mensagem = String(body.mensagem ?? "").trim().slice(0, 4000);
  const imagens = (Array.isArray(body.imagens) ? body.imagens : [])
    .map(String)
    .map((s) => s.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/))
    .filter((m): m is RegExpMatchArray => !!m && m[2].length < 2_800_000)
    .slice(0, 4);
  if (!mensagem && imagens.length === 0) return json({ error: "mensagem_vazia" }, 400);

  // conversa: continua a que veio ou abre uma nova
  let threadId = typeof body.thread_id === "string" ? body.thread_id : null;
  if (threadId) {
    const { data: t } = await admin.from("mentor_threads").select("id").eq("id", threadId).eq("user_id", user.id).maybeSingle();
    if (!t) threadId = null;
  }

  const { data: precos } = await admin.from("settings").select("key, value").in("key", ["credits_per_mentor", "credits_per_mentor_images"]);
  const preco = Object.fromEntries((precos ?? []).map((r) => [r.key, Number(r.value)]));
  const custo = imagens.length ? preco.credits_per_mentor_images ?? 2 : preco.credits_per_mentor ?? 1;
  const cobranca = await admin.rpc("spend_credits", { p_user: user.id, p_amount: custo, p_reason: "Mentor", p_story: null });
  if (cobranca.error) {
    const sem = String(cobranca.error.message).includes("creditos_insuficientes");
    return json({ error: sem ? "creditos_insuficientes" : "cobranca_falhou" }, sem ? 402 : 500);
  }

  try {
    if (!threadId) {
      const titulo = (mensagem || "Análise de prints").replace(/\s+/g, " ").slice(0, 60);
      const { data: t, error } = await admin.from("mentor_threads").insert({ user_id: user.id, title: titulo }).select("id").single();
      if (error) throw error;
      threadId = t.id;
    }

    // guarda os prints
    const paths: string[] = [];
    for (let i = 0; i < imagens.length; i++) {
      const [, mime, b64] = imagens[i];
      const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
      const path = `${user.id}/mentor/${threadId}/${Date.now()}-${i}.${ext}`;
      const up = await admin.storage.from("media").upload(path, fromBase64(b64), { contentType: mime });
      if (!up.error) paths.push(path);
    }

    const desde = new Date(Date.now() - 30 * 86400e3).toISOString();
    const [{ data: neg }, { data: antigas }, { data: bot }, conversas, pedidos, { data: ad }] = await Promise.all([
      admin.from("business_profiles").select("name, niche, sells, audience, tone, socials, tipo").eq("user_id", user.id).maybeSingle(),
      admin.from("mentor_messages").select("role, content").eq("thread_id", threadId).order("created_at", { ascending: false }).limit(16),
      admin.from("whatsapp_bots").select("treino").eq("user_id", user.id).maybeSingle(),
      admin.from("whatsapp_conversas").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("ultima_em", desde),
      admin.from("whatsapp_pedidos").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("origem", "whatsapp").gte("created_at", desde),
      admin.from("anuncios_analises").select("resultado").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const ctx: Contexto = {
      treino: (bot?.treino as Record<string, unknown>) ?? null,
      zap: { conversas: conversas.count ?? 0, pedidos: pedidos.count ?? 0 },
      anuncios: (ad?.resultado as Record<string, unknown>) ?? null,
    };

    await admin.from("mentor_messages").insert({ thread_id: threadId, user_id: user.id, role: "user", content: mensagem, images: paths });

    const historico = (antigas ?? [])
      .reverse()
      .filter((m) => m.content)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string }));
    // a API pede que a conversa comece com a pessoa
    while (historico.length && historico[0].role !== "user") historico.shift();

    const atual: Array<Record<string, unknown>> = imagens.map(([, mime, b64]) => ({ type: "image", source: { type: "base64", media_type: mime, data: b64 } }));
    atual.push({ type: "text", text: `${mensagem || "Analisa esses prints pra mim."}\n\n(Responda chamando a ferramenta responder.)` });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2500,
        system: regras(neg, ctx),
        tools: [TOOL],
        tool_choice: { type: "auto" },
        messages: [...historico, { role: "user", content: atual }],
      }),
    });
    if (!res.ok) throw new Error(`anthropic_${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const blocks = (data.content ?? []) as Array<Record<string, unknown>>;
    const tool = blocks.find((b) => b.type === "tool_use")?.input as { texto?: string; acoes?: Array<Record<string, string>>; diagnostico?: { nota?: number; itens?: Array<Record<string, string>> } } | undefined;
    const texto = String(tool?.texto ?? blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n") ?? "").trim();
    if (!texto) throw new Error("sem_resposta");
    const acoes = (tool?.acoes ?? [])
      .filter((a) => TIPOS.includes(a.tipo))
      .slice(0, 2)
      .map((a) => ({ tipo: a.tipo, titulo: String(a.titulo ?? "").slice(0, 80), detalhe: String(a.detalhe ?? "").slice(0, 600), formato: a.formato ? String(a.formato).slice(0, 20) : undefined }));

    const dg = tool?.diagnostico;
    const diagnostico =
      dg && Array.isArray(dg.itens) && dg.itens.length
        ? {
            nota: Math.max(0, Math.min(10, Math.round(Number(dg.nota) * 10) / 10 || 0)),
            itens: dg.itens
              .filter((i) => i && i.area)
              .slice(0, 10)
              .map((i) => ({ area: String(i.area).slice(0, 40), status: STATUS.includes(i.status) ? i.status : "nao_vi", dica: String(i.dica ?? "").slice(0, 200) })),
          }
        : null;
    const { data: msg } = await admin
      .from("mentor_messages")
      .insert({ thread_id: threadId, user_id: user.id, role: "assistant", content: texto, actions: acoes, diagnostico })
      .select("id, created_at")
      .single();
    await admin.from("mentor_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    const { data: perfil } = await admin.from("profiles").select("credits").eq("id", user.id).single();
    return json({ thread_id: threadId, mensagem: { id: msg?.id, texto, acoes, diagnostico, criada: msg?.created_at }, creditos: perfil?.credits ?? null });
  } catch (e) {
    console.error(e);
    await admin.rpc("refund_credits", { p_user: user.id, p_amount: custo, p_reason: "Mentor (devolvido)" });
    return json({ error: "falha_mentor", thread_id: threadId }, 502);
  }
});
