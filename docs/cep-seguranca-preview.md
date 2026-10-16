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

**77 testes direcionados passaram**, nenhum falhou: `node --test tests/cep.test.js tests/checkout.test.js tests/pagamento.test.js tests/frete.test.js tests/embalagens.test.js tests/catalogo.test.js tests/carrinho-frete.test.js`. Mantidas as evidências anteriores dos módulos sem alteração; não se trata da mesma composição dos 77 testes antigos. A rodada anterior da assinatura executou 78 testes. `git diff --check` passou. Revisão de 89 arquivos de texto, incluindo CJS, sem possíveis segredos ou arquivos de credenciais detectados; isso não é garantia de ausência de toda vulnerabilidade.

Preview integrada READY `dpl_7QY6gMdLWuu3wskTFBinAJT3oErY`, commit `f401af127a2f2b4b63d64f2f31aa6f4b4238b987`: ViaCEP retornou Praça da Sé, Sé, São Paulo/SP para 01001-000 e preencheu os campos. Informar “Outra Cidade” bloqueou a preparação e preservou nome, número, complemento e demais dados. Após corrigir somente a cidade, o servidor preparou o pedido `daf7ff7465105f6ac0ae83eb74f04a5c`. Nenhum pagamento iniciado nesse pedido.

Cotação real Melhor Envio: 2 grandes Whiskey e 4 pequenas Rede Social entre Amigos, subtotal 10140 centavos, frete JeT Standard 1076, total **11216 centavos**. Um pacote de 490 g, 30 × 25 × 3 cm, peso estimado explicitado. A arte antes ambígua foi selecionada e persistida corretamente. Pedido recuperado após reload com o mesmo número e sem criar pagamento. Pix da prova automática também foi recuperado aprovado com o mesmo número após a confirmação independente do webhook.

Inspeção responsiva local com os arquivos atuais: iframe de 390 px (área útil 375 px) para o formulário e 360 px (área útil 345 px) para o pedido. Em ambos, `scrollWidth=clientWidth`, sem rolagem horizontal. Número longo, resumo e retorno de consulta legíveis. As respostas dessa inspeção local são simuladas e não substituem as provas dos provedores na Preview. Teste em aparelho físico, rede móvel e campos seguros do cartão no celular permanece pendente. Servidor temporário encerrado; auxiliar fora do repositório/commit.

Isolamento: somente a branch de preparação foi publicada em Preview. Main e Production permanecem no código `fef09e5`; Production continua no deploy `dpl_2SmVjNnLTXXSrZ5apjSbPjWKewvM`. A proteção geral do site foi preservada; receptor externo isolado e autenticado por HMAC. A infraestrutura atual de testes tem entradas compartilhadas com o checkout antigo de Production; não representa banco exclusivo para vendas reais. O novo modo de produção exige credenciais e banco próprios, sem fallback nas entradas de teste. A tabela de nomes, finalidade e escopos está em `validacao-integrada-preview.md`, sem valores.

Continuam pendentes antes de produção: banco dedicado com retenção e backup, credenciais reais isoladas, webhook real, avaliação de antifraude/3DS e fluxos adicionais, políticas e rotina de operação, além da pendência de revogação do Client Secret de teste descrita no relatório anterior. Não renová-lo sem ação autorizada específica do usuário. Etiquetas e rastreamento automáticos não implementados; entrega manual.

Referências: [ViaCEP](https://viacep.com.br/), [notificações Orders](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications), [orientação sobre ID alfanumérico no manifesto](https://www.mercadopago.com.ar/developers/en/docs/wallet-connect/notifications). A confirmação específica desta integração vem do retry automático acima, não de extrapolar a documentação de outro produto.
