import { createClient } from "npm:@supabase/supabase-js@2";

/* Endpoint público com autenticação própria por códigos aleatórios (80+ bits).
   Implantar esta função com verify_jwt=false: create/login/recover são anônimos;
   "status" e "enroll" verificam a sessão de usuário explicitamente. */
const allowed = new Set([
  "https://hydraagro.sbs",
  "https://www.hydraagro.sbs",
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
]);
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function headers(origin: string) {
  const data: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-hydra-client, x-supabase-api-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (origin && (allowed.has(origin) || /^https?:\/\/localhost:\d{2,5}$/.test(origin))) {
    data["Access-Control-Allow-Origin"] = origin;
  }
  return data;
}
function reply(origin: string, data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}
function issue(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let output = "";
  for (const byte of bytes) output += alphabet[byte & 31];
  return output;
}
function normalized(value: unknown, length: number) {
  if (typeof value !== "string") return "";
  const candidate = value.toUpperCase().replace(/[^A-Z2-9]/g, "");
  return candidate.length === length && [...candidate].every((char) => alphabet.includes(char)) ? candidate : "";
}
function formatted(value: string) { return value.match(/.{1,4}/g)?.join("-") || value; }
async function sha(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("hydra-access:v1:" + value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") || "";
  if (origin && !allowed.has(origin) && !/^https?:\/\/localhost:\d{2,5}$/.test(origin))
    return reply(origin, { message: "Origem não permitida." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (request.method !== "POST") return reply(origin, { message: "Método não permitido." }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return reply(origin, { message: "Serviço temporariamente indisponível." }, 503);
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    if (Number(request.headers.get("content-length") || 0) > 4096)
      return reply(origin, { message: "Requisição muito grande." }, 413);
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply(origin, { message: "Dados inválidos." }, 400);
    const action = String(body.action || "");
    if (!["create", "login", "recover", "enroll", "status"].includes(action))
      return reply(origin, { message: "Ação inválida." }, 400);

    // Hash do IP para não guardar o endereço de rede. A limitação usa a RPC
    // atômica, impedindo múltiplas requisições simultâneas de contornar o limite.
    const ip = (request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim().slice(0, 80);
    const network = await sha("net:" + ip);
    async function limit(bucket: string, max: number, seconds: number) {
      const { data, error } = await admin.rpc("hydra_code_take_slot", {
        p_key: bucket + ":" + network, p_max: max, p_window_seconds: seconds,
      });
      if (error) throw error;
      return data === true;
    }
    async function getSignedInUser() {
      const bearer = request.headers.get("authorization") || "";
      const token = bearer.toLowerCase().startsWith("bearer ") ? bearer.slice(7).trim() : "";
      if (!token || token.startsWith("sb_publishable_")) return null;
      const { data, error } = await admin.auth.getUser(token);
      return error ? null : data.user;
    }
    async function loginTicket(userId: string) {
      const { data: found, error: userError } = await admin.auth.admin.getUserById(userId);
      if (userError || !found.user?.email) throw new Error("Conta indisponível.");
      // Link de uso único gerado pelo servidor; NÃO enviamos e-mail e NÃO expomos
      // a senha interna. O cliente troca token_hash por sessão Supabase normal.
      const { data, error } = await admin.auth.admin.generateLink({
        type: "magiclink", email: found.user.email,
      });
      const ticket = data?.properties?.hashed_token;
      if (error || !ticket) throw new Error("Não foi possível iniciar a sessão.");
      return ticket;
    }

    if (action === "status" || action === "enroll") {
      const current = await getSignedInUser();
      if (!current) return reply(origin, { message: "Entre na conta antes de continuar." }, 401);
      if (String(current.user_metadata?.account_type || "") === "staff")
        return reply(origin, { message: "O acesso de funcionário já utiliza um código próprio." }, 403);
      const { data: existing, error } = await admin.from("hydra_code_access")
        .select("user_id").eq("user_id", current.id).maybeSingle();
      if (error) throw error;
      if (action === "status") return reply(origin, { hasCode: Boolean(existing) });
      if (existing) return reply(origin, { message: "Sua conta já tem um código. Se o perdeu, use a recuperação." }, 409);
      if (!await limit("enroll", 3, 3600)) return reply(origin, { message: "Aguarde para tentar novamente." }, 429);
      const access = issue(16), recovery = issue(24);
      const { error: insertError } = await admin.from("hydra_code_access").insert({
        user_id: current.id, access_hash: await sha(access), recovery_hash: await sha(recovery),
      });
      if (insertError) throw insertError;
      return reply(origin, { accessCode: formatted(access), recoveryCode: formatted(recovery), userId: current.id });
    }

    if (action === "create") {
      if (!await limit("create", 3, 3600)) return reply(origin, { message: "Muitas contas criadas nesta rede. Tente mais tarde." }, 429);
      const access = issue(16), recovery = issue(24);
      // O e-mail técnico nunca é solicitado ao usuário nem usado para mensagens.
      const internalEmail = "ha-" + crypto.randomUUID() + "@access.hydraagro.sbs";
      const { data: created, error: creationError } = await admin.auth.admin.createUser({
        email: internalEmail, password: issue(40), email_confirm: true,
        user_metadata: { full_name: "Produtor", property: {} },
      });
      if (creationError || !created.user) throw new Error("Não foi possível criar a conta agora.");
      const { error: insertError } = await admin.from("hydra_code_access").insert({
        user_id: created.user.id, access_hash: await sha(access), recovery_hash: await sha(recovery),
      });
      if (insertError) {
        await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
        throw insertError;
      }
      return reply(origin, { userId: created.user.id, accessCode: formatted(access), recoveryCode: formatted(recovery) });
    }

    if (action === "login") {
      if (!await limit("login", 30, 600)) return reply(origin, { message: "Muitas tentativas. Aguarde alguns minutos." }, 429);
      const code = normalized(body.code, 16);
      if (!code) return reply(origin, { message: "Informe o código completo." }, 400);
      const { data, error } = await admin.from("hydra_code_access")
        .select("user_id").eq("access_hash", await sha(code)).maybeSingle();
      if (error) throw error;
      if (!data) return reply(origin, { message: "Código inválido." }, 401);
      return reply(origin, { tokenHash: await loginTicket(data.user_id) });
    }

    if (!await limit("recover", 6, 3600)) return reply(origin, { message: "Muitas tentativas de recuperação. Aguarde." }, 429);
    const recovery = normalized(body.recoveryCode, 24);
    if (!recovery) return reply(origin, { message: "Informe o código de recuperação completo." }, 400);
    const { data: existing, error } = await admin.from("hydra_code_access")
      .select("user_id").eq("recovery_hash", await sha(recovery)).maybeSingle();
    if (error) throw error;
    if (!existing) return reply(origin, { message: "Código de recuperação inválido." }, 401);
    const access = issue(16), nextRecovery = issue(24);
    const { error: updateError } = await admin.from("hydra_code_access").update({
      access_hash: await sha(access), recovery_hash: await sha(nextRecovery),
      updated_at: new Date().toISOString(),
    }).eq("user_id", existing.user_id).eq("recovery_hash", await sha(recovery));
    if (updateError) throw updateError;
    return reply(origin, { userId: existing.user_id, accessCode: formatted(access), recoveryCode: formatted(nextRecovery) });
  } catch (error) {
    console.error("hydra-code-auth", error instanceof Error ? error.message : "unknown");
    return reply(origin, { message: "Não foi possível concluir a solicitação. Tente novamente." }, 500);
  }
});
