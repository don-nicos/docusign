#!/bin/bash

# Script para ejecutar tests E2E con verificación de servicios

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=========================================="
echo "  Ejecutar Tests E2E - Docusing"
echo "==========================================${NC}"
echo ""

echo -e "${YELLOW}Verificando servicios Docker...${NC}"
if ! docker-compose ps | grep -q "Up"; then
    echo -e "${RED}Error: Servicios Docker no están corriendo${NC}"
    echo "Ejecuta: docker-compose up -d"
    exit 1
fi
echo -e "${GREEN}✓ Servicios Docker activos${NC}"
echo ""

echo -e "${YELLOW}Verificando frontend...${NC}"
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${RED}Error: Frontend no está corriendo en http://localhost:3000${NC}"
    echo "Ejecuta en otra terminal: cd frontend && npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Frontend activo${NC}"
echo ""

cd frontend

if [ "$1" == "ui" ]; then
    echo -e "${YELLOW}Ejecutando tests en modo UI...${NC}"
    npm run test:e2e:ui
elif [ "$1" == "headed" ]; then
    echo -e "${YELLOW}Ejecutando tests en modo headed...${NC}"
    npm run test:e2e:headed
elif [ "$1" == "debug" ]; then
    echo -e "${YELLOW}Ejecutando tests en modo debug...${NC}"
    npm run test:e2e:debug
else
    echo -e "${YELLOW}Ejecutando tests en modo headless...${NC}"
    npm run test:e2e
fi

echo ""
echo -e "${GREEN}✓ Tests completados!${NC}"
echo ""
echo "Ver reporte con: npx playwright show-report"
