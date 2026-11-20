// Criador de Apps: o Claude cria (e ajusta) um app de uma página pro negócio, conversando com a pessoa.
// O app é um arquivo HTML único, sem backend: pedidos e agendamentos vão pro WhatsApp do negócio.
// Cobra os créditos antes e devolve se der erro.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-sonnet-5-5";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

function regras(neg: Record<string, unknown> | null) {
  const p = neg ?? {};
  const zap = String(((p.socials as Record<string, string>) ?? {}).whatsapp ?? "").replace(/\D/g, "");
  const insta = String(((p.socials as Record<string, string>) ?? {}).instagram ?? "").replace(/^@/, "");
  const cores = ((p.colors as string[]) ?? []).join(", ");
  return `Você é o construtor de apps do Plotoon. Cria apps web de uma página pra pequenos negócios no Brasil: cardápio digital, catálogo de produtos, agendamento, link na bio, página de vendas, orçamento, cupom, quiz, cartão de visita digital e o que mais a pessoa pedir.

Negócio: ${p.name || "não informado"} | Nicho: ${p.niche || "não informado"} | Vende: ${p.sells || "não informado"} | Público: ${p.audience || "não informado"} | Cores da marca: ${cores || "escolha uma paleta bonita"} | WhatsApp: ${zap ? `55${zap.replace(/^55/, "")}` : "não informado"} | Instagram: ${insta || "não informado"}.

Regras técnicas (obrigatórias):
- Entregue UM arquivo HTML completo (<!DOCTYPE html> até </html>), com CSS e JavaScript dentro do próprio arquivo.
- Não use nada de fora: sem bibliotecas, sem CDNs, sem fontes externas (use font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif), sem imagens externas. Use emojis, gradientes, formas em CSS e SVG inline.
- Pensado primeiro pro celular, bonito, moderno e profissional, com as cores da marca, botões grandes e fáceis de tocar.
- Não existe servidor: pedidos, agendamentos, orçamentos e contatos são enviados pelo WhatsApp do negócio, abrindo https://wa.me/NUMERO?text=MENSAGEM com a mensagem pronta (use encodeURIComponent) e target="_blank". Se o WhatsApp não foi informado, use o link https://wa.me/?text=MENSAGEM.
- Não use localStorage, sessionStorage, cookies nem IndexedDB (o app roda isolado). Guarde o estado em variáveis.
- Nunca crie campo de senha, login, dados de cartão ou documento, e nunca imite a marca, o logo ou o site de outra empresa.
- Textos em português do Brasil. Preços com R$ quando a pessoa informar; se não informar, deixe preços de exemplo fáceis de trocar.
- Ao ajustar um app que já existe, mantenha tudo o que já está lá e mude só o que foi pedido.

Responda chamando a ferramenta entregar_app com: o nome do app, uma resposta curta e amigável pra pessoa (o que você fez e uma sugestão de próximo ajuste) e o HTML completo.`;
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
  const pedido = String(body.pedido ?? "").trim().slice(0, 3000);
  if (pedido.length < 3) return json({ error: "pedido_vazio" }, 400);

  let app: { id: string; name: string; html: string; messages: Array<{ role: string; text: string }> } | null = null;
  if (typeof body.app_id === "string") {
    const { data } = await admin.from("apps").select("id, name, html, messages").eq("id", body.app_id).eq("user_id", user.id).maybeSingle();
    if (!data) return json({ error: "app_nao_encontrado" }, 404);
    app = data as typeof app;
  }

  const { data: preco } = await admin.from("settings").select("value").eq("key", "credits_per_app").maybeSingle();
  const custo = Number(preco?.value ?? 8);
  const cobranca = await admin.rpc("spend_credits", { p_user: user.id, p_amount: custo, p_reason: app ? "App: ajuste" : "App: criar", p_story: null });
  if (cobranca.error) {
    const sem = String(cobranca.error.message).includes("creditos_insuficientes");
    return json({ error: sem ? "creditos_insuficientes" : "cobranca_falhou" }, sem ? 402 : 500);
  }

  try {
    const { data: neg } = await admin.from("business_profiles").select("name, niche, sells, audience, colors, socials").eq("user_id", user.id).maybeSingle();
    const conversa = (app?.messages ?? []).slice(-8).map((m) => `${m.role === "user" ? "Pessoa" : "Você"}: ${m.text}`).join("\n");
    const conteudo = app?.html
      ? `Conversa até aqui:\n${conversa || "(sem conversa)"}\n\nHTML atual do app "${app.name}":\n<<<HTML\n${app.html}\nHTML>>>\n\nNovo pedido da pessoa: ${pedido}`
      : `Pedido da pessoa: ${pedido}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 20000,
        system: regras(neg),
        tools: [
          {
            name: "entregar_app",
            description: "Entrega o app pronto.",
            input_schema: {
              type: "object",
              properties: {
                nome: { type: "string", description: "Nome curto do app, até 6 palavras." },
                resposta: { type: "string", description: "Mensagem curta pra pessoa: o que foi feito e uma sugestão de ajuste." },
                html: { type: "string", description: "O HTML completo do app." },
              },
              required: ["nome", "resposta", "html"],
            },
          },
        ],
        tool_choice: { type: "auto" },
        messages: [{ role: "user", content: `${conteudo}\n\nResponda chamando a ferramenta entregar_app.` }],
      }),
    });
    if (!res.ok) throw new Error(`anthropic_${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const out = (data.content ?? []).find((b: { type: string }) => b.type === "tool_use")?.input as { nome?: string; resposta?: string; html?: string } | undefined;
    const html = String(out?.html ?? "").trim();
    if (!/<html[\s>]/i.test(html) || html.length > 400000) throw new Error("html_invalido");
    const nome = String(out?.nome ?? app?.name ?? "Meu app").slice(0, 80);
    const resposta = String(out?.resposta ?? "Pronto! Dá uma olhada na prévia.").slice(0, 1500);
    const messages = [...(app?.messages ?? []), { role: "user", text: pedido }, { role: "assistant", text: resposta }].slice(-30);

    let saved;
    if (app) {
      saved = await admin.from("apps").update({ name: nome, html, messages, updated_at: new Date().toISOString() }).eq("id", app.id).select("id, name, slug, html, messages, published, updated_at").single();
    } else {
      saved = await admin.from("apps").insert({ user_id: user.id, name: nome, html, messages }).select("id, name, slug, html, messages, published, updated_at").single();
    }
    if (saved.error) throw saved.error;
    const { data: perfil } = await admin.from("profiles").select("credits").eq("id", user.id).single();
    return json({ app: saved.data, resposta, creditos: perfil?.credits ?? null });
  } catch (e) {
    console.error(e);
    await admin.rpc("refund_credits", { p_user: user.id, p_amount: custo, p_reason: "App (devolvido)" });
    return json({ error: "falha_app" }, 502);
  }
});
