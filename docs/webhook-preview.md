# Webhook de teste — Preview

**Rodada integrada de 16/10/2026:** o simulador foi validado para recusa e aprovação. Após alinhar o segredo, um único novo Pix fictício permitiu diagnosticar a entrega automática: o HMAC confere com o ID em minúsculas. O validador foi corrigido mantendo a assinatura obrigatória; a repetição automática da mesma notificação está em observação. Ver o resultado atual em `validacao-integrada-preview.md`; as demais seções são histórico. URL estável: `https://heeeph-webhook-teste-nardsssbh-9766s-projects.vercel.app/api/mercado-pago-webhook`.

Endpoint: `POST /api/mercado-pago-webhook`. A Orders API envia o evento **Order (Mercado Pago)**, com `type=order` e `data.id=ORD...` na query. Não selecionar Payment da API legada nem QR presencial.

A validação usa HMAC SHA-256 sobre `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, com o segredo da aplicação. O manifesto aceita o ID original do simulador e o ID em minúsculas observado na entrega automática; ambos exigem HMAC válido. A consulta à API e a persistência mantêm o ID original. Depois de validar a assinatura, conferir vendedor, referência e valores. O corpo da notificação não confirma aprovação. Repetir a notificação não cria cobrança.

## Configuração privada

1. Na aplicação HEEEPH `935313633293399`, entrar em Mercado Pago → Suas integrações → Webhooks → Configurar notificações → **Modo de teste**. Selecionar **Order (Mercado Pago)** e cadastrar a URL HTTPS exata do receptor isolado indicada no resultado abaixo. As credenciais de teste dessa aplicação correspondem ao vendedor `3763192972`. Não alterar a aba Modo de produção.
2. Salvar a configuração para gerar a chave secreta de assinatura. Não usar Access Token nem o valor de um header `x-signature` como segredo.
3. Em Vercel → heeeph → Settings → Environment Variables, cadastrar `MERCADO_PAGO_WEBHOOK_SECRET_TEST` como Sensitive/Secret, **somente em Preview**, para `codex/preparacao-vendas` se for restringir à branch. Colar o segredo diretamente do Mercado Pago no painel Vercel, sem chat ou arquivo no repositório. Depois fazer redeploy somente da branch de testes.

## Proteção do Preview

Requisições externas sem credencial retornaram `401` com `Protected deployment`, antes da função. O Mercado Pago não faz login na Vercel. Não desativar Vercel Authentication, não criar exceção pública de domínio e não usar OPTIONS Allowlist para um webhook POST.

**Configuração atual:** usar o receptor isolado `heeeph-webhook-teste`, público somente para o endpoint de notificação e protegido por assinatura. O site e o painel continuam protegidos pela Vercel. Não é necessário copiar bypass para o Mercado Pago.

Histórico da alternativa descartada: foi testado um Shareable Link temporário do Preview/branch. O POST retornou redirecionamento e o simulador não concluiu a entrega; o link foi revogado. Não reutilizar essa alternativa nem publicar seu parâmetro privado.

Protection Bypass for Automation do projeto é mais amplo: o segredo atende todos os deployments do projeto. Não gerar esse segredo compartilhado como atalho neste fluxo. Caso o Shareable Link não funcione para o POST, reportar o bloqueio e preparar um receptor de testes separado, sem tornar o site inteiro público.

## Validação sem cobrança

### Resultado observado em 16/10/2026

**Resultado do simulador: entrega assinada e processamento da notificação de teste confirmados.** O usuário substituiu `MERCADO_PAGO_ACCESS_TOKEN_TEST` somente em Preview do receptor, copiando o Access Token existente de **Credenciais de teste** da aplicação HEEEPH, cujo User ID foi conferido como `3763192972`. Não houve regeneração da credencial do checkout nem alteração de main/Production nesta correção.

O redeploy normal do receptor, `dpl_CbwnbjQLooChdskW8TeZgZzSz4fN` (Preview), está READY. A URL de teste salva no Mercado Pago é `https://heeeph-webhook-teste-1j4qv8p5a-nardsssbh-9766s-projects.vercel.app/api/mercado-pago-webhook`. Foi repetida somente a notificação da order existente `ORDTST01M523EW53YJSRMZNG57QBJP0H`. Resposta ao Mercado Pago: **200 OK**. Logs: vendedor `3763192972`, `teste:true`, `assinaturaValidada:true`, `resultado:processado_e_persistido`; request Vercel `x6w6p-1792157601791-a72d966e51b7`.

Consulta independente e somente de leitura no Redis confirmou o pedido `9cb559b6f5579bb6a9d0d03f10c0a9c0` com `webhookRecebido.assinaturaValidada=true`, mesma order, horário `2026-10-16T13:33:22.725Z` (10:33:22 BRT) e estado `failed`. `pagamento.aprovado` permanece `false`: prevaleceu a consulta autoritativa da Orders API, não o corpo simulado que declarava `processed`. Nenhuma cobrança foi criada ou reenviada. A assinatura, a entrega e a persistência desta notificação de teste estão comprovadas; isso não equivale a liberar vendas/cobranças reais ou validar automaticamente todas as transições futuras.

Na rodada integrada, foi enviada somente a notificação da order já aprovada `ORDTST01M524ME02R2ESXG6HJWPBKE1V`, pedido `558cdfff7d3b407abe8b848fe14211ae`. O simulador retornou HTTP 200; consulta independente ao Redis confirmou `aprovado=true`, `processed` e `webhookRecebido.assinaturaValidada=true`, em `2026-10-16T13:46:15.035Z`. Isso comprova também o processamento de uma order aprovada. A entrega automática após uma nova mudança de estado é uma evidência separada, ainda não comprovada por essa simulação.

Histórico da investigação anterior à correção:

Atualização com receptor isolado: o Mercado Pago entregou uma notificação assinada da order existente `ORDTST01M523EW53YJSRMZNG57QBJP0H` ao endpoint do projeto `heeeph-webhook-teste`. Os logs confirmaram `assinaturaValidada:true`. A resposta final foi **503** porque a consulta GET da order recebeu **403 PA_UNAUTHORIZED_RESULT_FROM_POLICIES** do Mercado Pago (request ID `359e6d7f-6586-489e-bb90-51daa7295dd1`). A proteção do site permaneceu ativa.

O receptor foi reforçado para confirmar o vendedor de teste antes de consultar a order. No novo deploy `dpl_6qmkQ2p9xxqBLKSoy3Ywd8um8Qqu`, uma nova notificação da mesma order passou pela assinatura, mas GET `/users/me` também retornou **403 PA_UNAUTHORIZED_RESULT_FROM_POLICIES**, request ID `c096b47b-4000-4801-909e-39dd7376994c`. Isso impede confirmar a conta; não foi feita nova cobrança nem atualização forçada do pedido. A URL de teste do Mercado Pago aponta ao endpoint desse Preview isolado.

Uma consulta somente de leitura no console do Redis, após a rotação, confirmou o pedido `9cb559b6f5579bb6a9d0d03f10c0a9c0`, sua order e vendedor `3763192972`, em `failed`, sem `webhookRecebido`. Confirmou também a preservação do pedido de teste aprovado `558cdfff7d3b407abe8b848fe14211ae`. Não foram expostos dados de comprador nem credenciais.

Situação: entrega ao receptor e HMAC validados; processamento/persistência do webhook ainda não validados. Conferir diretamente no painel a credencial `MERCADO_PAGO_ACCESS_TOKEN_TEST` do receptor e sua origem no vendedor de teste que criou a order. A documentação do Mercado Pago associa esse código a bloqueio/revogação por políticas; se a credencial correta persistir recusada, tratar com o suporte usando os request IDs. Não trocar por credenciais da conta real.

Comparação posterior em 16/10/2026: os Secrets não são relidos pela API Vercel. Foi executada comparação temporária entre os runtimes de Preview do checkout e do receptor, com HMAC e desafio único, referência com TTL no Redis e resultado booleano apenas. Os logs registraram `credenciaisIguais:false` e `assinaturaValidada:true` (request Vercel `drrn4-1792156359129-e196220e13de`). O HTTP 200 dessa etapa é exclusivamente diagnóstico (`comparacaoSomente:true`, `processado:false`); não confirma reconciliação do pedido. Nenhum token ou HMAC foi retornado ao navegador ou aos logs. A referência temporária recebeu expiração imediata após a leitura; o código de diagnóstico tem prazo de expiração e não foi incorporado ao pacote normal.

O Secret do checkout foi configurado antes da criação do pedido (`criadoEm` no Redis: `2026-10-16T10:17:21.844Z`) e não teve nova atualização desde então, segundo os metadados Vercel. A substituição do Secret divergente no receptor continua pendente: o formulário foi aberto como Secret, somente Preview, sem ler nem preencher o valor. A URL de teste do Mercado Pago foi restaurada para o receptor normal `heeeph-webhook-teste-qswxcbmue-nardsssbh-9766s-projects.vercel.app/api/mercado-pago-webhook`. Após a substituição direta no painel, redeployar apenas o receptor e repetir a notificação da order existente. Não concluir bloqueio da conta do checkout a partir do 403 da credencial divergente do receptor.

Histórico anterior ao receptor isolado:

- Redeploy de `codex/preparacao-vendas`, commit `13618f7`, com `MERCADO_PAGO_WEBHOOK_SECRET_TEST` Sensitive somente em Preview.
- Simulação de **Order (Mercado Pago)** usando uma order de teste já existente: o Mercado Pago recebeu **307 Temporary Redirect**, antes de executar a função. Não houve criação nem reenvio de cobrança.
- O Shareable Link usa `_vercel_share` e exige redirecionamento; o simulador não o seguiu. Usar o mesmo token em `x-vercel-protection-bypass` retornou 401 da proteção. Não tratar esse link como solução para o POST do webhook.
- O link temporário foi revogado e a URL de teste voltou ao endpoint da branch sem token. A assinatura secreta foi preservada; a proteção geral e Production não foram alteradas.
- A validação real da assinatura e a reconciliação por webhook continuam pendentes. Para prosseguir sem ampliar o bypass do projeto, será necessário um receptor de teste isolado, acessível ao Mercado Pago e protegido pela assinatura HMAC.

No Mercado Pago → Webhooks → Simular, selecionar a URL privada configurada, evento Order, e o **ID ORD de uma order de teste já existente** (não o ID local do pedido). Enviar teste cria uma notificação, não uma cobrança. Validar:

- A chamada chega à função em vez de receber a página/erro da proteção Vercel.
- Uma assinatura inválida é recusada com 401, sem consulta ao provedor e sem alterar pedido.
- Uma entrega assinada válida consulta a order existente e devolve 200 somente após persistência. O simulador pode declarar um estado diferente: prevalece a API.
- Os logs `MP_WEBHOOK` informam resultado, HTTP, validação de assinatura e ID da order; não incluem query inteira, bypass, assinatura, segredo, corpo ou dados do comprador.
- O pedido recebe `webhookRecebido` apenas depois da assinatura válida e da consulta/persistência. O painel exibe essa evidência separadamente da última consulta de pagamento. Consulta ou reload não criam esse registro.
- Repetir o teste mantém a mesma order e não chama criação de pagamento. Assinatura válida com recurso não encontrado não é prova de reconciliação de um pedido.

Testes locais com mocks comprovam regras do código; somente uma entrega do provedor comprova a integração real. Não declarar o webhook validado só porque o simulador mostrou HTTP 200: conferir o log e a evidência do pedido correspondente.

Fontes oficiais:
- https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications
- https://github.com/mercadopago/sdk-nodejs/blob/master/src/utils/webhook/index.ts
- https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection
- https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
