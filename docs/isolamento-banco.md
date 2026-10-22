# Transição do Redis gratuito para uso exclusivo em vendas

Plano preparado em 21/10/2026 na branch `codex/preparacao-vendas`. Execução parcial posterior descrita abaixo: conexões automáticas retiradas, incluindo escopos Production/Preview do site. Main e deployments existentes não foram alterados. O recurso existente será reaproveitado, sem banco novo ou plano pago.

## Execução parcial em 21/10/2026

- Removida a conexão automática de `heeeph-webhook-teste` (Preview) e depois a de `heeeph` (Production e Preview). A integração confirmou `No connections yet`. O banco e os pedidos não foram excluídos. A remoção afeta variáveis de futuros deployments, não revoga credenciais retidas nos deployments existentes.
- No site, a página de variáveis recarregada deixou de listar as entradas `KV_*` gerenciadas. Não houve mudança em credenciais Mercado Pago ou Melhor Envio.
- No receptor, permaneceram cópias manuais `KV_REST_API_TOKEN` e `KV_REST_API_URL`, ambas em Preview. O diálogo de exclusão de `KV_REST_API_TOKEN` foi aberto, mas nenhuma exclusão foi confirmada: a Vercel informa que é permanente e não pode ser desfeita. Solicitada confirmação específica para excluir somente essas duas variáveis. Os nomes efetivamente observados no receptor são `KV_*`, não `RECEPTOR_KV_*`; estes últimos continuam no plano apenas como aliases a verificar caso existam em outra configuração.
- Rotação de credenciais ainda não executada. O controle `Reset...` está disponível em Upstash → Settings → Reset Credentials. A conclusão dessa ação deve ser feita pelo usuário. Nenhuma credencial real foi configurada e nenhuma cobrança real foi habilitada.
- Não considerar o isolamento concluído enquanto cópias manuais e credenciais antigas permanecerem utilizáveis. O ensaio integrado completo de expiração 3DS continua pendente; a busca administrativa atual não encontrou desafio antigo pendente que pudesse substituir um novo ensaio.

## Estado conferido no painel

Recurso `heeeph-pedidos-teste`, ID `f38fac30-f7db-4a64-ab0c-94cc3db038a4`, plano Free, São Paulo. A página Projects da integração Vercel mostra:

| Consumidor | Escopos atuais | Providência na transição |
| --- | --- | --- |
| `heeeph` | Production e Preview | Retirar a conexão automática de teste; a conexão real futura será Secret e somente Production |
| `heeeph-webhook-teste` | Preview | Retirar conexão e encerrar uso do receptor antes de dados reais |
| Deployments antigos dos dois projetos | Configuração fixada quando foram criados | Revogar as credenciais antigas; remover variáveis futuras não revoga cópias já implantadas |

No site, estão vinculadas `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL` e `KV_REDIS_URL`. No receptor, considerar também as entradas `RECEPTOR_KV_REST_API_URL` e `RECEPTOR_KV_REST_API_TOKEN`. Revisar eventuais overrides de branch e ambientes adicionais; a lista de projetos conectados não identifica cópias manuais de credenciais fora da integração.

## Ordem de execução na janela de transição

1. Concluir ou encerrar explicitamente as verificações restantes, inclusive o ensaio integrado de expiração 3DS. Não iniciar novos pedidos simulados durante a transição. Aprovação, recusa, recarga, antifraude e recuperação local já têm evidências. Preservar a exportação e relatório de recuperação descritos em `banco-producao.md`; exportar novamente se surgirem registros depois daquela cópia.
2. Registrar os nomes/escopos atuais sem exportar segredos e manter a flag de cobranças reais desativada. A retirada das conexões interromperá os fluxos atuais de teste, inclusive a demonstração de checkout no domínio de produção que ainda usa configuração de teste; não tratar isso como uma mudança sem impacto.
3. Na integração Vercel, desconectar os dois consumidores de teste do recurso, sem excluir o banco. Conferir a remoção das entradas gerenciadas e retirar as cópias manuais de teste. Não reconectar automaticamente o recurso a Preview ou ao receptor. Não remover variáveis de Mercado Pago ou Melhor Envio que não pertencem a esta troca.
4. O usuário conclui a rotação em Upstash → Settings → Reset Credentials. A tela atual informa que a operação gera novas credenciais e oferece `Reset...`. Não fazer isso antes de retirar vínculos automáticos, para não distribuir credenciais novas aos consumidores de teste. Não registrar novos segredos no chat, terminal ou documentos.
5. Verificar que credenciais antigas de leitura e escrita foram efetivamente revogadas, incluindo acesso Redis TCP se antes utilizado. Confirmar o comportamento real da integração após o reset. Uma entrada removida do painel não prova revogação. Manter os dados reais bloqueados enquanto houver acesso antigo válido ou distribuição automática inesperada.
6. Somente na etapa de configuração de Production aprovada, cadastrar `UPSTASH_REDIS_REST_URL_PROD` e `UPSTASH_REDIS_REST_TOKEN_PROD` como Secret exclusivamente em Production. O recurso pode conservar o mesmo endpoint, mas agora deve ter credencial nova e não estar mais ligado a teste. Remover desse escopo os aliases antigos `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `KV_REST_API_URL`, `KV_REST_API_TOKEN` e os demais aliases gerenciados que conservem acesso. Não copiar segredos reais para Preview, Development, receptor ou arquivos locais.
7. Verificar a publicação autorizada em Production com novas variáveis, preservando o bloqueio de cobranças. O código deve usar `heeeph:producao:` sem TTL e rejeitar acesso real fora de Production. Nenhum pedido `heeeph:teste:` será convertido, movido, apagado ou apresentado como venda real. Não promover deployment antigo com credenciais revogadas como rollback.
8. Confirmar que o checkout/receptor antigos não conseguem ler o banco e que o deployment real autorizado acessa somente o namespace real. Só depois revisar credenciais Mercado Pago reais, assinatura de webhook, operação e liberação de cobrança. Não criar pagamento real para provar isolamento.

## Evidência do código

Teste de regressão adicionado a `tests/checkout.test.js`: com endpoint reaproveitado e token novo fictício, o código ainda bloqueia se a origem de teste continua vinculada. Após retirar os aliases de teste do cenário sintético, o SET usa exclusivamente o prefixo real e não recebe TTL; Preview, Development e ambiente ausente são bloqueados antes de enviar comandos. Os 45 testes de checkout passaram. Não houve remoção da proteção `bancoProducaoIsolado`, alteração de código de produção ou prova de revogação real nesta preparação.

## Recuperação da transição

Se qualquer verificação falhar, manter cobranças reais bloqueadas e não gravar dados de clientes. Preservar o banco e os backups. Corrigir escopos e publicar nova versão autorizada, em vez de reativar credenciais antigas ou conceder acesso real aos testes. Restaurar somente em destino separado previamente aprovado; nunca sobre o banco ativo para desfazer uma configuração.

Fontes: [variáveis Vercel e aplicação em deployments](https://vercel.com/docs/environment-variables), [reset de credenciais Upstash](https://upstash.com/docs/devops/developer-api/redis/reset_password), [importação e efeito no destino](https://upstash.com/docs/redis/howto/importexport). A revogação de cada credencial e eventual sincronização da integração precisam ser verificadas na execução, sem presumir que a documentação de um reset cubra todas as cópias existentes.
