import { renderToStaticMarkup } from "react-dom/server";
import { Welcome } from "./welcome";
import pages from "./pages.json";

export function renderWelcome() {
  return renderToStaticMarkup(<div className="hydra-root theme-light"><Welcome /><noscript><p>Ative o JavaScript para entrar no aplicativo. As páginas sobre o projeto podem ser lidas sem JavaScript.</p></noscript></div>);
}

export function renderPage(page: typeof pages[number]) {
  return renderToStaticMarkup(<div className="hydra-public-page"><header><a className="hydra-public-brand" href="/">Hydra Agro</a><nav aria-label="Páginas do projeto">{pages.map(item => <a key={item.path} href={item.path} aria-current={item.path === page.path ? "page" : undefined}>{item.label}</a>)}</nav></header><main><h1>{page.heading}</h1><p className="hydra-public-intro">{page.intro}</p>{page.sections.map(section => <section key={section.heading}><h2>{section.heading}</h2><p>{section.text}</p></section>)}<a className="hydra-public-open" href="/">Acessar o aplicativo</a></main><footer>Hydra Agro · Gestão rural</footer></div>);
}
