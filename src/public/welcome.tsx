import { UsersRound } from "lucide-react";
import { HydraMark } from "../components/brand";

export function PublicProjectLink({ desktop = false }: { desktop?: boolean }) {
  return <nav className={desktop ? "hydra-public-link hydra-public-link-desktop" : "hydra-public-link"} aria-label="Sobre o projeto"><a href="/sobre" target={desktop ? "_self" : "_top"}>Conheça o Hydra Agro</a></nav>;
}

export function Welcome({ onEnter, onSignup, onStaff }: { onEnter?: () => void; onSignup?: () => void; onStaff?: () => void }) {
  return <main className="auth-landing"><div className="auth-landing-shade" aria-hidden="true" /><section className="auth-landing-content"><span className="auth-landing-mark-wrap"><HydraMark className="auth-landing-mark" /></span><p className="auth-landing-kicker">Gestão rural em um só lugar</p><h1>Água, rebanho e rotina.<br /><strong>Juntos.</strong></h1><p className="auth-landing-copy">Use o Hydra Agro no Android, iPhone, iPad ou computador.</p><div className="auth-landing-actions"><button className="auth-landing-primary" type="button" onClick={onEnter}>Entrar</button><button className="auth-landing-secondary" type="button" onClick={onSignup}>Criar conta</button></div><button className="auth-landing-staff" type="button" onClick={onStaff}><UsersRound size={17} /> Acesso de funcionário</button><PublicProjectLink /></section></main>;
}
