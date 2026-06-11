# Seguranca e LGPD

## Minimizacao

- Telas principais exibem codigo/leito em vez de dados identificaveis.
- Seed usa pacientes ficticios e pseudonimizados.
- Nomes de arquivos de imagem usam UUID, nao dados clinicos.
- O nome original persistido para uploads e generico/sanitizado, evitando identificadores em metadados do MVP.

## Controle de acesso

- `ADMIN`: gerencia usuarios, leitos, base alimentar e configuracoes futuras.
- `NUTRICAO`: registra dieta, metas, refeicoes, consumo e revisao.
- `ENFERMAGEM`: registra retorno de bandeja e fotos quando necessario.
- `MEDICO`: visualiza dashboard e resumo.
- `AUDITOR`: visualiza logs e historico.

## Audit log

O sistema registra login, exportacao e alteracoes principais. Logs incluem usuario, entidade, acao, data/hora e antes/depois quando aplicavel.

## Imagens

- MVP usa storage local em `IMAGE_STORAGE_DIR`.
- O upload registra tipo, mime, tamanho, uploader e possivel identificador.
- Uploads reais ficam ignorados pelo Git.
- O endpoint `/api/images/[imageId]` exige autenticacao e retorna arquivos apenas do storage local.
- Arquivo local ausente deve retornar erro controlado, nao fallback externo.
- Antes de producao, trocar por storage institucional com politicas de acesso, retencao e backup.

## Pseudonimizacao

`Patient.internalCode` e o identificador preferencial de tela. Qualquer integracao real deve revisar chaves de reversao, finalidade de uso e acesso.

## Uso assistencial versus pesquisa

O MVP e assistencial/documental. Uso para pesquisa, treinamento de IA ou avaliacao retrospectiva exige governanca propria, base legal, aprovacao institucional e controle de dados.

## IA

Nao ha envio de dados para servicos externos de IA. O modulo `meal-estimation` e apenas interface placeholder/mock e retorna sugestoes ficticias. Qualquer validacao futura de visao computacional deve ser local, governada e com revisao humana obrigatoria.
