import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const migration = readFileSync(resolve(root, "supabase/migrations/202608150001_hydra_agro.sql"), "utf8");
const capacitor = readFileSync(resolve(root, "capacitor.config.ts"), "utf8");
const manifest = readFileSync(resolve(root, "android/app/src/main/AndroidManifest.xml"), "utf8");
const androidCi = readFileSync(resolve(root, ".github/workflows/android-ci.yml"), "utf8");
const androidRelease = readFileSync(resolve(root, ".github/workflows/android-release.yml"), "utf8");

describe("contratos de segurança e empacotamento", () => {
  it("atribui o dono no banco e não no frontend", () => {
    expect(migration).toContain("danqxy7@gmail.com");
    expect(migration).toContain("security definer");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("is_active_user()");
    expect(migration).toContain("A conta proprietária não pode ser bloqueada");
  });

  it("empacota a interface e não aponta para site remoto", () => {
    expect(capacitor).toContain('webDir: "dist"');
    expect(capacitor).not.toContain("server:");
    expect(capacitor).not.toContain("HYDRA_APP_URL");
  });

  it("inclui o esquema rural completo", () => {
    for (const table of [
      "profiles", "roles", "properties", "property_sectors", "animals",
      "animal_identifications", "nfc_tags", "water_sources", "water_records",
      "activities", "monitoring_records", "posts",
      "comments", "likes", "subscriptions", "notifications",
    ]) expect(migration).toContain(`public.${table}`);
  });

  it("configura NFC opcional e mantém CI e release Android locais", () => {
    expect(manifest).toContain("android.permission.NFC");
    expect(manifest).toContain('android.hardware.nfc" android:required="false"');

    expect(androidCi).toContain("Hydra Agro • Android CI");
    expect(androidCi).toContain("app-debug.apk");
    expect(androidCi).toContain("HydraAgro-CI-");
    expect(androidCi).not.toContain("HYDRA_APP_URL");

    expect(androidRelease).toContain("Hydra Agro • Release Android");
    expect(androidRelease).toContain("assembleRelease");
    expect(androidRelease).toContain("HydraAgro-${TAG}.apk");
    expect(androidRelease).toContain("make_latest: true");
    expect(androidRelease).not.toContain("HYDRA_APP_URL");
  });
});
