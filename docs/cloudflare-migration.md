# Hospedar o Hydra Agro na Cloudflare

O projeto está preparado para Cloudflare Workers com arquivos estáticos, incluindo a API do assistente. O banco, login e arquivos dos usuários continuam no mesmo Supabase. A API Python e a configuração Vercel permanecem disponíveis para retorno à hospedagem anterior.

## Criar o Worker pelo GitHub

1. Entre na sua conta Cloudflare e abra Workers & Pages → Create application → conecte o repositório `dnmtfe3-cpu/hydra-agr`.
2. Escolha a branch que contém estes arquivos e o nome `hydra-agro`.
3. Use Node.js 24, diretório raiz do repositório, comando de build `npm run env:check && npm run build` e comando de deploy `npx wrangler deploy`. A pasta de arquivos estáticos é `dist`, já definida no `wrangler.jsonc`.
4. Configure nas variáveis do BUILD os mesmos valores públicos `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` usados no Vercel. Copie também outras variáveis `VITE_` que o projeto já utiliza. Não use service-role nem chaves secretas em variáveis `VITE_`.
5. No Worker, em Settings → Variables and Secrets, configure `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`. Se o assistente online estava habilitado, cadastre `OPENAI_API_KEY` como secret e o mesmo `OPENAI_MODEL` do Vercel. Variáveis do build não ficam automaticamente disponíveis para a API do Worker.
6. Publique e teste a URL `workers.dev`: home, páginas públicas, `/sitemap.xml`, `/robots.txt`, `/api/health`, login, dados existentes e pergunta ao assistente. A URL temporária recebe `noindex` para evitar uma cópia nas buscas.

Para testar autenticação na URL temporária, adicione somente essa URL exata às Redirect URLs do Supabase. Mantenha o Site URL de produção `https://www.hydraagro.sbs/`. Ao manter o domínio na migração, os URLs de autenticação de produção não precisam mudar.

## Apontar o domínio após o teste

1. Adicione a zona `hydraagro.sbs` à sua conta Cloudflare. Confira se os registros DNS existentes foram copiados, incluindo verificações do Google e eventuais registros de e-mail.
2. Se o DNS ainda está em outro provedor, atualize os nameservers no registrador do domínio para os dois valores fornecidos pela sua conta Cloudflare. Preserve inicialmente os registros que atendem o site no Vercel.
3. Com a zona ativa e a URL temporária validada, abra Worker → Settings → Domains & Routes → Add → Custom Domain. Cadastre `www.hydraagro.sbs` e `hydraagro.sbs`. O domínio sem `www` será redirecionado pela API para a versão com `www`, preservando caminho e parâmetros.
4. Teste HTTPS nos dois domínios, login e recuperação de senha, dados e assistente. Verifique todas as URLs do sitemap e os links de identificação animal. Apenas depois desses testes desative a hospedagem antiga; manter o projeto Vercel inicialmente facilita retorno se necessário.
5. O sitemap continua `https://www.hydraagro.sbs/sitemap.xml`. Mantendo URLs e verificação DNS do Search Console, não é uma mudança de endereço do site no Google.

## Terminal e verificação local

```sh
npm ci
npm run build
npm run cloudflare:check
# Desenvolvimento: configure VITE_ em .env.local e copie .dev.vars.example para .dev.vars.
npm run cloudflare:dev
# Publicação requer login na sua conta, além das variáveis acima.
npx wrangler login
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put OPENAI_API_KEY
npm run cloudflare:deploy
```

`cloudflare:check` testa a API com serviços simulados e valida o pacote Wrangler com `--dry-run`; não publica nem comprova acesso ao banco real. Nunca coloque tokens, senhas ou secrets no repositório.

Referências: [migração Vercel para Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/vercel-to-workers/), [configuração de arquivos estáticos](https://developers.cloudflare.com/workers/static-assets/binding/), [domínios personalizados](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
