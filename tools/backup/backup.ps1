param(
 [Parameter(Mandatory=$true)][ValidateSet('proteger','verificar')][string]$Acao,
 [Parameter(Mandatory=$true)][string]$Entrada,
 [string]$Saida
)
$ErrorActionPreference = 'Stop'
if ($env:HEEEPH_BACKUP_SENHA) { throw 'Remova a variável HEEEPH_BACKUP_SENHA preexistente antes de usar este assistente.' }
if ($Acao -eq 'proteger' -and -not $Saida) { throw 'Informe -Saida para um arquivo novo fora do repositório.' }
if ($Acao -eq 'verificar' -and $Saida) { throw 'Verificar não grava um arquivo de saída.' }
$segredoSeguro = Read-Host 'Senha exclusiva do backup (mínimo 16 caracteres; guarde no gerenciador de senhas)' -AsSecureString
$ponteiroSenha = [IntPtr]::Zero
try {
 $ponteiroSenha = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($segredoSeguro)
 $env:HEEEPH_BACKUP_SENHA = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ponteiroSenha)
 $argumentosBackup = @((Join-Path $PSScriptRoot 'arquivo.cjs'), $Acao, $Entrada)
 if ($Saida) { $argumentosBackup += $Saida }
 & node @argumentosBackup
 if ($LASTEXITCODE -ne 0) { throw 'Operação de backup não concluída.' }
} finally {
 Remove-Item Env:HEEEPH_BACKUP_SENHA -ErrorAction SilentlyContinue
 if ($ponteiroSenha -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ponteiroSenha) }
 $segredoSeguro.Dispose()
}
