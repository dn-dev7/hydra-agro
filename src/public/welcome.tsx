import { ArrowUpRight, BookOpen, Download, UsersRound } from "lucide-react";
import { HydraMark } from "../components/brand";

export function PublicProjectLink({ desktop = false }: { desktop?: boolean }) {
  return <nav className={desktop ? "hydra-public-link hydra-public-link-desktop" : "hydra-public-link"} aria-label="Sobre o projeto">
    <a className="hydra-project-link hydra-project-link-about" href="/sobre" target={desktop ? "_self" : "_top"}>
      <span className="hydra-project-link-icon" aria-hidden="true"><BookOpen size={17} /></span>
      <span className="hydra-project-link-copy"><strong>Conheça o Hydra Agro</strong><small>Veja como funciona</small></span>
      <ArrowUpRight className="hydra-project-link-arrow" size={15} aria-hidden="true" />
    </a>
    <a className="hydra-project-link hydra-project-link-download" href="/download" target={desktop ? "_self" : "_top"}>
      <span className="hydra-project-link-icon" aria-hidden="true"><Download size={17} /></span>
      <span className="hydra-project-link-copy"><strong>Baixar para Android</strong><small>APK oficial</small></span>
      <ArrowUpRight className="hydra-project-link-arrow" size={15} aria-hidden="true" />
    </a>
  </nav>;
}

export function Welcome({ onEnter, onSignup, onStaff }: { onEnter?: () => void; onSignup?: () => void; onStaff?: () => void }) {
  return <main className="auth-landing"><div className="auth-landing-shade" aria-hidden="true" /><section className="auth-landing-content"><span className="auth-landing-mark-wrap"><HydraMark className="auth-landing-mark" /></span><p className="auth-landing-kicker">Gestão rural em um só lugar</p><h1>Água, rebanho e rotina.<br /><strong>Juntos.</strong></h1><p className="auth-landing-copy">Use o Hydra Agro no Android, iPhone, iPad ou computador.</p><div className="auth-landing-actions"><button className="auth-landing-primary" type="button" onClick={onEnter}>Entrar</button><button className="auth-landing-secondary" type="button" onClick={onSignup}>Criar conta</button></div><PublicProjectLink /><button className="auth-landing-staff" type="button" onClick={onStaff}><UsersRound size={17} /> Acesso de funcionário</button></section></main>;
}
