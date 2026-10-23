# Alteração e desistência no checkout de teste

Implementação restrita à branch `codex/preparacao-vendas`. A ação de encerramento recusa o ambiente `producao`. Não habilita pagamentos reais.

## Fluxo

- Sem pedido preparado ou tentativa interrompida: Alterar meu pedido volta ao carrinho; Desistir da compra volta à loja. Os produtos permanecem no carrinho. A seleção de frete é invalidada.
- Com pedido preparado, referência recuperável ou Pix: apresenta confirmação explícita. Uma preparação interrompida é recuperada antes de liberar a saída.
- A ação autenticada `abandonarPedido` usa o bloqueio Redis do próprio pedido. Persiste a solicitação de saída antes de consultar o provedor; esse registro impede pagar ou recuperar o Pix dessa tentativa.
- Consulta a Orders API e confere vendedor, referência, identificador, país e valor. Busca vazia com marcador de tentativa não comprova ausência de cobrança.
- Para Pix de uma única transação, sem valores pagos explicitamente informados, com order e transação `created` ou `action_required`, usa POST `/v1/orders/{id}/cancel` com chave idempotente estável. Não realiza estornos nem cancela cartão pendente ou 3DS.
- Após solicitar cancelamento, sempre consulta novamente por GET, inclusive após timeout. Só libera após estado terminal de cancelamento/expiração em ambos os níveis e valores pagos explicitamente zerados. Recusa final já validada pelo checkout também permite encerrar a tentativa.
- Aprovação, valor parcial, transações múltiplas, dados faltantes, divergência, indisponibilidade ou persistência inconclusiva mantêm a edição/nova cobrança bloqueadas. A tela explica como consultar e repetir a confirmação.
- O pedido original, seus itens, valores, identificador MP e metadados de webhook permanecem no Redis. `saida` registra motivo, datas e confirmação sem inventar um status de pagamento.
- Só após confirmação persistida o navegador limpa referência ativa, preparação e cotação antigas. Guarda apenas o ID do pedido encerrado localmente. Não limpa os produtos do carrinho. A próxima compra requer seleção de modelos/quantidades e cotação nova, preparação nova e outra chave idempotente. O pedido encerrado recusa `pagar` e `recuperarPix` mesmo se for reaberto por uma aba antiga.

## Validação e limites

Testes automatizados usam somente fetch/Redis/Mercado Pago simulados. Nenhuma chamada financeira é feita ao provedor durante esses testes. A validação de integração com uma cobrança fictícia existente depende de autorização específica posterior; não criar outro Pix antes disso.

Os bloqueios são por pedido, autenticado pelo recibo do navegador. O checkout não possui conta de comprador nem impede uma pessoa de iniciar uma compra independente em outro navegador. O recibo local continua sujeito ao prazo existente de 24 horas; o pedido de teste no Redis mantém a política existente de 30 dias. Não se deve interpretar uma busca vazia ou expiração local como cancelamento no Mercado Pago.

### Pix comprovadamente expirado no sandbox

No retorno observado em 23/10/2026, a order cancelada por expiração ainda informa `total_paid_amount` igual ao total nominal, mas omite `paid_amount` na transação Pix. A exceção de teste aceita esse formato somente após consulta autenticada: order `canceled/expired` ou `failed/expired`, uma única transação Pix `expired/expired`, vendedor explícito correto, valor da transação idêntico ao pedido, agregado igual a zero ou ao total nominal, e valor pago da transação ausente ou explicitamente zero. Campos ausentes não são convertidos em zero. Os valores originais são preservados no histórico.

`pixExpiradoConfirmado` registra essa conferência. A ação pode encerrar a tentativa e liberar o carrinho sem enviar cancelamento a uma cobrança já expirada. A exceção não é aplicada em produção. Um total agregado nominal nunca basta para liberar pendência ou estado incerto.

Aprovação/processamento detectado ou valor Pix recebido na transação ficam registrados de modo persistente em `impedimentoEncerramento`, inclusive quando uma resposta posterior diverge. Esses casos, valores parciais, erros do provedor, identidades divergentes, transações múltiplas e estados terminais inconsistentes não liberam a edição.

Documentação de estados: https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-management/status/order-status e https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-management/status/transaction-status

Referência oficial: https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-api/cancel-order/post
