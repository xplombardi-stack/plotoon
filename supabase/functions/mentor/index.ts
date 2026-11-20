// Mentor do Plotoon: conversa sobre vendas e estratégia, conhecendo o perfil do negócio.
// Lê prints (ex.: do Instagram), responde e sugere ações que abrem o módulo certo já preenchido.
// Precisa do segredo ANTHROPIC_API_KEY no Supabase (Edge Functions → Secrets).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-sonnet-5-5";
const TIPOS = ["video", "copy", "imagem", "calendario", "whatsapp", "anuncios"];
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

function regras(neg: Record<string, unknown> | null) {
  const p = neg ?? {};
  const redes = Object.entries((p.socials as Record<string, string>) ?? {})
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return `Você é o Mentor do Plotoon, um mentor de vendas e marketing pra pequenos negócios no Brasil.
Seu jeito: direto, prático e próximo, como um empresário experiente que já vendeu muito com tráfego pago, conteúdo e WhatsApp. Fala português do Brasil informal, sem enrolação e sem jargão. Nada de respostas genéricas: tudo pensado pro negócio da pessoa.

O negócio de quem está falando com você:
- Nome: ${p.name || "não informado"}
- Nicho: ${p.niche || "não informado"}
- O que vende: ${p.sells || "não informado"}
- Público: ${p.audience || "não informado"}
- Tom da marca: ${TONS[String(p.tone)] ?? "não informado"}
- Redes: ${redes || "não informadas"}

Como responder:
- Respostas curtas e escaneáveis (até ~180 palavras), com listas quando ajudar. Plano completo só quando pedirem ou fizer sentido.
- Se faltar informação importante pra uma boa resposta (cidade, preço, ticket, canal), faça 1 ou 2 perguntas antes.
- Você não consegue abrir links nem entrar no Instagram de ninguém. Se a pessoa quiser análise do perfil, peça prints (bio, feed e um post), que ela anexa pelo clipe. Quando vierem prints, analise de verdade: bio, chamada pra ação, fotos, frequência de vídeo, prova social, preço visível.
- Sempre termine com o próximo passo claro.
- Quando sugerir algo que o Plotoon faz, inclua uma ação (até 3): video (historinha em vídeo), copy (legenda, gancho, anúncio ou mensagem de venda), imagem (foto de produto, post, banner, capa), calendario (planejar posts), whatsapp (atendimento), anuncios (análise de campanhas). No detalhe da ação, escreva o pedido já pronto pra ferramenta (ex.: a ideia do vídeo em uma frase, ou o tema da legenda).
- Nada de promessas de resultado garantido, conteúdo adulto, apostas ou cassino.`;
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
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            tipo: { type: "string", enum: TIPOS },
            titulo: { type: "string", description: "Rótulo curto da ação, até 7 palavras." },
            detalhe: { type: "string", description: "O pedido pronto pra ferramenta." },
            formato: { type: "string", description: "Só pra copy: legenda, gancho, anuncio ou venda. Só pra imagem: produto, post, banner ou capa." },
          },
          required: ["tipo", "titulo", "detalhe"],
        },
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

    const [{ data: neg }, { data: antigas }] = await Promise.all([
      admin.from("business_profiles").select("name, niche, sells, audience, tone, socials").eq("user_id", user.id).maybeSingle(),
      admin.from("mentor_messages").select("role, content").eq("thread_id", threadId).order("created_at", { ascending: false }).limit(16),
    ]);

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
        system: regras(neg),
        tools: [TOOL],
        tool_choice: { type: "auto" },
        messages: [...historico, { role: "user", content: atual }],
      }),
    });
    if (!res.ok) throw new Error(`anthropic_${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const blocks = (data.content ?? []) as Array<Record<string, unknown>>;
    const tool = blocks.find((b) => b.type === "tool_use")?.input as { texto?: string; acoes?: Array<Record<string, string>> } | undefined;
    const texto = String(tool?.texto ?? blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n") ?? "").trim();
    if (!texto) throw new Error("sem_resposta");
    const acoes = (tool?.acoes ?? [])
      .filter((a) => TIPOS.includes(a.tipo))
      .slice(0, 3)
      .map((a) => ({ tipo: a.tipo, titulo: String(a.titulo ?? "").slice(0, 80), detalhe: String(a.detalhe ?? "").slice(0, 600), formato: a.formato ? String(a.formato).slice(0, 20) : undefined }));

    const { data: msg } = await admin
      .from("mentor_messages")
      .insert({ thread_id: threadId, user_id: user.id, role: "assistant", content: texto, actions: acoes })
      .select("id, created_at")
      .single();
    await admin.from("mentor_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
    const { data: perfil } = await admin.from("profiles").select("credits").eq("id", user.id).single();
    return json({ thread_id: threadId, mensagem: { id: msg?.id, texto, acoes, criada: msg?.created_at }, creditos: perfil?.credits ?? null });
  } catch (e) {
    console.error(e);
    await admin.rpc("refund_credits", { p_user: user.id, p_amount: custo, p_reason: "Mentor (devolvido)" });
    return json({ error: "falha_mentor", thread_id: threadId }, 502);
  }
});
