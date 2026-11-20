// Vídeo do produto: o Claude escreve o roteiro (gancho, produto, benefícios, confiança, oferta e chamada).
// O vídeo em si é montado e gravado no navegador da pessoa, sem custo de servidor.
// Cobra os créditos antes e devolve se der erro. Precisa do segredo ANTHROPIC_API_KEY.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-sonnet-5-5";
const TIPOS = ["gancho", "produto", "beneficio", "prova", "oferta", "cta"];
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

const TOOL = {
  name: "entregar_roteiro",
  description: "Entrega o roteiro do vídeo curto do produto.",
  input_schema: {
    type: "object",
    properties: {
      titulo: { type: "string", description: "Nome curto do vídeo, até 6 palavras." },
      legenda: { type: "string", description: "Legenda pro post, até 300 caracteres, com chamada pra ação e no máximo 3 hashtags." },
      cenas: {
        type: "array",
        minItems: 5,
        maxItems: 9,
        items: {
          type: "object",
          properties: {
            tipo: { type: "string", enum: TIPOS },
            texto: { type: "string", description: "Frase grande na tela. Até 6 palavras. Na cena oferta: só o preço ou a oferta (ex.: R$ 39,90)." },
            destaque: { type: "string", description: "1 ou 2 palavras do texto que vão em cor de destaque." },
            apoio: { type: "string", description: "Frase pequena de apoio, até 12 palavras. Opcional." },
            segundos: { type: "number", description: "Duração da cena, de 2.5 a 7." },
          },
          required: ["tipo", "texto", "segundos"],
        },
      },
    },
    required: ["titulo", "cenas"],
  },
};

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
  const produto = String(body.produto ?? "").trim().slice(0, 200);
  const oferta = String(body.oferta ?? "").trim().slice(0, 200);
  const destaque = String(body.destaque ?? "").trim().slice(0, 800);
  const duracao = Number(body.duracao) === 40 ? 40 : 30;
  if (produto.length < 2) return json({ error: "produto_vazio" }, 400);

  const { data: preco } = await admin.from("settings").select("value").eq("key", "credits_per_product_video").maybeSingle();
  const custo = Number(preco?.value ?? 3);
  const cobranca = await admin.rpc("spend_credits", { p_user: user.id, p_amount: custo, p_reason: "Vídeo do produto", p_story: null });
  if (cobranca.error) {
    const sem = String(cobranca.error.message).includes("creditos_insuficientes");
    return json({ error: sem ? "creditos_insuficientes" : "cobranca_falhou" }, sem ? 402 : 500);
  }

  try {
    const { data: p } = await admin.from("business_profiles").select("name, niche, sells, audience, tone, socials").eq("user_id", user.id).maybeSingle();
    const system = `Você é o diretor de vídeos curtos do Plotoon. Escreve roteiros de vídeos verticais de ${duracao} segundos que mostram um produto e fazem a pessoa querer comprar, no estilo dos Reels que mais vendem: gancho forte nos 2 primeiros segundos, ritmo rápido, frases curtas e chamada pra ação clara no fim.
Negócio: ${p?.name || "não informado"} | Nicho: ${p?.niche || "não informado"} | Vende: ${p?.sells || "não informado"} | Público: ${p?.audience || "não informado"} | Tom: ${TONS[String(p?.tone)] ?? "amigável"}.

Estrutura (6 a 8 cenas): 1 gancho (2.5 a 3.5s, pergunta ou afirmação que para o dedo), 1 produto (apresenta), 2 ou 3 beneficio (um benefício por cena), 1 prova (por que confiar: qualidade, origem, cuidado, garantia SE informada), 1 oferta (só se houver preço ou oferta informada; senão pule), 1 cta no fim (5 a 6s).
A soma dos segundos tem que dar ${duracao}.
Português do Brasil, natural, no tom da marca. Texto grande com no máximo 6 palavras.
Regras: use só fatos que a pessoa informou ou que são óbvios do produto. Não invente preço, desconto, número de clientes, prêmios, prazos ou garantias. Nada de promessa de resultado garantido, nem promessa de saúde ou cura. Nada de conteúdo adulto, apostas ou cassino.`;
    const pedido = `Produto: ${produto}${oferta ? `\nPreço/oferta: ${oferta}` : "\nSem preço informado (não crie cena de oferta com valor)."}${destaque ? `\nO que destacar: ${destaque}` : ""}\n\nResponda chamando a ferramenta entregar_roteiro.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1800, system, tools: [TOOL], tool_choice: { type: "auto" }, messages: [{ role: "user", content: pedido }] }),
    });
    if (!res.ok) throw new Error(`anthropic_${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const out = ((data.content ?? []) as Array<Record<string, unknown>>).find((b) => b.type === "tool_use")?.input as
      | { titulo?: string; legenda?: string; cenas?: Array<Record<string, unknown>> }
      | undefined;
    let cenas = (out?.cenas ?? [])
      .filter((c) => TIPOS.includes(String(c.tipo)) && String(c.texto ?? "").trim())
      .slice(0, 9)
      .map((c) => ({
        tipo: String(c.tipo),
        texto: String(c.texto).trim().slice(0, 60),
        destaque: c.destaque ? String(c.destaque).slice(0, 30) : undefined,
        apoio: c.apoio ? String(c.apoio).slice(0, 90) : undefined,
        segundos: Math.min(7, Math.max(2.5, Number(c.segundos) || 4)),
      }));
    if (cenas.length < 3) throw new Error("roteiro_curto");
    // a chamada sempre fecha o vídeo
    const cta = cenas.filter((c) => c.tipo === "cta").pop();
    cenas = cenas.filter((c) => c.tipo !== "cta");
    cenas.push(cta ?? { tipo: "cta", texto: "Chama no WhatsApp", destaque: "WhatsApp", apoio: undefined, segundos: 5 });
    // acerta a soma pra bater a duração escolhida
    const soma = cenas.reduce((s, c) => s + c.segundos, 0);
    const k = duracao / soma;
    cenas = cenas.map((c) => ({ ...c, segundos: Math.round(c.segundos * k * 10) / 10 }));

    const { data: perfil } = await admin.from("profiles").select("credits").eq("id", user.id).single();
    return json({ roteiro: { titulo: String(out?.titulo ?? produto).slice(0, 60), legenda: String(out?.legenda ?? "").slice(0, 400), cenas }, creditos: perfil?.credits ?? null });
  } catch (e) {
    console.error(e);
    await admin.rpc("refund_credits", { p_user: user.id, p_amount: custo, p_reason: "Vídeo do produto (devolvido)" });
    return json({ error: "falha_roteiro" }, 502);
  }
});
