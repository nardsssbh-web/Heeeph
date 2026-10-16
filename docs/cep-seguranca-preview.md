# CEP, segurança e revisão da Preview — 16/10/2026

Somente `codex/preparacao-vendas`. Main, Production, credenciais e registros anteriores preservados. Pagamentos reais bloqueados. As evidências anteriores de Pix, cartão e recuperação não foram repetidas sem necessidade.

## Webhook automático comprovado

Pedido `5b33e17f2c74d1f18875f0879fdb5b3f`, order `ORDTST01M535VQTM3J1GQWPSYD78S89Z`, único Pix fictício necessário para obter um evento novo após corrigir a configuração. O provedor informou `live_mode=false`, `processed/accredited`, R$ 34,50.

O diagnóstico do primeiro envio confirmou HMAC com o ID em minúsculas. Correção publicada no receptor Preview `dpl_9D4k1oGpANTaVsYNFqEBaN7QxAY4`. Retry automático às **17:37:51 de São Paulo**: **HTTP 200**, assinatura válida, vendedor de teste confirmado, consulta à Orders API e `processado_e_persistido`. Request `sckw9-1792183071433-5570bf2beb57`. Não houve simulador nem consulta do comprador antes da prova. O ID original continua usado na consulta e na persistência; HMAC permanece obrigatório.

Metadados de `MERCADO_PAGO_WEBHOOK_SECRET_TEST` conferidos nos dois projetos: Secret, exclusivamente Preview. Não foram lidos ou comparados valores. Os deploys eram posteriores aos salvamentos, dispensando redeploy apenas de configuração. A correspondência da chave do receptor foi comprovada criptograficamente pelo evento automático. Nenhuma chave gerada ou renovada.

## Endereço

- `/api/cep` consulta o ViaCEP com host fixo, CEP de oito dígitos e timeout de cinco segundos. Resposta filtrada e cache em memória limitado a 256 CEPs, por dez minutos; não contém dados do comprador. Não exige nova variável ou credencial.
- Preenche somente rua, bairro, cidade e UF vazios. Número e complemento permanecem do cliente; a consulta não comprova a existência do número ou a capacidade de entrega no endereço.
- Antes de preparar o pedido, navegador e servidor conferem os campos informados pela base. Ignoram caixa, acentos e abreviações comuns. CEP geral/rural sem rua/bairro admite preenchimento manual nesses campos.
- Divergência, CEP inexistente ou indisponibilidade impedem preparar o pedido. Dados digitados permanecem no formulário. Nenhuma cobrança é criada pela consulta ou validação.
- Consultas e webhooks de pedidos anteriores continuam funcionando sem exigir uma nova validação postal; não altera cadastros já persistidos.

## Catálogo, segurança e desempenho

- Eliminados IDs repetidos de artes diferentes em bebidas, games e fotos reais. Todos os IDs envolvidos na ambiguidade receberam identificadores próprios: um carrinho antigo ambíguo é recusado, com orientação para selecionar novamente; não é associado silenciosamente à arte errada. Os pedidos salvos mantêm seus snapshots.
- Produtos “Em Breve” bloqueados também no servidor, mesmo em requisição direta.
- Conteúdo do carrinho proveniente de armazenamento do navegador é escapado antes de renderizar HTML. Imagens aceitam apenas caminhos locais de placas, sem travessia de diretório.
- Removida `precoNumero`, função sem referências em `lib/frete.js`. Sem novos pacotes ou dependências. Scripts temporários fora do commit; nenhuma imagem ou registro excluído.
- Galeria mantém as duas primeiras imagens com carregamento imediato e usa lazy loading nas demais, com decodificação assíncrona. Fontes originais preservadas; imagens grandes ainda podem limitar a experiência em conexão lenta.
- Número do pedido passa a quebrar linha em espaços estreitos. Visual existente preservado.

## Verificação

Testes direcionados cobrem CEP, integração com preparação, preservação dos campos, catálogo, carrinho, frete e embalagens. Mantidas as evidências dos testes anteriores para módulos sem alteração. Conferência integrada do CEP e visual da Preview será registrada ao concluir o deploy.

Continuam pendentes antes de produção: banco dedicado com retenção e backup, credenciais reais isoladas, webhook real, avaliação de antifraude/3DS e fluxos adicionais, políticas e rotina de operação, além da pendência de revogação do Client Secret de teste descrita no relatório anterior. Não renová-lo sem ação autorizada específica do usuário. Etiquetas e rastreamento automáticos não implementados; entrega manual.

Referências: [ViaCEP](https://viacep.com.br/), [notificações Orders](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications), [orientação sobre ID alfanumérico no manifesto](https://www.mercadopago.com.ar/developers/en/docs/wallet-connect/notifications). A confirmação específica desta integração vem do retry automático acima, não de extrapolar a documentação de outro produto.
