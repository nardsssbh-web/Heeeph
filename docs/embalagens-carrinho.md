# Embalagens HEEEPH — 13/10/2026

Pesos de pacotes completos (plástico e cantoneiras já incluídos), mais reserva estimada de 5 g por pacote para etiqueta e fita. Arredondamento para cima para 10 g e centímetros inteiros.

| Grandes 20×28 | Pequenas 10×15 | Peso cadastrado | C × L × A (cm) |
|---:|---:|---:|---|
|1|0|180 g|30 × 25 × 1|
|2|0|330 g|30 × 25 × 2|
|3|0|490 g|30 × 25 × 3|
|0|1|50 g|15 × 12 × 1|
|0|2|90 g|15 × 12 × 1|
|0|3|130 g|15 × 12 × 2|
|1|1|230 g|30 × 25 × 2|
|1|2|270 g|30 × 25 × 3|
|2|1|370 g|30 × 25 × 3|
|2|2|410 g|30 × 25 × 3|
|2|4|490 g estimados|30 × 25 × 3|

O último peso deriva de 404 g medidos + 80 g de duas pequenas + 5 g de etiqueta/fita. A altura real confirmada é 2,5 cm. As quatro cantoneiras são por pacote grande. O apoio da balança foi tarado.

## Regras

- `js/embalagens.js` contém a tabela compartilhada entre navegador e servidor.
- Seleção do tamanho é obrigatória. Horizontal e vertical pertencem à mesma classe de embalagem, mas o servidor valida as opções da orientação de cada produto.
- Cada pedido usa somente combinações confirmadas. 1G+3P e 2G+3P, por exemplo, são divididos em padrões existentes; não se inventa peso ou altura.
- O agrupamento minimiza o número de pacotes, depois o volume total. Não promete a menor tarifa, que depende da transportadora.
- Cada pacote entra em `volumes`, com centímetros, kg e seguro `insurance` calculado no servidor por preço da variante. Referência: https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos
- Preços das variantes atuais da galeria: P R$12,90, G R$24,90. Atualizar `precos` no módulo junto com a galeria quando mudar valores.
- IDs inexistentes ou duplicados no catálogo, tamanhos não suportados e carrinhos antigos sem tamanho continuam com confirmação pelo WhatsApp.
- No navegador, o resumo de pacotes é uma previsão. O servidor valida novamente todos os dados antes de cotar; nunca aceita peso ou preço enviados pelo cliente.
- Credenciais continuam somente na Vercel. A instalação da tabela não ativa o frete sem `FRETE_ATIVO=true`, token, User-Agent e ambiente de produção.
- Compra de etiqueta e pagamento permanecem manuais. Para múltiplos pacotes, a quantidade de etiquetas depende do serviço selecionado; conferir todos os volumes no Melhor Envio.

## Verificação

`node --test tests/*.test.js`

Testes incluem todas as combinações até 50 placas, reprodução das pesagens, tamanho/preço no servidor, seguro por volume, variantes da mesma arte e resposta de cotação antiga.

