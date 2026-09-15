import { renderToStaticMarkup } from "react-dom/server";
import { Welcome } from "./welcome";
import pages from "./pages.json";

export function renderWelcome() {
  return renderToStaticMarkup(<div className="hydra-root theme-light"><Welcome /><noscript><p>Ative o JavaScript para entrar no aplicativo. As páginas sobre o projeto podem ser lidas sem JavaScript.</p></noscript></div>);
}

function DownloadCard() {
  return <section className="hydra-download-hero" aria-labelledby="hydra-download-title">
    <div className="hydra-download-hero-copy">
      <div className="hydra-download-product-line">
        <span className="hydra-download-app-mark" aria-hidden="true"><img src="/hydra-mark.svg" alt="" /></span>
        <div>
          <p className="hydra-download-eyebrow">Aplicativo oficial para Android</p>
          <p className="hydra-download-product-name">Hydra Agro</p>
        </div>
      </div>

      <h2 id="hydra-download-title">Leve a gestão da propriedade com você.</h2>
      <p className="hydra-download-lead">Instale a versão oficial do Hydra Agro no Android e acesse animais, atividades, água e outros registros direto pelo aplicativo.</p>

      <div className="hydra-download-availability" aria-live="polite">
        <span className="hydra-download-dot" aria-hidden="true" />
        <span id="hydra-download-status">Consultando a versão mais recente...</span>
      </div>

      <div className="hydra-download-actions">
        <a id="hydra-download-apk" className="hydra-download-primary" href="#" hidden>
          <span className="hydra-download-button-icon" aria-hidden="true">↓</span>
          <span><strong>Baixar para Android</strong><small>APK oficial</small></span>
        </a>
        <a className="hydra-download-web" href="/">
          <span><strong>Usar versão Web</strong><small>Sem instalar</small></span>
        </a>
      </div>

      <div className="hydra-download-release-meta" aria-label="Informações da versão">
        <div><span>Versão</span><strong id="hydra-download-version">—</strong></div>
        <div><span>Tamanho</span><strong id="hydra-download-size">—</strong></div>
        <div><span>Publicação</span><strong id="hydra-download-date">—</strong></div>
      </div>
      <p id="hydra-download-meta" className="hydra-download-meta" />
    </div>

    <aside className="hydra-download-device" aria-label="Prévia do Hydra Agro no Android">
      <div className="hydra-download-phone">
        <div className="hydra-download-phone-top"><span /></div>
        <div className="hydra-download-phone-screen">
          <div className="hydra-download-phone-brand"><img src="/hydra-mark.svg" alt="" /><span>Hydra Agro</span></div>
          <p className="hydra-download-phone-kicker">Sua propriedade</p>
          <h3>Organizada em um só lugar.</h3>
          <div className="hydra-download-mini-grid" aria-hidden="true">
            <span><b>Animais</b><i>Rebanho</i></span>
            <span><b>Água</b><i>Registros</i></span>
            <span><b>Atividades</b><i>Rotina</i></span>
            <span><b>Setores</b><i>Propriedade</i></span>
          </div>
          <div className="hydra-download-phone-bar"><span /><span /><span /></div>
        </div>
      </div>
    </aside>
  </section>;
}

function DownloadContent(page: typeof pages[number]) {
  const install = page.sections[0];
  const supporting = page.sections.slice(1);
  return <>
    <DownloadCard />

    <section className="hydra-download-install" aria-labelledby="hydra-install-title">
      <div className="hydra-download-section-heading">
        <p className="hydra-download-eyebrow">Instalação rápida</p>
        <h2 id="hydra-install-title">{install?.heading ?? "Como instalar no Android"}</h2>
        <p>O processo é direto e leva apenas alguns passos no próprio celular.</p>
      </div>
      <div className="hydra-download-steps">
        <article><span>01</span><h3>Baixe o APK</h3><p>Use o botão oficial acima para baixar a versão mais recente.</p></article>
        <article><span>02</span><h3>Abra o arquivo</h3><p>Quando o download terminar, toque no APK. Se o Android pedir permissão, autorize apenas a origem usada neste download.</p></article>
        <article><span>03</span><h3>Instale e entre</h3><p>Conclua a instalação, abra o Hydra Agro e acesse sua conta normalmente.</p></article>
      </div>
    </section>

    <div className="hydra-download-info-grid">
      {supporting.map((section, index) => <section className="hydra-download-info-card" key={section.heading}>
        <span className="hydra-download-info-number" aria-hidden="true">0{index + 1}</span>
        <h2>{section.heading}</h2>
        <p>{section.text}</p>
        {section.heading === "Segurança do download" ? <div className="hydra-download-security-links">
          <a id="hydra-download-checksum" href="#" hidden>Ver SHA-256</a>
          <a id="hydra-download-releases" href="https://github.com/dnmtfe3-cpu/hydra-agr/releases" rel="noopener noreferrer">Releases oficiais</a>
        </div> : null}
      </section>)}
    </div>
  </>;
}

export function renderPage(page: typeof pages[number]) {
  const isDownload = page.path === "/download";
  return renderToStaticMarkup(<div className={`hydra-public-page${isDownload ? " hydra-download-page" : ""}`}><header><a className="hydra-public-brand" href="/">Hydra Agro</a><nav aria-label="Páginas do projeto">{pages.map(item => <a key={item.path} href={item.path} aria-current={item.path === page.path ? "page" : undefined}>{item.label}</a>)}</nav></header><main>{isDownload ? <div className="hydra-download-heading"><p className="hydra-download-eyebrow">Hydra Agro para Android</p><h1>{page.heading}</h1><p className="hydra-public-intro">{page.intro}</p></div> : <><h1>{page.heading}</h1><p className="hydra-public-intro">{page.intro}</p></>}{isDownload ? <DownloadContent page={page} /> : page.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2><p>{section.text}</p></section>)}{!isDownload ? <a className="hydra-public-open" href="/">Acessar o aplicativo</a> : null}</main><footer>Hydra Agro · Gestão rural</footer></div>);
}
