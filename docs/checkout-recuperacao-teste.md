# Recuperação restrita do checkout expirado no Preview

Recurso de validação, restrito ao pedido fictício `83891a67a9028883fed00b55b64db215`, ao ambiente `teste`, a `VERCEL_ENV=preview` e à branch `codex/preparacao-vendas`. Não habilita produção e não muda chaves de serviços ou o tokenHash original do pedido.

## Operação

1. O administrador autentica-se normalmente em pedidos.html. No pedido permitido, usa Recuperar checkout expirado de teste e confirma a emissão de um acesso privado.
2. O servidor reconsulta a conta e a order no Mercado Pago. Só emite se houver expiração Pix comprovada e nenhum impedimento de aprovação/recebimento. O histórico registra a emissão sem segredo.
3. A tela mostra um QR gerado localmente, válido por até cinco minutos. O prazo pertence ao acesso, não ao Pix. Não fotografar ou enviar esse QR ao chat; tratá-lo como chave temporária.
4. O usuário aponta a câmera do celular e abre o link no navegador com acesso ao Preview. A página retomar-teste.html não carrega scripts externos e remove o fragmento secreto do histórico antes da requisição. O segredo não aparece em query string nem em logs da aplicação.
5. O resgate consome atomicamente o link de uso único, reconsulta a expiração e emite uma sessão distinta, limitada ao tempo restante desde a emissão original. Só guarda hashes dos segredos no Redis, com TTL. Falha ou resposta perdida exige nova emissão; não há reenvio de cobrança.
6. O checkout guarda a sessão limitada apenas em sessionStorage. Não substitui o recibo original e bloqueia a entrada se houver referência de outra compra ou preparação em andamento no navegador.
7. A capacidade permite somente status e desistência do pedido autorizado. Pagar, recuperarPix, liberarNovaCompra, alterar e outros pedidos não aceitam essa autenticação. A desistência reconsulta o provedor e revalida o prazo antes de liberar a saída; uma pendência ou incerteza não pode disparar cancelamento por essa capacidade.
8. Confirmada a desistência, preserva o pedido e o histórico, revoga a sessão temporária e retorna à loja. O carrinho e referências de outras compras permanecem intactos. Auditoria registra emissão, resgate e conclusão sem token.

## Limites

- Não é recuperação geral de compradores, login, troca de credenciais ou liberação de vendas reais.
- Não serve para testar cancelamento de Pix pendente. Esse cenário exige autorização e validação próprias.
- QR vencido ou resgatado não pode ser reutilizado. A sessão também expira, inclusive após recarga. Falhas conservam o bloqueio.
- O botão depende do administrador; o agente não precisa ler a chave, o QR, o clipboard ou a capacidade real. Se o painel for recarregado, o usuário deve preencher a chave diretamente nele.
- Somente a emissão do acesso, o resgate e a desistência registram metadados no pedido fictício. Nenhum pedido novo é criado por essas rotas.
- Antes de migrar esse recurso para outro ambiente ou torná-lo geral, revisar escopo, autenticação, auditoria e expiração. Os bloqueios de contexto são obrigatórios.

## Verificação

Testes automatizados cobrem autenticação administrativa, confirmação, contexto Preview/branch, expiração, concorrência, uso único, capacidades distintas, restrição de ações, preservação do token original e negativa diante de aprovação/recebimento/incerteza. Há integração com o código real do checkout usando Redis/MP simulados e testes do frontend, do QR e da limpeza do fragmento.

A conferência visual local utiliza APIs reais do checkout com Redis em memória e respostas MP fictícias, sem POST financeiro. O fluxo de QR, resgate, confirmação e retorno à loja foi conferido nesse simulador. O teste móvel com o pedido existente depende da emissão manual no painel publicado; não confundir os dois resultados.
