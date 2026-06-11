# Demo checklist NutriTMO

Roteiro curto para demonstracao local de 10 a 15 minutos. Use apenas dados ficticios do seed.

## Preparacao

1. Subir PostgreSQL: `docker compose up -d`.
2. Conferir `.env`.
3. Rodar migrations e seed: `npm run prisma:migrate` e `npm run prisma:seed`.
4. Iniciar app: `npm run dev`.
5. Abrir `http://localhost:3000/login`.

## Roteiro de 10 a 15 minutos

1. Login como nutricao: `nutricao@nutritmo.local` / `nutritmo123`.
2. Mostrar o dashboard da unidade e os 10 leitos TMO.
3. Abrir um paciente com baixa ingesta ou alerta nutricional.
4. Mostrar prescricao ativa, metas de kcal/proteina e ingesta do dia.
5. Mostrar distribuicao por refeicao e destacar onde a falha de ingesta aparece.
6. Abrir `Registrar ingesta`.
7. Usar um preset de refeicao e aplicar ingesta rapida.
8. Mostrar calculo de kcal, PTN, CHO e LIP servidos/ingeridos.
9. Salvar uma refeicao com foto inadequada ou baixa confianca para gerar revisao.
10. Abrir `Revisao` e mostrar a pendencia com motivo.
11. Revisar a refeicao e confirmar que ela sai da fila ativa.
12. Abrir a tela do paciente e mostrar o historico auditavel da revisao.
13. Abrir `Auditoria` e mostrar o resumo humano mais o JSON bruto.
14. Abrir `Relatorios`, mostrar relatorio por refeicao e copiar texto para prontuario.
15. Mostrar um paciente/refeicao cancelada e explicar que o dado nao foi deletado.
16. Explicar que IA visual ainda e placeholder e nao esta ativa.

## Frases para demonstracao

- "O sistema nao substitui a nutricionista; ele estrutura o registro e reduz perda de informacao."
- "A revisao humana e obrigatoria quando ha baixa confianca, foto inadequada ou registro incompleto."
- "O relatorio mostra nao apenas o total do dia, mas qual refeicao concentrou a falha de ingesta."
- "Cancelamento nao apaga dado clinico: muda o status, recalcula o resumo e preserva auditoria."
- "A IA visual ainda nao esta ativa; este MVP prepara a base auditavel para uma validacao futura."
- "Nesta fase usamos apenas dados ficticios e imagens demo geradas localmente."

## Encerramento

Antes de apresentar como build demonstravel, rode:

```bash
npm run validate
```

Se precisar abrir o banco:

```bash
npm run prisma:studio
```
