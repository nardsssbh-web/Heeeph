# Banco exclusivo e recuperação de pedidos

Preparação em 20/10/2026, na branch `codex/preparacao-vendas`. Atualização de 21/10: main e deployments preservados; conexões automáticas de banco em Production/Preview retiradas durante a preparação do isolamento, conforme `isolamento-banco.md`.

## Decisão atual do usuário

O usuário recusou qualquer plano pago adicional e quer priorizar a operação real. A proposta paga abaixo está descartada; seu formulário foi fechado sem criar recurso. O conteúdo posterior permanece apenas como histórico da inspeção, não como plano autorizado de execução.

**Decisão posterior, 21/10/2026:** manter o site e checkout na Vercel, concluir as verificações e preparar o reaproveitamento exclusivo do Redis gratuito para vendas. Migração completa para a Hostinger suspensa. O usuário confirmou Business Web Hosting até 25/05/2030; o pacote Node preparado permanece preservado, sem substituir o projeto Vercel.

O caminho escolhido é destinar o banco gratuito existente exclusivamente à operação real, encerrando o acesso dos ambientes de teste antes de gravar dados de clientes. As conexões automáticas do site (Production/Preview) e receptor (Preview) foram retiradas em 21/10, sem apagar o banco. Restam cópias manuais no receptor e credenciais antigas nos deployments; a revogação ainda não foi executada. Não remover a proteção de isolamento do código apenas para permitir compartilhamento entre ambientes. Estado e sequência em [isolamento-banco.md](isolamento-banco.md).

Ordem da transição: concluir os cenários pendentes; preservar evidências e preparar recuperação; retirar o acesso dos consumidores de teste, incluindo credenciais antigas ainda presentes em deployments; configurar a conexão real exclusiva sem disponibilizá-la a Preview; verificar separação das chaves `heeeph:teste:` e `heeeph:producao:`; revisar antes de habilitar a loja. Não converter pedidos simulados em pedidos reais. A ausência de TTL para novos pedidos reais já está implementada, mas não altera a expiração dos registros de teste existentes. Credenciais e conexões só serão alteradas na etapa autorizada de ativação.

Fontes Hostinger: [Node.js](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/), [Redis](https://support.hostinger.com/en/articles/9581774-is-redis-supported-at-hostinger).

## Inspeção da conta

O recurso existente `heeeph-pedidos-teste` está disponível no plano Free, em AWS São Paulo (`sa-east-1`). Na conferência de 21/10/2026, o painel mostrou 83 KB armazenados, aproximadamente 3,7 mil comandos no mês e custo de US$ 0,00, com TLS habilitado e eviction desligado. A conexão histórica do projeto inclui Production e Preview, mas este banco continua reservado aos testes até concluir o isolamento descrito acima; ainda não gravar pedidos reais.

Daily Backup permanece desabilitado e a ação Backup indisponível. Em 21/10/2026 foi executada a opção manual Export: `heeeph-antes-producao-20261021.rdb`, 81,24 KB, estado Ready no painel. Após bloqueio do download no navegador integrado, o usuário baixou pelo navegador comum. A cópia local foi confirmada: 83.228 bytes, cabeçalho `REDIS0014`; original em Downloads e cópia de mesmo SHA-256 na pasta `backups-privados`, fora do checkout Git. SHA-256: `089e4b34c6c2eb4ad5d1c90e15d39750a608543b4dd3f2b8537c58fd594251d8`. O ensaio local de restauração abaixo foi concluído. Não há evidência de backup automático ativo. O arquivo contém dados privados e não deve integrar Git ou chat.

## Recuperação local comprovada — 21/10/2026

Às 13:59 de Brasília, uma cópia do RDB foi recuperada no Redis portátil 8.10.2, build comunitário MSYS2 para Windows, sem instalação de serviço. ZIP conferido contra o SHA-256 publicado no [release do mantenedor](https://github.com/redis-windows/redis-windows/releases/tag/8.10.2). O Windows não tinha Redis, Docker ou WSL instalado. O ensaio usou exclusivamente `127.0.0.1:16479`, com senha efêmera e diretório separado; nenhum endereço ou credencial do provedor foi usado.

- `redis-check-rdb` aprovou a estrutura: 89 chaves, 88 com expiração, nenhuma já expirada. O arquivo exportado veio com checksum interno desabilitado; isso foi informado pelo verificador, não tratado como checksum aprovado.
- O servidor carregou 88 strings e um sorted set. Foram lidos 45 pedidos JSON, com identificador, ambiente de teste, total, hash de acesso e data coerentes; os 45 constavam no índice, sem membros órfãos.
- Foi criado somente no banco local um registro sintético sem TTL. Após `SAVE`, encerramento e nova inicialização, o registro persistiu e continuou sem TTL. Removida apenas essa sentinela local, o digest de todas as chaves, tipos, valores e instantes absolutos de expiração coincidiu com o estado anterior ao reinício.
- O ensaio aprovado levou 58 segundos. Servidor encerrado e ausência de listener na porta confirmada; configurações com senha efêmera removidas. SHA-256 do RDB original permaneceu igual.

O relatório agregado está em `backups-privados/resultado-recuperacao-20261021.json`, fora do checkout. O script e as instruções estão em `ferramentas-recuperacao`, também fora do checkout. Dados e arquivos de ensaio não foram publicados. Isso comprova recuperação local do conteúdo exportado, sem comprovar importação nativa no Upstash, tempo de recuperação em incidente real ou agendamento de cópias. Não restaurar sobre o banco ativo: a [importação do provedor apaga o destino](https://upstash.com/docs/redis/howto/importexport).

O formulário de criação de outro banco nesta instalação ofereceu somente planos pagos. A proposta abaixo foi preenchida até a revisão anterior ao botão Create, sem contratação.

## Proposta para revisão

| Item | Configuração proposta |
| --- | --- |
| Nome | `heeeph-pedidos-producao` |
| Provedor | Upstash Redis pela integração Vercel existente |
| Região primária | São Paulo, `gru1` no formulário Vercel |
| Plano | Fixed 250MB, US$ 10/mês, mais taxas e impostos aplicáveis |
| Capacidade anunciada | 250 MB de dados e 50 GB de banda |
| Regiões adicionais | Nenhuma |
| Auto Upgrade | False, confirmado no resumo |
| Eviction | False, confirmado no resumo |
| Prod Pack | False; adicional de US$ 200/mês não selecionado |
| Dados iniciais | Banco vazio, sem importar pedidos de teste |
| Conexão ao site | Somente em etapa posterior autorizada para Production |

O plano por consumo também aparece como alternativa, a US$ 0,20 por 100 mil comandos, sujeito aos demais componentes de cobrança. Não foi escolhido por exigir uma decisão separada de orçamento. Os limites e preços do formulário da conta prevalecem sobre exemplos genéricos.

## Sequência de configuração após decisão de custo

1. Criar apenas o recurso aprovado. Se a integração oferecer conexão automática a projetos/ambientes, não confirmar uma alteração de Production sem autorização específica dessa etapa. Não sobrescrever as variáveis `KV_*` de teste.
2. Conferir região, plano, TLS, eviction desligado, aumento automático desligado e ausência de registros. Confirmar a região das Functions antes de decidir qualquer mudança de localização.
3. Abrir Backups no recurso novo e conferir disponibilidade e eventual custo. Habilitar backup diário com retenção de três dias se incluído no plano; caso indisponível, definir alternativa e custo antes da liberação. Essa disponibilidade ainda não foi comprovada para o recurso proposto.
4. Criar um backup inicial e registrar horário, tamanho e estado final. Não considerar a simples ativação do agendamento como prova de recuperação.
5. Validar a restauração em outro banco vazio destinado ao ensaio, com um registro sintético e sem conectar o site. Conferir conteúdo e ausência de expiração do registro após restaurar. A restauração apaga os dados do destino: nunca usar o banco ativo ou o banco de testes existente como destino. Se o ensaio exigir outro recurso pago, obter a decisão de custo antes de criá-lo.
6. Registrar resultado, duração da recuperação e último backup válido. Definir responsável e periodicidade de repetição do ensaio. Não exportar dados de clientes para o repositório ou chat.
7. Somente após autorização de configuração de Production, cadastrar `UPSTASH_REDIS_REST_URL_PROD` e `UPSTASH_REDIS_REST_TOKEN_PROD` exclusivamente nesse ambiente. O token deve ser Secret. Manter URLs/tokens de teste existentes para que o código também verifique a separação. Não copiar credenciais para Preview ou para este documento.
8. Revisar as evidências antes de publicar o código em main ou habilitar cobranças reais. O provisionamento do banco, isoladamente, não libera vendas.

O código atual bloqueia acesso ao Redis real fora de `VERCEL_ENV=production`, exige HTTPS e rejeita origem ou token iguais aos de teste conhecidos. Os registros de produção não recebem TTL automático; a referência local do navegador tem outra finalidade e não é backup do servidor.

## Recuperação operacional proposta

- Backup diário implica possibilidade de perder alterações posteriores à última cópia; confirmar se uma janela de até 24 horas atende à operação antes das vendas.
- Em incidente, bloquear novas tentativas e preservar o banco original. Restaurar uma cópia em um destino separado aprovado, validar pedidos e conciliar estados com o Mercado Pago antes de retomar atendimento ou cobrança.
- Nunca reenviar pagamentos para reconstruir registros e nunca inferir aprovação apenas de um backup antigo.
- A retenção de longo prazo dos pedidos e de seus dados pessoais ainda precisa de política própria; não é determinada pelos três dias de retenção de backup propostos.

Fontes consultadas: [backup e restauração Upstash](https://upstash.com/docs/redis/features/backup), [preços Redis](https://upstash.com/pricing/redis). Estado real da conta conferido no painel autenticado. Exportação, cópia local e recuperação local confirmadas. Nenhuma restauração online ou compra foi executada. Conexões automáticas antigas retiradas posteriormente; conexão real e revogação ainda pendentes.
