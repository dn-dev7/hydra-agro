import { renderToStaticMarkup } from "react-dom/server";
import { Welcome } from "./welcome";
import pages from "./pages.json";

export function renderWelcome() {
  return renderToStaticMarkup(<div className="hydra-root theme-light"><Welcome /><noscript><p>Ative o JavaScript para entrar no aplicativo. As páginas sobre o projeto podem ser lidas sem JavaScript.</p></noscript></div>);
}

function DownloadCard() {
  return <section className="hydra-download-card" aria-labelledby="hydra-download-title">
    <p className="hydra-download-eyebrow">Android</p>
    <h2 id="hydra-download-title">Versão oficial mais recente</h2>
    <p id="hydra-download-status" className="hydra-download-status" aria-live="polite">Consultando a versão mais recente...</p>
    <div className="hydra-download-actions">
      <a id="hydra-download-apk" className="hydra-public-open hydra-download-primary" href="#" hidden>Baixar APK oficial</a>
      <a id="hydra-download-checksum" className="hydra-download-secondary" href="#" hidden>Ver SHA-256</a>
      <a id="hydra-download-releases" className="hydra-download-secondary" href="https://github.com/dnmtfe3-cpu/hydra-agr/releases" rel="noopener noreferrer">Releases oficiais</a>
    </div>
    <p id="hydra-download-meta" className="hydra-download-meta" />
  </section>;
}

export function renderPage(page: typeof pages[number]) {
  const isDownload = page.path === "/download";
  return renderToStaticMarkup(<div className="hydra-public-page"><header><a className="hydra-public-brand" href="/">Hydra Agro</a><nav aria-label="Páginas do projeto">{pages.map(item => <a key={item.path} href={item.path} aria-current={item.path === page.path ? "page" : undefined}>{item.label}</a>)}</nav></header><main><h1>{page.heading}</h1><p className="hydra-public-intro">{page.intro}</p>{isDownload ? <DownloadCard /> : null}{page.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2><p>{section.text}</p></section>)}<a className="hydra-public-open" href="/">Acessar o aplicativo</a></main><footer>Hydra Agro · Gestão rural</footer></div>);
}
