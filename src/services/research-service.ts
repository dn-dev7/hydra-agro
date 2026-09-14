import { Preferences } from "@capacitor/preferences";
import { requireSupabase } from "./supabase";

export type ResearchRun = {
  durationSeconds: number;
  errors: number;
  completed: boolean;
};

export type ResearchTest = {
  id: string;
  participantCode: string;
  userType: string;
  task: string;
  withoutHydra: ResearchRun;
  withHydra: ResearchRun;
  easeRating: number;
  notes?: string;
  createdAt: string;
};

export type ResearchMethodology = {
  problem: string;
  researchQuestion: string;
  hypothesis: string;
  generalObjective: string;
  specificObjectives: string;
  methodology: string;
  audience: string;
  variables: string;
  results: string;
  conclusion: string;
  limitations: string;
  futureImprovements: string;
};

export type ResearchData = {
  tests: ResearchTest[];
  methodology: ResearchMethodology;
  updatedAt: string;
  pendingSync: boolean;
};

const emptyMethodology: ResearchMethodology = {
  problem: "", researchQuestion: "", hypothesis: "", generalObjective: "",
  specificObjectives: "", methodology: "", audience: "", variables: "",
  results: "", conclusion: "", limitations: "", futureImprovements: "",
};

export const emptyResearchData = (): ResearchData => ({
  tests: [], methodology: { ...emptyMethodology }, updatedAt: new Date(0).toISOString(), pendingSync: false,
});

const key = (userId: string) => "hydra.research.v1." + userId;

async function readLocal(userId: string): Promise<ResearchData | null> {
  const { value } = await Preferences.get({ key: key(userId) });
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ResearchData>;
    return {
      tests: Array.isArray(parsed.tests) ? parsed.tests : [],
      methodology: { ...emptyMethodology, ...(parsed.methodology || {}) },
      updatedAt: parsed.updatedAt || new Date(0).toISOString(),
      pendingSync: Boolean(parsed.pendingSync),
    };
  } catch {
    return null;
  }
}

async function writeLocal(userId: string, data: ResearchData) {
  await Preferences.set({ key: key(userId), value: JSON.stringify(data) });
}

async function pushRemote(userId: string, data: ResearchData): Promise<ResearchData> {
  const client = requireSupabase();
  const synced = { ...data, pendingSync: false, updatedAt: new Date().toISOString() };
  const { error } = await client.from("research_projects").upsert({
    user_id: userId,
    payload: { tests: synced.tests, methodology: synced.methodology },
    updated_at: synced.updatedAt,
  }, { onConflict: "user_id" });
  if (error) throw error;
  await writeLocal(userId, synced);
  return synced;
}

export async function loadResearchData(userId: string): Promise<ResearchData> {
  const local = await readLocal(userId);
  if (typeof navigator !== "undefined" && !navigator.onLine) return local || emptyResearchData();
  try {
    const client = requireSupabase();
    const { data, error } = await client.from("research_projects").select("payload,updated_at").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (!data) return local || emptyResearchData();
    const payload = data.payload as Partial<ResearchData>;
    const remote: ResearchData = {
      tests: Array.isArray(payload.tests) ? payload.tests : [],
      methodology: { ...emptyMethodology, ...(payload.methodology || {}) },
      updatedAt: String(data.updated_at),
      pendingSync: false,
    };
    if (local?.pendingSync || (local && Date.parse(local.updatedAt) > Date.parse(remote.updatedAt))) return pushRemote(userId, local);
    await writeLocal(userId, remote);
    return remote;
  } catch {
    return local || emptyResearchData();
  }
}

export async function saveResearchData(userId: string, next: Omit<ResearchData, "updatedAt" | "pendingSync">) {
  const local: ResearchData = { ...next, updatedAt: new Date().toISOString(), pendingSync: true };
  await writeLocal(userId, local);
  if (typeof navigator !== "undefined" && !navigator.onLine) return { data: local, status: "offline" as const };
  try {
    return { data: await pushRemote(userId, local), status: "synced" as const };
  } catch {
    return { data: local, status: "pending" as const };
  }
}

export async function syncResearchData(userId: string) {
  const local = await readLocal(userId);
  if (!local?.pendingSync || (typeof navigator !== "undefined" && !navigator.onLine)) return local;
  try { return await pushRemote(userId, local); } catch { return local; }
}

export function calculateResearchMetrics(tests: ResearchTest[]) {
  const count = tests.length;
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const withoutTime = average(tests.map(test => test.withoutHydra.durationSeconds));
  const withTime = average(tests.map(test => test.withHydra.durationSeconds));
  const withoutErrors = average(tests.map(test => test.withoutHydra.errors));
  const withErrors = average(tests.map(test => test.withHydra.errors));
  const withoutCompletion = count ? tests.filter(test => test.withoutHydra.completed).length / count * 100 : 0;
  const withCompletion = count ? tests.filter(test => test.withHydra.completed).length / count * 100 : 0;
  const reduction = withoutTime > 0 ? (withoutTime - withTime) / withoutTime * 100 : 0;
  return {
    count, withoutTime, withTime, withoutErrors, withErrors, withoutCompletion,
    withCompletion, reduction, ease: average(tests.map(test => test.easeRating)),
    sufficient: count >= 5,
  };
}
