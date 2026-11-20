// Recebe os avisos da Cakto e mexe nos créditos sozinho.
//  compra aprovada / renovação  -> soma os créditos da oferta (e ativa o plano)
//  reembolso / chargeback       -> tira os créditos daquela compra
//  assinatura cancelada         -> tira o plano (os créditos que sobraram ficam)
// Cada aviso fica guardado em cakto_events. Segredo: CAKTO_WEBHOOK_SECRET.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

type J = Record<string, unknown>;
const ok = () => new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
const obj = (v: unknown): J => (v && typeof v === "object" ? (v as J) : {});
const str = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");

// todos os textos do aviso (pra achar o código da oferta onde quer que ele venha)
function textos(v: unknown, out: Set<string> = new Set(), prof = 0): Set<string> {
  if (prof > 6) return out;
  if (typeof v === "string") out.add(v);
  else if (Array.isArray(v)) v.forEach((x) => textos(x, out, prof + 1));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => textos(x, out, prof + 1));
  return out;
}

async function acharUsuario(db: SupabaseClient, email: string) {
  if (!email) return null;
  const { data } = await db.rpc("user_id_by_email", { p_email: email });
  return (data as string | null) ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok();
  let body: J;
  try {
    body = await req.json();
  } catch {
    return new Response("corpo_invalido", { status: 400 });
  }
  const secret = (Deno.env.get("CAKTO_WEBHOOK_SECRET") ?? "").trim();
  const recebida = str(body.secret).trim();
  const valido = !!secret && recebida === secret;
  // nunca guarda a chave; só o suficiente pra entender por que não bateu
  const { secret: _s, ...resto } = body;
  const semSegredo: J = valido ? resto : { ...resto, _chave: { configurada_no_supabase: !!secret, tamanho_esperado: secret.length, tamanho_recebido: recebida.length } };
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const evento = str(body.event).slice(0, 60);
  const { data: reg } = await db.from("cakto_events").insert({ event: evento, valido, raw: semSegredo }).select("id").single();
  if (!valido) return ok(); // aviso sem o segredo certo: só guarda

  const d = obj(body.data);
  const pedido = str(d.id) || str(d.refId);
  const email = (str(obj(d.customer).email) || str(d.email)).trim().toLowerCase();
  const valor = Number(d.amount ?? d.baseAmount ?? obj(d.offer).price ?? 0) || 0;
  const feito = async (nota?: string) => {
    if (reg?.id) await db.from("cakto_events").update({ processado: true, raw: nota ? { ...semSegredo, _nota: nota } : semSegredo }).eq("id", reg.id);
  };

  try {
    if (evento === "purchase_approved" || evento === "subscription_renewed") {
      // qual oferta foi comprada
      const { data: ofertas } = await db.from("offers").select("id, tipo, nome, creditos, slug, cakto_id").not("cakto_id", "is", null);
      const ts = textos(d);
      // o link pode vir com o checkout junto (ex.: ga9ufx9_1351254); o aviso traz só a oferta (ga9ufx9)
      const oferta = (ofertas ?? []).find((o) => ts.has(String(o.cakto_id)) || ts.has(String(o.cakto_id).split("_")[0]));
      if (!oferta) return ok(); // oferta não cadastrada no painel: fica guardado pra processar depois
      if (!pedido) return ok();
      const uid = await acharUsuario(db, email);
      const desc = oferta.tipo === "plano" ? `Plano ${oferta.nome}${evento === "subscription_renewed" ? " (renovação)" : ""}` : `Compra: ${oferta.nome}`;
      // um pedido só credita uma vez (a Cakto pode mandar o mesmo pedido em mais de um aviso)
      const ins = await db
        .from("payments")
        .insert({ user_id: uid, email, provider: "cakto", provider_id: pedido, offer_id: oferta.id, descricao: desc, valor_brl: valor, creditos: oferta.creditos, evento, status: uid ? "pago" : "pendente_conta" })
        .select("id")
        .single();
      if (ins.error) {
        await feito("pedido_ja_processado");
        return ok();
      }
      if (uid) {
        await db.rpc("add_credits", { p_user: uid, p_amount: oferta.creditos, p_reason: desc });
        if (oferta.tipo === "plano" && oferta.slug) {
          await db.from("profiles").update({ plan: oferta.slug }).eq("id", uid);
          const sub = str(obj(d.subscription).id) || pedido;
          await db.from("subscriptions").upsert({ user_id: uid, email, provider: "cakto", provider_subscription_id: sub, plan: oferta.slug, status: "ativa", updated_at: new Date().toISOString() }, { onConflict: "provider_subscription_id" });
        }
      }
      await feito(uid ? undefined : "sem_conta_com_esse_email");
    } else if (evento === "refund" || evento === "chargeback") {
      const { data: pg } = await db.from("payments").select("id, user_id, creditos, status").eq("provider", "cakto").eq("provider_id", pedido).maybeSingle();
      if (pg && pg.status !== "reembolsado") {
        if (pg.user_id) await db.rpc("remove_credits", { p_user: pg.user_id, p_amount: pg.creditos, p_reason: evento === "chargeback" ? "Chargeback na Cakto" : "Reembolso na Cakto" });
        await db.from("payments").update({ status: "reembolsado" }).eq("id", pg.id);
      }
      await feito();
    } else if (evento === "subscription_canceled") {
      const uid = await acharUsuario(db, email);
      if (uid) {
        await db.from("profiles").update({ plan: "nenhum" }).eq("id", uid);
        await db.from("subscriptions").update({ status: "cancelada", updated_at: new Date().toISOString() }).eq("user_id", uid).eq("provider", "cakto");
      }
      await feito();
    } else if (evento === "subscription_renewal_refused" || evento === "subscription_late") {
      const uid = await acharUsuario(db, email);
      if (uid) await db.from("subscriptions").update({ status: "atrasada", updated_at: new Date().toISOString() }).eq("user_id", uid).eq("provider", "cakto");
      await feito();
    }
  } catch (e) {
    console.error(e);
  }
  return ok();
});
