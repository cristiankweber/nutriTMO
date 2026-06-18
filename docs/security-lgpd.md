# Seguranca e LGPD

## Minimizacao

- Telas principais exibem codigo/leito em vez de dados identificaveis.
- Seed usa pacientes ficticios e pseudonimizados.
- Nomes de arquivos de imagem usam UUID, nao dados clinicos.
- O nome original persistido para uploads e generico/sanitizado, evitando identificadores em metadados do MVP.

## Controle de acesso

- `ADMIN`: acessa atendimento, relatorios, exportacoes, auditoria, governanca e limpeza de retencao.
- `NUTRICAO`: gerencia admissoes demo, base alimentar, prescricoes, registros, revisoes, detalhe clinico e relatorios.
- `ENFERMAGEM`: visualiza dashboard/detalhe clinico e registra retorno de bandeja/fotos quando necessario.
- `MEDICO`: visualiza dashboard/detalhe clinico, relatorios e exportacao local por paciente.
- `AUDITOR`: visualiza logs, matriz de governanca e politicas; nao acessa dashboard, detalhe clinico, imagens ou relatorios clinicos.

As permissoes ficam centralizadas em `src/lib/auth/permissions.ts` e aplicadas em navegacao, paginas, server actions e route handlers criticos.

## Sessao

- Cookie HttpOnly, SameSite Strict e Secure em producao.
- Validade padrao de 8 horas.
- Payload assinado guarda apenas `id`, `name` e `role`; o e-mail permanece fora do cookie.
- Tokens com expiracao acima da janela esperada sao rejeitados.

## Audit log

O sistema registra login, exportacao e alteracoes principais. Logs incluem usuario, entidade, acao, data/hora e antes/depois quando aplicavel.

## Imagens

- MVP usa storage local em `IMAGE_STORAGE_DIR`.
- Retencao local configuravel por `IMAGE_RETENTION_DAYS`, padrao 30 dias.
- A tela `Governanca` exibe total de imagens, possiveis identificadores e vencidas pela politica.
- A limpeza de imagens vencidas e manual, restrita a admin e registrada em `AuditLog`.
- O upload registra tipo, mime, tamanho, uploader e possivel identificador.
- Uploads reais ficam ignorados pelo Git.
- O endpoint `/api/images/[imageId]` exige perfil clinico autorizado e retorna arquivos apenas se o caminho estiver dentro do storage local.
- Arquivo local ausente deve retornar erro controlado, nao fallback externo.
- Antes de producao, trocar por storage institucional com politicas de acesso, retencao e backup.

## Pseudonimizacao

`Patient.internalCode` e o identificador preferencial de tela. Qualquer integracao real deve revisar chaves de reversao, finalidade de uso e acesso.

## Uso assistencial versus pesquisa

O MVP e assistencial/documental. Uso para pesquisa, treinamento de IA ou avaliacao retrospectiva exige governanca propria, base legal, aprovacao institucional e controle de dados.

## Referencias de governanca para piloto

- [ANPD, Guia orientativo sobre seguranca da informacao para agentes de tratamento de pequeno porte](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte): medidas administrativas e tecnicas devem acompanhar o risco do tratamento.
- [ANPD, Relatorio de Impacto a Protecao de Dados Pessoais (RIPD)](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd): recomendado antes de tratamento que possa gerar alto risco, especialmente com dados sensiveis.
- [ANPD, consulta sobre guia de anonimizacao e pseudonimizacao](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-abre-consulta-a-sociedade-sobre-o-guia-de-anonimizacao-e-pseudonimizacao): tratar anonimizacao e pseudonimizacao como processo baseado em risco, nao como garantia absoluta.
- [ANPD, Comunicacao de incidente de seguranca](https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis): incidentes confirmados com risco ou dano relevante exigem avaliacao e comunicacao pelo controlador nos termos aplicaveis.

## IA

Nao ha envio de dados para servicos externos de IA. O modulo `meal-estimation` e apenas interface placeholder/mock e retorna sugestoes ficticias. Qualquer validacao futura de visao computacional deve ser local, governada e com revisao humana obrigatoria.
