# Banco exclusivo e recuperação de pedidos

Preparação em 20/10/2026, na branch `codex/preparacao-vendas`. Main e Production permanecem inalteradas.

## Decisão atual do usuário

O usuário recusou qualquer plano pago adicional e quer priorizar a operação real. A proposta paga abaixo está descartada; seu formulário foi fechado sem criar recurso. O conteúdo posterior permanece apenas como histórico da inspeção, não como plano autorizado de execução.

**Decisão posterior, 21/10/2026:** manter o site e checkout na Vercel, concluir as verificações e preparar o reaproveitamento exclusivo do Redis gratuito para vendas. Migração completa para a Hostinger suspensa. O usuário confirmou Business Web Hosting até 25/05/2030; o pacote Node preparado permanece preservado, sem substituir o projeto Vercel.

O caminho escolhido é destinar o banco gratuito existente exclusivamente à operação real, encerrando o acesso dos ambientes de teste antes de gravar dados de clientes. Isso exige planejar a retirada das conexões do checkout Preview e do receptor, considerar deployments antigos que conservam credenciais e preservar registros existentes. Não remover a proteção de isolamento do código apenas para permitir compartilhamento entre ambientes. Nenhuma dessas mudanças foi aplicada.

Ordem da transição: concluir os cenários pendentes; preservar evidências e preparar recuperação; retirar o acesso dos consumidores de teste, incluindo credenciais antigas ainda presentes em deployments; configurar a conexão real exclusiva sem disponibilizá-la a Preview; verificar separação das chaves `heeeph:teste:` e `heeeph:producao:`; revisar antes de habilitar a loja. Não converter pedidos simulados em pedidos reais. A ausência de TTL para novos pedidos reais já está implementada, mas não altera a expiração dos registros de teste existentes. Credenciais e conexões só serão alteradas na etapa autorizada de ativação.

Fontes Hostinger: [Node.js](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/), [Redis](https://support.hostinger.com/en/articles/9581774-is-redis-supported-at-hostinger).

## Inspeção da conta

O recurso existente `heeeph-pedidos-teste` está disponível no plano Free, em AWS São Paulo (`sa-east-1`). O painel mostrou 77 KB armazenados, aproximadamente 3,1 mil comandos no mês, TLS habilitado e eviction desligado. A conexão histórica do projeto inclui Production e Preview, mas este banco continua reservado aos testes; não reutilizá-lo para pedidos reais.

Na aba Backups, a lista estava vazia, Daily Backup desabilitado e a ação Backup indisponível. O diálogo oferecia Export, que não foi executado. Não há evidência de backup automático ativo. Persistência e ausência de TTL não substituem uma cópia recuperável.

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

Fontes consultadas: [backup e restauração Upstash](https://upstash.com/docs/redis/features/backup), [preços Redis](https://upstash.com/pricing/redis). Estado real da conta conferido no painel autenticado; nenhuma cópia, restauração, compra ou troca de conexão foi executada nesta inspeção.
