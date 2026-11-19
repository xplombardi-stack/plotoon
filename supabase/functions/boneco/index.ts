// Boneco 3D: recebe a foto da pessoa e gera o personagem com o Nano Banana (Google Gemini).
// Cobra os créditos antes de gerar e devolve se der erro.
// Precisa do segredo GEMINI_API_KEY no Supabase (Edge Functions → Secrets).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODELS = ["gemini-nano-banana-2.1", "gemini-3.1-flash-image", "gemini-2.5-flash-image"];

const ESTILOS: Record<string, string> = {
  cinema:
    "semi-realistic 3D animated film character, natural human proportions, detailed skin texture and hair, high-end cinematic animation look",
  fofinho:
    "stylized 3D animated character with soft rounded features and slightly bigger eyes, friendly and charming, still clearly the same person",
  realista: "photorealistic 3D render of the same person, lifelike skin, hair and eyes, cinematic film still quality",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function prompt(estilo: string) {
  return [
    "Turn the person in this photo into a 3D character.",
    "Keep the exact same identity: face shape, eyes, eyebrows, nose, mouth, skin tone, hairstyle, hair color, facial hair and glasses (if any).",
    `Style: ${ESTILOS[estilo] ?? ESTILOS.cinema}.`,
    "Framing: head and upper body, centered, looking slightly to the side of the camera, calm confident expression, simple dark t-shirt.",
    "Background: dark room with soft blue and warm orange rim lighting, shallow depth of field.",
    "Vertical 3:4 image. No text, no letters, no logos, no watermark.",
  ].join(" ");
}

function fromBase64(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function gerar(key: string, foto: string, mime: string, estilo: string) {
  let last = "";
  for (const model of MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt(estilo) }, { inline_data: { mime_type: mime, data: foto } }] }],
        generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "3:4" } },
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
  if (!key) return json({ error: "boneco_sem_chave" }, 503);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // quem está pedindo
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: who } = await admin.auth.getUser(token);
  const user = who?.user;
  if (!user) return json({ error: "nao_autenticado" }, 401);

  let body: { foto?: string; estilo?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "corpo_invalido" }, 400);
  }
  const raw = String(body.foto ?? "");
  const m = raw.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  const mime = m ? m[1] : "image/jpeg";
  const foto = m ? m[2] : raw;
  if (foto.length < 1000 || foto.length > 6_000_000) return json({ error: "foto_invalida" }, 400);
  const estilo = ["cinema", "fofinho", "realista"].includes(String(body.estilo)) ? String(body.estilo) : "cinema";

  // cobra antes de gerar
  const { data: preco } = await admin.from("settings").select("value").eq("key", "credits_per_character").single();
  const custo = Number(preco?.value ?? 5);
  const cobranca = await admin.rpc("spend_credits", { p_user: user.id, p_amount: custo, p_reason: "Boneco 3D", p_story: null });
  if (cobranca.error) {
    const sem = String(cobranca.error.message).includes("creditos_insuficientes");
    return json({ error: sem ? "creditos_insuficientes" : "cobranca_falhou" }, sem ? 402 : 500);
  }

  try {
    const out = await gerar(key, foto, mime, estilo);
    const stamp = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const ext = out.mime.includes("jpeg") ? "jpg" : out.mime.includes("webp") ? "webp" : "png";
    const fotoPath = `${user.id}/fotos/${stamp}.${mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"}`;
    const bonecoPath = `${user.id}/bonecos/${stamp}.${ext}`;
    const up1 = await admin.storage.from("media").upload(fotoPath, fromBase64(foto), { contentType: mime });
    const up2 = await admin.storage.from("media").upload(bonecoPath, out.bytes, { contentType: out.mime });
    if (up1.error || up2.error) throw new Error(`storage: ${up1.error?.message ?? ""} ${up2.error?.message ?? ""}`);
    const { data: signed } = await admin.storage.from("media").createSignedUrl(bonecoPath, 60 * 60);
    const { data: perfil } = await admin.from("profiles").select("credits").eq("id", user.id).single();
    return json({ imagem: signed?.signedUrl, imagem_path: bonecoPath, foto_path: fotoPath, creditos: perfil?.credits ?? null, modelo: out.model });
  } catch (e) {
    console.error(e);
    await admin.rpc("refund_credits", { p_user: user.id, p_amount: custo, p_reason: "Boneco 3D (devolvido)" });
    const msg = String((e as Error).message ?? "");
    const recusado = /SAFETY|blocked|PROHIBITED|sem_imagem/i.test(msg);
    return json({ error: recusado ? "foto_recusada" : "falha_boneco" }, recusado ? 422 : 502);
  }
});
