import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Download, Globe2, MonitorSmartphone, Share2, SquarePlus } from "lucide-react";
import { loadAccount } from "../services/hydra-repository";
import { requireSupabase } from "../services/supabase";
import "../platform-choice-dialog.css";

type DeviceKind = "android" | "ios" | "desktop";

const SESSION_KEY_PREFIX = "hydra.platform-choice.";

function detectDevice(): DeviceKind {
  if (typeof navigator === "undefined") return "desktop";
  const userAgent = navigator.userAgent || "";
  const isIpad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iPad|iPhone|iPod/i.test(userAgent) || isIpad) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}

function clearSessionChoices() {
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(SESSION_KEY_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    // O navegador pode bloquear armazenamento em modos privados/restritos.
  }
}

export function PlatformChoiceDialog() {
  const device = useMemo(detectDevice, []);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [showIosTutorial, setShowIosTutorial] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const inspectAccount = async () => {
      try {
        const client = requireSupabase();
        const {
          data: { user },
        } = await client.auth.getUser();
        if (!active || !user) {
          if (active) setOpen(false);
          return;
        }

        const account = await loadAccount(user);
        if (!active || account.access.kind === "staff") return;

        const key = `${SESSION_KEY_PREFIX}${user.id}`;
        let alreadyAnswered = false;
        try {
          alreadyAnswered = sessionStorage.getItem(key) === "answered";
        } catch {
          alreadyAnswered = false;
        }

        setUserId(user.id);
        setOpen(!alreadyAnswered);
      } catch {
        if (active) setOpen(false);
      }
    };

    void inspectAccount();

    try {
      const client = requireSupabase();
      const { data } = client.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          clearSessionChoices();
          setUserId("");
          setOpen(false);
          setShowIosTutorial(false);
          return;
        }
        if (event !== "SIGNED_IN" && event !== "USER_UPDATED" && event !== "INITIAL_SESSION") return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          if (active) void inspectAccount();
        }, 120);
      });

      return () => {
        active = false;
        clearTimeout(timer);
        data.subscription.unsubscribe();
      };
    } catch {
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, []);

  function rememberAnswer() {
    if (!userId) return;
    try {
      sessionStorage.setItem(`${SESSION_KEY_PREFIX}${userId}`, "answered");
    } catch {
      // A escolha continua válida nesta renderização mesmo sem armazenamento.
    }
  }

  function continueOnWeb() {
    rememberAnswer();
    setShowIosTutorial(false);
    setOpen(false);
  }

  function openAndroidDownload() {
    rememberAnswer();
    window.location.assign("/download");
  }

  if (!open) return null;

  const isIos = device === "ios";
  const isAndroid = device === "android";

  return (
    <div className="platform-choice-backdrop">
      <section className="platform-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="platform-choice-title">
        <div className="platform-choice-mark" aria-hidden="true">
          <MonitorSmartphone size={23} />
        </div>
        <p className="platform-choice-kicker">HYDRA AGRO</p>
        <h2 id="platform-choice-title">Como você quer usar o Hydra Agro?</h2>
        <p className="platform-choice-subtitle">
          {isIos
            ? "No iPhone e iPad, use a versão Web ou adicione o Hydra Agro à Tela de Início."
            : isAndroid
              ? "Você pode instalar o aplicativo no Android ou continuar direto pelo navegador."
              : "Continue pela Web neste computador ou baixe o aplicativo para usar no Android."}
        </p>

        <div className="platform-choice-options">
          {isAndroid ? (
            <>
              <button className="platform-choice-option platform-choice-option-primary" type="button" onClick={openAndroidDownload}>
                <span className="platform-choice-option-icon"><Download size={21} /></span>
                <span><strong>Baixar para Android</strong><small>Instalar o APK oficial</small></span>
              </button>
              <button className="platform-choice-option" type="button" onClick={continueOnWeb}>
                <span className="platform-choice-option-icon"><Globe2 size={21} /></span>
                <span><strong>Continuar na Web</strong><small>Usar agora sem instalar</small></span>
              </button>
            </>
          ) : isIos ? (
            <>
              <button className="platform-choice-option platform-choice-option-primary" type="button" onClick={continueOnWeb}>
                <span className="platform-choice-option-icon"><Globe2 size={21} /></span>
                <span><strong>Continuar na Web</strong><small>Abrir o Hydra Agro no Safari</small></span>
              </button>
              <button className="platform-choice-option" type="button" onClick={() => setShowIosTutorial((current) => !current)} aria-expanded={showIosTutorial}>
                <span className="platform-choice-option-icon"><SquarePlus size={21} /></span>
                <span><strong>Adicionar à Tela de Início</strong><small>Usar com aparência de aplicativo</small></span>
              </button>
            </>
          ) : (
            <>
              <button className="platform-choice-option platform-choice-option-primary" type="button" onClick={continueOnWeb}>
                <span className="platform-choice-option-icon"><Globe2 size={21} /></span>
                <span><strong>Usar versão Web</strong><small>Continuar neste computador</small></span>
              </button>
              <button className="platform-choice-option" type="button" onClick={openAndroidDownload}>
                <span className="platform-choice-option-icon"><Download size={21} /></span>
                <span><strong>Baixar para Android</strong><small>Abrir a página do APK oficial</small></span>
              </button>
            </>
          )}
        </div>

        {isIos && showIosTutorial && (
          <div className="platform-choice-ios-tutorial" role="status">
            <div><span>1</span><p><Share2 size={17} /> Toque em <strong>Compartilhar</strong> no Safari.</p></div>
            <div><span>2</span><p><SquarePlus size={17} /> Escolha <strong>Adicionar à Tela de Início</strong>.</p></div>
            <div><span>3</span><p>Toque em <strong>Adicionar</strong> para concluir.</p></div>
            <button type="button" onClick={continueOnWeb}>Entendi, continuar</button>
          </div>
        )}

        <p className="platform-choice-note">Você pode continuar usando a mesma conta nas duas versões.</p>
      </section>
    </div>
  );
}
