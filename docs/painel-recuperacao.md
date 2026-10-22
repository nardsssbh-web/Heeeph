# Painel e recuperação — preparação local de 22/10/2026

Alterações locais em `codex/preparacao-vendas`, sem publicação. Migração Hostinger suspensa por decisão do usuário. Main, Production, domínio, credenciais, Redis ativo e configurações dos provedores preservados. Nenhum pagamento, pedido ou webhook foi enviado aos serviços externos nesta rodada.

## Painel

- Paginação padrão de 20 pedidos, limite máximo de 50 por requisição. Próxima/anterior e nova busca acionam o servidor, não apenas o subconjunto já carregado.
- Busca por número completo, nome, e-mail ou produto, com normalização de acentos e filtro de pagamento no servidor. Nenhum dado é retornado antes de autenticar a chave administrativa existente.
- Leitura de até 200 membros do índice por requisição, com um membro adicional somente para detectar continuação. Não declarar ausência definitiva se ainda há cursor: uma pesquisa pode retornar página vazia com opção de continuar nos registros antigos.
- Cada lote de até 25 membros usa um MGET para pedido e gestão, preservando exclusão lógica e ignorando registros expirados. A primeira página comum exige uma consulta ao índice e um MGET (duas operações REST/Redis de nível superior; não é medição de latência nem promessa de consumo faturado).
- Cursor aponta para o último ID examinado. ZREVRANK localiza esse ponto antes da continuação, evitando deslocamento quando surgem pedidos novos acima dele. Se o membro do cursor desaparecer do índice, responder 409 e atualizar a busca desde o início. A navegação não é um snapshot transacional entre requisições: mudanças nos registros podem alterar resultados; atualizar para ver novos pedidos.
- Um ID exato de 32 caracteres hexadecimais é consultado diretamente, inclusive se o pedido tiver sido salvo fora do índice. Isso não repara nem escreve no banco e não exibe registro oculto ou de outro ambiente.
- Respostas de listagem antigas não reabrem o painel após sair. Imprimir se refere somente à página exibida. A chave continua apenas no estado da página, sem persistência adicional.

## Persistência e falhas

`salvar()` usa uma execução Lua para gravar o pedido e atualizar o sorted set, sem intervalo concorrente entre comandos. Valida ID/data no JavaScript e tipo do índice/argumentos antes do SET no script. Teste continua com TTL de 30 dias, produção sintética sem TTL. Nenhum TTL foi alterado em registros existentes do provedor.

Redis não faz rollback de comandos já executados quando um script encontra erro em execução. A validação prévia impede o caso conhecido de índice com tipo inválido modificar o pedido. Isso não elimina todo risco de falha de infraestrutura ou capacidade e não substitui backup, alertas ou conciliação. Uma resposta perdida após executar pode ser repetida com o mesmo pedido e ID: SET/ZADD convergem sem criar outro registro ou order.

Quando o Mercado Pago aceita uma order mas a gravação seguinte falha, a tentativa permanece protegida. A consulta recupera a order existente por referência externa, confere valores e vendedor e não chama criação novamente. O cenário foi exercitado com provedor simulado; o teste de Redis local exercitou Lua real em instância separada.

O webhook principal agora responde **503**, e registra `recurso_ausente_requer_conciliacao`, quando encontra 404 durante o processamento de uma notificação assinada. Não retorna 200 apenas porque faltou um recurso. Uma nova entrega pode concluir quando o registro voltar a estar disponível. Assinatura inválida continua 401; processamento/persistência concluídos continuam 200.

Isso solicita nova entrega, mas não garante retentativas ilimitadas do provedor nem reconstrói automaticamente dados perdidos. Em ausência persistente, é necessária conciliação operacional e recuperação de backup, preservando dados atuais. Não criar novo pagamento nem importar snapshot antigo sobre o banco ativo para resolver o erro. A rotina agendada de conciliação/alertas e a rotina de backup ainda não foram implantadas.

## Testes

Comando final: `node --test tests/*.test.js`, Node 24.19.0. **133 testes passaram; zero falhas, zero omissões.** `git diff --check` também conferido. As APIs financeiras/CEP/frete são simuladas; testes HTTP usam loopback.

Novos cenários incluem:

- Navegação por registros antigos e inserção concorrente antes do cursor.
- Busca com acento/filtro atravessando 450 registros em três janelas limitadas.
- Exclusões/expiração e consulta exata de pedido fora do índice, sem escrita.
- Rejeição de parâmetros/cursor inválidos.
- Busca/cursor enviados pela tela e descarte de resposta após sair.
- Order fictícia aceita com falha posterior de persistência, recuperada sem nova criação.
- Webhook com recurso ausente respondendo 503 e entrega posterior concluída.
- Script Lua real em Redis portátil local: pedido e índice, TTL, erro de tipo antes de escrever e resposta perdida/repetida.

O ensaio Lua inicia Redis somente em 127.0.0.1, com senha efêmera, sem importar backups e sem persistência em disco. Usa diretório de ensaio fora do checkout e o encerra com NOSAVE. Não acessa Upstash. Se o binário portátil não existir em outra máquina, esse teste informa omissão em vez de baixar software ou recorrer ao banco remoto; nenhuma omissão ocorreu na execução registrada aqui. A primeira tentativa foi interrompida por incompatibilidade do caminho absoluto de configuração com o port MSYS2; corrigida para arquivo relativo ao diretório isolado, o ensaio e a suíte completa passaram.

## Arquivos e próximos passos

Implementação: `lib/pedidos-lista.js`, `api/pedidos.js`, `js/pedidos.js`, `pedidos.html`, `lib/persistencia.js`, `lib/checkout.js`, `api/mercado-pago-webhook.js`. O empacotador do receptor inclui a nova dependência de persistência; nenhum receptor foi republicado.

Testes: `tests/pedidos-paginacao.test.js`, `tests/pedidos-tela.test.js`, `tests/pedidos.test.js`, `tests/checkout.test.js`, `tests/hostinger.test.js`, `tests/persistencia-redis.test.js`, `tests/webhook-recuperacao.test.js`.

O ZIP Hostinger de 21/10 permanece preservado como release anterior e não contém estas alterações de 22/10. Não usá-lo como versão atual do painel; regenerar e conferir somente quando retomada a preparação de implantação autorizada. Esta rodada não requer migração.

Ainda pendentes: validação publicada do novo painel e recuperação, expiração integrada do 3DS/Pix, confirmação mobile de cópia, backup operacional e proteção de dados, isolamento definitivo do banco, escolha da hospedagem comercial e configuração real das integrações. Nenhuma dessas pendências deve ser inferida como concluída pelos testes locais.
