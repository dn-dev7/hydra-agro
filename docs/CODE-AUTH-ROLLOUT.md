# Hydra Agro — entrada com código (liberação gradual)

O projeto ativo é o Hydra Agro original, não o Hydra Agro 2.0. A remoção dos blocos marcados da tela inicial e do perfil independe da migração da autenticação.

## Preparar o backend

Implante **no mesmo projeto Supabase usado pelo Hydra Agro original**, identificado no ambiente da aplicação como VITE_SUPABASE_URL. Nunca implante essa migração em outro projeto com nome parecido: as contas e os dados existentes precisam continuar no mesmo banco.

1. Aplicar a migration supabase/migrations/202609220001_hydra_code_auth.sql, que cria a tabela privada hydra_code_access, a tabela de limitação de requisições e a RPC exclusiva de service_role. As contas, sessões, senhas e tabelas anteriores não são apagadas.
2. Implantar supabase/functions/hydra-code-auth/index.ts como função hydra-code-auth com verify_jwt=false. A função implementa a validação dos tokens JWT nas ações status e enroll; create, login e recover precisam ser chamadas por visitantes não autenticados. Confirmar que o CORS permite os domínios reais do Hydra e os endereços internos do aplicativo.
3. Testar criação de conta, recebimento e guarda dos dois códigos, login por código, persistência da sessão e recuperação, usando contas de teste e confirmando que os dados de cada conta permanecem isolados. Testar também o código HA-... de funcionários.
4. Antes de remover a entrada antiga, definir VITE_HYDRA_CODE_AUTH=pilot no build web/Android. Nesse modo, a tela antiga continua disponível, e as contas existentes encontram **Código de acesso** no menu de configurações para gerar e guardar seus dois códigos sem perder seus dados. Informar os usuários antigos de que devem concluir essa etapa antes de sair da conta.
5. Depois da migração das contas existentes, testar e definir VITE_HYDRA_CODE_AUTH=true, recompilar e publicar o web app e o APK. Nesse modo, a tela de entrar/criar conta pede apenas o código (ou o código HA-... para funcionário), não exibe e-mail nem senha, e novos usuários respondem às perguntas conversacionais após guardar os códigos.

Não ative true antes de executar as etapas de banco, Edge Function e migração: isso bloquearia o acesso de usuários existentes sem código. false ou variável ausente preservam o login anterior enquanto o backend não estiver pronto.

## Contas existentes e recuperação

A opção **Código de acesso** nas configurações vincula um novo código a uma conta existente já autenticada, sem criar conta duplicada. O código de acesso possui 16 caracteres aleatórios, e o código de recuperação possui 24, ambos mostrados somente no momento da emissão; no banco são guardados apenas hashes. A recuperação invalida o código de acesso anterior e emite dois novos códigos. Códigos de funcionário existentes continuam separados. Guardar os códigos em local seguro é responsabilidade do usuário; uma conta antiga sem código e sem sessão deve ser migrada antes de concluir a mudança de modo.

As preferências escolhidas durante as perguntas são mantidas localmente no dispositivo da conta. O nome informado é salvo no perfil do Hydra Agro. A configuração da propriedade continua disponível nas telas já existentes; as perguntas não modificam o rebanho, água, NFC, históricos ou registros já cadastrados.

## Verificação

Executar npm run lint, npm test e npm run build após a configuração do backend, seguidos de testes reais de autenticação e migração. O CI atual também produz um APK de teste. O código-fonte por si só não implanta a Edge Function nem executa a migration.
