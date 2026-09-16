import { useEffect } from "react";

/** Keeps the existing forms inside the area available above the device keyboard. */
export function RuralViewport() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const viewport = window.visualViewport;
    function reveal() {
      const field = document.activeElement;
      if (!(field instanceof HTMLElement) || !field.matches("input,select,textarea")) return;
      field.closest(".field")?.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
    function resize() {
      document.body.style.setProperty("--rural-viewport-height", `${viewport?.height ?? window.innerHeight}px`);
      reveal();
    }
    function focus(event: FocusEvent) {
      const field = event.target;
      if (!(field instanceof HTMLElement) || !field.matches("input,select,textarea")) return;
      clearTimeout(timer);
      timer = setTimeout(reveal, 200);
    }
    resize();
    viewport?.addEventListener("resize", resize);
    document.addEventListener("focusin", focus);
    return () => {
      clearTimeout(timer);
      viewport?.removeEventListener("resize", resize);
      document.removeEventListener("focusin", focus);
      document.body.style.removeProperty("--rural-viewport-height");
    };
  }, []);
  return null;
}
