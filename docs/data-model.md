# Modelo de dados

## Entidades

- `User`: usuario do sistema, email, hash de senha e papel.
- `Patient`: paciente pseudonimizado, com `internalCode` como identificador principal de tela e `active` indicando se ha acompanhamento operacional ativo.
- `Bed`: leito da unidade TMO.
- `Admission`: internacao/leito, tipo de transplante, D+/D-, `active` e `dischargeDate`.
- `NutritionPrescription`: dieta, consistencia, restricoes e metas nutricionais.
- `FoodItem`: preparacao ou suplemento com porcao padrao, kcal e proteina.
- `Meal`: refeicao registrada para uma admissao.
- `MealItem`: item servido, multiplicador de porcao, percentual ingerido e calculos.
- `NutritionDailySummary`: agregado diario por admissao.
- `AuditLog`: trilha de alteracoes, login e exportacoes.
- `ImageAsset`: metadados de fotos pre/pos refeicao.

## Relacoes principais

- Um `Patient` pode ter varias `Admission`.
- Um `Bed` pode ser associado a varias `Admission` ao longo do tempo.
- Uma `Admission` possui prescricoes, refeicoes e resumos diarios.
- Uma `Meal` possui varios `MealItem` e `ImageAsset`.
- `User` aparece como criador/revisor de prescricoes e refeicoes, uploader de imagem e autor de logs.

## Campos criticos

- `Patient.internalCode`: preferido para exibicao, evitando dados identificaveis.
- `Patient.active`: fica `false` apos alta quando nao resta admissao ativa, permitindo filtro de inativos e reinternacao futura.
- `Admission.active` e `dischargeDate`: separam internacao corrente do historico de altas.
- `Admission.transplantDay`: guarda o D+/D- informado na admissao; telas e exportacoes calculam o D atual pela diferenca de dias locais desde `admissionDate`.
- `NutritionPrescription.kcalTarget` e `proteinTarget`: metas usadas nos percentuais.
- `Meal.imageQuality` e `confidence`: alimentam revisao e alerta cinza.
- `MealItem.consumedPercent`: enum restrito a 0, 25, 50, 75 e 100.
- `AuditLog.beforeJson` e `afterJson`: historico auditavel de alteracoes.
- `ImageAsset.containsPotentialIdentifier`: marca possivel identificador em imagem.
