(() => {
  // Download fixado na versão restaurada solicitada. O APK original da release
  // continua disponível mesmo quando a API do GitHub está indisponível.
  const releaseTag = "v1.3.0";
  const repository = "dn-dev7/hydra-agro";
  const assetName = "HydraAgro-v1.3.0.apk";
  const assetUrl = `https://github.com/${repository}/releases/download/${releaseTag}/${assetName}`;
  const apkLink = document.getElementById("hydra-download-apk");
  const checksumLink = document.getElementById("hydra-download-checksum");
  const status = document.getElementById("hydra-download-status");
  const meta = document.getElementById("hydra-download-meta");
  const versionNode = document.getElementById("hydra-download-version");
  const sizeNode = document.getElementById("hydra-download-size");
  const dateNode = document.getElementById("hydra-download-date");

  if (apkLink instanceof HTMLAnchorElement) {
    apkLink.href = assetUrl;
    apkLink.removeAttribute("hidden");
  }
  if (checksumLink instanceof HTMLAnchorElement) {
    checksumLink.href = assetUrl + ".sha256";
    checksumLink.removeAttribute("hidden");
  }
  if (status) status.textContent = "Versão v1.3.0 disponível para baixar";
  if (meta) meta.textContent = `Arquivo oficial ${assetName}`;
  if (versionNode) versionNode.textContent = releaseTag;
  if (sizeNode) sizeNode.textContent = "8,7 MB";
  if (dateNode) dateNode.textContent = "15 set 2026";
})();
