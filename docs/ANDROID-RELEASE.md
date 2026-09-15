# Publicação oficial do Hydra Agro para Android

Este fluxo publica um APK assinado no GitHub Releases e faz a página `/download` encontrar automaticamente a versão mais recente.

## 1. Criar e guardar a chave de assinatura

A chave Android deve ser criada uma única vez e guardada em local seguro. Não envie o arquivo `.jks`, senhas ou o conteúdo em Base64 para commits, issues, chats públicos ou arquivos do projeto.

### Sem terminal, usando Android Studio

1. Abra **Build → Generate Signed Bundle / APK**.
2. Escolha **APK**.
3. Clique em **Create new...**.
4. Salve como `hydra-agro-release.jks`.
5. Crie e guarde a senha do keystore.
6. Use `hydraagro` como alias.
7. Crie e guarde a senha da chave.
8. Use uma validade longa e conclua a criação.

Guarde um backup seguro de `hydra-agro-release.jks`. Perder essa chave pode impedir atualizações compatíveis com instalações anteriores.

### Alternativa via Linux

Com Java instalado:

```bash
keytool -genkeypair \
  -v \
  -keystore hydra-agro-release.jks \
  -alias hydraagro \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000
```

## 2. Converter a chave para Base64

### Sem terminal

Abra:

`https://www.hydraagro.sbs/tools/keystore`

Selecione `hydra-agro-release.jks` e clique em **Copiar Base64**. A ferramenta lê o arquivo somente no navegador, não faz upload, não usa API e não salva o resultado no armazenamento do site.

Depois de copiar, feche a página e cole o conteúdo apenas no secret `ANDROID_KEYSTORE_BASE64` do GitHub.

### Alternativa via Linux

```bash
base64 -w 0 hydra-agro-release.jks > hydra-agro-release.base64.txt
```

O conteúdo em Base64 continua sendo secreto. Nunca o publique em código, commit, issue, comentário ou arquivo compartilhado.

## 3. Cadastrar os GitHub Actions Secrets

No repositório, abra **Settings → Secrets and variables → Actions → New repository secret** e crie:

- `ANDROID_KEYSTORE_BASE64`: conteúdo completo em Base64;
- `ANDROID_KEYSTORE_PASSWORD`: senha do keystore;
- `ANDROID_KEY_ALIAS`: alias usado na criação da chave, por exemplo `hydraagro`;
- `ANDROID_KEY_PASSWORD`: senha da chave.

O workflow também aceita os secrets já usados pelo projeto para o backend:

- `VITE_SUPABASE_URL`;
- `VITE_SUPABASE_PUBLISHABLE_KEY`.

Nunca coloque secrets diretamente em `.yml`, `.env` versionado ou código-fonte.

## 4. Publicar uma versão

Abra **Actions → Hydra Agro • Release Android → Run workflow**.

Informe a versão no formato `MAJOR.MINOR.PATCH`, por exemplo:

```text
1.3.0
```

O workflow:

1. valida TypeScript, testes e build;
2. sincroniza o Capacitor com Android;
3. restaura a chave apenas no runner temporário;
4. gera o APK Release assinado;
5. cria `HydraAgro-v1.3.0.apk`;
6. gera `HydraAgro-v1.3.0.apk.sha256`;
7. cria a GitHub Release `v1.3.0` e marca como **Latest**.

Também é possível publicar criando uma tag no padrão `vX.Y.Z`.

## 5. Download automático no site

A página `https://www.hydraagro.sbs/download` consulta a GitHub Release marcada como **Latest**.

Quando existe um arquivo no padrão `HydraAgro-vX.Y.Z.apk`, o botão **Baixar APK oficial** aparece automaticamente. O site também oferece o SHA-256 quando o arquivo correspondente existe.

Se nenhuma Release oficial existir, a página não inventa um link: mostra que a primeira versão Android ainda não foi publicada.

## 6. Atualizações futuras

Para cada atualização:

1. atualize e teste o código normalmente;
2. escolha a próxima versão, como `1.3.1` ou `1.4.0`;
3. execute o workflow **Hydra Agro • Release Android**;
4. confirme que a nova Release ficou marcada como **Latest**;
5. abra `/download` e confira o botão.

Não é necessário alterar manualmente o link de download no site.
