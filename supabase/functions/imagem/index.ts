// Estúdio de Imagem: foto de produto, post, story, banner e capa com o Nano Banana (Google Gemini).
// Pode receber a foto do produto (do celular) e transforma em imagem profissional com as cores da marca.
// Cobra antes, devolve se der erro e guarda na Biblioteca.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODELS = ["gemini-nano-banana-2.1", "gemini-3.1-flash-image", "gemini-2.5-flash-image"];
const FORMATOS: Record<string, { ratio: string; desc: string }> = {
  produto: { ratio: "1:1", desc: "professional e-commerce product photo, studio lighting, clean background, soft shadow" },
  post: { ratio: "4:5", desc: "eye-catching Instagram feed post image" },
  story: { ratio: "9:16", desc: "vertical Instagram story / Reels cover image, key content centered away from the edges" },
  banner: { ratio: "16:9", desc: "wide promotional banner for a website or store" },
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
const limpa = (v: unknown, n: number) => String(v ?? "").replace(/[\r"`]/g, " ").trim().slice(0, n);

function fromBase64(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "metodo" }, 405);
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return json({ error: "imagem_sem_chave" }, 503);

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
  const formato = Object.keys(FORMATOS).includes(String(body.formato)) ? String(body.formato) : "produto";
  const pedido = limpa(body.pedido, 500);
  const usarMarca = body.marca !== false;
  const foto = String(body.foto ?? "").match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!pedido && !foto) return json({ error: "pedido_vazio" }, 400);
  if (foto && foto[2].length > 6_000_000) return json({ error: "foto_grande" }, 400);

  const { data: preco } = await admin.from("settings").select("value").eq("key", "credits_per_image").maybeSingle();
  const custo = Number(preco?.value ?? 2);
  const cobranca = await admin.rpc("spend_credits", { p_user: user.id, p_amount: custo, p_reason: "Imagem com IA", p_story: null });
  if (cobranca.error) {
    const sem = String(cobranca.error.message).includes("creditos_insuficientes");
    return json({ error: sem ? "creditos_insuficientes" : "cobranca_falhou" }, sem ? 402 : 500);
  }

  try {
    const { data: neg } = await admin.from("business_profiles").select("name, niche, colors").eq("user_id", user.id).maybeSingle();
    const cores = usarMarca ? ((neg?.colors as string[] | null) ?? []).slice(0, 4) : [];
    const f = FORMATOS[formato];
    const texto = [
      foto ? "Use the product in the attached photo. Keep the product exactly as it is (shape, label, colors, text on it); only change the scene, background and lighting." : "",
      `Create a ${f.desc}${neg?.niche ? ` for a ${neg.niche} business` : ""}.`,
      pedido ? `Request from the owner (in Portuguese): ${pedido}.` : "",
      cores.length ? `Use these brand colors in the scene and accents: ${cores.join(", ")}.` : "",
      "Photorealistic, high quality, sharp focus, appealing for social media in Brazil.",
      "Do not add any text, letters, logos or watermark unless the owner explicitly asked for a specific text.",
    ]
      .filter(Boolean)
      .join(" ");
    const parts: Array<Record<string, unknown>> = [{ text: texto }];
    if (foto) parts.push({ inline_data: { mime_type: foto[1], data: foto[2] } });

    let out: { bytes: Uint8Array; mime: string; model: string } | null = null;
    let last = "";
    for (const model of MODELS) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: f.ratio } } }),
      });
      if (res.status === 404) {
        last = `${model}: 404`;
        continue;
      }
      if (!res.ok) throw new Error(`gemini_${res.status}: ${(await res.text()).slice(0, 400)}`);
      const data = await res.json();
      const img = (data?.candidates?.[0]?.content?.parts ?? []).find((p: Record<string, unknown>) => p.inlineData || p.inline_data);
      const blob = (img?.inlineData ?? img?.inline_data) as { data?: string; mimeType?: string; mime_type?: string } | undefined;
      if (!blob?.data) throw new Error(`sem_imagem: ${JSON.stringify(data).slice(0, 300)}`);
      out = { bytes: fromBase64(blob.data), mime: blob.mimeType ?? blob.mime_type ?? "image/png", model };
      break;
    }
    if (!out) throw new Error(`sem_modelo: ${last}`);

    const stamp = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const ext = out.mime.includes("jpeg") ? "jpg" : out.mime.includes("webp") ? "webp" : "png";
    const path = `${user.id}/imagens/${stamp}.${ext}`;
    const up = await admin.storage.from("media").upload(path, out.bytes, { contentType: out.mime });
    if (up.error) throw new Error(`storage: ${up.error.message}`);
    const nomes: Record<string, string> = { produto: "Foto de produto", post: "Post", story: "Story", banner: "Banner" };
    await admin.from("library_items").insert({ user_id: user.id, kind: "imagem", module: "imagem", title: `${nomes[formato]}${pedido ? `: ${pedido.slice(0, 60)}` : ""}`, preview_path: path, file_path: path, meta: { pedido, formato } });
    const { data: signed } = await admin.storage.from("media").createSignedUrl(path, 60 * 60);
    const { data: perfil } = await admin.from("profiles").select("credits").eq("id", user.id).single();
    return json({ imagem: signed?.signedUrl, imagem_path: path, creditos: perfil?.credits ?? null });
  } catch (e) {
    console.error(e);
    await admin.rpc("refund_credits", { p_user: user.id, p_amount: custo, p_reason: "Imagem com IA (devolvido)" });
    const msg = String((e as Error).message ?? "");
    const recusado = /SAFETY|blocked|PROHIBITED|sem_imagem/i.test(msg);
    return json({ error: recusado ? "imagem_recusada" : msg.includes("gemini_429") ? "sem_cota" : "falha_imagem" }, recusado ? 422 : 502);
  }
});
