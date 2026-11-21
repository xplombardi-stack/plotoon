// Anúncios: conecta a conta de anúncios da Meta (token da própria pessoa) ou lê relatório/print,
// e a IA diz em português simples o que escalar, manter, ajustar ou pausar. Não cria nem mexe em anúncio.
//  POST { acao: "conectar", token }            -> valida e lista as contas de anúncio
//  POST { acao: "escolher", conta_id }
//  POST { acao: "analisar", periodo }          -> puxa os números da Meta e analisa
//  POST { acao: "analisar_arquivo", texto?, imagens? }
//  POST { acao: "desconectar" }
// Segredos: ANTHROPIC_API_KEY
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

type J = Record<string, unknown>;
const MODEL = "claude-sonnet-5-5";
const USD_IN = 2 / 1e6, USD_OUT = 10 / 1e6;
const GRAPH = "https://graph.facebook.com/v24.0";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
const obj = (v: unknown): J => (v && typeof v === "object" ? (v as J) : {});
const str = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");
const PERIODOS: Record<string, string> = { last_7d: "últimos 7 dias", last_14d: "últimos 14 dias", last_30d: "últimos 30 dias" };

class MetaErro extends Error {
  constructor(public code: number, msg: string) {
    super(msg);
  }
}
async function graph(path: string, token: string, params: Record<string, string> = {}) {
  const u = new URL(`${GRAPH}/${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("access_token", token);
  const r = await fetch(u);
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new MetaErro(Number(d?.error?.code ?? r.status), String(d?.error?.message ?? `meta_${r.status}`));
  return d as J;
}
const erroMeta = (e: unknown) => {
  if (e instanceof MetaErro) {
    if (e.code === 190 || e.code === 102) return json({ error: "token_expirado" }, 401);
    if (e.code === 200 || e.code === 10 || /permission/i.test(e.message)) return json({ error: "sem_permissao" }, 403);
    if (e.code === 17 || e.code === 4 || e.code === 80004) return json({ error: "limite_meta" }, 429);
    return json({ error: "meta", detalhe: e.message.slice(0, 200) }, 502);
  }
  return null;
};

/* ---------------- a análise ---------------- */
const TOOL = {
  name: "analise",
  description: "Entrega a análise das campanhas.",
  input_schema: {
    type: "object",
    properties: {
      resumo: { type: "string", description: "2 ou 3 frases simples dizendo como estão os anúncios no geral, como se falasse com alguém que não entende de anúncio." },
      nota: { type: "number", description: "Nota geral de 0 a 10." },
      gasto_total: { type: "string", description: "Quanto foi gasto no período, ex.: R$ 1.240,00. Vazio se não souber." },
      campanhas: {
        type: "array",
        maxItems: 15,
        items: {
          type: "object",
          properties: {
            nome: { type: "string" },
            veredito: { type: "string", enum: ["escalar", "manter", "ajustar", "pausar"] },
            numeros: { type: "string", description: "Os números principais em uma linha, ex.: R$ 320 gastos · 41 conversas · R$ 7,80 cada" },
            motivo: { type: "string", description: "Por que, em 1 frase simples." },
            o_que_fazer: { type: "string", description: "O que fazer agora, em 1 frase prática." },
          },
          required: ["nome", "veredito", "numeros", "motivo", "o_que_fazer"],
        },
      },
      prioridades: { type: "array", maxItems: 3, items: { type: "string" }, description: "As 3 coisas mais importantes pra fazer agora, em ordem." },
      acoes: {
        type: "array",
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            tipo: { type: "string", enum: ["video", "imagem", "copy"] },
            titulo: { type: "string", description: "Até 7 palavras." },
            detalhe: { type: "string", description: "O pedido pronto pra ferramenta (ex.: a ideia do vídeo novo pra trocar o criativo cansado)." },
            formato: { type: "string", description: "video: produto ou historinha. copy: anuncio ou gancho. imagem: post ou banner." },
          },
          required: ["tipo", "titulo", "detalhe"],
        },
      },
    },
    required: ["resumo", "nota", "campanhas", "prioridades"],
  },
};

function sistema(neg: J | null) {
  const n = neg ?? {};
  return `Você é o analista de anúncios do Plotoon. Olha os números das campanhas da Meta (Facebook e Instagram) de um pequeno negócio e explica, em português do Brasil simples, sem jargão, o que está bom e o que está ruim. Quem lê é dono de negócio, muitas vezes leigo: troque termos técnicos por palavras comuns (ex.: "custo por conversa" em vez de CPA; se usar CTR, explique como "de cada 100 que viram, quantos clicaram").

O negócio: ${n.name || "não informado"} · ${n.niche || "ramo não informado"}${n.tipo ? ` (${n.tipo})` : ""} · vende: ${n.sells || "não informado"} · público: ${n.audience || "não informado"}.

Como decidir o veredito de cada campanha (compare com a média da própria conta, não com números mágicos):
- escalar: resultado bom e custo por resultado abaixo da média, com gasto suficiente pra confiar. Diga quanto aumentar (ex.: 20% por dia, nunca dobrar de uma vez).
- manter: está ok ou ainda tem pouco gasto pra julgar.
- ajustar: tem algo pra arrumar (criativo cansado com frequência acima de 3, poucas pessoas clicando, público errado, custo subindo).
- pausar: gastou bem mais que a média sem resultado ou com custo muito acima da média.
- Campanha pausada ou com gasto zero: não opine como se estivesse rodando.
- Se faltar dado pra decidir, diga isso no motivo em vez de inventar.
Escolha o resultado que importa pro tipo de campanha (conversas no WhatsApp/Direct, compras, cadastros, cliques no link). Nunca invente número que não está nos dados. Nada de promessa de resultado garantido.
Nas ações, sugira só o que o Plotoon faz: vídeo novo, imagem nova ou texto de anúncio novo pra trocar criativo ruim, sempre pensando no ramo desse negócio.`;
}

async function analisar(neg: J | null, conteudo: Array<J>) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("sem_chave");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort: "medium" },
      system: sistema(neg),
      tools: [TOOL],
      tool_choice: { type: "tool", name: "analise" },
      messages: [{ role: "user", content: conteudo }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic_${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const tool = ((data.content ?? []) as J[]).find((b) => b.type === "tool_use");
  if (!tool) throw new Error("sem_analise");
  const custo = Number(data.usage?.input_tokens ?? 0) * USD_IN + Number(data.usage?.output_tokens ?? 0) * USD_OUT;
  return { resultado: obj(tool.input), custo, i: Number(data.usage?.input_tokens ?? 0), o: Number(data.usage?.output_tokens ?? 0) };
}

// números da Meta, enxutos pra IA
async function numerosDaMeta(token: string, conta: string, periodo: string) {
  const [camp, ins] = await Promise.all([
    graph(`${conta}/campaigns`, token, { fields: "name,status,effective_status,objective,daily_budget,lifetime_budget", limit: "100" }),
    graph(`${conta}/insights`, token, {
      level: "campaign",
      date_preset: periodo,
      fields: "campaign_id,campaign_name,spend,impressions,reach,frequency,clicks,inline_link_clicks,ctr,cpc,cpm,actions,cost_per_action_type,purchase_roas",
      limit: "100",
    }),
  ]);
  const info = new Map<string, J>();
  for (const c of (camp.data as J[]) ?? []) info.set(str(c.id), c);
  const linhas = ((ins.data as J[]) ?? []).map((r) => {
    const c = info.get(str(r.campaign_id)) ?? {};
    const acoes = Object.fromEntries(((r.actions as J[]) ?? []).map((a) => [str(a.action_type), str(a.value)]));
    const custos = Object.fromEntries(((r.cost_per_action_type as J[]) ?? []).map((a) => [str(a.action_type), str(a.value)]));
    return {
      campanha: r.campaign_name,
      status: c.effective_status ?? c.status,
      objetivo: c.objective,
      orcamento_diario: c.daily_budget ? Number(c.daily_budget) / 100 : undefined,
      gasto: r.spend,
      impressoes: r.impressions,
      alcance: r.reach,
      frequencia: r.frequency,
      cliques_no_link: r.inline_link_clicks,
      ctr: r.ctr,
      cpc: r.cpc,
      cpm: r.cpm,
      resultados: acoes,
      custo_por_resultado: custos,
      roas_compras: ((r.purchase_roas as J[]) ?? [])[0]?.value,
    };
  });
  const semDados = [...info.values()].filter((c) => !linhas.some((l) => l.campanha === c.name) && str(c.effective_status) === "ACTIVE").map((c) => c.name);
  return { linhas, semDados };
}

/* ---------------- servidor ---------------- */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "metodo" }, 405);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const tokenApp = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: who } = await db.auth.getUser(tokenApp);
  const user = who?.user;
  if (!user) return json({ error: "nao_autenticado" }, 401);
  let body: J = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "corpo_invalido" }, 400);
  }
  const acao = str(body.acao);

  try {
    if (acao === "conectar") {
      const token = str(body.token).trim().replace(/\s+/g, "");
      if (token.length < 30 || token.length > 1000) return json({ error: "token_invalido" }, 400);
      const eu = await graph("me", token, { fields: "id,name" });
      const contas = await graph("me/adaccounts", token, { fields: "name,account_id,currency,account_status", limit: "50" });
      const lista = ((contas.data as J[]) ?? []).map((c) => ({ id: `act_${str(c.account_id)}`, nome: str(c.name) || `Conta ${str(c.account_id)}`, moeda: str(c.currency), ativa: Number(c.account_status) === 1 }));
      if (!lista.length) return json({ error: "sem_contas" }, 404);
      let expira: string | null = null;
      try {
        const info = await graph("oauth/access_token_info", token);
        const s = Number(info.expires_in);
        if (s > 0) expira = new Date(Date.now() + s * 1000).toISOString();
      } catch {
        /* sem informação de validade */
      }
      await db.from("anuncios_tokens").upsert({ user_id: user.id, token, criado_em: new Date().toISOString() });
      const unica = lista.length === 1 ? lista[0] : null;
      await db.from("anuncios_conexoes").upsert({ user_id: user.id, meta_nome: str(eu.name), contas: lista, conta_id: unica?.id ?? null, conta_nome: unica?.nome ?? null, moeda: unica?.moeda ?? null, expira_em: expira, atualizado_em: new Date().toISOString() });
      return json({ ok: true, nome: eu.name, contas: lista, expira_em: expira });
    }

    if (acao === "escolher") {
      const { data: con } = await db.from("anuncios_conexoes").select("contas").eq("user_id", user.id).maybeSingle();
      const c = ((con?.contas as J[]) ?? []).find((x) => str(x.id) === str(body.conta_id));
      if (!c) return json({ error: "conta_invalida" }, 400);
      await db.from("anuncios_conexoes").update({ conta_id: c.id, conta_nome: c.nome, moeda: c.moeda, atualizado_em: new Date().toISOString() }).eq("user_id", user.id);
      return json({ ok: true });
    }

    if (acao === "desconectar") {
      await db.from("anuncios_tokens").delete().eq("user_id", user.id);
      await db.from("anuncios_conexoes").delete().eq("user_id", user.id);
      return json({ ok: true });
    }

    if (acao === "analisar" || acao === "analisar_arquivo") {
      const { data: neg } = await db.from("business_profiles").select("name, niche, sells, audience, tipo").eq("user_id", user.id).maybeSingle();
      const conteudo: J[] = [];
      let periodo: string | null = null;
      let contaNome: string | null = null;

      if (acao === "analisar") {
        periodo = PERIODOS[str(body.periodo)] ? str(body.periodo) : "last_7d";
        const [{ data: tk }, { data: con }] = await Promise.all([
          db.from("anuncios_tokens").select("token").eq("user_id", user.id).maybeSingle(),
          db.from("anuncios_conexoes").select("conta_id, conta_nome, moeda").eq("user_id", user.id).maybeSingle(),
        ]);
        if (!tk?.token) return json({ error: "sem_conexao" }, 400);
        if (!con?.conta_id) return json({ error: "sem_conta" }, 400);
        contaNome = con.conta_nome;
        const { linhas, semDados } = await numerosDaMeta(tk.token, con.conta_id, periodo);
        if (!linhas.length) return json({ error: "sem_dados" }, 404);
        conteudo.push({ type: "text", text: `Conta: ${con.conta_nome} (moeda ${con.moeda || "BRL"}). Período: ${PERIODOS[periodo]}.\nNúmeros por campanha (JSON da Meta, já resumido):\n${JSON.stringify(linhas).slice(0, 60000)}${semDados.length ? `\nCampanhas ativas sem entrega no período: ${semDados.join(", ")}` : ""}\n\nAnalise e responda chamando a ferramenta analise.` });
      } else {
        const texto = str(body.texto).slice(0, 60000);
        const imagens = (Array.isArray(body.imagens) ? body.imagens : []).slice(0, 4).map((x) => str(x)).filter((x) => x.startsWith("data:image/"));
        if (!texto.trim() && !imagens.length) return json({ error: "vazio" }, 400);
        for (const d of imagens) {
          const m = d.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
          if (m && m[2].length < 7_000_000) conteudo.push({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } });
        }
        conteudo.push({ type: "text", text: `${texto ? `Relatório exportado do Gerenciador de Anúncios:\n${texto}\n\n` : "Prints do Gerenciador de Anúncios acima.\n\n"}Analise e responda chamando a ferramenta analise. Use só o que dá pra ver nos dados.` });
      }

      const { data: pr } = await db.from("settings").select("value").eq("key", "credits_per_ads_analysis").maybeSingle();
      const custoCred = Number(pr?.value ?? 5);
      const cob = await db.rpc("spend_credits", { p_user: user.id, p_amount: custoCred, p_reason: "Anúncios: análise", p_story: null });
      if (cob.error) return json({ error: "creditos_insuficientes" }, 402);
      try {
        const r = await analisar(neg, conteudo);
        const { data: salvo } = await db.from("anuncios_analises").insert({ user_id: user.id, origem: acao === "analisar" ? "meta" : "arquivo", periodo: periodo ? PERIODOS[periodo] : null, conta_nome: contaNome, resultado: r.resultado }).select("id, origem, periodo, conta_nome, resultado, created_at").single();
        await db.from("ai_usage").insert({ user_id: user.id, modulo: "anuncios", ref: salvo?.id ?? null, input_tokens: r.i, output_tokens: r.o, custo_usd: r.custo, creditos: custoCred });
        return json({ analise: salvo });
      } catch (e) {
        await db.rpc("refund_credits", { p_user: user.id, p_amount: custoCred, p_reason: "Anúncios: análise (devolvido)" });
        throw e;
      }
    }

    return json({ error: "acao_invalida" }, 400);
  } catch (e) {
    const m = erroMeta(e);
    if (m) return m;
    console.error(e);
    return json({ error: "falhou" }, 502);
  }
});
