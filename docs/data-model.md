# Modelo de dados

## Entidades

- `User`: usuario do sistema, email, hash de senha e papel.
- `Patient`: paciente pseudonimizado, com `internalCode` como identificador principal de tela.
- `Bed`: leito da unidade TMO.
- `Admission`: internacao ativa, leito, tipo de transplante e D+/D-.
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
- `NutritionPrescription.kcalTarget` e `proteinTarget`: metas usadas nos percentuais.
- `Meal.imageQuality` e `confidence`: alimentam revisao e alerta cinza.
- `MealItem.consumedPercent`: enum restrito a 0, 25, 50, 75 e 100.
- `AuditLog.beforeJson` e `afterJson`: historico auditavel de alteracoes.
- `ImageAsset.containsPotentialIdentifier`: marca possivel identificador em imagem.
