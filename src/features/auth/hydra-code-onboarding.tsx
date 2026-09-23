"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Mic, Sprout } from "lucide-react";
import { HydraMark } from "../../components/brand";
import "./hydra-code-onboarding.css";

export type HydraCodePreferences = { name: string; uses: string[]; tone: string; detail: string; home: string };
type Props = { initialName?: string; onFinish: (preferences: HydraCodePreferences) => Promise<void> };

const questions = [
  "Como posso te chamar?",
  "O que você mais quer fazer no Hydra Agro?",
  "Como você prefere que eu fale com você?",
  "Quando alguma coisa for complicada, como você prefere?",
  "O que você quer encontrar primeiro ao abrir o app?",
];
const purposes = ["Gerenciar meus animais","Monitorar a água","Organizar tarefas","Acompanhar o clima","Identificar animais por NFC","Cuidar da propriedade","Registrar minha produção","Um pouco de tudo"];
const tones = ["Direto ao ponto","Explicando tudo","Mais descontraído","Mais profissional","Me adaptar à situação"];
const details = ["Explica bem simples","Pode entrar em detalhes","Só aprofunda quando eu pedir","Escolhe automaticamente"];
const homes = ["Resumo da propriedade","Meus animais","Água da fazenda","Tarefas","Mapa da propriedade"];

function QuestionText({ text }: { text: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setCount(text.length); return; }
    setCount(0);
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const next = Math.min(text.length, Math.floor((now - start) / 21));
      setCount(next);
      if (next < text.length) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [text]);
  return <p>{text.slice(0, count)}</p>;
}

export function HydraCodeOnboarding({ initialName = "", onFinish }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName === "Produtor" ? "" : initialName);
  const [uses, setUses] = useState<string[]>([]);
  const [tone, setTone] = useState("");
  const [detail, setDetail] = useState("");
  const [home, setHome] = useState("");
  const [thinking, setThinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const speech = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const answers = [name, uses.join(" · "), tone, detail, home];
  const valid = step === 0 ? name.trim().length >= 2 : step === 1 ? uses.length > 0 :
    step === 2 ? Boolean(tone) : step === 3 ? Boolean(detail) : step === 4 ? Boolean(home) : true;

  useEffect(() => {
    setVoiceSupported(Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
    return () => speech.current?.abort();
  }, []);
  useEffect(() => {
    if (step === 5) return;
    setThinking(true);
    const timeout = window.setTimeout(() => setThinking(false), 330);
    return () => window.clearTimeout(timeout);
  }, [step]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [step, thinking]);

  function next() {
    if (!valid || thinking || saving) return;
    setStep((current) => Math.min(current + 1, 5));
  }
  function choose(key: "tone" | "detail" | "home", answer: string) {
    if (thinking || saving) return;
    if (key === "tone") setTone(answer);
    else if (key === "detail") setDetail(answer);
    else setHome(answer);
    window.setTimeout(() => setStep((current) => Math.min(current + 1, 5)), 115);
  }
  function listen() {
    if (listening) { speech.current?.stop(); return; }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition || step !== 0) return;
    const recorder = new Recognition();
    speech.current = recorder;
    recorder.lang = "pt-BR";
    recorder.interimResults = false;
    recorder.onresult = (event: any) => setName(String(event.results[0][0].transcript).slice(0, 80));
    recorder.onend = () => setListening(false);
    recorder.onerror = () => setListening(false);
    setListening(true);
    recorder.start();
  }
  async function finish() {
    if (saving || !name.trim()) return;
    setSaving(true); setError("");
    try {
      await onFinish({ name: name.trim(), uses, tone, detail, home });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar suas preferências.");
      setSaving(false);
    }
  }

  return (
    <main className="hydra-code-entry hydra-questions">
      <div className="hydra-questions-progress" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={6} aria-label="Progresso da criação da conta"><span style={{ width: String((step + 1) / 6 * 100) + "%" }} /></div>
      <div className={"hydra-questions-pet " + (thinking ? "is-thinking" : "")} aria-hidden="true"><HydraMark /></div>
      <div className="hydra-questions-feed" aria-live="polite">
        {questions.map((question, index) => index <= Math.min(step, 4) && <div className="hydra-questions-turn" key={question}>
          <QuestionText text={question} />
          {index === step && !thinking && <small>{index === 0 ? "Seu primeiro nome ou apelido." :
            index === 1 ? "Escolha uma ou mais opções. Você poderá usar todas as funções do app." :
              "Você pode mudar sua escolha depois."}</small>}
          {index < step && answers[index] && <div className="hydra-answer-bubble">{answers[index]}</div>}
        </div>)}
        {thinking ? <div className="hydra-questions-dots" aria-label="Preparando a próxima pergunta"><i /><i /><i /></div> :
          step === 1 ? <div className="hydra-questions-choices" role="group" aria-label={questions[1]}>
            {purposes.map((option) => <button type="button" key={option} aria-pressed={uses.includes(option)} className={uses.includes(option) ? "selected" : ""} onClick={() => setUses((current) => current.includes(option) ? current.filter((v) => v !== option) : [...current, option])}><span>{option}</span><span className="hydra-choice-indicator">{uses.includes(option) && <Check size={15} />}</span></button>)}
          </div> :
          step >= 2 && step <= 4 ? <div className="hydra-questions-choices" role="radiogroup" aria-label={questions[step]}>
            {(step === 2 ? tones : step === 3 ? details : homes).map((option) => {
              const current = step === 2 ? tone : step === 3 ? detail : home;
              return <button type="button" key={option} role="radio" aria-checked={current === option} className={current === option ? "selected" : ""} onClick={() => choose(step === 2 ? "tone" : step === 3 ? "detail" : "home", option)}><span>{option}</span><span className="hydra-choice-indicator">{current === option && <Check size={15} />}</span></button>;
            })}
          </div> :
          step === 5 ? <div className="hydra-questions-complete"><Sprout size={23} /><h1>Pronto, {name.trim()}.</h1><p>Sua conta está preparada. Agora você pode começar a organizar sua propriedade.</p></div> : null}
        <div ref={bottomRef} />
      </div>
      <div className="hydra-questions-composer">
        {error && <p className="hydra-code-error" role="alert">{error}</p>}
        {step === 0 && <form onSubmit={(event: FormEvent) => { event.preventDefault(); next(); }}>
          <label className="sr-only" htmlFor="hydra-question-name">Seu nome</label>
          <input id="hydra-question-name" autoFocus placeholder="Digite seu nome" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} autoComplete="nickname" />
          <div className="hydra-questions-control-row"><button type="button" disabled={!voiceSupported || thinking} className="hydra-questions-mic" aria-label="Responder por voz" onClick={listen}><Mic size={19} /></button><button disabled={!valid || thinking} type="submit" className="hydra-questions-next" aria-label="Continuar"><ArrowRight size={20} /></button></div>
        </form>}
        {step === 1 && <div className="hydra-questions-control-row"><span>{uses.length ? String(uses.length) + " selecionadas" : "Selecione acima"}</span><button type="button" disabled={!valid || thinking} className="hydra-questions-next" onClick={next} aria-label="Continuar"><ArrowRight size={20} /></button></div>}
        {step === 5 && <button disabled={saving} className="hydra-code-primary" onClick={() => void finish()} type="button">{saving ? "Preparando sua conta…" : "Entrar no Hydra Agro"} <ArrowRight size={18} /></button>}
        <button type="button" disabled={step === 0 || saving || thinking} className="hydra-questions-back" onClick={() => setStep((current) => Math.max(0, current - 1))}><ArrowLeft size={17} /> Voltar</button>
      </div>
    </main>
  );
}
