# Retomada do checkout em Preview

Em 20/10/2026, o teste em telefone indicou perda da referência do pedido após sair da página e refazer a navegação pelo carrinho. O carrinho remove a referência da sessão ao iniciar um novo checkout; isso não apaga o registro no servidor, mas antes não havia uma opção de retomar esse registro na página.

A página passa a guardar a última referência de acesso no armazenamento local do mesmo navegador e da mesma origem, por até 24 horas desde a última consulta bem-sucedida. Sem sessão ativa, oferece o botão “Retomar este pedido sem gerar outro pagamento”, inclusive sem carrinho carregado. O botão somente chama `status`, com a autenticação do pedido original. Não chama `preparar`, `pagar` nem altera o pagamento no Mercado Pago.

A referência contém apenas identificador, token de acesso do próprio pedido e horário. O token é sensível: não colocar em URLs, logs, capturas ou relatórios. Não são salvos nesse recibo nome, CPF, endereço ou cartão. Armazenamento bloqueado não impede a recuperação pela sessão que ainda existir. Referências inválidas ou vencidas são descartadas localmente, sem apagar pedidos no servidor.

Limites: não recupera retroativamente uma referência já perdida antes desta correção; não funciona entre navegadores, entre aplicativos, em outro domínio de deploy ou após limpar os dados do site. Para testes subsequentes, manter a mesma URL/origem. Sem referência válida, consultar o painel administrativo antes de gerar outro pagamento.

Validação local: 23 testes da página de pagamento passaram, incluindo retomada sem sessão/carrinho com consulta única, validade da referência e armazenamento bloqueado. Essa simulação não substitui a verificação no telefone após publicação em Preview. Nenhuma cobrança foi criada para implementar ou testar a correção.
