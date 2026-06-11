# Regras clinicas

## Calculos

As funcoes puras ficam em `src/lib/clinical/calculations.ts`.

- `servedKcal = kcalPerPortion * servedPortionMultiplier`
- `servedProtein = proteinPerPortion * servedPortionMultiplier`
- `servedCarbs = carbsPerPortion * servedPortionMultiplier`
- `servedFat = fatPerPortion * servedPortionMultiplier`
- `consumedKcal = servedKcal * consumedPercent / 100`
- `consumedProtein = servedProtein * consumedPercent / 100`
- `consumedCarbs = servedCarbs * consumedPercent / 100`
- `consumedFat = servedFat * consumedPercent / 100`
- `kcalTargetPercent = totalConsumedKcal / kcalTarget * 100`
- `proteinTargetPercent = totalConsumedProtein / proteinTarget * 100`

Valores sao arredondados para uma casa decimal.

## Relatorio por refeicao

O relatorio por refeicao agrupa refeicoes nao canceladas do dia selecionado e soma kcal, CHO, PTN e LIP ingeridos por tipo de refeicao.

- Total diario: soma todas as refeicoes nao canceladas e serve para documentar a ingesta oral do dia.
- Distribuicao por refeicao: mostra onde a ingesta ficou menor ou onde houve maior aporte nutricional.
- Menor ingesta calorica: menor kcal entre refeicoes com registro ativo; refeicao sem registro e sinalizada, mas nao e comparada como zero ingerido.
- Menor ingesta proteica: menor PTN entre refeicoes com registro ativo.
- Maior aporte calorico/proteico: maior kcal ou PTN entre refeicoes com registro ativo.
- Refeicoes `CANCELADA` nao entram no calculo.
- Refeicoes `REVISADA` usam os valores persistidos apos revisao.
- Refeicoes `PLANEJADA`, `SERVIDA` ou `PARCIALMENTE_REGISTRADA` aparecem como pendentes/incompletas.

Esse relatorio apoia a discussao com a nutricao sobre padrao de aceitacao por refeicao. Ele nao cria recomendacao clinica automatica.

## Alertas

- `CINZA`: pendencia operacional do dia, como refeicao critica sem registro ou foto inadequada ainda sem revisao.
- `VERDE`: kcal e proteina >= 75% da meta.
- `AMARELO`: kcal ou proteina entre 50% e 74%.
- `LARANJA`: kcal ou proteina < 50% em 24h.
- `VERMELHO`: baixa ingesta por 48h consecutivas ou baixa ingesta associada a observacao ficticia de alto risco.

Alertas nao substituem avaliacao clinica.

## Fila de revisao, pendencia do dia e alerta nutricional

- Fila de revisao: lista somente refeicoes que ainda exigem acao humana. Entram na fila refeicoes com `PARCIALMENTE_REGISTRADA`, `imageQuality = INADEQUADA` ou `confidence = BAIXA`.
- Saida da fila: refeicoes com `REVISADA` ou `CANCELADA` nunca permanecem na fila ativa, mesmo que a foto original tenha sido inadequada ou a confianca original baixa.
- Baixa qualidade do dado: foto inadequada e baixa confianca descrevem a qualidade do registro original. Depois da revisao, esse historico continua auditavel, mas deixa de ser pendencia ativa.
- Pendencia do dia: indica falha operacional ou registro incompleto, como refeicao critica ausente. Pode existir mesmo sem uma revisao aberta.
- Alerta nutricional: indica baixa ingesta ou risco nutricional. Uma refeicao revisada pode continuar contribuindo para alerta nutricional se a ingesta revisada permanecer baixa.
- Revisao aberta e alerta nutricional nao sao a mesma coisa: a revisao trata qualidade/completude do registro; o alerta trata baixa ingesta ou risco.

## Revisao humana

- Percentuais sugeridos/registrados podem ser corrigidos pela nutricao.
- Refeicoes com baixa confianca, foto inadequada ou status parcial entram na fila enquanto nao estiverem `REVISADA` ou `CANCELADA`.
- Ao revisar, o sistema marca `reviewedBy`, recalcula itens, atualiza o resumo diario e redireciona para `/review?salvo=1`.
- A revisao gera `AuditLog` com `beforeJson`, `afterJson`, motivos da revisao, observacao textual e diffs de percentuais por item.
- Revisoes antigas sem metadados estruturados continuam legiveis: a interface deriva motivos e diffs dos JSONs antes/depois quando possivel.

## Cancelamento

- Cancelar uma refeicao muda `Meal.status` para `CANCELADA`.
- Cancelamento nao remove `Meal`, `MealItem` ou imagens associadas.
- Refeicoes canceladas saem da fila ativa e nao entram no relatorio por refeicao.
- O cancelamento gera `AuditLog` com antes/depois e motivo quando informado.
- O historico da admissao e a auditoria continuam mostrando o registro cancelado.

## Texto para prontuario

O relatorio usa `NutritionDailySummary` armazenado e os registros do periodo selecionado. Quando houver revisao humana salva, o texto usa os totais recalculados apos revisao e informa quantas refeicoes foram revisadas no periodo.

Exemplo:

> Resumo nutricional do periodo selecionado: ingesta oral registrada de 780 kcal e 34 g de proteina, correspondendo a 43% da meta calorica e 48% da meta proteica. Dados revisados foram utilizados quando disponiveis. Alerta vermelho por baixa ingesta persistente. Registros do periodo: 4/5 refeicao(oes) completas e 2/5 revisada(s) pela nutricao. Sugere-se reavaliacao nutricional conforme julgamento clinico.

O texto por refeicao complementa o resumo diario:

> Resumo nutricional oral em 10/06/2026: ingesta total estimada de 1507 kcal, 219 g de carboidratos, 40 g de proteinas e 49 g de lipidios. A menor ingesta calorica ocorreu na refeicao janta, com 210 kcal. A menor ingesta proteica ocorreu na refeicao janta, com 4 g de proteina. O maior aporte calorico ocorreu na refeicao lanche da tarde, com 700 kcal. Dados revisados utilizados quando disponiveis.

## IA visual

Nao ha regra clinica automatica de IA neste MVP. O modulo `meal-estimation` e mock/local, retorna sugestoes ficticias e nao deve ser usado para decisao clinica.
