# Checkout HEEEPH — somente testes

Atualização de 13/10/2026. Checkout Transparente via Orders API, cartão pelo Card Payment Brick e Pix por QR/copia e cola. NÃO habilita vendas reais. Verifica o vendedor autenticado pela API /users/me e exige a tag test_user. Se essa verificação falhar, o pagamento fica bloqueado. Credenciais Orders de teste também podem começar com APP_USR; não usar o prefixo como prova do ambiente.

## Instalação
Copie os arquivos desta atualização para a raiz do repositório Heeeph, mantendo as pastas. Commit e push pelo GitHub Desktop; Vercel publica automaticamente. Não copiar tokens para arquivos do repositório.

## Variáveis Production da Vercel
O nome Production aqui é o ambiente de hospedagem. O código só usa contas e credenciais de pagamento de TESTE.

- MERCADO_PAGO_ACCESS_TOKEN_TEST: Access Token da aba Teste, tipo Secret.
- MERCADO_PAGO_PUBLIC_KEY_TEST: Public Key da aba Teste, tipo Config.
- CHECKOUT_TESTE_ATIVO: true, Config. Padrão ausente mantém processamento bloqueado.
- UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN: banco Redis conectado ao projeto pelo Marketplace da Vercel. Aceita também KV_REST_API_URL e KV_REST_API_TOKEN. Token sempre Secret. Nunca usar token read-only.
- MERCADO_PAGO_WEBHOOK_SECRET_TEST: assinatura da notificação configurada para o vendedor de teste, Secret.
- HEEEPH_PEDIDOS_ADMIN_TOKEN: chave aleatória de pelo menos 32 caracteres, Secret, para entrar em /pedidos.html. Gerar com um gerenciador de senhas; não usar a senha da conta Mercado Pago.
- Manter as quatro variáveis do frete já configuradas.

Banco deve estar conectado antes dos testes. Sem banco não existe cobrança. Avaliar plano/custos do provedor antes de contratá-lo; não provisionado por esta atualização.

## Webhook
URL: https://heeeph.com.br/api/mercado-pago-webhook
Evento: Order (Mercado Pago). Configurar na conta de vendedor de teste conforme o painel/documentação de Orders; não confundir com a conta real. Guardar a assinatura gerada no Secret acima e redeploy. Valida HMAC do data.id da query e x-request-id; depois consulta a order na API, confere vendedor, referência e valor. Não usa status do corpo da notificação como prova de pagamento.

## Fluxo
1. Carrinho escolhe entrega e envia apenas IDs, tamanhos e quantidades à página de pagamento.
2. Coleta dados de entrega e aceite de termos. Não grava endereço/CPF no navegador. No sessionStorage ficam apenas carrinho e acesso aleatório ao pedido.
3. Servidor valida catálogo e preços G/P; consulta Melhor Envio e exige confirmação se tarifa mudou.
4. Guarda pedido no Redis antes de pagar. Testes retidos por 30 dias; não serve como arquivo fiscal permanente.
5. Consulta tarifa novamente antes da primeira tentativa. Se mudou, exige voltar ao carrinho; não altera valor cobrado silenciosamente.
6. Cria Orders com chave de idempotência fixa por pedido e impressão digital da tentativa. Token de cartão não é persistido nem registrado em logs.
7. Status consultado pelo servidor; aprovação requer processed/accredited, valor integral, vendedor de teste e referência corretos.
8. Webhook atualiza o pedido sem depender de o comprador continuar no site. /pedidos.html lista os últimos 50 registros de teste, protegido por chave do administrador.

Não comprar etiquetas nem enviar placas destes pedidos. O cálculo Melhor Envio continua real, mas o pagamento é simulado.

## Verificação
- 1P, 2G+4P e pedido com vários volumes: conferir resumo, total e endereço.
- Usar comprador e cartões de teste fornecidos pelo Mercado Pago. Não usar cartão pessoal.
- Testar Pix pendente e aprovado, cartão aprovado e recusado, alteração de tarifa, refresh após tentativa, notificação assinada e acesso não autorizado ao painel.
- Confirmar no banco que pedido inclui itens, endereço, aceite, pacotes, frete, ID e status de pagamento.

## Antes de produção (ainda não implementado/liberado)
Integração real requer revisão separada: credenciais reais e modo de produção, proteção por 3DS quando exigida, antifraude/device ID, validação dos dados completos e CPF, limites de requisições, retenção e acesso de dados adequados, atualização de políticas de privacidade, envio de confirmação por e-mail, acompanhamento/rastreio, prazos de produção, reembolso e gestão de contestações. Completar catálogo com IDs únicos; os IDs ambíguos existentes são recusados. Rotina de documentos fiscais e comprovantes de entrega continua necessária. Não há garantia automática da Proteção ao Vendedor.

## Evidência local
23 testes automatizados passaram na preparação. Nenhum teste contra credenciais do usuário foi executado aqui. Validação visual e pagamentos reais/simulados no ambiente publicado ainda dependem da instalação e configurações acima.

Referências oficiais consultadas:
https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/websites/cards
https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/websites/pix
https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications
https://vercel.com/docs/marketplace-storage
https://upstash.com/docs/redis/features/restapi
