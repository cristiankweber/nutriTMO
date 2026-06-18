# Arquitetura

## Visao geral

NutriTMO e uma aplicacao Next.js 16 App Router com server components, server actions e Prisma/PostgreSQL. O MVP e local-first para desenvolvimento e demonstracao: login seedado, dados ficticios, storage local de imagens e nenhuma chamada externa de IA.

## Fluxo assistencial

1. Usuario autentica com papel.
2. Equipe visualiza leitos ativos no dashboard.
3. Admin ou nutricao gerencia admissao, alta, troca de leito e reinternacao de paciente inativo.
4. Nutricao registra prescricao e metas.
5. Nutricao ou enfermagem registra refeicao, fotos pre/pos e percentual ingerido, podendo usar atalhos de preparacoes e ingesta rapida.
6. Sistema calcula kcal, CHO, proteina e lipidios por item; o resumo diario segue focado em kcal/proteina e alertas.
7. Refeicoes com baixa confianca, foto inadequada ou pendencia ativa entram em revisao.
8. Resumo diario e relatorio por refeicao podem ser exportados para prontuario, registrando audit log.

## Fluxo de dados

- Formularios chamam server actions em `src/lib/actions.ts`.
- Actions validam papel do usuario autenticado.
- Mutacoes revalidam as telas afetadas e redirecionam com feedback curto quando o fluxo precisa confirmar a acao.
- Mutacoes de admissao validam leito ativo/livre, paciente sem admissao ativa e registram troca de leito, alta e readmissao em `AuditLog`.
- Calculos e agrupamento por refeicao ficam em `src/lib/clinical/calculations.ts`.
- Persistencia usa Prisma Client gerado em `src/generated/prisma`.
- Uploads usam `src/lib/storage/local.ts`, com filenames UUID.
- Auditoria usa `src/lib/audit.ts`.
- Regras de fila e historico de revisao ficam em `src/lib/review/rules.ts`, evitando duplicacao entre dashboard, revisao, paciente e testes.

## Modulos principais

- Auth: cookie HttpOnly assinado, login seedado e middleware de presenca de sessao.
- Clinical rules: funcoes puras testadas para ingestao, macros, alertas e distribuicao por refeicao.
- Meal registration: formulario cliente com calculo em tempo real, atalhos de refeicao demo e aplicacao rapida de percentual ingerido.
- Review queue: correcao humana de percentuais, qualidade de foto e confianca.
- Review audit: `AuditLog` registra antes/depois, motivos, observacao textual e diffs de percentuais por item.
- Reporting: texto copiavel e auditavel, limitado ao dia selecionado, com resumo diario e relatorio por refeicao.
- AI placeholder: `src/lib/meal-estimation`, sem modelo real.
- Demo seed: `prisma/seed.ts` recria dados ficticios e imagens SVG locais para demonstracao. O seed e destrutivo para dados demo.

## Limitacoes do MVP

- Sem integracao real com prontuario ou FHIR.
- Sem IA visual real e sem envio de imagem a servicos externos.
- Sem hardening institucional de seguranca, LGPD ou governanca clinica.
- Alertas sao simples e exigem julgamento humano.
- Nao usar dados reais de pacientes, prontuarios ou imagens reais nesta fase.

## Fluxo de revisao e auditoria

- A fila ativa usa `getReviewQueueWhereClause()` e exclui sempre `REVISADA` e `CANCELADA`.
- A funcao `isMealPendingReview()` e a regra regressiva testavel para foto inadequada, baixa confianca e refeicao parcial.
- Ao salvar revisao, `reviewMealAction` atualiza kcal, CHO, proteina e lipidios consumidos, marca `Meal.status = REVISADA`, recalcula resumo diario e cria `AuditLog`.
- O historico da admissao e a tela de auditoria leem `AuditLog` para mostrar status anterior/atual, revisor, data/hora, motivos e diffs.
- Uma revisao fecha a pendencia ativa do dado, mas nao apaga alertas nutricionais gerados por baixa ingesta revisada.

## Relatorio por refeicao

- `FoodItem` armazena kcal, proteina, CHO e LIP por porcao.
- `MealItem` armazena valores servidos e ingeridos para kcal, proteina, CHO e LIP.
- `buildMealNutrientReport()` exclui refeicoes canceladas, agrupa por tipo de refeicao e marca menor kcal, menor proteina, maior kcal, maior proteina, pendencia e revisao.
- `MealNutrientReport` renderiza a tabela, enquanto as telas `reports`, `patients/[admissionId]` e `dashboard` reaproveitam o mesmo resultado calculado.

## Evolucao futura

- Trocar storage local por S3 ou storage institucional.
- Integrar autenticacao institucional.
- Adicionar import/export FHIR apos revisao de governanca.
- Validar futuramente um modulo local de visao computacional, mantendo revisao humana obrigatoria e governanca institucional.
