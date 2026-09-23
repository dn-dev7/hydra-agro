"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, KeyRound, Leaf, LifeBuoy, LogIn, ShieldCheck, Sparkles, UserPlus, UsersRound, X } from "lucide-react";
import { HydraMark } from "../../components/brand";
import type { AuthResult } from "../../lib/hydra-types";
import type { NivoIssuedCodes } from "../../services/nivo-link-service";
import {
  codeHasLength,
  createHydraCodeAccount,
  formatHydraCode,
  recoverHydraCodeAccount,
  type IssuedHydraCodes,
} from "../../services/code-auth-service";
import "./hydra-code-auth.css";

type View = "landing" | "access" | "create" | "recover" | "issued" | "staff" | "nivo" | "nivo-issued" | "admin";
type Props = {
  initialView?: "landing" | "auth";
  onCodeLogin: (code: string) => Promise<AuthResult>;
  onCreatedLocalAccount: (userId: string) => Promise<AuthResult>;
  onStaffLogin: (code: string) => Promise<AuthResult>;
  onNivoLogin: (code: string) => Promise<AuthResult>;
  onNivoCreate: () => Promise<{ result: AuthResult; issued?: NivoIssuedCodes; userId?: string }>;
  onAdminLogin: (code: string) => Promise<AuthResult>;
};

function formatStaff(value: string) {
  let compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 14);
  if (compact && !compact.startsWith("HA")) compact = ("HA" + compact).slice(0, 14);
  const body = compact.startsWith("HA") ? compact.slice(2) : compact;
  return compact ? "HA-" + (body.match(/.{1,4}/g) || []).join("-") : "";
}

export function HydraCodeAuthFlow({ initialView = "landing", onCodeLogin, onCreatedLocalAccount, onStaffLogin, onNivoLogin, onNivoCreate, onAdminLogin }: Props) {
  const [view, setView] = useState<View>(initialView === "auth" ? "access" : "landing");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [staff, setStaff] = useState("");
  const [nivoCode, setNivoCode] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [nivoIssued, setNivoIssued] = useState<NivoIssuedCodes | null>(null);
  const [nivoUserId, setNivoUserId] = useState("");
  const [issued, setIssued] = useState<IssuedHydraCodes | null>(null);
  const [issuedFrom, setIssuedFrom] = useState<"create" | "recover">("create");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"access" | "recovery" | null>(null);

  function switchView(next: View) {
    if (busy) return;
    setError("");
    setView(next);
  }

  async function issueCode(action: "create" | "recover") {
    if (busy) return;
    if (action === "recover" && !codeHasLength(recovery, 24)) {
      setError("Digite seu código de recuperação completo.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const result = action === "create" ?
        await createHydraCodeAccount() : await recoverHydraCodeAccount(recovery);
      setIssued(result);
      setIssuedFrom(action);
      setView("issued");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível criar o código agora.");
    } finally {
      setBusy(false);
    }
  }

  async function signIn(value: string, isStaff: boolean, justCreated = false) {
    if (busy) return;
    if (isStaff ? !/^HA[A-Z2-9]{12}$/.test(value.replace(/-/g, "")) : !codeHasLength(value, 16)) {
      setError("Digite seu código completo.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      if (justCreated && issued?.userId) {
        window.sessionStorage.setItem("hydra-code-onboarding", issued.userId);
      }
      const result = !isStaff && justCreated && issued?.localOnly
        ? await onCreatedLocalAccount(issued.userId)
        : isStaff ? await onStaffLogin(value) : await onCodeLogin(value);
      if (!result.ok) {
        if (justCreated) window.sessionStorage.removeItem("hydra-code-onboarding");
        setError(result.message);
        setBusy(false);
      }
      // Se houve sucesso, o HydraApp substitui esta tela assim que a conta é carregada.
    } catch (caught) {
      if (justCreated) window.sessionStorage.removeItem("hydra-code-onboarding");
      setError(caught instanceof Error ? caught.message : "Não foi possível entrar agora.");
      setBusy(false);
    }
  }

  async function loginWithNivo() {
    if (busy) return;
    if (!codeHasLength(nivoCode, 16)) {
      setError("Digite o código Nivo completo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await onNivoLogin(nivoCode);
      if (!result.ok) {
        setError(result.message);
        setBusy(false);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível entrar com o Nivo.");
      setBusy(false);
    }
  }

  async function createWithNivo() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await onNivoCreate();
      if (!response.result.ok || !response.issued || !response.userId) {
        setError(response.result.message);
        setBusy(false);
        return;
      }
      setNivoIssued(response.issued);
      setNivoUserId(response.userId);
      setView("nivo-issued");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível criar a conta Nivo.");
    } finally {
      setBusy(false);
    }
  }

  async function continueNivoAccount() {
    if (busy || !nivoUserId) return;
    setBusy(true);
    setError("");
    try {
      window.sessionStorage.setItem("hydra-code-onboarding", nivoUserId);
      const result = await onCreatedLocalAccount(nivoUserId);
      if (!result.ok) {
        window.sessionStorage.removeItem("hydra-code-onboarding");
        setError(result.message);
        setBusy(false);
      }
    } catch (caught) {
      window.sessionStorage.removeItem("hydra-code-onboarding");
      setError(caught instanceof Error ? caught.message : "Não foi possível abrir a conta.");
      setBusy(false);
    }
  }

  async function loginAdmin() {
    if (busy) return;
    if (!codeHasLength(adminCode, 16)) {
      setError("Digite o código administrativo completo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await onAdminLogin(adminCode);
      if (!result.ok) {
        setError(result.message);
        setBusy(false);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível abrir o painel.");
      setBusy(false);
    }
  }

  async function copy(value: string, kind: "access" | "recovery") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setError("Não foi possível copiar. Anote o código antes de continuar.");
    }
  }

  if (view === "landing") return (
    <main className="hydra-code-entry hydra-code-welcome">
      <header className="hydra-code-topbar"><div className="hydra-code-wordmark"><HydraMark /><span>hydra <b>agro</b></span></div></header>
      <div className="hydra-code-intro"><div className="hydra-code-welcome-mark"><HydraMark /></div>
        <span className="hydra-code-eyebrow">SUA PROPRIEDADE EM UM SÓ LUGAR</span>
        <h1>Sua rotina no campo.<br /><em>Mais simples.</em></h1>
        <p>Gerencie animais, água, tarefas e setores da propriedade. Comece com um código privado, sem senha ou e-mail.</p>
      </div>
      <div className="hydra-code-welcome-actions">
        <button className="hydra-code-primary" type="button" onClick={() => switchView("access")}><LogIn size={18} /> Entrar <ArrowRight size={19} /></button>
        <button className="hydra-code-secondary" type="button" onClick={() => switchView("create")}><UserPlus size={18} /> Criar conta</button>
        <button className="hydra-code-nivo" type="button" onClick={() => switchView("nivo")}><Sparkles size={18} /> Entrar com Nivo <ArrowRight size={18} /></button>
        <div className="hydra-code-minor-actions">
          <button className="hydra-code-muted-button" type="button" onClick={() => switchView("staff")}><UsersRound size={17} /> Funcionário</button>
          <button className="hydra-code-muted-button" type="button" onClick={() => switchView("admin")}><ShieldCheck size={17} /> Painel adm</button>
        </div>
      </div>
    </main>
  );

  return (
    <main className="hydra-code-entry hydra-code-flow">
      <header className="hydra-code-topbar"><div className="hydra-code-wordmark"><HydraMark /><span>hydra <b>agro</b></span></div>
        <button className="hydra-code-close" aria-label="Fechar" type="button" disabled={busy || view === "issued"} onClick={() => switchView("landing")}><X size={19} /></button>
      </header>
      {(view === "access" || view === "create") && <nav className="hydra-code-tabs" aria-label="Tipo de acesso">
        <button className={view === "access" ? "active" : ""} aria-current={view === "access" ? "page" : undefined} onClick={() => switchView("access")}><LogIn size={16} /> Entrar</button>
        <button className={view === "create" ? "active" : ""} aria-current={view === "create" ? "page" : undefined} onClick={() => switchView("create")}><UserPlus size={16} /> Criar conta</button>
      </nav>}
      <form className="hydra-code-panel" onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (view === "create" || view === "recover") void issueCode(view);
        else if (view === "access") void signIn(code, false);
        else if (view === "staff") void signIn(staff, true);
        else if (view === "nivo") void loginWithNivo();
        else if (view === "admin") void loginAdmin();
      }}>
        <div className="hydra-code-question" key={view}>
          <span className="hydra-code-eyebrow">
            {view === "access" ? "SEU ACESSO" : view === "create" ? "NOVO ACESSO" : view === "recover" ? "RECUPERAÇÃO" : view === "issued" ? "CÓDIGOS CRIADOS" : view === "nivo" ? "CONTA NIVO" : view === "nivo-issued" ? "CONTA NIVO CRIADA" : view === "admin" ? "ADMINISTRAÇÃO" : "ACESSO À PROPRIEDADE"}
          </span>
          <h1>{view === "access" ? "Entre no Hydra Agro" : view === "create" ? "Crie sua conta" : view === "recover" ? "Recupere seu acesso" : view === "issued" ? "Guarde seus códigos" : view === "nivo" ? "Entre com o Nivo" : view === "nivo-issued" ? "Guarde seus códigos Nivo" : view === "admin" ? "Painel administrativo" : "Código de funcionário"}</h1>
          <p>{view === "access" ? "Digite o código privado da sua conta." : view === "create" ? "Sem e-mail e sem senha. Um código privado será gerado para sua conta." : view === "recover" ? "Use o código de recuperação que você recebeu ao criar sua conta." : view === "issued" ? "Seu código de acesso permite entrar. O de recuperação cria novos códigos se você perder o primeiro." : view === "nivo" ? "Use o mesmo código da sua conta Nivo. A fazenda ficará vinculada ao Nivo e os dados resumidos poderão ser usados pela função Minha fazenda." : view === "nivo-issued" ? "Sua conta Nivo foi criada. Salve os dois códigos antes de continuar para o Hydra Agro." : view === "admin" ? "Digite o código privado de administração para abrir o painel do Hydra Agro." : "Digite o código fornecido pelo dono da propriedade."}</p>

          {view === "access" && <>
            <label className="hydra-code-label" htmlFor="hydra-access-code">Código de acesso</label>
            <input autoFocus id="hydra-access-code" className="hydra-code-input" inputMode="text" type="text" value={code} maxLength={19} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX-XXXX-XXXX" onChange={(event) => { setCode(formatHydraCode(event.target.value, 16)); setError(""); }} />
            <button className="hydra-code-muted-button inline" type="button" onClick={() => switchView("recover")}><LifeBuoy size={16} /> Perdi meu código</button>
          </>}

          {view === "recover" && <>
            <label className="hydra-code-label" htmlFor="hydra-recovery-code">Código de recuperação</label>
            <input autoFocus id="hydra-recovery-code" className="hydra-code-input" value={recovery} maxLength={29} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" onChange={(event) => { setRecovery(formatHydraCode(event.target.value, 24)); setError(""); }} />
            <p className="hydra-code-hint">Após a recuperação, seu código de acesso anterior deixa de funcionar.</p>
          </>}

          {view === "create" && <div className="hydra-code-explainer">
            <span><KeyRound size={15} /></span><p>Geramos seu código de acesso privado.</p>
            <span><ShieldCheck size={15} /></span><p>Você guarda o código e a chave de recuperação em local seguro.</p>
            <span><LogIn size={15} /></span><p>Depois, entra apenas com seu código de acesso.</p>
          </div>}

          {view === "staff" && <>
            <label className="hydra-code-label" htmlFor="hydra-staff-code">Código de funcionário</label>
            <input id="hydra-staff-code" autoFocus className="hydra-code-input" value={staff} maxLength={17} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="HA-XXXX-XXXX-XXXX" onChange={(event) => { setStaff(formatStaff(event.target.value)); setError(""); }} />
            <p className="hydra-code-hint">O dono da propriedade fornece seu código.</p>
          </>}

          {view === "nivo" && <>
            <label className="hydra-code-label" htmlFor="hydra-nivo-code">Código do Nivo</label>
            <input id="hydra-nivo-code" autoFocus className="hydra-code-input" value={nivoCode} maxLength={19} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX-XXXX-XXXX" onChange={(event) => { setNivoCode(formatHydraCode(event.target.value, 16)); setError(""); }} />
            <div className="hydra-code-nivo-note"><Sparkles size={18} /><span>Ao vincular, o Nivo ganha a função <strong>Minha fazenda</strong> com o resumo autorizado do Hydra.</span></div>
            <button className="hydra-code-muted-button inline" type="button" onClick={() => void createWithNivo()}><UserPlus size={16} /> Ainda não tenho Nivo · criar conta</button>
          </>}

          {view === "admin" && <>
            <label className="hydra-code-label" htmlFor="hydra-admin-code">Código administrativo</label>
            <input id="hydra-admin-code" autoFocus className="hydra-code-input" value={adminCode} maxLength={19} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX-XXXX-XXXX" onChange={(event) => { setAdminCode(formatHydraCode(event.target.value, 16)); setError(""); }} />
            <p className="hydra-code-hint">Este acesso abre o painel administrativo e não deve ser compartilhado.</p>
          </>}

          {view === "nivo-issued" && nivoIssued && <div className="hydra-code-issued hydra-code-issued-nivo" aria-live="polite">
            <div><small>Código de acesso Nivo</small><strong>{nivoIssued.accessCode}</strong><button aria-label="Copiar código Nivo" type="button" onClick={() => void copy(nivoIssued.accessCode, "access")}>{copied === "access" ? <Check size={17} /> : <Copy size={17} />} {copied === "access" ? "Copiado" : "Copiar"}</button></div>
            <div><small>Código de recuperação Nivo</small><strong>{nivoIssued.recoveryCode}</strong><button aria-label="Copiar recuperação Nivo" type="button" onClick={() => void copy(nivoIssued.recoveryCode, "recovery")}>{copied === "recovery" ? <Check size={17} /> : <Copy size={17} />} {copied === "recovery" ? "Copiado" : "Copiar"}</button></div>
            <p><ShieldCheck size={17} /> O mesmo Nivo ficará vinculado à sua fazenda no Hydra Agro.</p>
          </>}

          {view === "issued" && issued && <div className="hydra-code-issued" aria-live="polite">
            <div><small>Código de acesso</small><strong>{issued.accessCode}</strong><button aria-label="Copiar código de acesso" type="button" onClick={() => void copy(issued.accessCode, "access")}>{copied === "access" ? <Check size={17} /> : <Copy size={17} />} {copied === "access" ? "Copiado" : "Copiar"}</button></div>
            <div><small>Código de recuperação</small><strong>{issued.recoveryCode}</strong><button aria-label="Copiar código de recuperação" type="button" onClick={() => void copy(issued.recoveryCode, "recovery")}>{copied === "recovery" ? <Check size={17} /> : <Copy size={17} />} {copied === "recovery" ? "Copiado" : "Copiar"}</button></div>
            <p><ShieldCheck size={17} /> Estes códigos não serão exibidos novamente. Guarde os dois antes de continuar.</p>
          </div>}
          {error && <p className="hydra-code-error" role="alert">{error}</p>}
        </div>
        <div className="hydra-code-actions">
          <button className="hydra-code-back" type="button" aria-label="Voltar" disabled={busy || view === "issued" || view === "nivo-issued"} onClick={() => switchView(view === "recover" ? "access" : "landing")}><ArrowLeft size={19} /></button>
          {view === "issued" ? <button className="hydra-code-primary" disabled={busy || !issued} type="button" onClick={() => { if (issued) void signIn(issued.accessCode, false, issuedFrom === "create"); }}>{busy ? "Entrando…" : "Já salvei, continuar"} <ArrowRight size={19} /></button>
            : view === "nivo-issued" ? <button className="hydra-code-primary" disabled={busy || !nivoIssued || !nivoUserId} type="button" onClick={() => void continueNivoAccount()}>{busy ? "Abrindo…" : "Já salvei, continuar"} <ArrowRight size={19} /></button>
            : <button className="hydra-code-primary" disabled={busy || (view === "access" && !codeHasLength(code, 16)) || (view === "recover" && !codeHasLength(recovery, 24)) || (view === "staff" && staff.replace(/-/g, "").length !== 14) || (view === "nivo" && !codeHasLength(nivoCode, 16)) || (view === "admin" && !codeHasLength(adminCode, 16))} type="submit">
              {busy ? "Aguarde…" : view === "create" ? "Gerar meu código" : view === "recover" ? "Recuperar acesso" : view === "nivo" ? "Entrar com Nivo" : view === "admin" ? "Abrir painel" : "Entrar"} <ArrowRight size={19} />
            </button>}
        </div>
      </form>
      <footer className="hydra-code-footer"><Leaf size={14} /> Hydra Agro · sua propriedade, seus dados.</footer>
    </main>
  );
}
