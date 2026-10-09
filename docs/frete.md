# Frete no carrinho HEEEPH

O carrinho está preparado para consultar o Melhor Envio em `/api/frete`, mostrar
opções e somar a entrega escolhida ao subtotal. A escolha acompanha a mensagem
do WhatsApp. O checkout online permanece em teste: o link geral do Mercado Pago
não recebe nem valida o total do pedido.

## O que falta para ativar

1. Pesar e medir cada produto embalado. Não usar os 500 g e 32 × 25 × 1 cm
   da simulação como dados reais sem conferir.
2. Cadastrar o preço real em `produtos.js` e a embalagem em `config/frete.json`.
3. Configurar as variáveis abaixo na Vercel, primeiro somente em Preview.
4. Testar um CEP, vários itens, produtos misturados e os pontos de postagem
   das transportadoras oferecidas. Conferir o preço com a calculadora da conta.
5. Somente depois, liberar as variáveis de produção e fazer novo deploy.

### Embalagens

`cepOrigem` está preenchido com `06414025`. `embalagensPorProduto` começa vazio
de propósito: nenhum peso ou dimensão foi inventado.

Cada chave é o `id` único do produto de `produtos.js`. O valor precisa conter
`width`, `height`, `length` em centímetros e `weight` em quilogramas, todos
números positivos medidos na embalagem individual. Preço e dados de envio
são lidos no servidor; valores enviados pelo navegador não são aceitos.

O catálogo atual ainda não tem escolha de tamanho. Se uma arte for vendida
em tamanhos diferentes, criar variantes com IDs distintos e dados próprios
antes de oferecer frete para elas. IDs duplicados no catálogo também precisam
ser corrigidos para poder cotar os produtos afetados.

Esta primeira integração faz cotação por produtos: envia dados unitários e
quantidades para o empacotamento do Melhor Envio. Não assume que várias placas
cabem em uma embalagem de uma placa. Para aproveitar uma caixa compartilhada,
medir os conjuntos e implementar regras de volumes validadas antes de ativar
essa otimização. Conferir sempre se os volumes cotados correspondem à postagem.

### Variáveis na Vercel

| Variável | Conteúdo |
| --- | --- |
| `FRETE_ATIVO` | `true` apenas quando os dados estiverem conferidos |
| `MELHOR_ENVIO_TOKEN` | Token privado da conta, do ambiente correspondente |
| `MELHOR_ENVIO_USER_AGENT` | Nome da aplicação e e-mail real de contato, conforme documentação |
| `MELHOR_ENVIO_AMBIENTE` | `sandbox` para testes; `producao` para cotações reais |

Não colocar token no HTML, JavaScript público ou repositório. Sem ativação ou
credenciais, o carrinho orienta confirmar o frete pelo WhatsApp. Embalagem ou
preço ausente bloqueia a cotação do pedido completo. A API não compra etiquetas,
não cobra pagamentos nem cria pedidos. Valores sandbox ficam identificados como
teste e não entram na mensagem comercial de WhatsApp; sandbox é bloqueado no
deploy de produção. No GitHub Pages, sem a função Vercel, só funciona o atendimento
manual. O cálculo requer hospedagem com suporte à rota `/api/frete`.

## Verificação local

Requer Node.js 22 ou superior. Rodar `node --test tests/*.test.js`. Os testes usam
respostas simuladas e não acessam a conta Melhor Envio nem compram etiquetas.

Referências: [Cotação](https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos),
[Vercel Functions](https://vercel.com/docs/functions/runtimes/node-js).
