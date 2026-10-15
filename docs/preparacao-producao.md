# Preparação para vendas — 15/10/2026

Código preparado em `codex/preparacao-vendas`, a partir de `fef09e5`. Sem push, deploy, acesso às credenciais ou cobrança real. Esta revisão substitui as orientações antigas de copiar ZIP e publicar diretamente na main. Não executar essas instruções antigas durante a revisão.

## Resultado da auditoria

O painel existente já tinha produtos destacados, número do pedido, quatro etapas de entrega independentes do pagamento, exclusão lógica com confirmação e consulta no próprio cartão. O teste ainda procurava “Atualizar pagamento”; agora verifica “Consultar Pagamento”, progresso, aprovação, pendência, recusa, erro e informação. CSS claro do Brick e das parcelas preservado. O layout e as imagens não foram redesenhados.

Correções implementadas:

- Configuração central com modo explícito, credenciais, prefixos e retenções separados. Padrão: teste. Produção permanece desativada por padrão e é recusada em Preview.
- Preparação idempotente: chave aleatória de 256 bits criada e guardada antes do POST, identidade estável do pedido e recuperação após perda da resposta. A mesma chave não aceita outro conteúdo. O token de consulta não vai na URL nem no índice do painel.
- Bloqueio Redis por pedido para pagamentos, recuperação, consultas, webhook e alterações de gestão. Um processo concorrente recebe 409. Lease de 180 segundos, superior ao máximo configurado de 60 segundos da função; liberação exige o mesmo proprietário.
- Mantidas a chave de idempotência do Mercado Pago e a impressão do payload. Timeout e resultado incerto não liberam nova tentativa. Recuperação Pix reutiliza chave e payload e só reenvia dentro da sessão de 30 minutos; depois exige consulta/conferência. Nenhum token de cartão é persistido.
- Preços, itens, orientação/tamanho, quantidades, volumes e nova cotação de frete continuam no servidor. Produção também valida dígitos do CPF e recusa e-mail de comprador de teste. Aprovação exige referência, vendedor autenticado, país, ID da order, total e estado compatíveis; em produção exige também valor e valor pago da transação com centavos válidos.
- Webhook usa o segredo do ambiente, valida HMAC do ID recebido na query e consulta a Orders API. O corpo da notificação não aprova pedidos. Reconsulta sob bloqueio, recusa associação com outra order e não cria cobranças ao repetir evento.
- Recuperação no navegador independe do carrinho salvo. Preparação interrompida é retomada antes de aceitar outro pedido. O número aparece também no resumo antes de pagar. As mensagens distinguem teste/produção.
- Painel devolve apenas campos explicitamente permitidos. Segredos, hashes de acesso e metadados de idempotência não são retornados. Chave administrativa continua só em memória. Respostas e páginas sensíveis sem cache; adicionados cabeçalhos contra MIME sniffing, enquadramento e vazamento de referência. `.env*` e `.vercel` ignorados pelo Git.

## Configurações externas ainda necessárias

Nenhuma configuração da conta Mercado Pago, Vercel, Redis ou Melhor Envio foi inspecionada ou alterada. Os itens abaixo precisam ser conferidos nos painéis dos provedores, sem enviar credenciais pelo chat.

### Mercado Pago

1. Conferir aplicação e conta do vendedor real, habilitação para Checkout Transparente via Orders, Pix e cartões, cadastro, condições comerciais e parcelamento. Public Key e Access Token devem pertencer à mesma aplicação. Conferir `/users/me` e registrar o ID esperado em `MERCADO_PAGO_VENDEDOR_ID_PROD`; o prefixo `APP_USR` não comprova ambiente.
2. Cadastrar a URL HTTPS `https://heeeph.com.br/api/mercado-pago-webhook` para notificações de **Order** na aplicação real e guardar seu segredo em `MERCADO_PAGO_WEBHOOK_SECRET_PROD`. Na aplicação de teste usar uma URL do deploy de testes com o segredo `_TEST`. Um deploy atende somente ao ambiente configurado; não apontar notificações antigas de teste para produção.
3. Validar entregas assinadas, reenvios, mudança de estado e comparação entre order, pedido local e valor. Monitorar falhas; o endpoint só confirma após persistir. Em timeout/erro responde com falha para permitir reenvio. O provedor espera confirmação em 22 segundos; se o ambiente não completar nesse prazo sob carga, implementar fila durável antes da liberação, sem responder 200 antes da persistência.
4. Antes de liberar cartões reais, concluir a avaliação da qualidade da integração, coleta de dispositivo/antifraude e exigência de 3DS para esta aplicação. **Esta revisão não implementa apresentação de desafio 3DS.** Se exigido, integrar e testar esse fluxo antes da liberação; `action_required` nunca é tratado como aprovado. Reembolso, cancelamento e contestação são operados no painel Mercado Pago, sem automação neste site.

### Vercel

Usar Node 22 ou superior. Manter a main sem alteração até aprovação. Testar esta branch em Preview só com conta de teste e banco de testes. A origem `https://VERCEL_URL` é aceita apenas no ambiente Preview. Não expor Preview com segredos reais. A publicação de produção continua dependendo da autorização do responsável.

| Variável | Teste / Preview | Produção futura |
| --- | --- | --- |
| `CHECKOUT_AMBIENTE` | `teste` (padrão) | `producao` |
| `CHECKOUT_TESTE_ATIVO` | `true` para testes | `false` |
| `CHECKOUT_PRODUCAO_ATIVO` | ausente ou `false` | **manter `false` até autorização e validações** |
| `MERCADO_PAGO_ACCESS_TOKEN_TEST` / `MERCADO_PAGO_PUBLIC_KEY_TEST` | aplicação do vendedor de teste | não utilizados no modo produção |
| `MERCADO_PAGO_ACCESS_TOKEN_PROD` / `MERCADO_PAGO_PUBLIC_KEY_PROD` | ausentes | aplicação real; token Secret |
| `MERCADO_PAGO_VENDEDOR_ID_PROD` | ausente | ID numérico conferido da conta real |
| `MERCADO_PAGO_WEBHOOK_SECRET_TEST` | segredo do webhook de testes | não utilizado no modo produção |
| `MERCADO_PAGO_WEBHOOK_SECRET_PROD` | ausente | segredo do webhook real, Secret |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | banco de testes; aceita aliases `KV_REST_API_URL` / `KV_REST_API_TOKEN` | sem fallback no modo produção |
| `UPSTASH_REDIS_REST_URL_PROD` / `UPSTASH_REDIS_REST_TOKEN_PROD` | ausentes | banco durável dedicado; token Secret com escrita e EVAL |
| `HEEEPH_PEDIDOS_ADMIN_TOKEN` | chave aleatória exclusiva de pelo menos 32 caracteres | outra chave aleatória, Secret, em gerenciador de senhas |
| `FRETE_ATIVO` | `true` após conferir os dados | `true` após conferir os dados |
| `MELHOR_ENVIO_AMBIENTE` | `producao` para completar o checkout atual | `producao` |
| `MELHOR_ENVIO_TOKEN` | segredo só no servidor | token da conta/ambiente de cotação |
| `MELHOR_ENVIO_USER_AGENT` | identificação da aplicação e e-mail de contato | identificação da aplicação e e-mail de contato |

`VERCEL_ENV` e `VERCEL_URL` são variáveis de sistema da Vercel, não flags para falsificar manualmente. Produção exige `VERCEL_ENV=production`, vendedor real esperado, webhook e banco próprios, além da liberação explícita. Apenas trocar chaves não ativa produção.

Configurar proteção dos deployments de Preview, acesso dos administradores, logs e alertas de erros/latência. Configurar regras de limitação de requisições no Firewall/WAF para `/api/checkout`, `/api/pedidos` e `/api/frete`; calibrar sem bloquear consultas legítimas e testes. O código não inclui um limitador geral por IP. Não aplicar desafio de navegador nem autenticação de Preview ao webhook externo; usar endpoint de teste especificamente acessível ao Mercado Pago e protegido por assinatura. Não registrar Authorization, corpo de pagamento, CPF, endereço ou chaves de preparação nos logs.

### Armazenamento durável / Upstash

- Teste: prefixo `heeeph:teste:`; registros e tentativas expiram em 30 dias após a última gravação. Pedidos antigos sem campo de ambiente são reconhecidos apenas como teste.
- Produção: prefixo `heeeph:producao:`; pedidos, gestão, exclusão lógica e tentativas **sem TTL automático**. Somente os bloqueios temporários expiram. Não copiar registros de teste para produção.
- Provisionar banco dedicado com persistência, capacidade e política que não expulse registros de pedidos; configurar backup e testar restauração isolada. A remoção do TTL no código não garante backup nem disponibilidade do provedor.
- Definir com os responsáveis a política de retenção, minimização/anonimização de dados e acesso. Não apagar travas de tentativas incertas nem referências de pagamento durante a operação; isso compromete a proteção contra duplicação. Sem política aprovada, não habilitar vendas.
- Não restaurar snapshot antigo sobre banco com vendas ativas: pode perder IDs/tentativas posteriores ao backup. Suspender checkout, reconciliar pedidos e payments no Mercado Pago antes de reabrir. Manter alertas para capacidade, falhas de Redis e pagamentos não reconciliados.

### Melhor Envio

1. Conferir autorização/token e identificação `User-Agent` da conta real para cotação. Token de sandbox não serve no host de produção. O checkout continua exigindo cotação comercial; sandbox está disponível somente para o cálculo isolado em Preview.
2. Confirmar CEP do remetente em `config/frete.json`, endereço completo, medidas, pesos e combinações de volumes em `js/embalagens.js`, inclusive margem estimada de etiqueta/fita e a combinação 2G+4P. Comparar preço e aceitação dos volumes com a conta/transportadoras para os CEPs atendidos.
3. Definir prazo de preparação somado ao prazo de transporte e capacidade de postagem, seguro, declaração de conteúdo/documentação fiscal e rotina operacional do remetente.
4. **Compra de etiqueta e rastreamento automático não estão implementados.** Comprar e acompanhar pelo painel do Melhor Envio e atualizar manualmente Recebido → Em Preparação → Saiu para entrega → Entregue. Se for desejada automação, ainda exige implementação própria e permissões correspondentes.

## Validação antes de liberar

Rodar `node --test tests/*.test.js` e `git diff --check`. Resultado desta revisão: 50 testes passaram com APIs simuladas (antes: 36/37). Conferido no navegador local com pedido fictício: produtos destacados, etapa salva no topo e retorno verde ao consultar. A prévia não usou APIs ou chaves reais. O Card Payment Brick hospedado, parcelas em diferentes dispositivos, contas externas, Redis real e deploy Vercel ainda precisam de validação integrada.

Em Preview, usando contas de teste: cartão aprovado/recusado, Pix pendente/aprovado/expirado, recarregar após preparar e após pagar, resposta perdida, dois cliques/abas, alteração de frete, webhook válido/inválido/repetido, acesso ao painel sem chave/com chave, quatro etapas e exclusão. Conferir valores diretamente no Mercado Pago e registros no Redis. Nunca limpar manualmente uma tentativa para “tentar de novo”.

O navegador mantém recuperação em `sessionStorage` da mesma aba. Fechar a aba, apagar o armazenamento ou mudar de dispositivo exige atendimento com o número do pedido; não foi implementada conta do comprador, link permanente de recuperação nem e-mail de confirmação. Pedidos de cartão recusados com order existente não são reabertos automaticamente; conferir no Mercado Pago antes de orientar nova compra.

Somente depois de resolver as pendências e obter autorização: configurar produção, publicar a branch aprovada e realizar uma validação controlada da integração real com autorização específica de cobrança. Conferir também rotina de atendimento, reembolsos, contestações, documentos fiscais e políticas comerciais. Para interromper novas cobranças, desativar `CHECKOUT_PRODUCAO_ATIVO` e fazer novo deploy; manter o banco e as tentativas. Consultas e webhooks continuam reconciliando pagamentos existentes com as mesmas credenciais. Ela não cancela cobranças já iniciadas.

## Documentação oficial consultada em 15/10/2026

- [Orders / criação e idempotência](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-api/create-order/post)
- [Notificações de orders e confirmação pela API](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications)
- [Validador oficial de assinatura Node](https://github.com/mercadopago/sdk-nodejs/blob/master/src/utils/webhook/index.ts)
- [Subir em produção](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/go-to-production)
- [Upstash REST](https://upstash.com/docs/redis/features/restapi) e [backup/restauração](https://upstash.com/docs/redis/features/backup)
- [Cotação Melhor Envio](https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos)
