(() => {
  const input = document.getElementById("keystore");
  const output = document.getElementById("base64");
  const copy = document.getElementById("copy");
  const clear = document.getElementById("clear");
  const status = document.getElementById("status");

  if (!(input instanceof HTMLInputElement) || !(output instanceof HTMLTextAreaElement) || !(copy instanceof HTMLButtonElement) || !(clear instanceof HTMLButtonElement) || !(status instanceof HTMLElement)) return;

  function reset(message = "") {
    input.value = "";
    output.value = "";
    copy.disabled = true;
    status.textContent = message;
  }

  function bytesToBase64(bytes) {
    const chunkSize = 0x8000;
    let binary = "";
    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, Math.min(index + chunkSize, bytes.length));
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) {
      reset();
      return;
    }

    const allowed = file.name.toLowerCase().endsWith(".jks") || file.name.toLowerCase().endsWith(".keystore");
    if (!allowed) {
      reset("Escolha um arquivo .jks ou .keystore.");
      return;
    }

    try {
      status.textContent = "Convertendo somente neste navegador…";
      const buffer = await file.arrayBuffer();
      const encoded = bytesToBase64(new Uint8Array(buffer));
      output.value = encoded;
      copy.disabled = encoded.length === 0;
      status.textContent = encoded ? `Pronto: ${file.name}. Agora copie o Base64 para o Secret do GitHub.` : "O arquivo está vazio.";
    } catch {
      reset("Não foi possível ler esse arquivo. Tente selecioná-lo novamente.");
    }
  });

  copy.addEventListener("click", async () => {
    if (!output.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
      status.textContent = "Base64 copiado. Cole em ANDROID_KEYSTORE_BASE64 no GitHub.";
    } catch {
      output.focus();
      output.select();
      status.textContent = "Selecione e copie o texto manualmente.";
    }
  });

  clear.addEventListener("click", () => reset("Conteúdo limpo desta página."));

  window.addEventListener("pagehide", () => {
    output.value = "";
  });
})();
