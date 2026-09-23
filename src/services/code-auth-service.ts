import { Preferences } from "@capacitor/preferences";
import { createEmptyAccount, type HydraAccount } from "../lib/hydra-types";
import { requireSupabase } from "./supabase";

export type IssuedHydraCodes = {
  userId: string;
  accessCode: string;
  recoveryCode: string;
  localOnly?: boolean;
};

type LocalRegistry = {
  access: Record<string, string>;
  recovery: Record<string, string>;
};

const LOCAL_REGISTRY_KEY = "hydra.code.local.registry.v1";
const LOCAL_ACTIVE_KEY = "hydra.code.local.active.v1";
const LOCAL_ACCOUNT_PREFIX = "hydra.code.local.account.";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function localAccountKey(userId: string) {
  return LOCAL_ACCOUNT_PREFIX + userId;
}

function randomCode(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let value = "";
  for (const byte of bytes) value += alphabet[byte & 31];
  return value;
}

async function codeHash(value: string) {
  const normalized = value.toUpperCase().replace(/[^A-Z2-9]/g, "");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("hydra-local-code:v1:" + normalized));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readLocalRegistry(): Promise<LocalRegistry> {
  const { value } = await Preferences.get({ key: LOCAL_REGISTRY_KEY });
  if (!value) return { access: {}, recovery: {} };
  try {
    const parsed = JSON.parse(value) as Partial<LocalRegistry>;
    return {
      access: parsed.access && typeof parsed.access === "object" ? parsed.access : {},
      recovery: parsed.recovery && typeof parsed.recovery === "object" ? parsed.recovery : {},
    };
  } catch {
    return { access: {}, recovery: {} };
  }
}

async function writeLocalRegistry(registry: LocalRegistry) {
  await Preferences.set({ key: LOCAL_REGISTRY_KEY, value: JSON.stringify(registry) });
}

async function readLocalAccount(userId: string): Promise<HydraAccount | null> {
  const { value } = await Preferences.get({ key: localAccountKey(userId) });
  if (!value) return null;
  try {
    const account = JSON.parse(value) as HydraAccount;
    return account?.id === userId ? account : null;
  } catch {
    return null;
  }
}

export async function saveLocalHydraCodeAccount(account: HydraAccount) {
  await Preferences.set({ key: localAccountKey(account.id), value: JSON.stringify(account) });
}

export async function loadActiveLocalHydraCodeAccount() {
  const { value: userId } = await Preferences.get({ key: LOCAL_ACTIVE_KEY });
  if (!userId) return null;
  const account = await readLocalAccount(userId);
  if (!account) await Preferences.remove({ key: LOCAL_ACTIVE_KEY });
  return account;
}

export async function clearActiveLocalHydraCodeAccount() {
  await Preferences.remove({ key: LOCAL_ACTIVE_KEY });
}

export async function signInWithLocalHydraCode(code: string) {
  if (!codeHasLength(code, 16)) return null;
  const registry = await readLocalRegistry();
  const userId = registry.access[await codeHash(code)];
  if (!userId) return null;
  const account = await readLocalAccount(userId);
  if (!account) return null;
  await Preferences.set({ key: LOCAL_ACTIVE_KEY, value: userId });
  return account;
}

async function createLocalHydraCodeAccount(): Promise<IssuedHydraCodes> {
  const userId = "local-" + crypto.randomUUID();
  const accessPlain = randomCode(16);
  const recoveryPlain = randomCode(24);
  const accessHash = await codeHash(accessPlain);
  const recoveryHash = await codeHash(recoveryPlain);
  const registry = await readLocalRegistry();
  registry.access[accessHash] = userId;
  registry.recovery[recoveryHash] = userId;
  await writeLocalRegistry(registry);
  const account = createEmptyAccount({ id: userId, email: "", name: "Produtor" });
  await saveLocalHydraCodeAccount(account);
  return {
    userId,
    accessCode: formatHydraCode(accessPlain, 16),
    recoveryCode: formatHydraCode(recoveryPlain, 24),
    localOnly: true,
  };
}

async function recoverLocalHydraCodeAccount(recoveryCode: string): Promise<IssuedHydraCodes | null> {
  if (!codeHasLength(recoveryCode, 24)) return null;
  const registry = await readLocalRegistry();
  const oldRecoveryHash = await codeHash(recoveryCode);
  const userId = registry.recovery[oldRecoveryHash];
  if (!userId) return null;
  const account = await readLocalAccount(userId);
  if (!account) return null;

  for (const [hash, id] of Object.entries(registry.access)) if (id === userId) delete registry.access[hash];
  for (const [hash, id] of Object.entries(registry.recovery)) if (id === userId) delete registry.recovery[hash];

  const accessPlain = randomCode(16);
  const recoveryPlain = randomCode(24);
  registry.access[await codeHash(accessPlain)] = userId;
  registry.recovery[await codeHash(recoveryPlain)] = userId;
  await writeLocalRegistry(registry);
  return {
    userId,
    accessCode: formatHydraCode(accessPlain, 16),
    recoveryCode: formatHydraCode(recoveryPlain, 24),
    localOnly: true,
  };
}

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

export async function createHydraCodeAccount() {
  try {
    return await invoke<IssuedHydraCodes>({ action: "create" });
  } catch {
    // Enquanto o backend definitivo ainda não foi publicado, permite criar
    // uma conta local funcional no aparelho. Ela pode ser migrada depois.
    return createLocalHydraCodeAccount();
  }
}

export async function recoverHydraCodeAccount(recoveryCode: string) {
  const local = await recoverLocalHydraCodeAccount(recoveryCode);
  if (local) return local;
  return invoke<IssuedHydraCodes>({ action: "recover", recoveryCode });
}

export async function signInWithHydraCode(code: string) {
  const { tokenHash } = await invoke<{ tokenHash: string }>({ action: "login", code });
  if (!tokenHash) throw new Error("O servidor não retornou um acesso válido.");
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
