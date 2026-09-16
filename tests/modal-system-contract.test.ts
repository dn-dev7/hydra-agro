import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const app = readFileSync(resolve(root, "src/hydra-app.tsx"), "utf8");
const modalSystem = readFileSync(resolve(root, "src/components/modal-system.ts"), "utf8");
const ui = readFileSync(resolve(root, "src/components/ui.tsx"), "utf8");
const styles = readFileSync(resolve(root, "src/globals.css"), "utf8");

describe("contrato global de modais e feedback", () => {
  it("usa um único controlador empilhável para modal e ações rápidas", () => {
    expect(modalSystem).toContain("const overlays: OverlayEntry[]");
    expect(modalSystem).toContain("overlays.at(-1)");
    expect(app).toContain("useModalNavigation");
    expect(app).toContain("useAppOverlay(quickOpen");
    expect(app).toContain("bottom-nav ${modalNavigationOpen ? \"is-hidden\"");
    expect(ui).toContain("useAppOverlay(present, requestClose)");
  });

  it("oferece loading, toast, altura dinâmica e proteção de teclado", () => {
    expect(ui).toContain("export function LoadingButton");
    expect(ui).toContain("export function AppToastRegion");
    expect(styles).toContain("height: 100dvh");
    expect(styles).toContain("scroll-padding:");
    expect(styles).toContain("position: sticky");
    expect(styles).toContain("z-index: 200");
  });

  it("mantém os modais fora de ancestrais transformados e dentro da viewport segura", () => {
    expect(ui).toContain("createPortal");
    expect(ui).toContain("document.body");
    expect(styles).toContain("backdrop-filter: blur");
    expect(styles).toContain("env(safe-area-inset-top)");
    expect(styles).toContain("env(safe-area-inset-bottom)");
  });
});
