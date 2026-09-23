import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://www.hydraagro.sbs",
  "https://hydraagro.sbs",
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
]);
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const bucketName = "hydra-code-auth-private";

function cors(origin: string) {
  const headers: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-hydra-client, x-supabase-api-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (origin && (allowedOrigins.has(origin) || /^https?:\/\/localhost:\d{2,5}$/.test(origin))) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(origin: string, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

function randomSecret(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let value = "";
  for (const byte of bytes) value += alphabet[byte & 31];
  return value;
}

function normalize(value: unknown, length: number) {
  if (typeof value !== "string") return "";
  const plain = value.toUpperCase().replace(/[^A-Z2-9]/g, "");
  if (plain.length !== length) return "";
  return [...plain].every((char) => alphabet.includes(char)) ? plain : "";
}

function format(value: string) {
  return value.match(/.{1,4}/g)?.join("-") ?? value;
}

async function digest(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("hydra-code:v2:" + value));
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

type Mapping = { userId: string; accessHash: string; recoveryHash: string; createdAt: string };

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") || "";
  if (origin && !allowedOrigins.has(origin) && !/^https?:\/\/localhost:\d{2,5}$/.test(origin)) {
    return json(origin, { message: "Origem não permitida." }, 403);
  }
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (request.method !== "POST") return json(origin, { message: "Método não permitido." }, 405);
  if (Number(request.headers.get("content-length") || 0) > 4096) {
    return json(origin, { message: "Requisição muito grande." }, 413);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json(origin, { message: "Serviço temporariamente indisponível." }, 503);

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  async function ensureBucket() {
    const { data, error } = await admin.storage.getBucket(bucketName);
    if (data && !error) return;
    const created = await admin.storage.createBucket(bucketName, {
      public: false,
      fileSizeLimit: 64 * 1024,
      allowedMimeTypes: ["application/json"],
    });
    if (created.error && !/already|exists|duplicate/i.test(created.error.message)) throw created.error;
  }

  async function readMapping(path: string): Promise<Mapping | null> {
    const { data, error } = await admin.storage.from(bucketName).download(path);
    if (error || !data) return null;
    try {
      const parsed = JSON.parse(await data.text()) as Mapping;
      return parsed?.userId && parsed?.accessHash && parsed?.recoveryHash ? parsed : null;
    } catch {
      return null;
    }
  }

  async function writeMapping(path: string, mapping: Mapping, upsert = false) {
    const payload = new Blob([JSON.stringify(mapping)], { type: "application/json" });
    const { error } = await admin.storage.from(bucketName).upload(path, payload, {
      contentType: "application/json",
      cacheControl: "0",
      upsert,
    });
    if (error) throw error;
  }

  async function removePaths(paths: string[]) {
    const filtered = paths.filter(Boolean);
    if (!filtered.length) return;
    await admin.storage.from(bucketName).remove(filtered).catch(() => undefined);
  }

  async function rateLimit(bucket: string, limit: number, windowSeconds: number) {
    const { data, error } = await admin.rpc("consume_service_rate_limit", {
      p_bucket: bucket,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    const row = data as { allowed?: boolean; retryAfter?: number } | null;
    return { allowed: row?.allowed === true, retryAfter: Number(row?.retryAfter || 0) };
  }

  async function signedInUser() {
    const header = request.headers.get("authorization") || "";
    const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
    if (!token || token.startsWith("sb_publishable_")) return null;
    const { data, error } = await admin.auth.getUser(token);
    return error ? null : data.user;
  }

  async function loginTicket(userId: string) {
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
    if (userError || !userData.user?.email) throw new Error("Conta indisponível.");
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email,
    });
    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) throw new Error("Não foi possível iniciar a sessão.");
    return tokenHash;
  }

  async function issueMappings(userId: string) {
    const access = randomSecret(16);
    const recovery = randomSecret(24);
    const accessHash = await digest(access);
    const recoveryHash = await digest(recovery);
    const mapping: Mapping = { userId, accessHash, recoveryHash, createdAt: new Date().toISOString() };
    await writeMapping("access/" + accessHash + ".json", mapping);
    try {
      await writeMapping("recovery/" + recoveryHash + ".json", mapping);
      await writeMapping("users/" + userId + ".json", mapping, true);
    } catch (error) {
      await removePaths(["access/" + accessHash + ".json", "recovery/" + recoveryHash + ".json"]);
      throw error;
    }
    return { accessCode: format(access), recoveryCode: format(recovery), mapping };
  }

  try {
    await ensureBucket();
    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "health") {
      const guard = await rateLimit("hydra-code:health", 1000, 60);
      if (!guard.allowed) return json(origin, { message: "Serviço temporariamente ocupado." }, 429);
      return json(origin, { ok: true, mode: "code-v2" });
    }

    const ip = (request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim().slice(0, 80);
    const network = await digest("network:" + ip);

    if (action === "status" || action === "enroll") {
      const user = await signedInUser();
      if (!user) return json(origin, { message: "Entre na conta antes de continuar." }, 401);
      if (String(user.user_metadata?.account_type || "") === "staff") {
        return json(origin, { message: "O acesso de funcionário já utiliza um código próprio." }, 403);
      }
      const current = await readMapping("users/" + user.id + ".json");
      if (action === "status") return json(origin, { hasCode: Boolean(current) });
      if (current) return json(origin, { message: "Esta conta já possui um código de acesso." }, 409);

      const guard = await rateLimit("hydra-code:enroll:" + network, 4, 3600);
      if (!guard.allowed) return json(origin, { message: "Aguarde antes de gerar outro código.", retryAfter: guard.retryAfter }, 429);
      const issued = await issueMappings(user.id);
      return json(origin, { userId: user.id, accessCode: issued.accessCode, recoveryCode: issued.recoveryCode });
    }

    if (action === "create") {
      const guard = await rateLimit("hydra-code:create:" + network, 4, 3600);
      if (!guard.allowed) return json(origin, { message: "Muitas contas criadas nesta rede. Tente mais tarde.", retryAfter: guard.retryAfter }, 429);

      const internalEmail = "ha-" + crypto.randomUUID() + "@access.hydraagro.sbs";
      const { data: created, error } = await admin.auth.admin.createUser({
        email: internalEmail,
        password: randomSecret(40),
        email_confirm: true,
        user_metadata: { full_name: "Produtor", property: {} },
      });
      if (error || !created.user) throw new Error("Não foi possível criar a conta agora.");

      try {
        const issued = await issueMappings(created.user.id);
        return json(origin, { userId: created.user.id, accessCode: issued.accessCode, recoveryCode: issued.recoveryCode });
      } catch (mappingError) {
        await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
        throw mappingError;
      }
    }

    if (action === "login") {
      const guard = await rateLimit("hydra-code:login:" + network, 35, 600);
      if (!guard.allowed) return json(origin, { message: "Muitas tentativas. Aguarde alguns minutos.", retryAfter: guard.retryAfter }, 429);

      const code = normalize(body?.code, 16);
      if (!code) return json(origin, { message: "Digite o código de acesso completo." }, 400);
      const accessHash = await digest(code);
      const perCode = await rateLimit("hydra-code:login-code:" + accessHash, 12, 3600);
      if (!perCode.allowed) return json(origin, { message: "Muitas tentativas para este código. Aguarde.", retryAfter: perCode.retryAfter }, 429);

      const mapping = await readMapping("access/" + accessHash + ".json");
      if (!mapping || mapping.accessHash !== accessHash) return json(origin, { message: "Código de acesso inválido." }, 401);
      return json(origin, { tokenHash: await loginTicket(mapping.userId) });
    }

    if (action === "recover") {
      const guard = await rateLimit("hydra-code:recover:" + network, 8, 3600);
      if (!guard.allowed) return json(origin, { message: "Muitas tentativas de recuperação. Aguarde.", retryAfter: guard.retryAfter }, 429);

      const recovery = normalize(body?.recoveryCode, 24);
      if (!recovery) return json(origin, { message: "Digite o código de recuperação completo." }, 400);
      const recoveryHash = await digest(recovery);
      const oneUse = await rateLimit("hydra-code:recover-code:" + recoveryHash, 1, 86400);
      if (!oneUse.allowed) return json(origin, { message: "Este código de recuperação já foi utilizado ou está temporariamente bloqueado." }, 409);

      const mapping = await readMapping("recovery/" + recoveryHash + ".json");
      if (!mapping || mapping.recoveryHash !== recoveryHash) return json(origin, { message: "Código de recuperação inválido." }, 401);

      const current = await readMapping("users/" + mapping.userId + ".json");
      if (!current || current.recoveryHash !== recoveryHash) return json(origin, { message: "Código de recuperação inválido." }, 401);

      const issued = await issueMappings(mapping.userId);
      await removePaths([
        "access/" + current.accessHash + ".json",
        "recovery/" + current.recoveryHash + ".json",
      ]);
      return json(origin, { userId: mapping.userId, accessCode: issued.accessCode, recoveryCode: issued.recoveryCode });
    }

    return json(origin, { message: "Ação inválida." }, 400);
  } catch (error) {
    console.error("hydra-code-auth", error instanceof Error ? error.message : "unknown");
    return json(origin, { message: "Não foi possível concluir a solicitação. Tente novamente." }, 500);
  }
});
