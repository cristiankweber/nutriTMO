# Checklist de validacao manual

Use apenas dados ficticios do seed ou registros demo. Nao usar pacientes, prontuarios ou imagens reais. Marque a data, navegador, viewport e perfil usado antes de iniciar.

## Preparacao

- [ ] 1. Rodar `docker compose up -d`.
- [ ] 2. Rodar `npm run demo:reset` e confirmar que `demo:verify` passou.
- [ ] 3. Rodar `npm run validate`.
- [ ] 4. Subir app para validacao visual em modo production: `npm run start -- --port 3100`.
- [ ] 5. Abrir `http://127.0.0.1:3100/login`.

## Login e permissoes

- [ ] 6. Login como nutricao (`nutricao@nutritmo.local`).
- [ ] 7. Confirmar acesso a dashboard, pacientes, cardapio, prescricoes, registro, revisao, relatorios e auditoria.
- [ ] 8. Login como auditor (`auditor@nutritmo.local`).
- [ ] 9. Confirmar que auditor acessa `Auditoria` e `Governanca`, mas fica bloqueado em dashboard, detalhe clinico, imagens e relatorios.

## Operacao de leitos e admissoes

- [ ] 10. Abrir `Pacientes` e confirmar filtros `Ativas`, `Alertas`, `Sem prescricao`, `Leitos livres`, `Altas`, `Inativos` e `Todos`.
- [ ] 11. Confirmar 5 admissoes ativas no seed limpo.
- [ ] 12. Confirmar 5 leitos livres no seed limpo.
- [ ] 13. Confirmar 1 paciente inativo no seed limpo.
- [ ] 14. Trocar leito de uma admissao ativa para um leito livre.
- [ ] 15. Confirmar mensagem de troca registrada e novo leito na listagem.
- [ ] 16. Dar alta em uma admissao ativa.
- [ ] 17. Confirmar que a admissao sai da lista ativa e aparece em `Altas`.
- [ ] 18. Confirmar que paciente sem outra admissao ativa aparece em `Inativos`.
- [ ] 19. Reinternar um paciente inativo usando `Nova admissao`.
- [ ] 20. Confirmar retorno ao detalhe da nova admissao e registro de auditoria.

## Registro e revisao de ingesta

- [ ] 21. Registrar ingesta com foto adequada e confianca alta usando atalho de refeicao e ingesta rapida.
- [ ] 22. Confirmar que a refeicao nao entra na fila de revisao.
- [ ] 23. Registrar ingesta com foto inadequada.
- [ ] 24. Confirmar que entra na fila de revisao com motivo `Foto inadequada`.
- [ ] 25. Revisar refeicao com foto inadequada.
- [ ] 26. Confirmar que sai da fila ativa e aparece no historico/auditoria.
- [ ] 27. Registrar ingesta com confianca baixa.
- [ ] 28. Confirmar que entra na fila com motivo `Baixa confianca`.
- [ ] 29. Revisar refeicao com confianca baixa.
- [ ] 30. Confirmar que sai da fila ativa.
- [ ] 31. Cancelar refeicao pela tela da admissao.
- [ ] 32. Confirmar que a refeicao cancelada nao aparece na fila ativa nem entra no calculo do relatorio.

## Relatorios e exportacao local

- [ ] 33. Abrir `Relatorios` e confirmar tabela `Relatorio por refeicao`.
- [ ] 34. Confirmar colunas de kcal, `% kcal do dia`, CHO, PTN, LIP e observacao.
- [ ] 35. Confirmar destaque de menor ingesta calorica, menor ingesta proteica e maior aporte calorico.
- [ ] 36. Gerar texto por refeicao para prontuario no dia selecionado.
- [ ] 37. Confirmar que o texto reflete dados revisados, exclui refeicoes canceladas e nao inclui refeicoes de outros dias.
- [ ] 38. Exportar relatorio por paciente em XLSX.
- [ ] 39. Exportar relatorio por paciente em PDF.
- [ ] 40. Exportar auditoria em XLSX/PDF.
- [ ] 41. Confirmar que cada exportacao gera `AuditLog` com acao `EXPORT`.

## Imagens, auditoria e governanca

- [ ] 42. Abrir uma imagem demo autenticado a partir de uma foto do registro e confirmar renderizacao.
- [ ] 43. Encerrar sessao e confirmar que a mesma URL de imagem redireciona ou bloqueia usuario nao autenticado.
- [ ] 44. Abrir `Auditoria` e confirmar resumo humano, usuario, entidade, acao e JSON bruto colapsado.
- [ ] 45. Abrir JSON bruto de um evento de revisao e confirmar antes/depois.
- [ ] 46. Abrir `Governanca` e confirmar matriz de permissoes, retencao de imagens e avisos LGPD.
- [ ] 47. Confirmar que a interface e a documentacao nao afirmam que IA visual real esta ativa.

## Mobile

- [ ] 48. Validar dashboard mobile com filtros rapidos sem overflow global.
- [ ] 49. Validar `Pacientes` mobile com filtros, cards, alta/troca e nova admissao.
- [ ] 50. Validar registro de refeicao mobile com resumo fixo visivel.
- [ ] 51. Validar revisao mobile sem formulario excessivamente comprimido.
- [ ] 52. Validar auditoria mobile em cards e JSON colapsado.
- [ ] 53. Validar relatorios mobile com tabelas apenas em containers rolaveis.

## Fechamento

- [ ] 54. Rodar `npm run demo:verify` apos a validacao manual se o banco foi alterado durante os testes.
- [ ] 55. Registrar bugs encontrados com perfil, URL, acao, resultado esperado, resultado obtido e screenshot quando aplicavel.
- [ ] 56. Resetar o banco para a proxima demo com `npm run demo:reset`.
