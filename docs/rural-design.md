# Hydra Agro — acabamento rural

Evolução da estrutura existente, sem novos bancos, coleções ou rotas duplicadas.

## Referência consultada

Foi examinada a imagem pública mobile de treino do FitFolio:
https://fitfolio.com.br/images/hero/phone-training.webp

A referência sustenta cabeçalho compacto, números legíveis, controles agrupados,
espaçamento cuidadoso e divisões sutis. Não foram verificadas telas privadas,
a home autenticada nem a fonte exata do FitFolio. O Hydra utiliza Manrope e
sua própria paleta verde, sem copiar a marca ou as funções de treino.

## Estrutura

- Home: destaque de próxima tarefa/aviso, quatro atalhos, próximas atividades,
  estado cadastrado das fontes, um resumo de clima e ocorrências existentes.
- Navegação do proprietário: Início, Animais, Água, Tarefas e Mais.
- Mais: perfil e links para os módulos existentes, sem novas telas paralelas.
- Funcionários: permissões e destinos existentes preservados.
- Modo Fácil: provider e navegação guiada existentes preservados, sem bottom bar.
- Desktop: sidebar e composição da rotina em duas colunas.
- Splash: logo SVG já incluída no projeto, nome e duração de 900 ms.
- Autenticação: composição existente preservada.
- Verde escuro passa a ser o padrão das contas comuns. A preferência clara já
  existente para administradores continua funcionando com uma paleta separada.

## Tokens

`src/hydra-rural-design.css` define fundo, superfícies, texto, bordas, ação,
tipografia, espaço, raio e movimento. Os tokens legados são ligados à mesma
paleta na área autenticada. Movimento padrão de 180 ms; redução de movimento
respeitada. O helper de viewport reduz a altura dos modais com o teclado aberto
e revela o campo ativo, sem alterar os valores preenchidos.

## Dados e salvamento

O resumo utiliza coleções reais da conta. Não inventa nível de reservatório,
posição de tag nem dados climáticos. A conclusão de tarefa utiliza `updateAccount`
e a fila/cache existentes. O feedback não afirma que a alteração foi sincronizada:
esse estado permanece responsabilidade do `SyncBanner`.

## Validação

85 testes automatizados passaram após a primeira implementação, incluindo
Modo Fácil, conservação de valores em erros de formulário, isolamento de conta,
clima e conclusão de tarefa na nova home. TypeScript e build passaram.

A validação visual em 360/390/430 px, tablet e desktop e a sincronização com
backend real ainda não foram concluídas. O navegador automatizado não inicia
neste ambiente e sockets locais apresentam restrições. Não considerar os testes
de componentes como prova de funcionamento em hardware iOS/Android ou de
sincronização real. Esta evolução deve ser revisada em preview antes de produção.
