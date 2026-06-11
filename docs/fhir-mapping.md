# Mapeamento FHIR preliminar

Este arquivo descreve compatibilidade futura. O MVP nao implementa integracao FHIR real.

## Patient

- `Patient.id` interno -> identificador tecnico local.
- `Patient.internalCode` -> identificador pseudonimizado local.
- Evitar enviar `displayName` ou dados pessoais sem avaliacao LGPD.

## Encounter / Admission

- `Admission` pode mapear para `Encounter`.
- `Admission.bed` pode mapear para localizacao/leito.
- `Admission.admissionDate` e `dischargeDate` podem mapear para periodo do encontro.
- `Admission.transplantType` e `transplantDay` podem ser extensoes locais ou Observations especificas.

## Observation

- `NutritionDailySummary.totalConsumedKcal` -> Observation de ingestao calorica diaria.
- `NutritionDailySummary.totalConsumedProtein` -> Observation de ingestao proteica diaria.
- Percentuais de meta podem ser Observations separadas ou componentes.

## NutritionOrder

- `NutritionPrescription` pode mapear para `NutritionOrder` ou recurso equivalente conforme perfil institucional.
- Dieta, consistencia, restricoes, metas e suplementos exigem perfilamento local.

## DocumentReference / Media

- `ImageAsset` pode mapear para `Media` ou `DocumentReference`.
- Armazenamento e compartilhamento de imagens exigem avaliacao de identificadores e consentimento/governanca.

## Pendencias

- Definir codificacoes institucionais.
- Definir se metas nutricionais sao Observation, Goal ou NutritionOrder.
- Definir politica de imagens e minimizacao.
- Validar com prontuario, seguranca da informacao e LGPD.
