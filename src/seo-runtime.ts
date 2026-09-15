// Public metadata and structured data are emitted in the HTML at build time.
// Identification records, preview screens and unknown routes are not search pages.
if (typeof document !== "undefined") {
  const path = window.location.pathname;
  const publicHome = path === "/" || path === "/index.html";
  const animalRecord = new URLSearchParams(window.location.search).get("pa") === "1";
  if (!publicHome || animalRecord) {
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (robots) robots.content = "noindex, follow";
    document.getElementById("hydra-seo-schema")?.remove();
    document.querySelector('link[rel="canonical"]')?.remove();
  }
}
