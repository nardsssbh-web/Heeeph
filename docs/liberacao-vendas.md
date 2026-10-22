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

1. **3DS:** aprovação e recusa com desafio real de teste e webhook foram comprovadas no navegador integrado; aprovação também no telefone físico, conforme evidências abaixo. Recarga durante desafio comprovada em 21/10/2026 no pedido `d063209eadb2c854ca96477292af269a`: mesmo pedido e desafio restaurados; aprovação posterior, sem nova cobrança. Ainda falta expiração completa. A lista aceita apenas `www.mercadopago.com.br` no caminho de autenticação; investigar outro destino antes de ampliar.
2. **Antifraude:** coleta e encaminhamento comprovados na Preview em 21/10/2026, conforme evidência abaixo. O coletor oficial `security.js` é carregado explicitamente antes do SDK, inclusive no fluxo Pix. `window.MP_DEVICE_SESSION_ID` segue transitoriamente no header `X-meli-session-id` somente no POST de criação da order. Valores ausentes/inválidos são omitidos, sem bloquear ou reenviar uma cobrança. O identificador não integra payload, fingerprint, Redis, recibo ou logs. Ainda falta conferir a qualidade/configuração da aplicação real; aprovação de teste não mede a eficácia do antifraude.
3. **Armazenamento sem custo adicional:** em 21/10/2026 o usuário escolheu manter a Vercel e preparar a destinação exclusiva do Redis gratuito à operação real após concluir as verificações. Migração para a Hostinger suspensa e proposta paga descartada. Exportação, cópia e recuperação local comprovadas; rotina de backup e importação nativa no provedor ainda não comprovadas. Encerrar acesso dos consumidores de teste, inclusive deployments antigos, antes de guardar dados reais. Histórico e limitações em [banco-producao.md](banco-producao.md). Sem TTL não significa backup.
4. **Mercado Pago real:** confirmar vendedor/aplicação, pares de credenciais, Pix/cartão, parcelamento e evento Order em `https://heeeph.com.br/api/mercado-pago-webhook`; validar assinatura, API e persistência. Preservar proteção geral e receptor de teste.
5. **Operação:** revisar políticas comerciais, contato, documentos fiscais, reembolsos/contestações e postagem. Etiquetas e rastreamento automático não implementados; entrega com etapas manuais.
6. **Autorização final:** revisar resultado antes de publicar e de qualquer validação com cobrança real. Main/Production continuam fora desta rodada.

Permanece pendente confirmar no telefone a nova mensagem “Código copiado”. O comportamento foi testado localmente.

### Transições finais na tela — 22/10/2026, somente local

Mensagens de status expirado, cancelado e recusado agora aparecem em português. Expiração ou cancelamento informado pela API preserva o número do pedido e orienta a conciliação com a loja; isso não libera uma nova cobrança. Dois testes adicionais verificam a transição de Pix pendente para expirado, removendo código/QR antigos, e de 3DS pendente para cancelado, removendo o iframe. Falha intermediária de consulta preserva o desafio e mantém nova cobrança bloqueada. As chamadas simuladas se limitam à consulta da mesma referência.

Os **39 testes da tela de pagamento passaram**, sem falhas. São respostas sintéticas, sem chamadas ao Mercado Pago ou Redis ativo. Não substituem a observação da expiração real no provedor nem a conferência visual no celular. Código permanece local na branch de preparação; nenhuma publicação nesta rodada.

## Verificação técnica

### Coleta e envio do dispositivo — 21/10/2026

Na Preview `1d73b9d`, o diagnóstico opcional `?diagnostico=dispositivo`, disponível somente em teste, confirmou a coleta sem exibir o identificador. O pedido fictício `7f1b076a7a93d9e4291d6983f043b36c`, R$ 59,91, gerou a única order `ORDTST01M5FFSRHN62929EE5NHFHW69F`. O cliente registrou apenas os booleanos `obtido:true` e `presente:true`. Às 12:03:12, o servidor registrou `MP_DISPOSITIVO_TESTE {"enviado":true,"http":201}` após resposta do provedor. O painel confirmou `Pix/processed/accredited` e webhook autenticado às 12:03:21; a consulta manual às 12:05:02 confirmou aprovação.

A tentativa anterior `b12f415b8ac9a9498292a5efadc64f8f` havia omitido o identificador ausente com segurança, sem reenviar a cobrança. Depois do ajuste do coletor e da validação, a coleta foi confirmada antes de criar a nova tentativa. São aceitos valores ASCII sem espaços ou controles, limitados a 512 caracteres. Nenhum identificador real foi exposto nas evidências.

115 testes locais passaram após o ajuste, incluindo o teste do servidor Hostinger ainda não versionado; isso não significa publicação desse servidor. `git diff --check` e revisão de segredos passaram. Main e Production permanecem inalteradas. O ensaio completo de expiração de 3DS continua pendente.

Validação local adicional em 21/10/2026: três regressões cobrem sessão com 45 minutos e desafio ainda pendente, bloqueio de criação em sessão antiga sem pagamento e tela que mantém consulta sem liberar troca nem aprovação por passagem do tempo. A consulta permanece na mesma order; somente a resposta final do provedor remove o desafio. A suíte local passou com 118 testes, incluindo o servidor Hostinger não versionado. O primeiro ensaio completo foi limitado por `EACCES` na conexão de loopback do ambiente restrito; a execução autorizada fora dessa restrição passou. Esses testes usam estado/tempo sintéticos e não substituem observar a expiração real no provedor.

### Exportação preventiva do banco — 21/10/2026

O Redis permanece Free, custo mostrado US$ 0,00. A exportação manual `heeeph-antes-producao-20261021.rdb` ficou Ready, com 81,24 KB. Após o usuário baixar pelo navegador comum, a cópia local foi confirmada: 83.228 bytes, cabeçalho RDB e SHA-256 idêntico ao original em Downloads. A cópia preservada fica fora do checkout Git. Às 13:59 de Brasília, o ensaio local recuperou 89 chaves e 45 pedidos, todos presentes no índice. Salvamento e reinício preservaram o digest dos valores e expirações; uma sentinela sintética local sem TTL persistiu. O original não mudou e o servidor foi encerrado. Não houve conexão com Upstash, restauração online nem mudança de credencial. A importação nativa no provedor e a rotina de backup não foram comprovadas. Detalhes em [banco-producao.md](banco-producao.md).

### Recarga integrada de 3DS — 21/10/2026

Pedido fictício `d063209eadb2c854ca96477292af269a`, R$ 59,91 (duas placas Whiskey e JeT), order `ORDTST01M5FE2RJW3V25TKX8P670Q8AW`. Na Preview `607e494`, APRO-CHOK apresentou o desafio do provedor. A página foi recarregada antes da confirmação; a consulta restaurou o mesmo identificador e o desafio pendente. Após confirmar o código ilustrativo pelo teclado, a primeira consulta permaneceu pendente. Consulta manual às 11:34:50 confirmou aprovação e removeu o iframe. O painel confirmou `master/processed/accredited`, aplicação `2764236022861400`, e webhook autenticado às 11:34:32. Uma única order foi criada nesta tentativa; não houve cobrança real. O envio do identificador antifraude ainda não foi comprovado por essa evidência.

### Evidência integrada de 3DS após a publicação

A Preview `a1e1ec2` apresentou o iframe real de teste do Mercado Pago para `APRO-CHOK`. Pedido `ff41cae3d9a0b9918a6c05ee580eb01c`, R$ 59,91, order `ORDTST01M5DCJER4774XCWJ38KAKBGHE`. A confirmação ilustrativa disparou consulta; a resposta inicial ainda estava pendente e não foi tratada como aprovada. Em seguida, o registro recebeu `processed/accredited`, com webhook autenticado às **16:29:14**; a página confirmou aprovação na consulta das 16:29:32. O iframe foi removido após aprovação. Não houve SMS real, código de conta ou cobrança real.

Essa evidência resolve a aprovação com desafio no navegador integrado. Expiração de 40 minutos, desafio em telefone físico e coleta de dispositivo/qualidade da aplicação continuam separados e não são inferidos dessa aprovação.

**Validação posterior no telefone físico:** o usuário concluiu o desafio de teste no pedido `797a8963df8d52e637ca03212f5ad925`, R$ 34,50. A tela inicialmente permaneceu pendente, com o iframe vazio após a conclusão; a consulta manual às 18:31:53 confirmou aprovação no mesmo pedido. O painel carregado posteriormente confirmou `master/processed/accredited`, order `ORDTST01M5DKAC5EQGR2ACPB5BVSYGTC`, e webhook autenticado `processed` às **18:27:03**, anterior à consulta manual. Assim, apresentação/conclusão do desafio, aprovação e recebimento assinado estão comprovados também no aparelho. Não foi criado nem reenviado pagamento para conferir esses registros. A atualização imediata para estado final não é garantida: consultar o mesmo pagamento após concluir o desafio. Expiração completa e antifraude/qualidade da aplicação continuam pendentes.

O cenário `OTHE-CHNO` foi executado em outro pedido: `3694d1624eb765327b9902a4a6328f2f`, order `ORDTST01M5DCQAR68SQT5SZ3CJFQY8F7`, R$ 59,91. O desafio foi apresentado e concluído; a API confirmou `failed/failed`, transação `3ds_challenge_failed`, com webhook autenticado às **16:31:28**. A primeira coleta de dados do SDK falhou antes do envio; a repetição dessa coleta produziu a única order dessa tentativa, sem reenviar pagamento existente.

Identificada e corrigida a transição de recusa 3DS para revisão: a API pode devolver montantes nominais em campos de pagamento em recusas finais. A liberação exige recusa nos dois níveis, uma única transação, montante exato e valores zero ou nominais exatos, limitados aos detalhes de recusa final conhecidos. Pendências, valor parcial/divergente e estado de repetição continuam bloqueados. A aprovação nunca é inferida de montantes nominais.

80 testes direcionados passaram: `checkout`, `pagamento`, `pedidos`, `pedidos-tela` e `webhook-teste`. Cobrem isolamento Redis, 3DS pendente, URLs inválidas, mensagem forjada, consulta sem nova cobrança e ocultação da URL no painel. São simulações, separadas das evidências integradas acima.

Fontes: [Orders e 3DS](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-management/integrate-3ds), [cartões de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/integration-test/cards), [backup Upstash](https://upstash.com/docs/redis/features/backup).

Preview: https://heeeph-git-codex-preparacao-vendas-nardsssbh-9766s-projects.vercel.app/
