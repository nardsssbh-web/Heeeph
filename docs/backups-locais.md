# Proteção e conferência de backups locais — 22/10/2026

Preparação local na branch `codex/preparacao-vendas`. Nenhum banco, serviço, credencial ou publicação foi alterado. A migração permanece suspensa. Este procedimento utiliza uma exportação manual já baixada; não cria uma rotina automática de exportação.

## Ferramentas preparadas

`tools/backup/backup.ps1` solicita a senha sem exibi-la e chama `arquivo.cjs`. O formato versionado usa AES-256-GCM com cabeçalho autenticado, sal aleatório de 16 bytes, nonce aleatório de 12 bytes, tag de 16 bytes e chave derivada por scrypt (N=32768, r=8, p=1). Não há dependências de terceiros. Cada cópia usa novos valores aleatórios.

O comando `proteger` confere os bytes por decifragem em memória antes de gravar um arquivo novo. `verificar` decifra em memória e retorna somente tamanho e SHA-256 do RDB. Não grava conteúdo decifrado nem importa dados em Redis. Arquivo existente nunca é sobrescrito. O RDB de origem não é modificado. O cabeçalho RDB é conferido, mas a ferramenta **não valida a estrutura interna completa do Redis**: o ensaio de recuperação continua necessário.

Limite desta versão: RDB de até **64 MiB**, processado em memória. Isso não cobre automaticamente a capacidade inteira do plano do banco. Sem senha não existe recuperação; SHA-256 isolado não substitui a autenticação da cópia. O arquivo original exportado continua legível e precisa de proteção de acesso própria.

## Como usar quando autorizado

1. Exportar pelo painel do provedor e baixar o RDB em pasta privada fora do repositório. Registrar data da exportação, tamanho e origem sem tokens. Não restaurar sobre o banco ativo.
2. Escolher uma senha longa, exclusiva e aleatória, salva no gerenciador de senhas. Nunca enviar pelo chat, linha de comando ou arquivo `.env`. Uma nova senha nesta ferramenta protege apenas o backup; não muda credenciais do Redis.
3. No PowerShell, aberto na raiz deste checkout, executar com caminhos absolutos para os arquivos privados:

```powershell
.\tools\backup\backup.ps1 -Acao proteger -Entrada 'C:\pasta-privada\exportacao.rdb' -Saida 'C:\pasta-privada\exportacao.heeephbak'
.\tools\backup\backup.ps1 -Acao verificar -Entrada 'C:\pasta-privada\exportacao.heeephbak'
```

4. Comparar os SHA-256 retornados. Copiar o arquivo protegido para um segundo local privado independente, verificar novamente essa cópia e registrar resultado e data. Duas pastas no mesmo computador não comprovam uma cópia independente.
5. Manter a senha recuperável em local separado. Em Windows, `mode 0600` não garante ACL privada: conferir as permissões da pasta e a política de sincronização. O assistente transmite a senha temporariamente por variável de ambiente ao processo Node, remove-a ao terminar e limpa o BSTR; não promete eliminar todas as cópias de memória de strings gerenciadas. Usar somente computador confiável e evitar transcrições/depuração que capturem o ambiente.

Arquivos `.rdb` e `.heeephbak` estão ignorados pelo Git como defesa adicional. Ainda assim, o destino recomendado é fora do checkout. Nenhuma cópia real foi criptografada nesta rodada: os testes usaram somente bytes fictícios.

Validação em 22/10/2026: **135 testes passaram, zero falhas e zero testes ignorados** na suíte completa, incluindo Lua em Redis local isolado. Os dois novos testes cobrem decifragem idêntica ao original, aleatoriedade, senha incorreta, adulteração, truncamento, preservação da origem, verificação sem arquivo decifrado e recusa de sobrescrita. Não houve chamada aos provedores nem teste com dados reais nesta rodada.

## Estado e pendências antes das vendas

- A exportação de 21/10/2026 e o ensaio local anterior comprovaram recuperação de 45 pedidos. Essa exportação representa aquele instante, não as alterações posteriores.
- Falta proteger uma exportação recente, guardar uma cópia independente e comprovar sua recuperação local em instância isolada. A ferramenta preparada não substitui essa execução.
- Definir responsável, frequência e retenção antes das vendas. Proposta para decisão operacional: exportar ao menos diariamente e antes de mudanças relevantes, verificar a cópia e registrar falhas. A janela de perda equivale ao tempo desde a última exportação válida; decidir se isso atende à loja. Não há agendamento configurado.
- Em falha, preservar o banco original e bloquear novas tentativas somente por procedimento previamente autorizado. Conciliar pagamentos com o provedor sem reenviá-los. Uma restauração online exige autorização separada e nunca deve ser aplicada ao banco ativo por este roteiro.
- Pagamentos reais continuam bloqueados e não há mudança de prefixos, TTL ou conexão neste trabalho. O histórico de propostas de outro banco em `banco-producao.md` não autoriza contratação; prevalece a decisão posterior de aproveitar o recurso gratuito existente, condicionada ao isolamento e à revisão de segurança.

## Evidências que continuam externas

Os testes locais cobrem sessão antiga, consulta da mesma order, desafio pendente sem aprovação pelo relógio e recuperação sem repetir cobrança. Ainda falta observar a expiração completa de Pix e 3DS no provedor e confirmar no celular físico a nova mensagem de cópia. Não criar uma order para obter essas evidências sem autorização específica. A aprovação e a recusa de teste já registradas não comprovam expiração.
