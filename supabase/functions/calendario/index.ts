// Calendário: o Mentor planeja os posts do mês pro negócio e grava no calendário.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-sonnet-5-5";
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
  const ano = Number(body.ano);
  const mes = Number(body.mes); // 1..12
  if (!(ano >= 2024 && ano <= 2100 && mes >= 1 && mes <= 12)) return json({ error: "mes_invalido" }, 400);
  const porSemana = Math.min(7, Math.max(1, Number(body.por_semana) || 3));
  const foco = String(body.foco ?? "").trim().slice(0, 400);
  const dias = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const hoje = new Date();
  const inicio = ano === hoje.getUTCFullYear() && mes === hoje.getUTCMonth() + 1 ? hoje.getUTCDate() : 1;

  const { data: preco } = await admin.from("settings").select("value").eq("key", "credits_per_plan").maybeSingle();
  const custo = Number(preco?.value ?? 3);
  const cobranca = await admin.rpc("spend_credits", { p_user: user.id, p_amount: custo, p_reason: "Calendário do mês", p_story: null });
  if (cobranca.error) {
    const sem = String(cobranca.error.message).includes("creditos_insuficientes");
    return json({ error: sem ? "creditos_insuficientes" : "cobranca_falhou" }, sem ? 402 : 500);
  }

  try {
    const { data: p } = await admin.from("business_profiles").select("name, niche, sells, audience, tone").eq("user_id", user.id).maybeSingle();
    const pedido = `Monte o calendário de conteúdo de ${String(mes).padStart(2, "0")}/${ano} (dias ${inicio} a ${dias}) pro negócio abaixo, com cerca de ${porSemana} posts por semana.
Negócio: ${p?.name || "não informado"} | Nicho: ${p?.niche || "não informado"} | Vende: ${p?.sells || "não informado"} | Público: ${p?.audience || "não informado"} | Tom: ${p?.tone || "amigável"}.
${foco ? `Foco do mês: ${foco}.` : ""}
Misture: vídeo (historinha curta com gancho), post (imagem com legenda), story e copy (mensagem de venda/campanha). Aproveite datas comemorativas do Brasil que façam sentido pro nicho nesse mês. Varie os dias da semana. Títulos curtos e ideias concretas, prontas pra produzir.
Responda chamando a ferramenta entregar_calendario.`;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 5000,
        system: "Você é o Mentor do Plotoon, estrategista de conteúdo pra pequenos negócios no Brasil. Escreve em português do Brasil, prático e direto. Nada de apostas, cassino ou conteúdo adulto.",
        tools: [
          {
            name: "entregar_calendario",
            description: "Entrega os posts do mês.",
            input_schema: {
              type: "object",
              properties: {
                posts: {
                  type: "array",
                  maxItems: 31,
                  items: {
                    type: "object",
                    properties: {
                      dia: { type: "integer", minimum: 1, maximum: 31 },
                      tipo: { type: "string", enum: ["video", "post", "story", "copy"] },
                      canal: { type: "string", description: "Instagram, TikTok, WhatsApp..." },
                      titulo: { type: "string" },
                      ideia: { type: "string", description: "O que fazer, em 1 ou 2 frases, pronto pra produzir." },
                    },
                    required: ["dia", "tipo", "titulo", "ideia"],
                  },
                },
              },
              required: ["posts"],
            },
          },
        ],
        tool_choice: { type: "auto" },
        messages: [{ role: "user", content: pedido }],
      }),
    });
    if (!res.ok) throw new Error(`anthropic_${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const out = (data.content ?? []).find((b: { type: string }) => b.type === "tool_use")?.input as { posts?: Array<Record<string, unknown>> } | undefined;
    const rows = (out?.posts ?? [])
      .map((x) => ({ dia: Math.round(Number(x.dia)), tipo: String(x.tipo), canal: String(x.canal ?? "Instagram").slice(0, 30), titulo: String(x.titulo ?? "").slice(0, 160), ideia: String(x.ideia ?? "").slice(0, 1000) }))
      .filter((x) => x.dia >= inicio && x.dia <= dias && x.titulo && ["video", "post", "story", "copy"].includes(x.tipo))
      .map((x) => ({ user_id: user.id, day: `${ano}-${String(mes).padStart(2, "0")}-${String(x.dia).padStart(2, "0")}`, kind: x.tipo, channel: x.canal || "Instagram", title: x.titulo, idea: x.ideia }));
    if (!rows.length) throw new Error("sem_posts");
    const { error } = await admin.from("calendar_posts").insert(rows);
    if (error) throw error;
    const { data: perfil } = await admin.from("profiles").select("credits").eq("id", user.id).single();
    return json({ criados: rows.length, creditos: perfil?.credits ?? null });
  } catch (e) {
    console.error(e);
    await admin.rpc("refund_credits", { p_user: user.id, p_amount: custo, p_reason: "Calendário (devolvido)" });
    return json({ error: "falha_calendario" }, 502);
  }
});
