#!/bin/bash

# Script de instalación rápida para tests E2E con Playwright

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=========================================="
echo "  Setup Tests E2E - Docusing"
echo "==========================================${NC}"
echo ""

echo -e "${YELLOW}1. Instalando dependencias de npm...${NC}"
cd frontend
npm install

echo ""
echo -e "${YELLOW}2. Instalando navegadores de Playwright...${NC}"
npx playwright install

echo ""
echo -e "${GREEN}✓ Setup completado!${NC}"
echo ""
echo "Comandos disponibles:"
echo "  npm run test:e2e          - Ejecutar todos los tests (headless)"
echo "  npm run test:e2e:ui       - Modo UI interactivo (RECOMENDADO)"
echo "  npm run test:e2e:headed   - Ver el navegador mientras corre"
echo "  npm run test:e2e:debug    - Debug paso a paso"
echo ""
echo "Ver documentación completa en: ../TESTING.md"
