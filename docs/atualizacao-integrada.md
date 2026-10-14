ATUALIZAÇÃO HEEEPH — 14/10/2026

INSTALAÇÃO
1. Faça uma cópia de segurança da pasta Heeeph atual.
2. Extraia este ZIP. Copie o conteúdo da pasta Heeeph para dentro da pasta Heeeph do seu computador, mantendo api, lib, js, css e as demais pastas. Aceite substituir os arquivos. NÃO apague a pasta do site: as imagens continuam na pasta original.
3. GitHub Desktop: confira Changes, faça um único commit e Push origin. Aguarde a publicação da Vercel.
4. Recarregue o checkout com Ctrl+F5.

PAINEL DO VENDEDOR
Abra https://heeeph.com.br/pedidos.html.
A chave é o valor da variável HEEEPH_PEDIDOS_ADMIN_TOKEN na Vercel. Caso ainda não exista, crie uma chave aleatória de pelo menos 32 caracteres em um gerenciador de senhas, salve como variável secreta na Vercel e faça Redeploy. Não use a senha do Mercado Pago; não grave a chave no código.
O painel mostra os últimos 50 registros, permite buscar número, cliente e produto, filtrar pagamentos, consultar cada pagamento e imprimir a lista exibida. A chave fica apenas na memória da página e no campo enquanto aberta. Sair limpa os dados da tela.
A lista carrega os dados guardados no banco. O botão de cada pedido consulta o Mercado Pago. Não confundir uma lista carregada com uma consulta nova de todos os pagamentos.

ENTREGA DESTA ATUALIZAÇÃO
- Formulário de cartão claro, com opções de parcelas legíveis.
- Consulta do comprador mostra progresso e confirmação com horário.
- Recuperação bem-sucedida não é seguida da mensagem do erro anterior.
- Painel protegido com cliente, CPF, endereço, itens, quantidades, valores, frete, volumes, ID do Mercado Pago e última consulta.
- Recuperação Pix, idempotência, webhook e cotação/agrupamento de frete existentes preservados no pacote.

VERIFICAÇÃO
34 testes automatizados locais passaram com APIs simuladas. Verificados cálculo de volumes, preços do servidor, proteção contra duplicação, recuperação Pix, consulta e autenticação do painel. Isso não substitui a verificação visual e de integração após publicar.
Após publicar: verificar parcelas no navegador; consultar cartão aprovado e confirmar mensagem; abrir painel com chave errada e correta; encontrar pedido de teste; consultar e conferir itens/endereço; recarregar Pix e confirmar recuperação.

ETIQUETAS E VENDAS REAIS — PENDÊNCIA EXPLÍCITA
Este pacote continua SOMENTE DE TESTE. Não habilita cobranças reais nem compra/gera etiquetas.
A cotação do Melhor Envio usa a integração existente. Para emissão de etiqueta faltam dados completos do remetente, definição fiscal/de conteúdo e configuração/permissões do fluxo de compra de frete. O ZIP não contém uma implementação de compra de etiquetas.
Os pedidos de teste são guardados por 30 dias e não devem ser postados. A liberação de vendas reais exige implementação e validação próprias; veja docs/checkout-teste.md.
Nenhuma alteração foi publicada por este trabalho e nenhuma credencial da Vercel foi acessada.
