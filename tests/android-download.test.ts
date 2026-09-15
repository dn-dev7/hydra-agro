import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const pages = JSON.parse(readFileSync(resolve(root, "src/public/pages.json"), "utf8")) as Array<{ path: string; sections: Array<{ heading: string; text: string }> }>;
const releaseScript = readFileSync(resolve(root, "public/download-release.js"), "utf8");
const downloadStyles = readFileSync(resolve(root, "public/download-polish.css"), "utf8");
const prerender = readFileSync(resolve(root, "scripts/prerender-public.mjs"), "utf8");
const publicRender = readFileSync(resolve(root, "src/public/prerender.tsx"), "utf8");
const welcome = readFileSync(resolve(root, "src/public/welcome.tsx"), "utf8");
const vercel = readFileSync(resolve(root, "vercel.json"), "utf8");

describe("download oficial do Android", () => {
  it("mantém uma página pública com tutorial de instalação", () => {
    const page = pages.find((item) => item.path === "/download");
    expect(page).toBeTruthy();
    expect(page?.sections.some((section) => section.heading === "Como instalar no Android")).toBe(true);
    expect(page?.sections.some((section) => section.heading === "iPhone e iPad")).toBe(true);
  });

  it("consulta somente a latest release oficial e exige APK com nome padronizado", () => {
    expect(releaseScript).toContain("https://api.github.com/repos/dnmtfe3-cpu/hydra-agr/releases/latest");
    expect(releaseScript).toContain("/^HydraAgro-v.+\\.apk$/i");
    expect(releaseScript).toContain("A primeira versão Android oficial ainda não foi publicada.");
  });

  it("publica o script, a rota e o acesso pela landing page", () => {
    expect(prerender).toContain('/download-release.js');
    expect(prerender).toContain('/download-polish.css');
    expect(vercel).toContain('"source": "/download"');
    expect(vercel).toContain('"destination": "/download/index.html"');
    expect(welcome).toContain('href="/download"');
  });

  it("mantém o download limpo e sem link de releases na interface", () => {
    const page = pages.find((item) => item.path === "/download");
    expect(publicRender).not.toContain("hydra-download-releases");
    expect(page?.sections.find((section) => section.heading === "Segurança do download")?.text).not.toContain("Releases oficiais");
    expect(downloadStyles).toContain(".hydra-download-trust");
    expect(downloadStyles).toContain("linear-gradient(145deg");
  });
});
