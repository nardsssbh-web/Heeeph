# QR do Pix no Preview

A Orders API de testes pode retornar `payment_method.qr_code` preenchido com `qr_code_base64` vazio. A documentação oficial mostra esse retorno:
https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/integration-test/pix

A página anteriormente ocultava a imagem nesse caso. Agora gera o QR localmente com a mesma sequência recebida em `qr_code`, mantendo o copia e cola intacto. A biblioteca fica no próprio site; nenhum dado do Pix vai a um serviço gerador externo. Uma imagem Base64 que falhe ao carregar também usa essa alternativa. Se o provedor não retornar código nem imagem, a página informa a ausência e orienta consultar a tentativa existente.

O servidor identifica Pix também quando os campos QR estão ausentes, sem inventar dados. Consulta continua buscando a mesma order por GET; a correção não altera criação, idempotência, bloqueios, credenciais nem ambiente.

Validação local: testes cobrem recuperação por consulta sem outro POST de criação, retorno sem imagem, retorno sem código, geração real de imagem GIF e falha no carregamento da imagem do provedor. Isso não comprova os dados de uma tentativa real. A validação integrada depende de localizar o pedido original e consultar essa mesma order, sem criar outra cobrança.
