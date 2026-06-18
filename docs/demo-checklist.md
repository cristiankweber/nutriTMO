# Demo checklist NutriTMO

Roteiro operacional para preparar e apresentar o MVP em 10 a 15 minutos. Use apenas dados ficticios do seed. Nao usar pacientes, prontuarios, fotos reais ou credenciais institucionais.

## Objetivo da demo

Mostrar que o NutriTMO consegue registrar ingesta, calcular macro/micronarrativa operacional, acionar revisao humana, preservar auditoria, exportar relatorio local e demonstrar rotina de leitos/admissoes sem integracoes externas.

## Reset do banco demo

1. Conferir `.env` local com `DATABASE_URL`, `SESSION_SECRET`, `IMAGE_STORAGE_DIR` e `IMAGE_RETENTION_DAYS`.
2. Subir PostgreSQL:

```bash
docker compose up -d
```

3. Resetar o banco demo com migrations, seed e verificacao:

```bash
npm run demo:reset
```

4. Confirmar no terminal que o seed verificado mostra:

- 5 admissoes ativas.
- 1 paciente inativo com alta historica.
- 10 leitos ativos e 5 leitos livres.
- 14 itens ativos na base alimentar.
- Ao menos 1 pendencia de revisao.
- Ao menos 1 refeicao cancelada.
- Auditoria de seed, revisao e exportacao.
- Imagens demo locais.

## Preflight antes de apresentar

1. Rodar validacao completa:

```bash
npm run demo:pilot
```

2. Subir em modo production para evitar indicador/overlay de desenvolvimento:

```bash
npm run start -- --port 3100
```

3. Abrir `http://127.0.0.1:3100/login`.
4. Fazer login como `nutricao@nutritmo.local`.
5. Confirmar rapidamente:
   - Dashboard abre com leitos e filtros rapidos.
   - `Pacientes` mostra ativas, leitos livres, altas e inativos.
   - `Revisao` tem ao menos uma pendencia.
   - `Relatorios` permite exportar XLSX/PDF local.
   - `Auditoria` mostra eventos e JSON bruto colapsavel.

## Roteiro de 10 a 15 minutos

### 0:00-1:00 - Contexto

- Abrir login e explicar que o ambiente e local, ficticio e sem dados reais.
- Frase-chave: "O sistema nao substitui a nutricionista; ele estrutura o registro, calculo, revisao humana e rastreabilidade."

### 1:00-3:00 - Dashboard da unidade

- Mostrar leitos TMO, filtros rapidos, alertas, revisoes abertas e pendencias do dia.
- Destacar diferenca entre alerta nutricional e pendencia operacional.

### 3:00-4:30 - Operacao de leitos e admissoes

- Abrir `Pacientes`.
- Mostrar filtros `Ativas`, `Leitos livres`, `Altas`, `Inativos` e `Todos`.
- Explicar que alta e troca de leito sao auditadas e que paciente inativo pode ser reinternado sem trocar o codigo pseudonimizado.

### 4:30-6:30 - Detalhe do paciente

- Abrir `TMO-001`.
- Mostrar prescricao ativa, metas de kcal/proteina, resumo diario e distribuicao por refeicao.
- Destacar a menor ingesta proteica/calorica como ponto de discussao, nao como conduta autonoma.

### 6:30-8:30 - Registro de ingesta

- Abrir `Registrar ingesta`.
- Usar atalho de refeicao demo e ingesta rapida.
- Mostrar calculo em tempo real de kcal, CHO, PTN e LIP.
- Marcar foto inadequada ou baixa confianca para gerar revisao.

### 8:30-10:00 - Revisao humana

- Abrir `Revisao`.
- Mostrar motivo da pendencia.
- Ajustar percentual/observacao e salvar revisao.
- Explicar que a pendencia sai da fila, mas o historico permanece.

### 10:00-12:00 - Auditoria e cancelamento

- Abrir detalhe do paciente ou `Auditoria`.
- Mostrar antes/depois, motivo humano e JSON bruto colapsado.
- Mostrar uma refeicao cancelada do seed e explicar que cancelamento nao deleta dado clinico.

### 12:00-14:00 - Relatorios e exportacao local

- Abrir `Relatorios`.
- Mostrar texto copiavel para prontuario e tabela por refeicao.
- Baixar XLSX ou PDF local.
- Explicar que nao ha envio para Google Sheets por padrao.

### 14:00-15:00 - Fechamento

- Reforcar limites: sem IA visual real, sem prontuario integrado, sem uso assistencial real antes de governanca institucional.
- Encerrar com o proximo passo: piloto controlado com dados ficticios ou homologacao institucional.

## Frases para demonstracao

- "A revisao humana e obrigatoria quando ha baixa confianca, foto inadequada ou registro incompleto."
- "O relatorio mostra nao apenas o total do dia, mas qual refeicao concentrou a falha de ingesta."
- "Cancelamento nao apaga dado clinico: muda o status, recalcula o resumo e preserva auditoria."
- "A IA visual ainda nao esta ativa; este MVP prepara a base auditavel para uma validacao futura."
- "Nesta fase usamos apenas dados ficticios e imagens demo geradas localmente."
- "Exportacoes sao locais e auditadas; nao ha envio externo por padrao."

## Plano B rapido

- Se o app nao abrir: confirmar `docker compose ps`, depois `npm run demo:reset`.
- Se login falhar: rodar novamente `npm run prisma:seed`.
- Se imagem retornar 404: conferir `IMAGE_STORAGE_DIR` e rodar `npm run demo:reset`.
- Se aparecer indicador de desenvolvimento: parar `npm run dev`, rodar `npm run build` e `npm run start -- --port 3100`.
- Se os dados estiverem diferentes do roteiro: rodar `npm run demo:verify`; se falhar, resetar com `npm run demo:reset`.
