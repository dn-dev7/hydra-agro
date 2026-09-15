(() => {
  const status = document.getElementById("hydra-download-status");
  const meta = document.getElementById("hydra-download-meta");
  const apkLink = document.getElementById("hydra-download-apk");
  const checksumLink = document.getElementById("hydra-download-checksum");

  if (!status || !meta || !(apkLink instanceof HTMLAnchorElement) || !(checksumLink instanceof HTMLAnchorElement)) return;

  const formatSize = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
  };

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
  };

  fetch("https://api.github.com/repos/dnmtfe3-cpu/hydra-agr/releases/latest", {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then((response) => {
      if (!response.ok) throw new Error(`GitHub respondeu ${response.status}`);
      return response.json();
    })
    .then((release) => {
      const assets = Array.isArray(release.assets) ? release.assets : [];
      const apk = assets.find((asset) => typeof asset?.name === "string" && /^HydraAgro-v.+\.apk$/i.test(asset.name));
      if (!apk?.browser_download_url) throw new Error("Release sem APK oficial");

      const checksum = assets.find((asset) => asset?.name === `${apk.name}.sha256`);
      const version = typeof release.tag_name === "string" ? release.tag_name : "versão atual";
      const published = formatDate(release.published_at);
      const size = formatSize(Number(apk.size));

      apkLink.href = apk.browser_download_url;
      apkLink.removeAttribute("hidden");
      status.textContent = `Disponível: ${version}`;
      meta.textContent = [size, published ? `publicado em ${published}` : ""].filter(Boolean).join(" · ");

      if (checksum?.browser_download_url) {
        checksumLink.href = checksum.browser_download_url;
        checksumLink.removeAttribute("hidden");
      }
    })
    .catch(() => {
      status.textContent = "A primeira versão Android oficial ainda não foi publicada.";
      meta.textContent = "Assim que uma Release assinada for publicada, o botão de download aparecerá aqui automaticamente.";
    });
})();
