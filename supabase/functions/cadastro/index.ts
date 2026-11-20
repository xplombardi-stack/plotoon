// Cadastro sem confirmação de e-mail: cria a conta já confirmada e o app entra direto.
// O e-mail continua sendo usado só pra recuperar a senha.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "metodo" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "corpo_invalido" }, 400);
  }
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim().slice(0, 80);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "email_invalido" }, 400);
  if (password.length < 6 || password.length > 72) return json({ error: "senha_curta" }, 400);
  if (name.length < 2) return json({ error: "nome_vazio" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
  if (error) {
    const msg = String(error.message).toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) return json({ error: "ja_existe" }, 409);
    if (msg.includes("password")) return json({ error: "senha_fraca" }, 400);
    console.error(error);
    return json({ error: "falha_cadastro" }, 500);
  }
  return json({ ok: true });
});
