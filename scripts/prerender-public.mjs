import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { readFile, writeFile, mkdir } from "node:fs/promises";

const site = "https://www.hydraagro.sbs";
const pages = JSON.parse(await readFile("src/public/pages.json", "utf8"));
const escape = value => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
// Load only public components. Never load account data or initialize authentication.
const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: "custom" });
try {
  const { renderWelcome, renderPage } = await server.ssrLoadModule("/src/public/prerender.tsx");
  const home = await readFile("dist/index.html", "utf8");
  const marker = '<div id="root"></div>';
  if (!home.includes(marker)) throw new Error("Public landing placeholder was not found.");
  await writeFile("dist/index.html", home.replace(marker, `<div id="root">${renderWelcome()}</div>`));
  for (const page of pages) {
    const url = site + page.path;
    const schema = JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: page.heading, description: page.description, url, inLanguage: "pt-BR", isPartOf: { "@id": site + "/#website" } }).replace(/</g, "\\u003c");
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(page.title)}</title><meta name="description" content="${escape(page.description)}"><meta name="robots" content="index, follow, max-image-preview:large"><link rel="canonical" href="${url}"><link rel="icon" href="/hydra-mark.svg"><link rel="stylesheet" href="/hydra-public.css"><meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="Hydra Agro"><meta property="og:title" content="${escape(page.title)}"><meta property="og:description" content="${escape(page.description)}"><meta property="og:url" content="${url}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(page.title)}"><meta name="twitter:description" content="${escape(page.description)}"><script type="application/ld+json">${schema}</script><style>body{margin:0}*{box-sizing:border-box}</style></head><body>${renderPage(page)}</body></html>`;
    await mkdir(`dist${page.path}`, { recursive: true });
    await writeFile(`dist${page.path}/index.html`, html);
  }
  await writeFile("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["/", ...pages.map(page => page.path)].map(path => `  <url><loc>${site}${path}</loc></url>`).join("\n")}\n</urlset>\n`);
  console.log(`Pre-rendered home and ${pages.length} public pages.`);
} finally {
  await server.close();
}
