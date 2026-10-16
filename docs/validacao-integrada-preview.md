# Validação integrada — 16/10/2026

Somente a branch `codex/preparacao-vendas`, ambiente de teste. Main, Production e dados anteriores preservados. Nenhuma credencial regenerada nesta rodada. Testes locais não substituem as evidências dos provedores abaixo.

## Evidências confirmadas

| Caso | Evidência integrada |
| --- | --- |
| Webhook de recusa | Pedido `9cb559b6f5579bb6a9d0d03f10c0a9c0`, order `ORDTST01M523EW53YJSRMZNG57QBJP0H`: simulador do Mercado Pago entregou HTTP 200; assinatura e persistência confirmadas no Redis em `2026-10-16T13:33:22.725Z`; permaneceu `failed`, apesar do corpo simulado anunciar aprovação. |
| Webhook de aprovação existente | Pedido `558cdfff7d3b407abe8b848fe14211ae`, order `ORDTST01M524ME02R2ESXG6HJWPBKE1V`: somente uma notificação foi enviada pelo simulador, HTTP 200; Redis confirmou `aprovado=true`, `processed` e `webhookRecebido.assinaturaValidada=true` em `2026-10-16T13:46:15.035Z`. Não houve novo pagamento. |
| Frete | Consulta no Preview ao Melhor Envio retornou JeT Standard R$ 9,60 para CEP de teste 01001-000; produto R$ 24,90, total R$ 34,50, pacote 180 g, 30 × 25 × 1 cm. Preparação no servidor persistiu pedido `d2788967740fed060cb1d4c0c4cfcb12`. Não comprou etiqueta. |
| Diagnóstico Pix | Nova tentativa autorizada em teste recebeu HTTP 400 `property_value`, request MP `44ae7b6f-a9d6-4927-9ac6-92a09db691ab`. Sem ID de order criada; pedido preservado. Investigação em andamento; não contar como Pix aprovado. |
| Pix com complemento em branco | Causa confirmada no pedido `09a991c9d10416d37db7f9f81ed7a345`: HTTP 400 `property_value` nos campos `shipment.address.complement` e `payer.address.complement`, request `204a847e-999e-49b9-8d3e-61c4219db0cc`. Corrigido o payload para omitir somente o complemento vazio, sem alterar o cadastro. |
| Pix corrigido e persistência | O mesmo pedido preparado gerou uma única order `ORDTST01M52GMMYRJ01VFEGWDFKPAVW2`, `action_required`. Redis confirmou código e imagem presentes, subtotal 2490, frete 960 e total 3450 centavos. QR visível e copia e cola conferido contra a área de transferência, com igualdade confirmada. Nenhuma leitura exibiu credencial. |
| Recuperação após reload | Na mesma sessão e endereço estável da branch, recarregar recuperou o mesmo pedido `09a991c9d10416d37db7f9f81ed7a345`, agora aprovado pela consulta, e ocultou corretamente as instruções Pix. Não foi reenviado pagamento. Antes do reload, a consulta independente ao Redis ainda não mostrava evidência de webhook automático. |
| Cartão recusado | Pedido `6c3ebbed13c298efadca749650e06d8f`, order `ORDTST01M52HNMCBZ2JPRRPCA4T30J4Z`, cartão fictício oficial Mastercard e titular OTHE: HTTP 402 de criação preservou a order; consulta confirmou `failed` / `rejected_by_issuer`. Request MP `e77d71c0-05d2-42a5-9587-6b22b37f64ae`. A recusa reapareceu após reload. |
| Revisão da recusa | O provedor devolveu 3450 centavos nos campos total pago, transação paga e valor nominal mesmo com recusa final. Corrigida a classificação: uma única transação, recusa final do emissor nos dois níveis, principal exato e nenhum montante parcial. A mesma order, consultada novamente, liberou o botão “Revisar dados e trocar forma de pagamento”. Pendência, captura, retry, múltiplas transações e valores parciais permanecem bloqueados. |
| Tokenização isolada | Com a mesma chave pública existente e apenas cartão fictício oficial, a API de tokenização retornou HTTP 201. Não houve pagamento e nenhum token foi exibido, armazenado no repositório ou usado para cobrar. Essa prova não substitui o teste pelo formulário. |
| Cartão aprovado após revisão | Pelo próprio Brick, titular fictício APRO e uma parcela: pedido `9d999d62c012ddf9799eb4e335ae3235`, order `ORDTST01M52K43WFFZCQB6PE4P9K3ZQB`. Redis confirmou `processed`, `accredited`, Mastercard, total e transação de 3450 centavos. Recarregar recuperou a mesma aprovação e o mesmo número. O pedido recusado anterior foi preservado. |
| Configuração da assinatura | Prova controlada gerada localmente com a chave visível do painel de teste, sem gravar ou mostrar seu valor: HTTP 200, assinatura válida e reconciliação do Pix existente às `2026-10-16T14:45:57.568Z`. Não foi uma entrega do provedor. O registro dessa prova foi identificado com origem `verificacao_configuracao_local`, preservando a retenção. Não contar esse registro como evidência automática. |

## Webhook automático: falha confirmada

O Mercado Pago registrou a entrega automática `order.processed` do Pix `ORDTST01M52GMMYRJ01VFEGWDFKPAVW2` em `2026-10-16T14:07:50Z`, com HTTP 401. O receptor confirmou `assinatura_invalida`, sem consultar a API ou alterar o pedido. Request Vercel inicial observado: `sgzlx-1792159672561-df8b75a302b6`.

Após trocar somente a URL de teste pelo alias estável do receptor, uma nova tentativa da mesma notificação chegou em `2026-10-16T14:26:18.134Z`: diagnóstico `assinatura_divergente`, com variante em minúsculas também divergente. O `data.id` e `x-request-id` estavam presentes; não atribuir essa ocorrência à ausência do request ID. Request Vercel `vhczt-1792160778058-2a79e3f8ceb8`. Nenhum hash, segredo ou header de assinatura foi registrado.

A order consultada e a notificação automática identificam a aplicação `2764236022861400`; o painel e o simulador usados até então identificam `935313633293399`. Ambos apontam ao vendedor de teste `3763192972`. A relação entre essas aplicações e a chave que assina a notificação automática precisa ser conferida no painel. Isso é evidência de divergência a investigar, não prova isolada de que uma credencial foi cadastrada errada. Não remover HMAC ou retornar sucesso sem validar.

O manifesto foi alinhado ao SDK oficial para omitir o par opcional `request-id` quando ausente; o ID da order e um HMAC válido continuam obrigatórios. Essa correção de conformidade não foi a causa identificada na entrega acima. O receptor tem diagnóstico por motivos sem retornar valores dos headers.

O simulador comprova entrega assinada e processamento da order consultada. Ainda é preciso distinguir essa prova de uma notificação automática emitida após uma nova mudança de estado.

O registro do Pix aprovado existente não contém código/imagem após as consultas posteriores. Isso, isoladamente, não comprova ausência desses dados na resposta inicial. A documentação oficial prevê QR copia e cola, imagem base64 vazia e aprovação automática posterior no teste APRO; a exibição do estado pendente precisa de evidência própria.

## Variáveis, finalidade e escopo (sem valores)

| Projeto | Nomes | Finalidade / escopo |
| --- | --- | --- |
| heeeph | `CHECKOUT_AMBIENTE`, `CHECKOUT_TESTE_ATIVO`, `CHECKOUT_PRODUCAO_ATIVO` | Entradas Preview mantêm somente o checkout de teste; cobranças reais bloqueadas. |
| heeeph | `MERCADO_PAGO_ACCESS_TOKEN_TEST`, `MERCADO_PAGO_PUBLIC_KEY_TEST` | Credenciais existentes do vendedor de teste; entradas existentes compartilhadas Production/Preview, sem alteração nesta rodada. |
| heeeph | `MERCADO_PAGO_WEBHOOK_SECRET_TEST` | Assinatura de teste, somente Preview. |
| heeeph | `HEEEPH_PEDIDOS_ADMIN_TOKEN` | Secrets distintos por ambiente, Preview separado de Production. |
| heeeph | `KV_REDIS_URL`, `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN` | Integração Redis existente, Production/Preview. Prefixo de registros de teste `heeeph:teste:`, expiração de 30 dias; não é política de produção. |
| heeeph | `FRETE_ATIVO`, `MELHOR_ENVIO_AMBIENTE`, `MELHOR_ENVIO_USER_AGENT`, `MELHOR_ENVIO_TOKEN` | Cotação existente Melhor Envio, Production/Preview. Provedor em produção somente para cotação; nenhuma etiqueta contratada. |
| heeeph-webhook-teste | `CHECKOUT_AMBIENTE`, `CHECKOUT_TESTE_ATIVO`, `CHECKOUT_PRODUCAO_ATIVO` | Somente Preview; receptor restrito a reconciliação de teste, sem criação de cobrança. |
| heeeph-webhook-teste | `MERCADO_PAGO_ACCESS_TOKEN_TEST`, `MERCADO_PAGO_PUBLIC_KEY_TEST`, `MERCADO_PAGO_WEBHOOK_SECRET_TEST` | Somente Preview; mesma conta de teste e assinatura cadastrada no Mercado Pago. |
| heeeph-webhook-teste | `RECEPTOR_KV_REST_API_URL`, `RECEPTOR_KV_REST_API_TOKEN`, `RECEPTOR_KV_REST_API_READ_ONLY_TOKEN`, `RECEPTOR_KV_URL`, `RECEPTOR_REDIS_URL` | Conexão gerenciada Redis, somente Preview. Runtime usa URL/token REST dessa conexão, sem fallback nas antigas cópias manuais `KV_*`. |

## Ainda em validação

- Pix: QR/copia e cola e recuperação após reload comprovados; assinatura da notificação automática ainda divergente.
- Cartão: aprovação, recusa, retorno para revisão e recuperação após reload comprovados com o provedor em teste. Parcelamento com juros, débito e autenticação 3DS não foram exercitados nesta rodada.
- Revisão final das correções, publicação Preview e conferência visual da versão final.

Correções adicionais: o alias estável da branch era bloqueado por CORS/origem no checkout. Agora é aceita somente a URL exata informada pela variável de sistema `VERCEL_BRANCH_URL`, exclusivamente em Preview. Testes rejeitam outros domínios e impedem reutilizar essa exceção em Production. O formulário também fica bloqueado enquanto a configuração inicial não termina, evitando preparar um pedido incompleto após erro de inicialização. O envio mostra retorno visível e abrir o cartão limpa a mensagem anterior de Pix.

Não liberar produção antes da revisão. Banco exclusivo, retenção durável, credenciais reais, webhook de produção e validação dos fluxos adicionais continuam sujeitos à preparação e autorização separadas. Compra de etiquetas e rastreamento automático não foram implementados; etapas de entrega são manuais.

## Verificação local e publicação

`node --test tests/*.test.js`: 77 testes passaram, nenhum falhou. Esses testes verificam contratos e bloqueios com simulações; as evidências integradas estão separadas acima. Revisão de segredos inclui fontes, testes, documentação e os scripts necessários do receptor. Scripts temporários `editar.cjs`, `rotulos.cjs` e `preview.cjs` permanecem fora do repositório/commit.

URL estável do checkout Preview: https://heeeph-git-codex-preparacao-vendas-nardsssbh-9766s-projects.vercel.app/pagamento.html . Para uma nova sessão, iniciar pela loja/carrinho e selecionar frete. O pedido da sessão atual pode ser recuperado nessa URL sem iniciar outro pagamento.

Produção permanece no commit `fef09e51f541e173191e05a23e7f5129a7365c2b`; nenhuma publicação em main ou habilitação de pagamentos reais nesta rodada.

## Configurações externas pendentes

- Mercado Pago: resolver a assinatura da entrega automática na aplicação efetivamente indicada nas orders de teste. Preservar HMAC; obter a chave correspondente diretamente no painel e cadastrar somente em Preview se uma diferença for confirmada. Repetir uma notificação existente e conferir HTTP 200 e persistência sem consulta manual do comprador. Não criar cobrança para essa prova.
- Vercel: manter a proteção geral do site e o receptor isolado; as credenciais atuais permitem os testes comprovados. As antigas cópias manuais Redis do receptor não são usadas pelo runtime. A revogação independente dos tokens antigos não foi repetida nesta rodada.
- Para futura produção: preparar banco exclusivo sem expiração automática de pedidos, retenção/backup e credenciais `UPSTASH_REDIS_REST_URL_PROD`, `UPSTASH_REDIS_REST_TOKEN_PROD`; credenciais e assinatura `MERCADO_PAGO_ACCESS_TOKEN_PROD`, `MERCADO_PAGO_PUBLIC_KEY_PROD`, `MERCADO_PAGO_WEBHOOK_SECRET_PROD`, vendedor `MERCADO_PAGO_VENDEDOR_ID_PROD` e endpoint de produção. Não cadastrar/ativar agora sem autorização.
- Melhor Envio: a cotação existente funcionou. Compra de etiqueta e rastreamento automático exigem implementação e validação próprias; não constam como prontas.

## Referências oficiais

- [Teste Pix Orders API](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/integration-test/pix)
- [Teste de cartões Orders API](https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/integration-test/cards)
- [Contrato de criação de order](https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-api/create-order/post)
