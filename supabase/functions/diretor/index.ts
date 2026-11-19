// Diretor do Plotoon: o Claude escreve a historinha em partes e ajusta partes a pedido.
// Precisa do segredo ANTHROPIC_API_KEY no Supabase (Edge Functions → Secrets).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MODELS: Record<string, string> = { caprichado: "claude-sonnet-5-5", rapido: "claude-haiku-5-5" };
const BACKDROPS = ["noite", "quarto", "loja", "rua", "escritorio"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const REGRAS = `Você é o Diretor do Plotoon, um estúdio de historinhas curtas em animação 3D (estilo cinema) para Reels, TikTok e Shorts, em formato vertical 9:16.
Regras:
- Escreva sempre em português do Brasil, com linguagem natural e jovem.
- A parte 1 precisa de um gancho forte nos primeiros segundos.
- Falas curtas (até 15 palavras), fáceis de virar legenda.
- Use os personagens pelo nome, exatamente como foram dados. Eles têm rosto e roupa fixos.
- O prompt de cada parte é o texto que vai pro gerador de vídeo. Ele deve dizer: animação 3D estilo cinema, vertical 9:16, a duração, o cenário, quem aparece (pelos nomes, com "mesmo rosto e mesma roupa"), o que acontece, 1 ou 2 takes com ângulo de câmera, e a fala entre aspas com "fala em português do Brasil".
- Nada de marcas registradas, personagens famosos, conteúdo adulto, violência, apostas ou cassino.`;

async function callClaude(key: string, model: string, system: string, user: string, tool: Record<string, unknown>) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 6000,
      system,
      tools: [tool],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: `${user}\n\nResponda chamando a ferramenta ${tool.name}.` }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic_${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const block = (data.content ?? []).find((b: { type: string }) => b.type === "tool_use");
  if (!block) throw new Error("sem_resposta");
  return block.input as Record<string, unknown>;
}

const parteSchema = {
  type: "object",
  properties: {
    momento: { type: "string", description: "Nome curto do momento: Gancho, Problema, Tentativa, Virada, Conquista, Final..." },
    cena: { type: "string", description: "O que acontece na cena, em 1 ou 2 frases curtas." },
    fala: { type: "string", description: "Fala curta em português do Brasil." },
    prompt: { type: "string", description: "Prompt completo pro gerador de vídeo, seguindo as regras." },
    cenario: { type: "string", enum: BACKDROPS, description: "Cenário mais próximo da cena (só pra miniatura)." },
  },
  required: ["momento", "cena", "fala", "prompt", "cenario"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "metodo" }, 405);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "diretor_sem_chave" }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "corpo_invalido" }, 400);
  }

  const personagens = (Array.isArray(body.personagens) ? body.personagens : [])
    .slice(0, 6)
    .map((p: { nome?: string; estilo?: string }) => `${String(p.nome ?? "").slice(0, 40)} (${String(p.estilo ?? "Cinema 3D").slice(0, 20)})`);
  const segundos = Math.min(15, Math.max(4, Number(body.segundos) || 10));
  const model = MODELS[String(body.modo)] ?? MODELS.caprichado;

  try {
    if (body.action === "roteiro") {
      const partes = Math.min(10, Math.max(1, Number(body.partes) || 3));
      const ideia = String(body.ideia ?? "").slice(0, 600);
      const clima = String(body.clima ?? "motivacional").slice(0, 30);
      if (ideia.trim().length < 3) return json({ error: "ideia_vazia" }, 400);
      const chamada = String(body.chamada ?? "").trim().slice(0, 140);
      const pedidoChamada = chamada
        ? `\nO vídeo vai ser usado como anúncio. A parte 1 abre com um gancho que prende nos 2 primeiros segundos. A última parte termina com o protagonista olhando pra câmera e fazendo esta chamada para ação, de um jeito natural e ligado à história: "${chamada}". A fala da chamada é curta e direta, e o prompt dessa parte pede o texto da chamada aparecendo na tela.`
        : "";

      const out = await callClaude(
        key,
        model,
        REGRAS,
        `Ideia: ${ideia}\nClima: ${clima}\nPersonagens: ${personagens.join(", ") || "um protagonista"}\nO primeiro personagem é o protagonista.\nEscreva a historinha em exatamente ${partes} parte(s), cada uma com até ${segundos} segundos.${pedidoChamada}`,
        {
          name: "entregar_roteiro",
          description: "Entrega o título e as partes da historinha.",
          input_schema: {
            type: "object",
            properties: {
              titulo: { type: "string", description: "Título curto e chamativo, até 8 palavras." },
              partes: { type: "array", minItems: partes, maxItems: partes, items: parteSchema },
            },
            required: ["titulo", "partes"],
          },
        },
      );
      return json(out);
    }

    if (body.action === "ajuste") {
      const pedido = String(body.pedido ?? "").slice(0, 500);
      const parte = (body.parte ?? {}) as Record<string, unknown>;
      const out = await callClaude(
        key,
        model,
        REGRAS,
        `Historinha: ${String(body.titulo ?? "").slice(0, 120)}\nIdeia original: ${String(body.ideia ?? "").slice(0, 600)}\nPersonagens: ${personagens.join(", ")}\nParte ${Number(parte.numero) || 1} (${String(parte.momento ?? "").slice(0, 40)}), até ${segundos} segundos:\n- Cena: ${String(parte.cena ?? "").slice(0, 600)}\n- Fala: ${String(parte.fala ?? "").slice(0, 300)}\n- Prompt: ${String(parte.prompt ?? "").slice(0, 3000)}\n\nPedido do usuário: ${pedido}\nAjuste essa parte conforme o pedido e responda ao usuário em uma frase curta.`,
        {
          name: "ajustar_parte",
          description: "Devolve a parte ajustada e uma resposta curta pro usuário.",
          input_schema: {
            type: "object",
            properties: {
              resposta: { type: "string", description: "Frase curta pro usuário dizendo o que mudou." },
              cena: parteSchema.properties.cena,
              fala: parteSchema.properties.fala,
              prompt: parteSchema.properties.prompt,
            },
            required: ["resposta", "cena", "fala", "prompt"],
          },
        },
      );
      return json(out);
    }

    return json({ error: "acao_invalida" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "falha_diretor" }, 502);
  }
});
