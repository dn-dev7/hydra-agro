import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const html = readFileSync(resolve(root, "public/tools/keystore-base64.html"), "utf8");
const script = readFileSync(resolve(root, "public/tools/keystore-base64.js"), "utf8");
const vercel = readFileSync(resolve(root, "vercel.json"), "utf8");

describe("preparação local da chave Android", () => {
  it("mantém a ferramenta fora de indexação e sem upload de arquivo", () => {
    expect(html).toContain('content="noindex, nofollow, noarchive, nosnippet"');
    expect(script).toContain("file.arrayBuffer()");
    expect(script).not.toMatch(/\bfetch\s*\(/);
    expect(script).not.toContain("XMLHttpRequest");
    expect(script).not.toContain("sendBeacon");
    expect(script).not.toContain("WebSocket");
  });

  it("não persiste a chave nem o Base64 no navegador", () => {
    expect(script).not.toContain("localStorage");
    expect(script).not.toContain("sessionStorage");
    expect(script).not.toContain("indexedDB");
    expect(script).toContain('window.addEventListener("pagehide"');
  });

  it("publica a rota auxiliar com proteção contra indexação", () => {
    expect(vercel).toContain('"source": "/tools/keystore"');
    expect(vercel).toContain('"destination": "/tools/keystore-base64.html"');
    expect(vercel).toContain('"source": "/tools/:path*"');
    expect(vercel).toContain('"value": "noindex, nofollow, noarchive, nosnippet"');
  });
});
