# Script de inicialização rápida do aplicativo Caderno Gastronômico
$ErrorActionPreference = 'Stop'

Set-Location -Path $PSScriptRoot

$serverPort = 8081
$serverUrl = "http://localhost:$serverPort"

Write-Output "===================================================="
Write-Output "  Caderno Gastronomico - Inicializando Servidor Web "
Write-Output "  Diretorio: $PSScriptRoot"
Write-Output "  O navegador abrira automaticamente em: $serverUrl"
Write-Output "===================================================="

if (-not (Test-Path -Path (Join-Path $PSScriptRoot "node_modules"))) {
    Write-Output "Instalando dependencias do projeto (npm install)..."
    npm install
}

# Monitora em segundo plano ate que o servidor HTTP conclua a inicializacao e responda 200 OK,
# abrindo uma unica aba no navegador.
Start-Job -ArgumentList $serverUrl -ScriptBlock {
    param([string]$targetUrl)
    $maxAttempts = 90
    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $targetUrl -Headers @{ Accept = "text/html" } -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Start-Process $targetUrl
                break
            }
        } catch {
            # Servidor ainda inicializando; aguarda 1 segundo antes da proxima verificacao
        }
        Start-Sleep -Seconds 1
    }
} | Out-Null

# Inicia o servidor Metro na porta 8081 sem a flag --web para evitar que o Expo abra uma segunda aba duplicada
npx expo start --port $serverPort
