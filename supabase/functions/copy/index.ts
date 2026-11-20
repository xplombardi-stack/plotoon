// Copy: escreve 3 opções de legenda, gancho, texto de anúncio ou mensagem de venda no tom do negócio.
// Cobra os créditos antes, devolve se der erro e guarda na Biblioteca.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-sonnet-5-5";
const TIPOS: Record<string, string> = {
  legenda: "legenda de post pro Instagram (com emojis na medida e chamada pra ação no fim)",
  gancho: "gancho pros 2 primeiros segundos de um vídeo curto (uma frase que prende)",
  anuncio: "texto de anúncio pro Meta Ads (texto principal curto, benefício claro e chamada pra ação)",
  venda: "mensagem de venda pro WhatsApp (curta, pessoal, termina com uma pergunta que puxa resposta)",
};
const NOMES: Record<string, string> = { legenda: "Legenda", gancho: "Gancho", anuncio: "Anúncio", venda: "Mensagem de venda" };
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "metodo" }, 405);
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "copy_sem_chave" }, 503);

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
  const tipo = Object.keys(TIPOS).includes(String(body.tipo)) ? String(body.tipo) : "legenda";
  const tema = String(body.tema ?? "").trim().slice(0, 600);
  const extra = String(body.extra ?? "").trim().slice(0, 300);
  if (tema.length < 3) return json({ error: "tema_vazio" }, 400);

  const { data: preco } = await admin.from("settings").select("value").eq("key", "credits_per_copy").maybeSingle();
  const custo = Number(preco?.value ?? 1);
  const cobranca = await admin.rpc("spend_credits", { p_user: user.id, p_amount: custo, p_reason: `Copy: ${NOMES[tipo]}`, p_story: null });
  if (cobranca.error) {
    const sem = String(cobranca.error.message).includes("creditos_insuficientes");
    return json({ error: sem ? "creditos_insuficientes" : "cobranca_falhou" }, sem ? 402 : 500);
  }

  try {
    const { data: p } = await admin.from("business_profiles").select("name, niche, sells, audience, tone, socials").eq("user_id", user.id).maybeSingle();
    const zap = (p?.socials as Record<string, string> | null)?.whatsapp;
    const system = `Você é o redator do Plotoon. Escreve textos que vendem pra pequenos negócios no Brasil, em português do Brasil natural.
Negócio: ${p?.name || "não informado"} | Nicho: ${p?.niche || "não informado"} | Vende: ${p?.sells || "não informado"} | Público: ${p?.audience || "não informado"} | Tom: ${TONS[String(p?.tone)] ?? "amigável"}${zap ? ` | WhatsApp: ${zap}` : ""}.
Regras: nada de promessa de resultado garantido, nada de conteúdo adulto, apostas ou cassino. Sem hashtags em excesso (no máximo 3, só em legenda). Cada opção com um ângulo diferente.`;
    const pedido = `Escreva 3 opções de ${TIPOS[tipo]}.\nSobre: ${tema}${extra ? `\nOferta ou detalhe: ${extra}` : ""}\n\nResponda chamando a ferramenta entregar.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1800,
        system,
        tools: [
          {
            name: "entregar",
            description: "Entrega as 3 opções de texto.",
            input_schema: { type: "object", properties: { opcoes: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } } }, required: ["opcoes"] },
          },
        ],
        tool_choice: { type: "auto" },
        messages: [{ role: "user", content: pedido }],
      }),
    });
    if (!res.ok) throw new Error(`anthropic_${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const out = (data.content ?? []).find((b: { type: string }) => b.type === "tool_use")?.input as { opcoes?: string[] } | undefined;
    const opcoes = (out?.opcoes ?? []).map((o) => String(o).trim()).filter(Boolean).slice(0, 3);
    if (!opcoes.length) throw new Error("sem_resposta");

    await admin.from("library_items").insert({
      user_id: user.id,
      kind: "copy",
      module: "copy",
      title: `${NOMES[tipo]}: ${tema.slice(0, 70)}`,
      body: opcoes.join("\n\n———\n\n"),
      meta: { tipo, tema, extra, opcoes },
    });
    const { data: perfil } = await admin.from("profiles").select("credits").eq("id", user.id).single();
    return json({ opcoes, creditos: perfil?.credits ?? null });
  } catch (e) {
    console.error(e);
    await admin.rpc("refund_credits", { p_user: user.id, p_amount: custo, p_reason: "Copy (devolvido)" });
    return json({ error: "falha_copy" }, 502);
  }
});
