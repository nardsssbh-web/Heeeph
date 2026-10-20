# Validação de 20/10/2026 — somente teste e Preview

**Atualização:** [Liberação de vendas](liberacao-vendas.md) reúne os testes posteriores de cartão no telefone, webhooks e preparação 3DS. As pendências históricas abaixo devem ser lidas com essa atualização.

Branch: `codex/preparacao-vendas`. Main, código e configuração de Production preservados. Nenhuma credencial gerada ou renovada. Nenhum pagamento real nem etiqueta comprada. Os pedidos existentes foram preservados.

## Evidências reaproveitadas e novas

- A aprovação e a recusa de cartão pelo Brick já foram verificadas em testes anteriores, incluindo consulta, persistência e retorno à revisão após recusa. Não foram repetidas sem necessidade. Teste físico dos campos seguros do cartão no telefone permanece pendente.
- Pedido `5ddb575be7b55d40b3ffa2d7bfd4c9b3`: tentativa original conferida contra a impressão digital, nome APRO correto, mas e-mail `teste@testuser.com`. Mercado Pago recusou com `invalid_users_involved`, HTTP 402, request `2cf05c9f-9bed-4423-b59c-888bce632b6b`. Não retornou QR nem copia e cola. Webhook autenticado da recusa persistido. Não houve reenvio.
- Pedido `f7b841dd2b624392c50b491abc3066e6`: Pix de teste aprovado `processed/accredited`, total R$ 34,50, com webhook autenticado em 20/10/2026 às 09:53:57 de São Paulo. Registro preservado.
- Pedido `0ee348b295e535817ac8a5588ba1cb39`: preparação persistida, total R$ 55,54, sem pagamento iniciado. Não foi recriado para recuperar acesso.
- Testes controlados de retomada no navegador integrado: pedidos `8dec800ffb81fcbecc22fad6f9361eff` e `6fea20b15a306c2c9fb153c5ca75c035`, sem pagamento. Fechar a aba e abrir novamente recuperou o mesmo número, itens, frete e total. A segunda verificação usou a versão revisada no endereço estável da branch.
- **Telefone físico:** usuário confirmou e enviou imagem do botão de retomada para `23c31e00209d60836910aae06b252bcc` após fechar e reabrir o mesmo endereço no navegador externo. Confirmou recuperação do mesmo pedido, produtos e total. Após iniciar um único Pix de teste nesse pedido e retomar a página, imagem enviada mostra QR e copia e cola, mesmo identificador e total R$ 49,40. Essa evidência é do aparelho, não de emulação.
- Consulta administrativa desse pedido: MP `ORDTST01M5CTCGVZ6WS11B4PEPW6T75C`, Pix `action_required/waiting_transfer`, imagem e código retornados. Payload conferido contém APRO e `test@testuser.com`. Webhook autenticado persistido às 11:10:34, estado `action_required`. **Esse registro comprova webhook pendente, não aprovação desse pagamento.** Não forçar aprovação ou reenviar.

## Correções

- Retomada no mesmo navegador/origem por até 24 horas, com leitura de confirmação da gravação e aviso claro quando indisponível. Quando há referência válida, a retomada substitui o formulário vazio e o aviso contraditório de voltar ao carrinho. O acesso não migra entre aplicativos/domínios e não recupera referências perdidas antes da correção.
- Confirmação de cópia ao lado do botão: “Copiando código…”, “Copiado!” e “Código copiado.” somente após o navegador confirmar. Se o clipboard estiver ausente ou recusar, instrução local de cópia manual; código preservado e nenhum pagamento reenviado. O aviso antigo ficava no topo da página, fora da área do botão. Inspeção local de 390 px confirmou o novo retorno com código fictício, sem integração financeira; falta confirmação dessa revisão no telefone.
- Servidor exige `test@testuser.com` no ambiente de teste, após normalizar espaços e caixa. Impede repetir a falha observada com `teste@testuser.com`, antes de salvar novo pedido ou chamar pagamentos. Regra de e-mail de produção preservada; pedidos anteriores continuam consultáveis.
- Painel exibe o identificador público da aplicação Mercado Pago quando a API o retorna, para facilitar investigação sem mostrar credenciais.
- Quando o cliente escolhe conferir outro carrinho tendo uma referência anterior, a página consulta primeiro o pedido salvo. Só mostra outro formulário se não existir tentativa pendente/incerta, ou se o pagamento anterior estiver aprovado ou recusado de forma final. Pendência retoma a tentativa original. A escolha não prepara pedido nem envia pagamento; o registro anterior e sua referência persistente são mantidos até o novo pedido ser salvo. Corrige o bloqueio de uma compra seguinte por um pedido antigo/expirado. Retomada e conferência do novo carrinho não executam simultaneamente.

## Verificações e limites

64 testes direcionados passaram: `node --test tests/checkout.test.js tests/pagamento.test.js tests/webhook-teste.test.js`. Incluem cópia confirmada/negada/indisponível, preservação de código, recuperação sem sessão/carrinho, assinatura e isolamento, além do bloqueio do erro de digitação no e-mail de teste. Respostas simuladas não comprovam integração real; as evidências do telefone, do painel e dos provedores estão separadas acima.

Também passaram os 5 testes de `tests/pedidos-tela.test.js` e `tests/pedidos.test.js`: autenticação, consulta, entrega separada do pagamento e exclusão lógica. Total desta rodada: 69 testes direcionados, nenhum falhou. `git diff --check` passou; revisão de 91 arquivos de texto, incluindo CJS, não detectou possíveis segredos ou arquivos de credenciais. Isso não garante ausência de toda vulnerabilidade.

Após a correção da escolha de outro carrinho, a execução conjunta dos mesmos cinco arquivos passou com 71 testes, nenhum falhou. Inclui os novos cenários de pedido anterior pago/recusado/sem cobrança e de bloqueio por pendência/incerteza. Esses testes não criam cobranças nos provedores.

Não estão concluídos: confirmação de cópia nessa revisão no telefone, cartão em aparelho físico e aprovação automática do último Pix. O banco definitivo, retenção/backup de produção, credenciais e webhook reais isolados e avaliação de antifraude/3DS continuam requisitos anteriores à liberação de vendas. Compra de etiqueta e rastreamento automático não implementados; etapas de entrega manuais.

### Atualização após a aprovação do último Pix

O painel autenticado confirmou posteriormente o pedido `23c31e00209d60836910aae06b252bcc` como `processed/accredited`, R$ 49,40, com webhook autenticado persistido como `processed` às **11:14:15 de São Paulo em 20/10/2026**. A consulta manual anterior era das 11:13:37 e mostrava pendência; recarregar a lista revelou a atualização assinada posterior. Portanto, a pendência de aprovação desse Pix descrita acima foi resolvida, sem nova cobrança, reenvio ou alteração manual do estado do pagamento. Não foi obtido código HTTP dessa entrega nos logs nesta rodada; a prova aqui é o registro persistido pelo receptor após validar a assinatura e consultar a Orders API.

Corrigido também um retorno antigo do painel: atualizar a lista agora limpa mensagens de consultas anteriores, evitando exibir “Aguardando confirmação” antigo abaixo de um pedido já aprovado pelo webhook. O teste da tela cobre essa transição.

Permanecem pendentes a confirmação da nova mensagem de cópia no telefone e o cartão em aparelho físico. Retomada do mesmo pedido, QR, copia e cola e aprovação com webhook do pedido do telefone estão comprovados pelas evidências acima.

Endereço estável de teste: https://heeeph-git-codex-preparacao-vendas-nardsssbh-9766s-projects.vercel.app/

Referência oficial consultada em 20/10/2026: [teste Pix com Orders API](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/integration-test/pix). A documentação indica `test@testuser.com` e `payer.first_name=APRO`, com atualização posterior para aprovação; não informa prazo garantido nessa página. Não considerar um pagamento aprovado enquanto o provedor não confirmar os estados e os valores.
