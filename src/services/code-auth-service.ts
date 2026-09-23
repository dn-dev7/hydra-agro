import { requireSupabase } from "./supabase";

export type IssuedHydraCodes = {
  userId: string;
  accessCode: string;
  recoveryCode: string;
};

function explainError(error: unknown) {
  const message = error instanceof Error ? error.message : "Serviço indisponível.";
  if (/failed to fetch|network|load failed/i.test(message)) {
    return "Sem conexão. Verifique sua internet e tente novamente.";
  }
  return message;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await requireSupabase().functions.invoke<T & { message?: string }>(
    "hydra-code-auth",
    { body },
  );
  if (error) throw new Error(explainError(error));
  if (!data || ("message" in data && data.message)) {
    throw new Error(data?.message || "Não foi possível concluir a solicitação.");
  }
  return data;
}

export function formatHydraCode(value: string, length: number) {
  const plain = value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, length);
  return plain.match(/.{1,4}/g)?.join("-") ?? plain;
}

export function codeHasLength(value: string, length: number) {
  return value.replace(/-/g, "").length === length;
}

export async function isHydraCodeAuthAvailable() {
  try {
    const result = await invoke<{ ok: boolean; mode?: string }>({ action: "health" });
    return result.ok === true;
  } catch {
    return false;
  }
}

export function createHydraCodeAccount() {
  return invoke<IssuedHydraCodes>({ action: "create" });
}

export function recoverHydraCodeAccount(recoveryCode: string) {
  return invoke<IssuedHydraCodes>({ action: "recover", recoveryCode });
}

export async function signInWithHydraCode(code: string) {
  const { tokenHash } = await invoke<{ tokenHash: string }>({ action: "login", code });
  if (!tokenHash) throw new Error("O servidor não retornou um acesso válido.");
  // A função emite um ticket OTP de uso único após validar o código privado.
  // O Supabase troca o ticket por uma sessão normal, com RLS e renovação.
  const { data, error } = await requireSupabase().auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });
  if (error || !data.user || !data.session) {
    throw new Error("Não foi possível abrir a sessão. Tente entrar novamente.");
  }
  return data;
}

export function getHydraCodeStatus() {
  return invoke<{ hasCode: boolean }>({ action: "status" });
}

export function enrollHydraCodeAccess() {
  return invoke<IssuedHydraCodes>({ action: "enroll" });
}
