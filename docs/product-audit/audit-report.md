# NutriTMO Product Audit - MVP demonstravel

Data: 2026-06-11
Escopo: auditoria visual e de fluxo local do MVP demonstravel do NutriTMO, com foco em layout clinico, navegacao, estados criticos, responsividade e prontidao para demonstracao de 10 a 15 minutos.

## Resumo executivo

O NutriTMO esta visualmente coerente com a proposta de ferramenta clinica densa, discreta e funcional. Os fluxos principais aparecem demonstraveis: login, dashboard, paciente, registro de refeicao, revisao, relatorio, cardapio, prescricoes e auditoria. A separacao entre alerta nutricional, pendencia de revisao e historico auditavel esta clara na maior parte das telas.

O principal bloqueio de demonstracao encontrado e o tratamento de permissao em `/audit` para perfil sem acesso: a tela cai em erro runtime do Next.js em vez de mostrar um estado controlado do produto. Tambem ha riscos de polimento de demo por causa do indicador/overlay de desenvolvimento do Next, tabelas administrativas densas em mobile e formularios muito comprimidos em cardapio/prescricoes.

## Ambiente auditado

- App local: `http://localhost:3000`
- Stack observada: Next.js 16.2.9, App Router, Turbopack em modo dev
- Banco local: PostgreSQL via Docker Compose
- Seed: dados demo ficticios/pseudonimizados
- Usuario principal de demonstracao: `nutricao@nutritmo.local`
- Usuario auditor/admin para auditoria: `admin@nutritmo.local`
- Captura: Browser plugin primeiro; Playwright usado como fallback autorizado para screenshots locais

## Evidencias salvas

Pasta da auditoria:

- `/Users/cristiankweber/Desktop/Nutrição/docs/product-audit/`

Arquivos principais:

- `contact-sheet.png`
- `capture-metadata.json`
- `screenshots/01-login-desktop.png`
- `screenshots/02-dashboard-desktop.png`
- `screenshots/03-patient-detail-desktop.png`
- `screenshots/04-meal-registration-desktop.png`
- `screenshots/05-review-queue-desktop.png`
- `screenshots/06-reports-desktop.png`
- `screenshots/07-report-copy-feedback-desktop.png`
- `screenshots/08-audit-desktop.png`
- `screenshots/09-menu-desktop.png`
- `screenshots/10-prescriptions-desktop.png`
- `screenshots/11-dashboard-mobile.png`
- `screenshots/12-meal-registration-mobile.png`
- `screenshots/13-reports-mobile.png`
- `screenshots/14-audit-mobile-admin.png`
- `screenshots/15-audit-forbidden-nutricao.png`

## Passos auditados

| Passo | Tela / fluxo | Evidencia | Saude geral |
| --- | --- | --- | --- |
| 1 | Login desktop | `01-login-desktop.png` | Boa |
| 2 | Dashboard desktop | `02-dashboard-desktop.png` | Boa |
| 3 | Paciente/admissao desktop | `03-patient-detail-desktop.png` | Boa |
| 4 | Registro de refeicao desktop | `04-meal-registration-desktop.png` | Boa com ajustes |
| 5 | Fila de revisao desktop | `05-review-queue-desktop.png` | Boa |
| 6 | Relatorio desktop | `06-reports-desktop.png` | Boa |
| 7 | Feedback de copia no relatorio | `07-report-copy-feedback-desktop.png` | Boa |
| 8 | Auditoria desktop como admin | `08-audit-desktop.png` | Boa com ajustes |
| 9 | Cardapio desktop | `09-menu-desktop.png` | Regular |
| 10 | Prescricoes desktop | `10-prescriptions-desktop.png` | Regular |
| 11 | Dashboard mobile | `11-dashboard-mobile.png` | Boa com ajustes |
| 12 | Registro de refeicao mobile | `12-meal-registration-mobile.png` | Boa com ajustes |
| 13 | Relatorio mobile | `13-reports-mobile.png` | Boa com ajustes |
| 14 | Auditoria mobile como admin | `14-audit-mobile-admin.png` | Regular |
| 15 | Auditoria sem permissao como nutricao | `15-audit-forbidden-nutricao.png` | Ruim / bloqueador |

## Pontos fortes

- A identidade visual esta alinhada ao uso clinico: densa, discreta, operacional e sem linguagem de marketing.
- O dashboard diferencia bem leitos, admissoes, metas nutricionais, pendencias e alertas.
- Os codigos pseudonimizados dos pacientes sustentam bem a narrativa de demo sem dados reais.
- O registro de refeicao mantem o calculo de kcal, CHO, PTN e LIP visivel e compreensivel.
- O feedback de copia do texto para prontuario funciona visualmente e melhora a demonstracao.
- A auditoria mostra eventos e JSON bruto, preservando rastreabilidade.
- Nao houve overflow horizontal de pagina nos estados capturados em desktop ou mobile.

## Achados priorizados

### P1 - Erro bruto de permissao em `/audit`

Evidencia: `screenshots/15-audit-forbidden-nutricao.png`

Ao acessar `/audit` com perfil `NUTRICAO`, o produto exibe o overlay de erro runtime do Next.js com a mensagem `Perfil sem permissao para auditoria.`. Este e um erro esperado de autorizacao e nao deveria chegar ao usuario como falha tecnica.

Impacto:

- Quebra a demonstracao se o apresentador acessar auditoria com perfil sem permissao.
- Faz o MVP parecer instavel, embora seja uma regra de permissao correta.
- Exibe stack trace e detalhes tecnicos em ambiente local.

Recomendacao:

- Trocar o `throw` de permissao por um estado controlado do produto, como pagina de acesso negado, redirect para dashboard com mensagem, ou `notFound`/`forbidden` padronizado se o projeto ja tiver esse padrao.
- Aplicar o mesmo criterio a outras rotas protegidas por papel.

### P2 - Indicador/overlay de desenvolvimento aparece na demo

Evidencias: `02-dashboard-desktop.png`, `04-meal-registration-desktop.png`, `11-dashboard-mobile.png`, `12-meal-registration-mobile.png`, `15-audit-forbidden-nutricao.png`

O indicador preto do Next em modo dev aparece no canto inferior esquerdo e pode cobrir partes da UI, especialmente em mobile. Em caso de erro, o overlay de desenvolvimento domina a tela.

Impacto:

- Reduz o polimento da demo.
- Pode ser confundido com elemento do produto.
- Em mobile, compete com botoes e conteudo no rodape.

Recomendacao:

- Para demonstracao, preferir `npm run build` seguido de `npm run start`.
- Documentar no checklist de demo o modo recomendado.
- Se o projeto suportar configuracao segura para ocultar indicador dev, usar apenas para demo local.

### P2 - Auditoria mobile depende de rolagem horizontal pouco evidente

Evidencia: `screenshots/14-audit-mobile-admin.png`

A pagina de auditoria em mobile nao quebra a largura do documento, mas a tabela mostra apenas as primeiras colunas no viewport. Campos importantes como detalhes, antes/depois e JSON bruto ficam fora da area visivel imediata.

Impacto:

- Dificulta demonstrar auditoria em telefone.
- Torna logs menos legiveis para revisao rapida.
- Exige gesto horizontal que nao esta claramente sinalizado.

Recomendacao:

- Em mobile, renderizar logs como cards empilhados com resumo humano primeiro.
- Manter JSON bruto em `<details>` colapsado.
- Se tabela for mantida, adicionar affordance clara de rolagem horizontal e primeira coluna fixa.

### P2 - Cardapio e prescricoes estao comprimidos demais para edicao

Evidencias: `screenshots/09-menu-desktop.png`, `screenshots/10-prescriptions-desktop.png`

As telas de cardapio e prescricoes usam linhas muito densas com muitos campos editaveis simultaneos. Alguns placeholders e valores aparecem truncados, como campos de sodio, nome, categoria e preparo.

Impacto:

- Aumenta chance de erro de edicao durante demo.
- Reduz legibilidade de unidades e contexto.
- Dificulta uso em telas menores.

Recomendacao:

- Preservar densidade de tabela para leitura, mas mover edicao para drawer, modal simples ou linha expandida.
- Exibir unidade nutricional de forma consistente em cabecalhos.
- Priorizar campos essenciais na grade e esconder metadados secundarios em detalhes.

### P2 - Registro de refeicao mobile exige rolagem longa ate itens e totais

Evidencia: `screenshots/12-meal-registration-mobile.png`

Em mobile, o primeiro viewport mostra identificacao, tipo de refeicao, observacoes e fotos. A parte de itens consumidos, percentuais e totais fica mais abaixo.

Impacto:

- O fluxo de beira-leito pode parecer mais longo do que e.
- O demonstrador demora para chegar ao ponto principal: calculo nutricional.

Recomendacao:

- Adicionar resumo/totais fixo ou semi-fixo no rodape em mobile.
- Adicionar atalhos internos para `Itens`, `Fotos` e `Salvar`.
- Considerar recolher blocos de foto depois que a imagem for anexada.

### P3 - Dashboard mobile fica muito longo

Evidencias: `screenshots/11-dashboard-mobile.png`, `capture-metadata.json`

O dashboard mobile tem conteudo organizado, mas altura de rolagem alta. Em unidades com mais leitos ou mais eventos, a varredura manual pode ficar cansativa.

Impacto:

- Menor eficiencia para encontrar o leito prioritario no telefone.
- A boa separacao de alertas pode ficar escondida pela extensao da tela.

Recomendacao:

- Adicionar filtros compactos por `alerta`, `revisao`, `baixa ingesta` e `pendencia do dia`.
- Considerar agrupar leitos sem alerta em secao recolhivel.

### P3 - JSON bruto domina a auditoria desktop

Evidencia: `screenshots/08-audit-desktop.png`

A auditoria desktop preserva o JSON bruto, o que e positivo, mas o bloco tecnico ocupa bastante atencao visual e pode competir com o resumo humano do evento.

Impacto:

- Em demo, a mensagem clinica da auditoria fica menos imediata.
- Usuarios nao tecnicos podem interpretar JSON como complexidade excessiva.

Recomendacao:

- Mostrar resumo humano primeiro.
- Deixar JSON bruto em bloco colapsavel por padrao, mantendo acesso completo.

### P3 - Relatorio mobile poderia aproximar copia e resumo

Evidencias: `screenshots/06-reports-desktop.png`, `screenshots/07-report-copy-feedback-desktop.png`, `screenshots/13-reports-mobile.png`

O relatorio e o feedback de copia estao bons em desktop. Em mobile, a area de texto copiavel e a tabela podem exigir rolagem ate a acao relevante.

Impacto:

- Pequena perda de fluidez na demo mobile.

Recomendacao:

- Adicionar botao `Copiar resumo` perto do topo em mobile, mantendo os textos detalhados abaixo.
- Preservar o feedback `Copiado`, que funcionou bem.

### P3 - Login poderia acelerar demo, sem virar produto real

Evidencia: `screenshots/01-login-desktop.png`

A tela de login e limpa. Para demonstracao, a lista de usuarios ajuda, mas ainda exige digitacao manual.

Impacto:

- Baixo; apenas friccao de apresentacao.

Recomendacao:

- Em ambiente demo, considerar botoes/chips de preenchimento rapido para os usuarios ficticios.
- Manter claro que sao contas demo e nao credenciais reais.

## Acessibilidade e responsividade

Observacoes positivas:

- As telas capturadas nao apresentaram overflow horizontal de documento.
- A escala visual e os contrastes gerais parecem adequados para ambiente clinico.
- A navegacao principal aparece disponivel em desktop e mobile.

Riscos nao fechados nesta auditoria:

- Nao foi feito teste completo de teclado.
- Nao foi feito teste com leitor de tela.
- Contraste nao foi medido programaticamente.
- Areas com tabela larga e JSON bruto precisam de revisao especifica de foco, leitura por tecnologia assistiva e navegacao por teclado.

## Proximas acoes recomendadas

1. Corrigir o acesso negado de `/audit` para estado controlado, sem overlay tecnico.
2. Rodar demo em modo build/start ou ocultar indicador dev para apresentacao local.
3. Adaptar auditoria mobile para cards/resumo-first, com JSON bruto colapsado.
4. Reduzir compressao de edicao em cardapio e prescricoes usando detalhes expansivos ou edicao dedicada.
5. Melhorar registro de refeicao mobile com resumo/totais persistentes ou atalhos internos.
6. Acrescentar filtros compactos no dashboard mobile para leitos com alerta ou revisao.
7. Fazer uma passada de acessibilidade por teclado e leitor de tela nos fluxos clinicos obrigatorios.

## Limites da auditoria

- Auditoria focada em produto, layout, responsividade e demonstrabilidade local.
- Nao foi uma auditoria de seguranca, LGPD, performance ou acessibilidade completa.
- Os screenshots foram capturados com app em modo dev, o que explica a presenca do indicador/overlay do Next.
- O Browser plugin foi tentado primeiro; screenshots finais foram capturados com Playwright como fallback autorizado pelo usuario.
- O banco local precisou ser iniciado e populado com seed demo antes da captura.
