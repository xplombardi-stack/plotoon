// Recebe os avisos da Cakto (compra aprovada, reembolso, assinatura...).
// Por enquanto guarda cada aviso pra conferir o formato; a liberação de créditos entra em seguida.
// Segredo: CAKTO_WEBHOOK_SECRET (o "secret" que a Cakto mostra no webhook).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("corpo_invalido", { status: 400 });
  }
  const secret = Deno.env.get("CAKTO_WEBHOOK_SECRET") ?? "";
  const valido = !!secret && String(body.secret ?? "") === secret;
  // nunca guardar o segredo junto do aviso
  const { secret: _s, ...semSegredo } = body;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  await admin.from("cakto_events").insert({ event: String(body.event ?? "").slice(0, 60), valido, raw: semSegredo });
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
