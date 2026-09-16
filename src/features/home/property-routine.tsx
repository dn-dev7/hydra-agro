import { useState } from "react";
import { Bell, Beef, Check, ChevronRight, ClipboardCheck, Droplets, ScanLine, Recycle, MapPin } from "lucide-react";
import type { Announcement, AppRoute, HydraAccount, UpdateAccount } from "../../lib/hydra-types";
import { HomeScienceSummary } from "../climate/home-science-summary";

const shortcuts = [
  { route: "herd", label: "Animais", icon: Beef },
  { route: "water", label: "Água", icon: Droplets },
  { route: "activities", label: "Tarefas", icon: ClipboardCheck },
  { route: "nfc", label: "Ler tag", icon: ScanLine },
] as const;

export function PropertyRoutine({ account, navigate, announcements, updateAccount, greeting, unread, onNutriCiclo }: {
  account: HydraAccount; navigate: (route: AppRoute) => void; announcements: Announcement[];
  updateAccount: UpdateAccount; greeting: string; unread: boolean; onNutriCiclo: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const pending = account.activities.filter((item) => !item.done).sort((a, b) => a.date.localeCompare(b.date));
  const alert = announcements.find((item) => item.level === "critical" || item.level === "attention");
  const sources = account.waterSources.filter((source) => source.status !== "ativa");
  const occurrences = account.monitoring.filter((item) => item.occurrence).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2);
  async function complete(id: string) {
    if (busy) return;
    setBusy(id); setFeedback("");
    try {
      await updateAccount((current) => ({ ...current, activities: current.activities.map((item) => item.id === id ? { ...item, done: true } : item) }), { requireRemote: true });
      setFeedback("Tarefa concluída. Confira o estado de sincronização no topo.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente."); }
    finally { setBusy(null); }
  }
  return <div className="screen home-screen rural-home page-enter">
    <header className="rural-header"><div><p>{greeting}</p><button onClick={() => navigate("property")}><MapPin size={16} /><strong>{account.property.name || "Minha propriedade"}</strong><ChevronRight size={16} /></button></div><button className="icon-button" aria-label="Notificações" onClick={() => navigate("notifications")}><Bell size={22} />{unread && <span className="notification-dot" />}</button></header>
    <section className="rural-today"><span className="rural-eyebrow">Hoje na propriedade</span><h1>{alert?.title || pending[0]?.title || "Tudo em dia"}</h1><p>{alert?.body || (pending[0] ? `Próxima tarefa · ${pending[0].date.split("-").reverse().join("/")}` : "Veja os registros e organize os próximos passos.")}</p><button className="primary-button" onClick={() => navigate(alert ? "notifications" : "activities")}>{alert ? "Ver aviso" : "Ver tarefas"}<ChevronRight size={18} /></button></section>
    <nav className="rural-shortcuts" aria-label="Atalhos da propriedade">{shortcuts.map(({ route, label, icon: Icon }) => <button key={route} onClick={() => navigate(route)}><span><Icon size={24} /></span><strong>{label}</strong></button>)}</nav>
    <section className="rural-section"><header><h2>Próximas atividades</h2><button onClick={() => navigate("activities")}>Ver todas<ChevronRight size={16} /></button></header>{pending.length ? <ul className="rural-list">{pending.slice(0, 3).map((item) => <li key={item.id}><button className="rural-row-copy" onClick={() => navigate("activities")}><strong>{item.title}</strong><small>{item.date.split("-").reverse().join("/")} · {item.category}</small></button><button className="rural-complete" disabled={busy !== null} aria-label={`Concluir ${item.title}`} onClick={() => void complete(item.id)}>{busy === item.id ? "…" : <Check size={20} />}</button></li>)}</ul> : <p className="rural-muted">Nenhuma tarefa pendente.</p>}<p className="rural-feedback" role="status">{feedback}</p></section>
    <section className="rural-section"><header><h2>Água</h2><button onClick={() => navigate("water")}>Registrar<ChevronRight size={16} /></button></header><button className="rural-water" onClick={() => navigate("water")}><Droplets size={25} /><span><strong>{sources.length ? `${sources.length} ${sources.length === 1 ? "fonte precisa" : "fontes precisam"} de atenção` : account.waterSources.length ? "Fontes de água ativas" : "Cadastre uma fonte de água"}</strong><small>{sources.length ? sources.slice(0, 2).map((source) => source.name).join(" · ") : "Acompanhe o abastecimento e os registros"}</small></span><ChevronRight size={18} /></button></section>
    <HomeScienceSummary account={account} compact onOpen={() => navigate("climate")} />
    {announcements.some((item) => item.id !== alert?.id) && <section className="rural-section"><h2>Avisos</h2>{announcements.filter((item) => item.id !== alert?.id).map((item) => <details className="rural-announcement" key={item.id}><summary>{item.title}</summary><p>{item.body}</p></details>)}</section>}
    {occurrences.length > 0 && <section className="rural-section"><header><h2>Ocorrências recentes</h2><button onClick={() => navigate("monitor")}>Ver todas<ChevronRight size={16} /></button></header><ul className="rural-list">{occurrences.map((item) => <li key={item.id}><button className="rural-row-copy" onClick={() => navigate("monitor")}><strong>{item.occurrence}</strong><small>{item.date.split("-").reverse().join("/")}</small></button><ChevronRight size={18} /></li>)}</ul></section>}
    <button className="rural-tool-link" onClick={onNutriCiclo}><Recycle size={18} />Hydra NutriCiclo<ChevronRight size={16} /></button>
  </div>;
}
