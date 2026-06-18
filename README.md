# NutriTMO

NutriTMO e um MVP demonstravel de documentacao nutricional inteligente para unidade fechada de Transplante de Medula Ossea. O sistema apoia registro, calculo, visualizacao, revisao humana e auditoria de ingesta oral e suplementos orais.

Este projeto e local e demonstrativo. Nao usar em producao assistencial sem validacao institucional, avaliacao LGPD, seguranca da informacao e governanca clinica. Nao usar dados reais nesta fase.

## Escopo do MVP

- Registro de paciente/leito e admissao pseudonimizados.
- Operacao local de leitos com filtros de admissoes ativas, alertas, sem prescricao, leitos livres, altas e pacientes inativos.
- Prescricao nutricional com metas de kcal e proteina.
- Base alimentar de preparacoes de referencia.
- Registro de ingesta com itens servidos, fotos pre/pos e percentual ingerido por item, incluindo kcal, CHO, proteina e lipidios.
- Atalhos de refeicao demo e ingesta rapida para reduzir cliques no registro manual.
- Calculo automatico de kcal, CHO, proteina e lipidios servidos e ingeridos.
- Dashboard da unidade, resumo por admissao, relatorio por refeicao, fila de revisao humana e audit log.
- Placeholder para futura estimativa por imagem, sem IA real e sem envio externo de dados.
- Documentacao preliminar de compatibilidade FHIR, sem integracao real.

Fora do MVP: nutricao enteral automatizada, parenteral automatizada, wearable, RGB-D, sensores ingestivos, IA autonoma e integracao real com prontuario.

## Stack

- Next.js 16 App Router + TypeScript
- Server Components e Server Actions
- Tailwind CSS
- Prisma ORM 7 + PostgreSQL
- Docker Compose para banco local
- Login local seedado por usuario/senha e papeis
- Storage local de imagens em `IMAGE_STORAGE_DIR`
- Vitest para regras clinicas puras

## Pre-requisitos

- Node.js 20.9 ou superior.
- npm.
- Docker Desktop ou Docker Engine com Docker Compose.
- Porta `5432` livre para PostgreSQL local, ou ajuste `DATABASE_URL`.
- Porta `3000` livre para o Next.js dev server.

## Configurar ambiente

1. Instale dependencias:

```bash
npm install
```

2. Copie variaveis locais:

```bash
cp .env.example .env
```

3. Revise `.env`:

```env
DATABASE_URL="postgresql://nutritmo:nutritmo@localhost:5432/nutritmo?schema=public"
SESSION_SECRET="troque-esta-chave-local-por-um-valor-longo"
IMAGE_STORAGE_DIR="./storage/images"
```

Nao use segredos reais no arquivo versionado. `SESSION_SECRET` precisa ter pelo menos 24 caracteres.

## Subir PostgreSQL

```bash
docker compose up -d
```

Verifique se o container ficou saudavel:

```bash
docker compose ps
```

Se preferir outro PostgreSQL, ajuste `DATABASE_URL` antes das migrations.

## Migrations e seed

Rode migrations:

```bash
npm run prisma:migrate
```

Rode o seed demonstravel:

```bash
npm run prisma:seed
```

O seed e destrutivo para os dados demo: ele limpa as tabelas do MVP e recria usuarios, leitos, pacientes ficticios, prescricoes, base alimentar, registros de ingesta, imagens ficticias e logs. Use apenas em ambiente local/demo.

Para preparar uma demo limpa com migrations aplicadas, seed e verificacao dos cenarios esperados, use:

```bash
npm run demo:reset
```

O reset deve terminar com 5 admissoes ativas, 1 paciente inativo com alta historica, 5 leitos livres, ao menos 1 pendencia de revisao, 1 refeicao cancelada, auditoria de revisao/exportacao e imagens demo locais.

## Iniciar app

```bash
npm run dev
```

Abra:

```text
http://localhost:3000/login
```

## Usuarios demo

Todos usam a senha `nutritmo123`.

- `admin@nutritmo.local`
- `nutricao@nutritmo.local`
- `enfermagem@nutritmo.local`
- `medico@nutritmo.local`
- `auditor@nutritmo.local`

## Prisma Studio

Com o banco local no ar:

```bash
npm run prisma:studio
```

O Studio abre em uma porta local informada pelo Prisma. Use apenas para inspecionar dados ficticios.

## Comandos

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run prisma:validate
npm run build
npm run validate
npm run demo:reset
npm run demo:verify
npm run demo:pilot
npm run prisma:migrate
npm run prisma:seed
npm run prisma:studio
```

`npm run validate` executa lint, typecheck, testes, validacao Prisma e build.

`npm run demo:reset` aplica migrations ja versionadas com `prisma migrate deploy`, recria o seed demo e valida a estrutura esperada para apresentacao.

`npm run demo:pilot` executa `demo:reset` e `validate`; use antes de apresentar o MVP como piloto local.

`npm run test:e2e` executa build, recria o seed demonstravel e roda Playwright em `http://127.0.0.1:3100`. O comando e destrutivo para os dados demo porque chama `npm run prisma:seed`; use apenas em ambiente local/demo.

Por padrao, os testes E2E usam o canal local do Google Chrome. Para usar o navegador gerenciado pelo Playwright depois de instalar browsers, rode:

```bash
PLAYWRIGHT_BROWSER_CHANNEL=bundled npm run test:e2e
```

## Storage local de imagens

- Uploads ficam em `IMAGE_STORAGE_DIR`, por padrao `./storage/images`.
- A retencao local e configurada por `IMAGE_RETENTION_DAYS`, por padrao 30 dias.
- A tela `Governanca` permite visualizar imagens vencidas e executar limpeza local auditada.
- Arquivos reais de upload sao ignorados pelo Git.
- O seed gera imagens ficticias locais para demonstracao.
- Nomes de arquivos salvos por upload usam UUID e nao incluem identificadores do paciente.
- O endpoint `/api/images/[imageId]` exige usuario clinico autorizado, usa runtime Node.js, serve apenas arquivos dentro de `IMAGE_STORAGE_DIR` e retorna 404 controlado quando o arquivo local nao existe.

## Governanca e seguranca

- Auditor nao acessa dashboard, detalhe clinico, relatorios nem imagens; fica restrito a `Auditoria` e `Governanca`.
- Relatorios e exportacao local por paciente ficam restritos a admin, nutricao e medico.
- Detalhe clinico fica restrito a admin, nutricao, enfermagem e medico.
- Sessao usa cookie HttpOnly, SameSite Strict, Secure em producao, prioridade alta e validade de 8 horas.
- O payload da sessao guarda apenas id, nome e perfil do usuario.
- Antes de piloto real, revisar RIPD, base legal, seguranca institucional, politica de backup/criptografia, retencao, fluxo de incidente e responsabilidades LGPD.

## Fluxo de revisao humana

- O registro de refeicao possui atalhos opcionais para preparacoes demo e aplicacao rapida do percentual ingerido em todos os itens.
- A fila de revisao mostra apenas refeicoes que ainda precisam de acao humana: foto inadequada, baixa confianca ou registro parcial.
- Refeicoes `REVISADA` e `CANCELADA` nunca aparecem na fila ativa, mas continuam visiveis no historico da admissao e na auditoria.
- O dashboard separa alertas nutricionais, revisoes abertas e pendencias operacionais do dia.
- Uma refeicao revisada pode continuar contribuindo para alerta nutricional quando a ingesta revisada permanece baixa.
- Cada revisao gera `AuditLog` com antes/depois, motivos, observacao e alteracoes de percentual por item.
- Cancelamento troca status para `CANCELADA`, nao deleta dados e gera `AuditLog`.

## Operacao de leitos e admissoes

- A tela `Pacientes` permite filtrar admissoes ativas, alertas nutricionais, admissoes sem prescricao, leitos livres, altas, pacientes inativos e a visao completa.
- A troca de leito valida destino ativo e livre, atualiza a admissao sem criar novo paciente e registra `AuditLog` com leito anterior e novo.
- A alta encerra a `Admission`; se o paciente nao mantiver outra admissao ativa, `Patient.active` passa para `false`.
- Pacientes inativos podem ser reinternados pela mesma tela, preservando `internalCode` pseudonimizado e criando nova `Admission`.

## Relatorio por refeicao

- A tela `Relatorios` complementa o resumo diario com tabela por refeicao: kcal, `% kcal do dia`, CHO, PTN, LIP e observacoes.
- A tela `Relatorios` e o detalhe da admissao exportam o relatorio por paciente em XLSX/PDF local, sem Google Sheets.
- A tela `Auditoria` exporta os ultimos eventos em XLSX/PDF local e cada download gera `AuditLog` com acao `EXPORT`.
- O XLSX inclui abas separadas para resumo, relatorio por refeicao, itens registrados e metadados; o export de auditoria inclui JSON em colunas dedicadas.
- Refeicoes canceladas nao entram no calculo.
- Refeicoes revisadas usam os valores persistidos apos revisao.
- Refeicoes pendentes aparecem sinalizadas como incompletas, sem sair automaticamente do total.
- A menor ingesta calorica e a menor ingesta proteica ajudam a localizar a refeicao que deve ser discutida pela nutricao; o sistema nao gera conduta autonoma.

## IA visual

Nao ha IA visual real neste MVP. `src/lib/meal-estimation` e um placeholder/mock local para uma validacao futura. O app nao envia imagens ou dados para servicos externos e nao deve ser apresentado como estimador automatico de consumo.

## Checklist de demo

Use `docs/demo-checklist.md` para reset, preflight e demonstracao de 10 a 15 minutos.

Use `docs/manual-validation-checklist.md` para validacao manual completa.

## Troubleshooting

- `DATABASE_URL nao configurada`: copie `.env.example` para `.env` e rode novamente.
- `SESSION_SECRET deve ter pelo menos 24 caracteres`: ajuste `SESSION_SECRET` no `.env`.
- Porta `5432` ocupada: pare outro PostgreSQL local ou altere a porta no `docker-compose.yml` e no `DATABASE_URL`.
- Prisma nao conecta: confirme `docker compose ps`, depois rode `npm run prisma:validate`.
- Login falha apos seed: use a senha `nutritmo123` e confira se `npm run prisma:seed` terminou sem erro.
- Imagem retorna 404: o registro existe, mas o arquivo local foi removido ou `IMAGE_STORAGE_DIR` mudou. Refaça o seed em ambiente demo.
- Build falha apos limpar `src/generated/prisma`: rode `npm run prisma:generate`.
- Erro `ENOENT` ou `Failed to restore task data` em `.next/dev`: `npm run dev` ja limpa `.next/dev` antes de iniciar. Se o erro persistir, pare o servidor, remova `.next` com `rm -rf .next` e inicie `npm run dev` novamente.

## Documentacao complementar

- `docs/architecture.md`
- `docs/data-model.md`
- `docs/clinical-rules.md`
- `docs/fhir-mapping.md`
- `docs/security-lgpd.md`
- `docs/manual-validation-checklist.md`
- `docs/demo-checklist.md`
