// Logo com IA: cria a logo do negócio com o Nano Banana (Google Gemini).
// Cobra os créditos antes de gerar, devolve se der erro e guarda a logo na Biblioteca.
// Precisa do segredo GEMINI_API_KEY no Supabase (Edge Functions → Secrets).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODELS = ["gemini-nano-banana-2.1", "gemini-3.1-flash-image", "gemini-2.5-flash-image"];

const ESTILOS: Record<string, string> = {
  moderna: "modern, bold geometric shapes, confident and clean",
  minimalista: "minimalist, very simple mark, thin lines, lots of negative space",
  divertida: "playful and friendly, rounded shapes, cheerful",
  elegante: "elegant and premium, refined serif or script typography, luxury feel",
  mascote: "a simple friendly mascot icon next to the brand name, flat illustration",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const limpa = (v: unknown, n: number) => String(v ?? "").replace(/[\n\r"`]/g, " ").trim().slice(0, n);

function prompt(nome: string, nicho: string, estilo: string, cores: string[], ideia: string) {
  return [
    `Design a professional logo for a small business called "${nome}"${nicho ? `, a ${nicho} business in Brazil` : ""}.`,
    `Style: ${ESTILOS[estilo] ?? ESTILOS.moderna}.`,
    cores.length ? `Use mainly these brand colors: ${cores.join(", ")}.` : "Use a harmonious, modern color palette.",
    ideia ? `Idea from the owner: ${ideia}.` : "",
    `Write the brand name exactly as "${nome}", spelled correctly, clearly legible.`,
    "Flat vector logo, centered, on a plain pure white background, generous margins, no mockup, no photo, no extra words, no slogan, no watermark.",
  ]
    .filter(Boolean)
    .join(" ");
}

function fromBase64(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function gerar(key: string, texto: string) {
  let last = "";
  for (const model of MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: texto }] }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1" } },
      }),
    });
    if (res.status === 404) {
      last = `${model}: 404`;
      continue;
    }
    if (!res.ok) throw new Error(`gemini_${res.status}: ${(await res.text()).slice(0, 400)}`);
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const img = parts.find((p: Record<string, unknown>) => p.inlineData || p.inline_data);
    const blob = (img?.inlineData ?? img?.inline_data) as { data?: string; mimeType?: string; mime_type?: string } | undefined;
    if (!blob?.data) throw new Error(`sem_imagem: ${JSON.stringify(data).slice(0, 400)}`);
    return { bytes: fromBase64(blob.data), mime: blob.mimeType ?? blob.mime_type ?? "image/png", model };
  }
  throw new Error(`sem_modelo: ${last}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "metodo" }, 405);

  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return json({ error: "logo_sem_chave" }, 503);

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
  const nome = limpa(body.nome, 60);
  if (nome.length < 2) return json({ error: "nome_vazio" }, 400);
  const nicho = limpa(body.nicho, 60);
  const ideia = limpa(body.ideia, 240);
  const estilo = Object.keys(ESTILOS).includes(String(body.estilo)) ? String(body.estilo) : "moderna";
  const cores = (Array.isArray(body.cores) ? body.cores : []).map(String).filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 4);

  const { data: preco } = await admin.from("settings").select("value").eq("key", "credits_per_logo").maybeSingle();
  const custo = Number(preco?.value ?? 5);
  const cobranca = await admin.rpc("spend_credits", { p_user: user.id, p_amount: custo, p_reason: "Logo com IA", p_story: null });
  if (cobranca.error) {
    const sem = String(cobranca.error.message).includes("creditos_insuficientes");
    return json({ error: sem ? "creditos_insuficientes" : "cobranca_falhou" }, sem ? 402 : 500);
  }

  try {
    const out = await gerar(key, prompt(nome, nicho, estilo, cores, ideia));
    const ext = out.mime.includes("jpeg") ? "jpg" : out.mime.includes("webp") ? "webp" : "png";
    const path = `${user.id}/logos/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const up = await admin.storage.from("media").upload(path, out.bytes, { contentType: out.mime });
    if (up.error) throw new Error(`storage: ${up.error.message}`);
    await admin.from("library_items").insert({ user_id: user.id, kind: "imagem", module: "logo", title: `Logo ${nome}`, preview_path: path, file_path: path, meta: { estilo, cores } });
    const { data: signed } = await admin.storage.from("media").createSignedUrl(path, 60 * 60);
    const { data: perfil } = await admin.from("profiles").select("credits").eq("id", user.id).single();
    return json({ imagem: signed?.signedUrl, imagem_path: path, creditos: perfil?.credits ?? null, modelo: out.model });
  } catch (e) {
    console.error(e);
    await admin.rpc("refund_credits", { p_user: user.id, p_amount: custo, p_reason: "Logo com IA (devolvido)" });
    const msg = String((e as Error).message ?? "");
    const recusado = /SAFETY|blocked|PROHIBITED|sem_imagem/i.test(msg);
    return json({ error: recusado ? "logo_recusada" : msg.includes("gemini_429") ? "sem_cota" : "falha_logo" }, recusado ? 422 : 502);
  }
});
