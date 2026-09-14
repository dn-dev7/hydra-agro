import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BarChart3, CheckCircle2, ClipboardList, FlaskConical, Plus, Save, WifiOff } from "lucide-react";
import { Field, LoadingButton, Modal, ScreenHeader } from "../../components/ui";
import type { HydraAccount } from "../../lib/hydra-types";
import {
  calculateResearchMetrics, emptyResearchData, loadResearchData, saveResearchData,
  syncResearchData, type ResearchData, type ResearchMethodology, type ResearchTest,
} from "../../services/research-service";
import "./research-impact.css";

type Props = { account: HydraAccount; onBack: () => void };
type Tab = "results" | "tests" | "methodology";

const blankTest = () => ({
  participantCode: "P-" + Math.random().toString(36).slice(2, 6).toUpperCase(),
  userType: "Produtor rural", task: "Localizar informações de um animal",
  withoutTime: "", withTime: "", withoutErrors: "0", withErrors: "0",
  withoutCompleted: true, withCompleted: true, easeRating: "4", notes: "",
});

const methodFields: Array<[keyof ResearchMethodology, string, string]> = [
  ["problem", "Problema observado", "Qual dificuldade real foi observada?"],
  ["researchQuestion", "Pergunta de pesquisa", "O que o teste pretende responder?"],
  ["hypothesis", "Hipótese", "Resultado esperado antes dos testes."],
  ["generalObjective", "Objetivo geral", "Objetivo principal do projeto."],
  ["specificObjectives", "Objetivos específicos", "Liste os objetivos menores."],
  ["methodology", "Metodologia", "Como os testes serão realizados?"],
  ["audience", "Público do teste", "Descreva o público sem dados pessoais."],
  ["variables", "Variáveis analisadas", "Tempo, erros, conclusão e facilidade."],
  ["results", "Resultados", "Registre apenas resultados obtidos."],
  ["conclusion", "Conclusão", "Preencha depois de analisar os dados."],
  ["limitations", "Limitações", "O que pode afetar os resultados?"],
  ["futureImprovements", "Melhorias futuras", "Próximas etapas do projeto."],
];

function seconds(value: number) {
  if (!Number.isFinite(value)) return "0 s";
  return value >= 60 ? (value / 60).toFixed(1).replace(".", ",") + " min" : Math.round(value) + " s";
}

export function ResearchImpactScreen({ account, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("results");
  const [data, setData] = useState<ResearchData>(emptyResearchData);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [draft, setDraft] = useState(blankTest);
  const metrics = useMemo(() => calculateResearchMetrics(data.tests), [data.tests]);

  useEffect(() => {
    let active = true;
    void loadResearchData(account.id).then(value => { if (active) { setData(value); setLoaded(true); } });
    const online = () => void syncResearchData(account.id).then(value => { if (active && value) setData(value); });
    window.addEventListener("online", online);
    return () => { active = false; window.removeEventListener("online", online); };
  }, [account.id]);

  async function persist(next: ResearchData) {
    setSaving(true);
    const result = await saveResearchData(account.id, { tests: next.tests, methodology: next.methodology });
    setData(result.data);
    setSaving(false);
  }

  async function addTest(event: FormEvent) {
    event.preventDefault();
    const withoutTime = Number(draft.withoutTime);
    const withTime = Number(draft.withTime);
    if (!draft.participantCode.trim() || !draft.task.trim() || withoutTime <= 0 || withTime <= 0) return;
    const test: ResearchTest = {
      id: crypto.randomUUID(), participantCode: draft.participantCode.trim().toUpperCase(),
      userType: draft.userType, task: draft.task.trim(),
      withoutHydra: { durationSeconds: withoutTime, errors: Math.max(0, Number(draft.withoutErrors)), completed: draft.withoutCompleted },
      withHydra: { durationSeconds: withTime, errors: Math.max(0, Number(draft.withErrors)), completed: draft.withCompleted },
      easeRating: Number(draft.easeRating), notes: draft.notes.trim() || undefined, createdAt: new Date().toISOString(),
    };
    await persist({ ...data, tests: [test, ...data.tests] });
    setDraft(blankTest()); setTestOpen(false); setTab("results");
  }

  async function saveMethodology(event: FormEvent) {
    event.preventDefault();
    await persist(data);
  }

  return <div className="screen page-enter extra-screen research-screen">
    <ScreenHeader eyebrow="DADOS DO PROJETO" title="Pesquisa e Impacto" subtitle="Teste o Hydra Agro e gere resultados a partir dos dados coletados." onBack={onBack} />
    <div className={"research-sync " + (data.pendingSync ? "pending" : "ok")} role="status">
      {data.pendingSync ? <WifiOff size={16} /> : <CheckCircle2 size={16} />}
      <span>{data.pendingSync ? "Salvo no dispositivo · aguardando conexão" : "Sincronizado"}</span>
    </div>
    <div className="research-tabs" role="tablist" aria-label="Seções de pesquisa e impacto">
      <button role="tab" aria-selected={tab === "results"} className={tab === "results" ? "active" : ""} onClick={() => setTab("results")}><BarChart3 size={16} />Resultados</button>
      <button role="tab" aria-selected={tab === "tests"} className={tab === "tests" ? "active" : ""} onClick={() => setTab("tests")}><ClipboardList size={16} />Testes</button>
      <button role="tab" aria-selected={tab === "methodology"} className={tab === "methodology" ? "active" : ""} onClick={() => setTab("methodology")}><FlaskConical size={16} />Método</button>
    </div>

    {!loaded ? <div className="research-empty">Carregando dados…</div> : tab === "results" ? <div className="research-stack">
      <section className="research-hero"><FlaskConical size={25} /><div><small>TESTES REGISTRADOS</small><strong>{metrics.count}</strong><span>{metrics.sufficient ? "Amostra pronta para uma análise inicial" : "Faça pelo menos 5 testes comparáveis"}</span></div></section>
      <div className="research-metrics">
        <article><small>Tempo médio</small><strong>{seconds(metrics.withTime)}</strong><span>com Hydra</span></article>
        <article><small>Redução de tempo</small><strong>{metrics.count ? metrics.reduction.toFixed(1).replace(".", ",") + "%" : "—"}</strong><span>comparação</span></article>
        <article><small>Erros médios</small><strong>{metrics.withErrors.toFixed(1).replace(".", ",")}</strong><span>com Hydra</span></article>
        <article><small>Facilidade</small><strong>{metrics.count ? metrics.ease.toFixed(1).replace(".", ",") + "/5" : "—"}</strong><span>avaliação</span></article>
      </div>
      {metrics.count > 0 && <section className="research-comparison">
        <header><BarChart3 size={20} /><div><small>COMPARAÇÃO</small><strong>Sem Hydra x Com Hydra</strong></div></header>
        <div className="research-bars">
          <div><span>Tempo</span><i><b style={{ width: "100%" }} /></i><em>{seconds(metrics.withoutTime)}</em></div>
          <div><span>Tempo com Hydra</span><i><b className="hydra" style={{ width: Math.max(5, Math.min(100, metrics.withoutTime ? metrics.withTime / metrics.withoutTime * 100 : 0)) + "%" }} /></i><em>{seconds(metrics.withTime)}</em></div>
        </div>
        <p>Conclusão automática: {metrics.sufficient ? (metrics.reduction > 0 ? "nos testes registrados, o Hydra reduziu o tempo médio em " + metrics.reduction.toFixed(1).replace(".", ",") + "%." : "os testes ainda não mostram redução do tempo médio.") : "ainda não há dados suficientes para sustentar uma conclusão."}</p>
      </section>}
      <section className="research-completion"><strong>Taxa de conclusão</strong><div><span>Sem Hydra <b>{metrics.withoutCompletion.toFixed(0)}%</b></span><span>Com Hydra <b>{metrics.withCompletion.toFixed(0)}%</b></span></div></section>
    </div> : tab === "tests" ? <div className="research-stack">
      <button className="primary-button full" onClick={() => setTestOpen(true)}><Plus size={18} /> Registrar teste</button>
      {data.tests.length === 0 ? <div className="research-empty"><ClipboardList size={28} /><strong>Nenhum teste registrado</strong><span>Compare a mesma tarefa com e sem o Hydra.</span></div> : <div className="research-test-list">{data.tests.map(test => <article key={test.id}><div><small>{test.participantCode} · {test.userType}</small><strong>{test.task}</strong><span>{seconds(test.withoutHydra.durationSeconds)} sem · {seconds(test.withHydra.durationSeconds)} com Hydra</span></div><b>{test.easeRating}/5</b></article>)}</div>}
    </div> : <form className="research-method" onSubmit={saveMethodology}>
      <p>Preencha com dados reais do projeto. O Hydra não cria resultados científicos automaticamente.</p>
      {methodFields.map(([field, label, placeholder]) => <Field label={label} key={field}><textarea value={data.methodology[field]} placeholder={placeholder} onChange={event => setData(current => ({ ...current, methodology: { ...current.methodology, [field]: event.target.value } }))} /></Field>)}
      <LoadingButton className="primary-button full" type="submit" loading={saving} loadingLabel="Salvando…"><Save size={18} /> Salvar metodologia</LoadingButton>
    </form>}

    <Modal open={testOpen} onClose={() => setTestOpen(false)} eyebrow="TESTE ANÔNIMO" title="Registrar comparação" wide>
      <form className="research-form" onSubmit={addTest}>
        <Field label="Código anônimo"><input value={draft.participantCode} onChange={event => setDraft({ ...draft, participantCode: event.target.value })} /></Field>
        <Field label="Tipo de usuário"><select value={draft.userType} onChange={event => setDraft({ ...draft, userType: event.target.value })}><option>Produtor rural</option><option>Trabalhador rural</option><option>Estudante</option><option>Outro</option></select></Field>
        <Field label="Tarefa"><input value={draft.task} onChange={event => setDraft({ ...draft, task: event.target.value })} /></Field>
        <div className="research-pair"><section><strong>SEM HYDRA</strong><Field label="Duração em segundos"><input type="number" min="1" inputMode="numeric" value={draft.withoutTime} onChange={event => setDraft({ ...draft, withoutTime: event.target.value })} /></Field><Field label="Erros"><input type="number" min="0" inputMode="numeric" value={draft.withoutErrors} onChange={event => setDraft({ ...draft, withoutErrors: event.target.value })} /></Field><label className="research-check"><input type="checkbox" checked={draft.withoutCompleted} onChange={event => setDraft({ ...draft, withoutCompleted: event.target.checked })} /> Tarefa concluída</label></section>
        <section><strong>COM HYDRA</strong><Field label="Duração em segundos"><input type="number" min="1" inputMode="numeric" value={draft.withTime} onChange={event => setDraft({ ...draft, withTime: event.target.value })} /></Field><Field label="Erros"><input type="number" min="0" inputMode="numeric" value={draft.withErrors} onChange={event => setDraft({ ...draft, withErrors: event.target.value })} /></Field><label className="research-check"><input type="checkbox" checked={draft.withCompleted} onChange={event => setDraft({ ...draft, withCompleted: event.target.checked })} /> Tarefa concluída</label></section></div>
        <Field label="Facilidade, de 1 a 5"><select value={draft.easeRating} onChange={event => setDraft({ ...draft, easeRating: event.target.value })}>{[1,2,3,4,5].map(value => <option key={value} value={value}>{value}</option>)}</select></Field>
        <Field label="Observações"><textarea value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} placeholder="Sem nomes, telefones ou documentos." /></Field>
        <LoadingButton className="primary-button full" type="submit" loading={saving} loadingLabel="Salvando…">Salvar teste</LoadingButton>
      </form>
    </Modal>
  </div>;
}
