# Webhook de teste — Preview

Endpoint: `POST /api/mercado-pago-webhook`. A Orders API envia o evento **Order (Mercado Pago)**, com `type=order` e `data.id=ORD...` na query. Não selecionar Payment da API legada nem QR presencial.

A validação usa HMAC SHA-256 sobre `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, com o segredo da aplicação. Não converter o ID da order para minúsculas. Depois de validar a assinatura, consultar a mesma order na API e conferir vendedor, referência e valores. O corpo da notificação não confirma aprovação. Repetir a notificação não cria cobrança.

## Configuração privada

1. Na aplicação do **vendedor de teste** que fornece as credenciais `_TEST`, entrar em Mercado Pago → Suas integrações → Webhooks → Configurar notificações. Escolher **Order (Mercado Pago)** e cadastrar a URL HTTPS do Preview com o caminho acima. A documentação atual mostra a aba Modo de produção; nesse caso a aplicação/conta deve continuar sendo a do vendedor de teste. Não modificar a aplicação de vendas reais.
2. Salvar a configuração para gerar a chave secreta de assinatura. Não usar Access Token nem o valor de um header `x-signature` como segredo.
3. Em Vercel → heeeph → Settings → Environment Variables, cadastrar `MERCADO_PAGO_WEBHOOK_SECRET_TEST` como Sensitive/Secret, **somente em Preview**, para `codex/preparacao-vendas` se for restringir à branch. Colar o segredo diretamente do Mercado Pago no painel Vercel, sem chat ou arquivo no repositório. Depois fazer redeploy somente da branch de testes.

## Proteção do Preview

Requisições externas sem credencial retornaram `401` com `Protected deployment`, antes da função. O Mercado Pago não faz login na Vercel. Não desativar Vercel Authentication, não criar exceção pública de domínio e não usar OPTIONS Allowlist para um webhook POST.

Para este teste, usar um **Shareable Link temporário do Preview/branch** e preservar seu parâmetro privado de bypass na URL cadastrada no Mercado Pago. O acesso é restrito ao Preview abrangido pelo link, mas o portador do token pode acessar esse Preview inteiro; ele não é um segredo exclusivo do caminho do webhook. Não exibir a URL completa com o token em chat, logs ou documentação. Revogar o link ao terminar o teste e renovar a URL se ele expirar. Requests sem o token continuam protegidos; Production não é liberada.

Protection Bypass for Automation do projeto é mais amplo: o segredo atende todos os deployments do projeto. Não gerar esse segredo compartilhado como atalho neste fluxo. Caso o Shareable Link não funcione para o POST, reportar o bloqueio e preparar um receptor de testes separado, sem tornar o site inteiro público.

## Validação sem cobrança

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
