# AGENTS.md - Instrucoes Permanentes para o Codex

Este arquivo define as regras operacionais que o Codex deve seguir neste repositorio.

## Objetivo

Alem de cumprir a tarefa solicitada, o Codex deve manter um Loop de Aprendizado Operacional para reduzir retrabalho, evitar repeticao de erros, poupar tokens e melhorar progressivamente a qualidade das entregas.

A cada tarefa, o Codex deve registrar de forma pratica, tecnica, curta e acionavel:

- o que foi feito;
- quais arquivos foram lidos e alterados;
- quais erros ocorreram;
- quais decisoes tecnicas foram tomadas;
- quais comandos e testes foram executados;
- quais descobertas tecnicas sao reutilizaveis.

## Fluxo obrigatorio por tarefa

Para cada tarefa neste repositorio, o Codex deve:

1. Entender o pedido do usuario.
2. Inspecionar o repositorio antes de alterar codigo.
3. Consultar registros anteriores relevantes no arquivo local `.xlsx` de aprendizado ou em logs locais, se houver acesso.
4. Aplicar aprendizados previos para evitar repetir erros.
5. Executar a alteracao solicitada.
6. Rodar os testes e validacoes adequadas ao escopo.
7. Registrar a execucao no arquivo local `.xlsx` de aprendizado ou gerar JSON pronto para copia manual.
8. Informar no final o que foi concluido, arquivos alterados, validacoes e status do registro.

## Antes de modificar codigo

Antes de editar qualquer arquivo, o Codex deve:

- ler os arquivos relevantes;
- verificar padroes existentes do projeto;
- identificar framework, linguagem, gerenciador de pacotes e comandos disponiveis;
- procurar instrucoes em arquivos como `README.md`, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `package.json`, `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `docker-compose.yml`, `.env.example` e arquivos de configuracao de lint, testes, TypeScript, Prisma, Drizzle ou framework usado.

O Codex nao deve assumir stack, comandos ou arquitetura sem verificar o repositorio.

## Consulta a aprendizados previos

Se houver acesso ao arquivo local `.xlsx`, script local ou arquivo de logs, o Codex deve consultar registros anteriores antes de comecar.

Pesquisar por termos relacionados a:

- nome do repositorio;
- framework ou biblioteca;
- erro semelhante;
- API envolvida;
- tipo de tarefa;
- comando que falhou;
- ferramenta de build;
- banco de dados;
- sistema de autenticacao;
- deploy;
- webhook;
- testes.

Use aprendizados encontrados para orientar a execucao, mas mencione ao usuario apenas quando isso justificar uma decisao relevante.

## Registro de aprendizado

Planilha local padrao:

- Nome: `Codex_Learning_Log`
- Aba: `task_log`
- Arquivo: `outputs/codex-learning-log-table/Codex_Learning_Log.xlsx`

Colunas esperadas:

1. `timestamp`
2. `repository`
3. `branch`
4. `task_title`
5. `task_type`
6. `user_request_summary`
7. `tokens_input`
8. `tokens_output`
9. `tokens_total`
10. `files_read`
11. `files_changed`
12. `what_was_done`
13. `errors_found`
14. `decisions_made`
15. `commands_run`
16. `tests_run`
17. `test_results`
18. `build_status`
19. `lint_status`
20. `typecheck_status`
21. `external_apis_or_services`
22. `environment_notes`
23. `reusable_discoveries`
24. `risk_or_attention_points`
25. `next_time_recommendation`
26. `status`

## Prioridade de registro

### 1. Workbook local `.xlsx`

Registrar cada tarefa no arquivo local:

`outputs/codex-learning-log-table/Codex_Learning_Log.xlsx`

Usar a aba `task_log` e manter as colunas esperadas deste documento.

Antes de adicionar uma linha, consultar registros anteriores relevantes nessa workbook.

Se a workbook existir e puder ser editada, ela e o destino oficial do loop de aprendizado neste repositorio. Nao enviar para Google Sheets por padrao.

### 2. Script local do projeto

Se existir um script local como `npm run learning-log`, `pnpm learning-log`, `node scripts/append-learning-log.js` ou equivalente, ler o script antes de usar e registrar a tarefa no formato esperado.

### 3. Sem acesso ao arquivo local

Se nao houver workbook local, script ou permissao para escrita, nao interromper a tarefa.

Ao final, gerar um bloco chamado `Registro local pendente` com o JSON completo, pronto para copia manual na workbook.

## Formato do registro

```json
{
  "timestamp": "YYYY-MM-DD HH:mm:ss",
  "repository": "nome-do-repositorio",
  "branch": "branch-atual",
  "task_title": "titulo curto e especifico",
  "task_type": "feature | bugfix | refactor | migration | test | documentation | config | research | other",
  "user_request_summary": "resumo fiel do pedido do usuario",
  "tokens_input": "numero exato ou nao disponivel no ambiente",
  "tokens_output": "numero exato ou nao disponivel no ambiente",
  "tokens_total": "numero exato ou nao disponivel no ambiente",
  "files_read": "arquivos relevantes lidos",
  "files_changed": "arquivos criados ou modificados",
  "what_was_done": "resumo objetivo do que foi implementado",
  "errors_found": "erros encontrados ou nenhum erro relevante encontrado",
  "decisions_made": "decisoes tecnicas tomadas",
  "commands_run": "comandos executados",
  "tests_run": "testes e validacoes executadas",
  "test_results": "resultado dos testes",
  "build_status": "passed | failed | not_run | not_applicable",
  "lint_status": "passed | failed | not_run | not_applicable",
  "typecheck_status": "passed | failed | not_run | not_applicable",
  "external_apis_or_services": "APIs, servicos externos ou integracoes usadas",
  "environment_notes": "observacoes sobre ambiente, versoes, Docker, banco, dependencias ou variaveis",
  "reusable_discoveries": "aprendizados tecnicos reutilizaveis",
  "risk_or_attention_points": "riscos, limitacoes, pontos de atencao ou pendencias",
  "next_time_recommendation": "orientacao objetiva para proxima tarefa semelhante",
  "status": "completed | partially_completed | failed | blocked"
}
```

## Tokens

Registrar tokens de entrada, saida e total somente se o ambiente fornecer essa informacao de forma confiavel.

Se nao houver numero exato, registrar:

`nao disponivel no ambiente`

Nunca estimar ou inventar consumo de tokens.

## Testes e validacoes

Rodar testes compativeis com a alteracao e registrar exatamente os comandos.

Exemplos:

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm build`
- `pnpm prisma generate`
- `pnpm prisma migrate dev`
- `docker compose up`
- `pytest`
- `ruff check`
- `tsc --noEmit`
- teste manual de fluxo
- validacao visual
- chamada manual de endpoint
- teste de webhook
- teste de migration

Se nao rodar testes, explicar claramente o motivo no registro.

## Descobertas reutilizaveis

A coluna `reusable_discoveries` deve conter apenas aprendizados que ajudem tarefas futuras.

Bons exemplos:

- `O projeto usa pnpm; evitar npm para nao criar package-lock.json.`
- `Prisma Client precisa ser regenerado apos mudanca no schema.`
- `Mutations no Next.js App Router que afetam dashboard precisam chamar revalidatePath('/dashboard').`
- `Webhook pode entregar eventos duplicados; usar idempotency key.`
- `Docker precisa subir Postgres antes de rodar migrations.`
- `A variavel DATABASE_URL e obrigatoria no build.`
- `Testes de data precisam fixar timezone para evitar falhas intermitentes.`
- `Este projeto usa soft delete; nao remover registros fisicamente sem confirmacao.`

Evitar descobertas genericas como:

- `E importante testar.`
- `O codigo deve ser limpo.`
- `A documentacao ajuda.`

## Seguranca

Nunca registrar na planilha, nos logs ou na resposta final:

- senhas;
- tokens;
- API keys;
- refresh tokens;
- secrets;
- URLs privadas contendo credenciais;
- dados pessoais desnecessarios;
- dados clinicos identificaveis;
- CPF;
- telefone;
- endereco;
- e-mail de paciente;
- conteudo sensivel copiado de arquivos privados.

Se precisar mencionar uma variavel sensivel, usar apenas o nome da variavel.

Exemplo correto:

`A variavel STRIPE_SECRET_KEY precisa estar configurada.`

## Commits, diffs e PRs

Se a tarefa envolver commit ou pull request, registrar:

- branch usada;
- arquivos alterados;
- resumo do diff;
- comandos de validacao;
- status final;
- pontos que o revisor deve observar.

Se nao for solicitado commit, nao fazer commit automaticamente.

## Status final do registro

Usar um dos valores:

- `completed`: tarefa concluida e validada de forma adequada.
- `partially_completed`: parte entregue, mas ha pendencias ou testes nao rodados.
- `failed`: alteracao nao funcionou ou quebrou validacoes essenciais.
- `blocked`: depende de informacao, credencial, permissao, servico externo ou decisao do usuario.

## Resposta final ao usuario

Na resposta final, informar:

1. O que foi concluido.
2. Quais arquivos foram alterados.
3. Quais testes ou validacoes foram rodados.
4. Se o registro foi salvo na workbook local `.xlsx`.
5. Se nao foi salvo, incluir o bloco `Registro local pendente`.

Modelo:

```text
Concluido.

Arquivos alterados:
- ...

Validacoes:
- ...

Resultado:
- ...

Registro de aprendizado:
- Salvo em `outputs/codex-learning-log-table/Codex_Learning_Log.xlsx`.
```

Se nao conseguiu registrar automaticamente:

```text
Registro de aprendizado:
Nao consegui atualizar a workbook local porque [motivo]. Segue o registro pronto para copia manual:

{JSON}
```

## Instrucoes especificas deste projeto

<!-- BEGIN:nextjs-agent-rules -->
### This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Learned User Preferences

- Comunicar em portugues; manter tom tecnico e objetivo alinhado aos docs do repo.
- Pedidos vagos como "arrume o repositorio" ou "revise e debug" esperam diagnostico com evidencia de runtime antes de alterar codigo de aplicacao.
- Nao fazer commit nem push sem pedido explicito do usuario.
- Ao planejar conclusao do MVP, priorizar lacunas visiveis para demo (fotos, edicao de prescricao, observacoes, sodio) antes de admin/RBAC/robustez, salvo escopo diferente.
- Validacao E2E e pedida explicitamente: subir Docker/Postgres e rodar a suite completa, nao apenas unitarios.
- Registrar tarefas concluidas na workbook local de aprendizado quando aplicavel.

## Learned Workspace Facts

- NutriTMO e um MVP Next.js 16 (React 19, Prisma 7, PostgreSQL) para documentacao nutricional em unidade de TMO; gerenciador de pacotes e `npm`.
- Repo em `~/Desktop` (iCloud) evicta `node_modules` com flag `dataless`, travando `eslint`/`tsc`/`vitest` sem saida; diagnosticar com `ls -lO node_modules/...`; corrigir com `rm -rf node_modules && npm install`; preferir clonar/mover para `~/dev`.
- Arquivos de codigo (`src`, `prisma`, `tests`) permanecem locais; o problema recorrente e eviction do `node_modules`, nao do fonte.
- Validacao completa: `npm run validate` (lint + typecheck + test + prisma validate + build); suíte atual ~51 unitarios + 4 e2e Playwright.
- E2E exige Docker/Postgres (`docker compose up -d` ou container `nutritmo-postgres`); `npm run test:e2e` faz build, seed e Playwright na porta 3100; reset demo via `npm run demo:reset`.
- Inputs `type="date"` devem usar `toDateInputValue()` de `@/lib/dates`, nunca `toISOString().slice(0, 10)` — paginas filtram por dia local do servidor.
- Em e2e Playwright, preferir locators unicos ou texto completo do banner; strings parciais colidem com empty states.
- Workbook de aprendizado: `outputs/codex-learning-log-table/Codex_Learning_Log.xlsx`, aba `task_log`, cabecalhos na linha 4; append via Python `openpyxl` quando ExcelJS falhar.
- Imagens de refeicao servidas por `/api/images/[imageId]` autenticado; URLs gravadas em `Meal.preMealImageUrl`/`postMealImageUrl`.
- Next.js 16 tem breaking changes — consultar `node_modules/next/dist/docs/` antes de codar APIs ou convencoes.
