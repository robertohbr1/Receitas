# Script de atualizacao e geracao de novo APK Android (com QR Code de instalacao)
$ErrorActionPreference = 'Stop'

Set-Location -Path $PSScriptRoot

Write-Output "=============================================================="
Write-Output "  Caderno Gastronomico - Atualizador de APK Android (EAS)     "
Write-Output "  Diretorio: $PSScriptRoot"
Write-Output "=============================================================="

if (-not (Get-Command eas -ErrorAction SilentlyContinue)) {
    Write-Output "Instalando EAS CLI globalmente..."
    npm install -g eas-cli
}

Write-Output "Verificando autenticacao na conta Expo..."
$whoamiOutput = eas whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Output "Voce ainda nao esta autenticado no Expo. Faca login abaixo:"
    eas login
} else {
    Write-Output "Autenticado como: $whoamiOutput"
}

Write-Output ""
Write-Output "Validando codigo TypeScript antes de gerar o APK..."
npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Error "Erros de tipagem encontrados. Corrija antes de gerar o APK."
    exit 1
}

Write-Output ""
Write-Output "Iniciando compilacao do novo APK na nuvem Expo..."
Write-Output "Ao concluir, o QR Code e o link para download aparecerao abaixo!"
Write-Output ""

eas build --platform android --profile preview

Write-Output ""
Write-Output "=============================================================="
Write-Output "  Processo finalizado! Escaneie o QR Code acima no Android.   "
Write-Output "=============================================================="
Read-Host -Prompt "Pressione ENTER para fechar esta janela"
