# Receptor isolado de teste

Estado atual: simulador assinado validado com HTTP 200. Após alinhar o segredo, a entrega automática confirmou HMAC com o ID em minúsculas; o validador foi corrigido e a repetição da mesma notificação está em observação. Evidências atuais e identificadores: `docs/validacao-integrada-preview.md`. Os deploys, erros e pendências específicos abaixo são histórico, não o estado final da integração.

URL estável de teste: `https://heeeph-webhook-teste-nardsssbh-9766s-projects.vercel.app/api/mercado-pago-webhook`. Atualizar o alias ao publicar outra versão Preview; não trocar a URL cadastrada a cada deploy.

Projeto Vercel: `heeeph-webhook-teste` (`prj_dl8AyJ4sJBP5RJxj0T5YeLgon9jb`), sem conexão Git e sem domínio do site.

Estado validado em 16/10/2026: deploy `dpl_CbwnbjQLooChdskW8TeZgZzSz4fN` READY, somente Preview, endpoint `https://heeeph-webhook-teste-1j4qv8p5a-nardsssbh-9766s-projects.vercel.app/api/mercado-pago-webhook`. Após correção do Access Token divergente, a notificação da order existente retornou **HTTP 200**, assinatura válida, vendedor de teste confirmado e persistência confirmada no Redis às `2026-10-16T13:33:22.725Z`. O pedido continuou `failed`/não aprovado conforme a API. Não houve criação ou reenvio de cobrança. Detalhes e evidências em `docs/webhook-preview.md`. Os apontamentos de bloqueio abaixo são histórico da investigação.

O pacote é gerado por `pacote.cjs`, usando uma lista explícita de fontes da branch de testes. A única rota é `POST /api/mercado-pago-webhook`; os demais caminhos retornam 404. Não publicar o repositório inteiro neste projeto. A função reutiliza o validador HMAC e a reconciliação com lock do site, consulta a Orders API, verifica vendedor de teste, referência e valores e grava `webhookRecebido` no registro existente. O corpo da notificação nunca confirma pagamento.

O receptor não possui rota de criação de pedido ou cobrança, painel administrativo ou endpoint de leitura. Não configurar credenciais `_PROD` nem o token administrativo neste projeto. `CHECKOUT_AMBIENTE=teste`, `CHECKOUT_TESTE_ATIVO=false` e `CHECKOUT_PRODUCAO_ATIVO=false` estão cadastrados somente em Preview.

Cadastrar diretamente no painel Vercel, somente em Preview, com os mesmos valores de teste do site:

- `MERCADO_PAGO_WEBHOOK_SECRET_TEST` (Secret/Sensitive).
- `MERCADO_PAGO_ACCESS_TOKEN_TEST` (Secret/Sensitive, vendedor de teste).
- `MERCADO_PAGO_PUBLIC_KEY_TEST`.
- Redis: usar o vínculo gerenciado `RECEPTOR_*` descrito abaixo, somente em Preview. As cópias manuais `KV_REST_API_URL` e `KV_REST_API_TOKEN` foram substituídas no runtime do receptor por essa conexão.

Não recuperar, registrar ou colar os segredos em chat, arquivos ou argumentos de terminal. O banco é o mesmo para preservar os pedidos `heeeph:teste:`; nenhum registro é apagado. Após cadastrar, redeploy somente o receptor em Preview e atualizar apenas a URL de teste no Mercado Pago.

## Rotação coordenada de Redis

Em 16/10/2026, o usuário autorizou uma exceção limitada à rotação das credenciais Redis e ao redeploy do mesmo código de Production do site, sem modificar main, pagamentos ou dados. Baseline de Production: commit `fef09e51f541e173191e05a23e7f5129a7365c2b`, deployment `dpl_ChYbXP3WggnkWafs1zQZ1weHh8dg`.

O receptor foi vinculado ao mesmo recurso Redis pela integração, somente em Preview, com prefixo `RECEPTOR`. As variáveis gerenciadas têm os nomes `RECEPTOR_KV_REST_API_URL`, `RECEPTOR_KV_REST_API_TOKEN`, `RECEPTOR_KV_REST_API_READ_ONLY_TOKEN`, `RECEPTOR_KV_URL` e `RECEPTOR_REDIS_URL`. `conexao.cjs` usa exclusivamente o URL e o token REST dessa conexão; não recai nas cópias manuais `KV_*`. Essas cópias permanecem até a troca ser concluída, pois a Vercel não permite renomear Secrets; não interpretar sua presença como uso pelo novo pacote.

A redefinição foi concluída pelo usuário no Upstash em 16/10/2026. Os metadados das credenciais gerenciadas dos dois projetos foram atualizados pela integração. Os três redeploys estão READY: Production `dpl_AWumBhcYFJ7acSJp7EBzytxMfQzo` conserva o commit `fef09e5`; Preview do site `dpl_6KjYafLSvSYGZww5pXQmQ6JvyAd3` conserva `13618f7`; receptor atualizado `dpl_MvfWyZUEBisTNDsDKidVfsrDsm3w` usa somente a conexão gerenciada. O site respondeu HTTP 200 e uma chamada não assinada ao receptor respondeu 401. A comprovação de leitura/gravação do pedido via entrega assinada e uma prova independente da revogação dos tokens antigos continuam pendentes; não considerar timestamps como prova de revogação.

Primeiro deploy isolado criado pela API recebeu automaticamente target `production` apesar da solicitação `staging`; não tem credenciais ou vínculo com o site. As versões seguintes do receptor usam target `staging` (Preview). Production do site foi redeployada exclusivamente para a rotação Redis autorizada, com o mesmo commit. Usar somente o endereço exato do Preview para a notificação e nunca cadastrar segredos em Production do receptor.

Verificação externa inicial: POST sem assinatura recebeu HTTP 503 com configuração bloqueada, confirmando acesso sem redirecionamento. Isso não valida assinatura nem processamento: ambos dependem das credenciais e de uma notificação assinada do Mercado Pago para uma order existente.

Após configuração: assinatura inválida deve retornar 401 sem consultar o provedor; uma notificação válida deve retornar 200 com `assinaturaValidada=true` e `processado=true` apenas depois de persistir. O retorno também identifica pedido, estado consultado e horário da evidência. Falha de consulta/persistência retorna 503, nunca sucesso simulado.

Validação real em 16/10/2026: entrega assinada confirmada nos logs, porém processamento bloqueado por 403 `PA_UNAUTHORIZED_RESULT_FROM_POLICIES` do Mercado Pago, inclusive em GET `/users/me`. O deploy mais recente é `dpl_6qmkQ2p9xxqBLKSoy3Ywd8um8Qqu`, no qual a confirmação do vendedor de teste antecede a leitura da order. O pedido foi confirmado preservado por consulta somente de leitura no Redis, sem evidência de webhook persistida. Ver detalhes e request IDs em `docs/webhook-preview.md`. Os 67 testes locais passaram, sem substituir essa validação real incompleta.
