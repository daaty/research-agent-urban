# Script PowerShell para visualizar logs do Research Agent Urban
param(
    [string]$Action = "help",
    [string]$Category = ""
)

$LogsDir = ".\logs"

Write-Host "📋 Research Agent Urban - Log Viewer" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Verificar se diretório de logs existe
if (!(Test-Path $LogsDir)) {
    Write-Host "❌ Diretório de logs não encontrado: $LogsDir" -ForegroundColor Red
    exit 1
}

# Listar arquivos de log disponíveis
Write-Host "📁 Logs disponíveis:" -ForegroundColor Yellow
Get-ChildItem "$LogsDir\*.log" | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    Write-Host "   $($_.Name) ($size KB)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Comandos disponíveis:" -ForegroundColor Green
Write-Host "1. Visualizar logs em tempo real: .\view-logs.ps1 -Action tail" -ForegroundColor White
Write-Host "2. Filtrar por categoria: .\view-logs.ps1 -Action filter -Category AUTO" -ForegroundColor White
Write-Host "3. Mostrar apenas erros: .\view-logs.ps1 -Action errors" -ForegroundColor White
Write-Host "4. Últimas 50 linhas: .\view-logs.ps1 -Action recent" -ForegroundColor White
Write-Host ""

switch ($Action) {
    "tail" {
        Write-Host "🔄 Acompanhando logs em tempo real (Ctrl+C para sair)..." -ForegroundColor Yellow
        Get-Content "$LogsDir\*.log" -Wait -Tail 10 | ForEach-Object {
            if ($_ -match "ERROR") {
                Write-Host $_ -ForegroundColor Red
            } elseif ($_ -match "SUCCESS") {
                Write-Host $_ -ForegroundColor Green
            } elseif ($_ -match "WARN") {
                Write-Host $_ -ForegroundColor Yellow
            } elseif ($_ -match "INFO") {
                Write-Host $_ -ForegroundColor Cyan
            } else {
                Write-Host $_
            }
        }
    }
    "filter" {
        if ([string]::IsNullOrEmpty($Category)) {
            Write-Host "❌ Especifique a categoria: .\view-logs.ps1 -Action filter -Category AUTO" -ForegroundColor Red
            exit 1
        }
        Write-Host "🔍 Filtrando logs por categoria: $Category" -ForegroundColor Yellow
        Get-Content "$LogsDir\*.log" | Select-String "\[$Category\]" | Select-Object -Last 50
    }
    "errors" {
        Write-Host "🚨 Últimos erros:" -ForegroundColor Red
        Get-Content "$LogsDir\*.log" | Select-String "ERROR" | Select-Object -Last 20
    }
    "recent" {
        Write-Host "📋 Últimas 50 linhas de log:" -ForegroundColor Yellow
        Get-Content "$LogsDir\*.log" | Select-Object -Last 50
    }
    default {
        Write-Host "📖 Para usar, escolha uma opção acima" -ForegroundColor White
        Write-Host "Exemplo: .\view-logs.ps1 -Action tail" -ForegroundColor Gray
    }
}
