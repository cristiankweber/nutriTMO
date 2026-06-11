# Checklist de validacao manual

Use apenas dados ficticios do seed ou registros demo. Nao usar pacientes, prontuarios ou imagens reais.

- [ ] 1. Login como usuario da nutricao (`nutricao@nutritmo.local` / `nutritmo123`).
- [ ] 2. Abrir dashboard da unidade.
- [ ] 3. Registrar ingesta com foto adequada e confianca alta usando um atalho de itens e ingesta rapida.
- [ ] 4. Confirmar que a refeicao nao entra na fila de revisao.
- [ ] 5. Registrar ingesta com foto inadequada.
- [ ] 6. Confirmar que entra na fila de revisao com motivo “Foto inadequada”.
- [ ] 7. Revisar refeicao com foto inadequada.
- [ ] 8. Confirmar que sai da fila ativa e aparece no historico/auditoria.
- [ ] 9. Registrar ingesta com confianca baixa.
- [ ] 10. Confirmar que entra na fila com motivo “Baixa confianca”.
- [ ] 11. Revisar refeicao com confianca baixa.
- [ ] 12. Confirmar que sai da fila ativa.
- [ ] 13. Cancelar refeicao pela tela da admissao.
- [ ] 14. Confirmar que a refeicao cancelada nao aparece na fila.
- [ ] 15. Criar ou usar paciente demo com baixa ingesta.
- [ ] 16. Confirmar que alerta nutricional permanece mesmo apos revisao da refeicao.
- [ ] 17. Confirmar que audit log registra criacao, revisao, cancelamento e exportacao quando aplicavel.
- [ ] 18. Abrir `Relatorios` e confirmar a tabela "Relatorio por refeicao".
- [ ] 19. Confirmar colunas de kcal, `% kcal do dia`, CHO, PTN, LIP e observacao.
- [ ] 20. Confirmar destaque de menor ingesta calorica, menor ingesta proteica e maior aporte calorico.
- [ ] 21. Gerar texto por refeicao para prontuario no dia selecionado.
- [ ] 22. Confirmar que o texto reflete dados revisados, exclui refeicoes canceladas e nao inclui refeicoes de outros dias.
- [ ] 23. Abrir `/api/images/[imageId]` autenticado a partir de uma foto demo e confirmar renderizacao.
- [ ] 24. Encerrar sessao e confirmar que a mesma URL de imagem redireciona/bloqueia usuario nao autenticado.
- [ ] 25. Confirmar estados vazios em base alimentar, prescricao, registros de ingesta e auditoria quando aplicavel.
- [ ] 26. Confirmar no mobile que dashboard, registro, revisao, relatorio e auditoria nao apresentam overflow fora das tabelas rolaveis.
- [ ] 27. Confirmar que a interface e a documentacao nao afirmam que IA visual real esta ativa.
- [ ] 28. Rodar validacao completa: `npm run lint`, `npm run typecheck`, `npm test`, `npm run prisma:validate`, `npm run build` e `npm run validate`.
