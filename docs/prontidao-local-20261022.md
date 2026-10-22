# Preparação local — 22/10/2026

Escopo: terminar e verificar o código antes de decidir hospedagem/migração. Somente branch `codex/preparacao-vendas`, sem publicação ou alterações externas. As evidências locais não equivalem a uma loja liberada para vender.

Validação final desta rodada: `node --test tests/*.test.js`, Node 24.19.0, **138 testes passaram, zero falhas e zero omissões**, incluindo Redis local isolado. Provedores externos foram simulados. Main permanece em `fef09e51f541e173191e05a23e7f5129a7365c2b`. As alterações estão no checkout local e não foram publicadas.

## Correções e verificações realizadas

- Painel: paginação, busca e filtro no servidor, navegação por registros antigos e descarte de resposta após sair. [Detalhes](painel-recuperacao.md).
- Persistência: pedido e índice na mesma execução Lua, validação de tipo antes da escrita e ensaio em Redis local isolado. Recuperação de order aceita com falha de gravação sem repetir cobrança. Lua não oferece rollback geral de erros posteriores às escritas.
- Webhook: ausência do recurso retorna 503 para permitir nova entrega; assinatura e persistência continuam necessárias para confirmar sucesso. Testes adicionais são simulados, sem novos eventos enviados ao provedor.
- Pagamento: estados finais em português; Pix expirado perde código/QR; cancelamento remove o desafio 3DS. Consulta que falha preserva estado e não libera outra cobrança. [Evidências e limites](liberacao-vendas.md).
- Backup: proteção autenticada de exportação manual, verificação em memória e recusa de sobrescrita. Nenhum backup real foi criptografado nesta rodada. [Procedimento](backups-locais.md).
- Servidor Node preparado: destino real de arquivo público precisa também estar na lista de caminhos públicos. Isso impede um link sob `js/` de expor código de `lib/`, mesmo dentro da raiz do projeto. Teste simula a resolução do link, sem exigir privilégios de criação de symlink no Windows. Migração permanece suspensa.

## Próximas etapas, em ordem

1. Conferir as mudanças locais e definir uma publicação **somente em Preview**, mediante autorização específica. As telas remotas atuais ainda não contêm todas estas correções. Preservar o deployment anterior para retorno; não mover alias ou URLs do Mercado Pago nesta etapa.
2. No Preview autorizado, conferir painel, busca, recuperação, Pix e cartão existentes sem reenviar cobranças. Conferir visualmente no celular a mensagem de cópia. A observação de expiração deve usar uma tentativa fictícia identificada; se precisar criar outra order, obter autorização antes.
3. Proteger exportação recente com senha escolhida pelo usuário, verificar cópia independente e ensaiar recuperação local. Definir responsável, frequência e retenção; não considerar o arquivo de 21/10 como cópia atualizada.
4. Definir a hospedagem comercial antes de liberar vendas. O servidor Hostinger está tecnicamente preparado para testes, mas **continua bloqueando pagamentos reais**. Nenhuma escolha ou contrato novo foi feito. O ZIP de 21/10 está desatualizado e não deve ser implantado como versão atual.
5. Planejar o uso exclusivo do banco gratuito existente para vendas: retirar acesso de teste, inclusive deployments antigos, revisar credenciais e proteções de ambiente, impedir testes futuros no banco de clientes e definir backup/recuperação. O código atual exige isolamento; não contornar esse bloqueio por variáveis artificiais. Não há migração nem remoção de dados autorizada nesta rodada.
6. Revisar, com autorização própria, conta real do Mercado Pago, configuração de assinatura/webhook, frete comercial e operação de entrega/reembolso. Cotação não compra etiqueta; postagem e acompanhamento permanecem manuais.
7. Somente após evidências e autorização final, preparar publicação e habilitação comercial, com plano de retorno que preserve pedidos e pagamentos já recebidos. Não restaurar backup antigo para desfazer uma publicação nem reenviar pagamentos para reconstruir histórico.

Não há ação externa executada por este roteiro. Nenhuma cobrança nova, pedido novo, alteração de Redis, credencial, domínio ou Production foi feita nesta rodada.
