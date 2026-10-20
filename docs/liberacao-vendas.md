# Liberação de vendas — 20/10/2026

Estado atual de preparação. Este documento não autoriza publicar em main/Production nem processar cobrança real. Os históricos anteriores permanecem preservados.

## Evidências dos provedores e do telefone

| Fluxo | Pedido local | Resultado |
| --- | --- | --- |
| Pix | `23c31e00209d60836910aae06b252bcc` | Retomada no mesmo navegador, QR/copia e cola; `processed/accredited`, R$ 49,40; webhook autenticado às 11:14:15. |
| Cartão aprovado | `42c83074b5d54ae81522e86364eb6ebc` | `master/processed/accredited`, R$ 49,40; webhook autenticado às 15:47:39; mesmo pedido após reload. |
| Cartão recusado | `5d3924dc83613db2b57340ac17937452` | `master/failed/rejected_by_issuer`, R$ 34,50; HTTP 402 da tentativa; webhook autenticado às 16:08:19; retorno ao formulário confirmado pelo usuário. |

As duas orders de cartão foram consultadas novamente às 16:14:45. Horários de webhook são registros persistidos após verificar assinatura e consultar a API; não são inferidos do reload. Não foi obtido nesta rodada o HTTP das entregas desses webhooks. Nenhuma cobrança foi reenviada para obter essas evidências.

O erro silencioso de abertura do cartão foi corrigido; o usuário alinhou a Public Key à aplicação vendedora de teste `2764236022861400`. `MERCADO_PAGO_PUBLIC_KEY_TEST` tem entradas separadas: Secret em Preview e valor anterior preservado em Production. O SDK real abriu após o redeploy exclusivo de Preview. Nenhum valor de chave integra esta documentação.

## Preparação adicional no código

- Redis de produção precisa usar HTTPS, origem e token diferentes das conexões de teste conhecidas. Preview não pode acessá-lo, nem para criar o bloqueio inicial. Não há migração, limpeza ou expiração automática dos pedidos de produção.
- Suporte inicial ao desafio 3DS da Orders API: opt-in no servidor, iframe com URL HTTPS da origem/caminho oficial brasileiro e consulta da mesma order após autenticação. Origem e janela da mensagem são verificadas. `COMPLETE` nunca aprova sozinho. URL com capacidade de autenticação não vai ao painel administrativo nem aos logs.
- `CHECKOUT_3DS_ATIVO` é Config, valor textual `true`, ausente/desativado por padrão. Testar na Preview antes de habilitar em produção. Novos cartões em produção são bloqueados sem esse opt-in; débito de produção continua bloqueado até avaliação própria.
- Consulta administrativa de cartão não exibe diagnóstico de payload Pix, que não se aplica a cartão.

## Variáveis, finalidade e escopos

| Nome | Finalidade | Escopo nesta etapa |
| --- | --- | --- |
| `CHECKOUT_AMBIENTE` | Selecionar teste | Preview: manter `teste` |
| `CHECKOUT_TESTE_ATIVO` | Simulações | Preview: configuração existente |
| `CHECKOUT_PRODUCAO_ATIVO` | Novas cobranças reais | Manter desativado |
| `CHECKOUT_3DS_ATIVO` | Solicitar 3DS no crédito | Config `true`, criado somente em Preview nesta rodada; padrão do código desativado |
| `MERCADO_PAGO_PUBLIC_KEY_TEST` | Campos seguros/tokenização | Preview próprio; anterior Production preservado |
| `MERCADO_PAGO_ACCESS_TOKEN_TEST` | API de orders simuladas | Configuração existente do checkout/receptor |
| `MERCADO_PAGO_WEBHOOK_SECRET_TEST` | HMAC de teste | Preview dos dois projetos |
| `HEEEPH_PEDIDOS_ADMIN_TOKEN` | Painel | Preview com chave exclusiva; Production com outra |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Redis de teste do checkout | Conexão existente; preservar dados |
| `RECEPTOR_KV_REST_API_URL`, `RECEPTOR_KV_REST_API_TOKEN` | Redis de teste do receptor | Preview do receptor |
| `FRETE_ATIVO`, `MELHOR_ENVIO_AMBIENTE`, `MELHOR_ENVIO_TOKEN`, `MELHOR_ENVIO_USER_AGENT` | Cotação | Configuração existente; não comprar etiquetas |
| `UPSTASH_REDIS_REST_URL_PROD`, `UPSTASH_REDIS_REST_TOKEN_PROD` | Banco dedicado futuro | Somente Production após autorização |
| `MERCADO_PAGO_PUBLIC_KEY_PROD`, `MERCADO_PAGO_ACCESS_TOKEN_PROD`, `MERCADO_PAGO_WEBHOOK_SECRET_PROD`, `MERCADO_PAGO_VENDEDOR_ID_PROD` | Conta real futura | Somente Production após autorização |

Tokens, assinaturas e chave administrativa devem ser Secret e nunca enviados no chat. A Public Key é pública no protocolo do SDK; marcá-la Secret na Vercel não impede seu envio necessário ao formulário do comprador.

## Pendências externas e critérios de liberação

1. **3DS:** aprovação e recusa com desafio real de teste e webhook foram comprovadas no navegador integrado; aprovação também no telefone físico, conforme evidências abaixo. Ainda faltam recarga durante o desafio e expiração completa. A lista aceita apenas `www.mercadopago.com.br` no caminho de autenticação; investigar outro destino antes de ampliar.
2. **Antifraude:** conferir coleta de dispositivo e qualidade da integração da aplicação real. O iframe 3DS não comprova essa etapa nem a configuração comercial da conta.
3. **Redis:** definir região/plano, retenção, backups e restauração em banco separado. Sem TTL não significa backup. Não criar recurso pago ou migrar registros sem decisão explícita.
4. **Mercado Pago real:** confirmar vendedor/aplicação, pares de credenciais, Pix/cartão, parcelamento e evento Order em `https://heeeph.com.br/api/mercado-pago-webhook`; validar assinatura, API e persistência. Preservar proteção geral e receptor de teste.
5. **Operação:** revisar políticas comerciais, contato, documentos fiscais, reembolsos/contestações e postagem. Etiquetas e rastreamento automático não implementados; entrega com etapas manuais.
6. **Autorização final:** revisar resultado antes de publicar e de qualquer validação com cobrança real. Main/Production continuam fora desta rodada.

Permanece pendente confirmar no telefone a nova mensagem “Código copiado”. O comportamento foi testado localmente.

## Verificação técnica

### Evidência integrada de 3DS após a publicação

A Preview `a1e1ec2` apresentou o iframe real de teste do Mercado Pago para `APRO-CHOK`. Pedido `ff41cae3d9a0b9918a6c05ee580eb01c`, R$ 59,91, order `ORDTST01M5DCJER4774XCWJ38KAKBGHE`. A confirmação ilustrativa disparou consulta; a resposta inicial ainda estava pendente e não foi tratada como aprovada. Em seguida, o registro recebeu `processed/accredited`, com webhook autenticado às **16:29:14**; a página confirmou aprovação na consulta das 16:29:32. O iframe foi removido após aprovação. Não houve SMS real, código de conta ou cobrança real.

Essa evidência resolve a aprovação com desafio no navegador integrado. Expiração de 40 minutos, desafio em telefone físico e coleta de dispositivo/qualidade da aplicação continuam separados e não são inferidos dessa aprovação.

**Validação posterior no telefone físico:** o usuário concluiu o desafio de teste no pedido `797a8963df8d52e637ca03212f5ad925`, R$ 34,50. A tela inicialmente permaneceu pendente, com o iframe vazio após a conclusão; a consulta manual às 18:31:53 confirmou aprovação no mesmo pedido. O painel carregado posteriormente confirmou `master/processed/accredited`, order `ORDTST01M5DKAC5EQGR2ACPB5BVSYGTC`, e webhook autenticado `processed` às **18:27:03**, anterior à consulta manual. Assim, apresentação/conclusão do desafio, aprovação e recebimento assinado estão comprovados também no aparelho. Não foi criado nem reenviado pagamento para conferir esses registros. A atualização imediata para estado final não é garantida: consultar o mesmo pagamento após concluir o desafio. Expiração completa e antifraude/qualidade da aplicação continuam pendentes.

O cenário `OTHE-CHNO` foi executado em outro pedido: `3694d1624eb765327b9902a4a6328f2f`, order `ORDTST01M5DCQAR68SQT5SZ3CJFQY8F7`, R$ 59,91. O desafio foi apresentado e concluído; a API confirmou `failed/failed`, transação `3ds_challenge_failed`, com webhook autenticado às **16:31:28**. A primeira coleta de dados do SDK falhou antes do envio; a repetição dessa coleta produziu a única order dessa tentativa, sem reenviar pagamento existente.

Identificada e corrigida a transição de recusa 3DS para revisão: a API pode devolver montantes nominais em campos de pagamento em recusas finais. A liberação exige recusa nos dois níveis, uma única transação, montante exato e valores zero ou nominais exatos, limitados aos detalhes de recusa final conhecidos. Pendências, valor parcial/divergente e estado de repetição continuam bloqueados. A aprovação nunca é inferida de montantes nominais.

80 testes direcionados passaram: `checkout`, `pagamento`, `pedidos`, `pedidos-tela` e `webhook-teste`. Cobrem isolamento Redis, 3DS pendente, URLs inválidas, mensagem forjada, consulta sem nova cobrança e ocultação da URL no painel. São simulações, separadas das evidências integradas acima.

Fontes: [Orders e 3DS](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-management/integrate-3ds), [cartões de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/integration-test/cards), [backup Upstash](https://upstash.com/docs/redis/features/backup).

Preview: https://heeeph-git-codex-preparacao-vendas-nardsssbh-9766s-projects.vercel.app/
