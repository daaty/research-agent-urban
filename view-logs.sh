#!/bin/bash

# Script para visualizar logs do Research Agent Urban
LOGS_DIR="./logs"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "📋 Research Agent Urban - Log Viewer"
echo "===================================="

# Verificar se diretório de logs existe
if [ ! -d "$LOGS_DIR" ]; then
    echo "❌ Diretório de logs não encontrado: $LOGS_DIR"
    exit 1
fi

# Listar arquivos de log disponíveis
echo "📁 Logs disponíveis:"
ls -la $LOGS_DIR/*.log 2>/dev/null | awk '{print "   " $9 " (" $5 " bytes)"}'

echo ""
echo "Comandos disponíveis:"
echo "1. Visualizar logs em tempo real: ./view-logs.sh tail"
echo "2. Filtrar por categoria: ./view-logs.sh filter CATEGORIA"
echo "3. Mostrar apenas erros: ./view-logs.sh errors"
echo "4. Últimas 50 linhas: ./view-logs.sh recent"
echo ""

case "$1" in
    "tail")
        echo "🔄 Acompanhando logs em tempo real (Ctrl+C para sair)..."
        tail -f $LOGS_DIR/*.log | while read line; do
            if echo "$line" | grep -q "ERROR"; then
                echo -e "${RED}$line${NC}"
            elif echo "$line" | grep -q "SUCCESS"; then
                echo -e "${GREEN}$line${NC}"
            elif echo "$line" | grep -q "WARN"; then
                echo -e "${YELLOW}$line${NC}"
            elif echo "$line" | grep -q "INFO"; then
                echo -e "${BLUE}$line${NC}"
            else
                echo "$line"
            fi
        done
        ;;
    "filter")
        if [ -z "$2" ]; then
            echo "❌ Especifique a categoria: ./view-logs.sh filter AUTO"
            exit 1
        fi
        echo "🔍 Filtrando logs por categoria: $2"
        grep "\[$2\]" $LOGS_DIR/*.log | tail -50
        ;;
    "errors")
        echo "🚨 Últimos erros:"
        grep "ERROR" $LOGS_DIR/*.log | tail -20
        ;;
    "recent")
        echo "📋 Últimas 50 linhas de log:"
        tail -50 $LOGS_DIR/*.log
        ;;
    *)
        echo "📖 Para usar, escolha uma opção acima"
        echo "Exemplo: ./view-logs.sh tail"
        ;;
esac
