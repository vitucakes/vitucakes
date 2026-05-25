#!/usr/bin/env bash
# arrancar.sh — script de "primer arranque" para Vitucakes
# Uso: bash arrancar.sh
#
# Verifica que Node esté instalado y la versión sea >=20, instala
# dependencias si falta el folder node_modules, y arranca la app en modo dev.

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # no color

echo -e "${CYAN}=== Vitucakes — arrancar ===${NC}"
echo ""

# 1. Verificar que estamos en la carpeta correcta
if [ ! -f "package.json" ]; then
  echo -e "${RED}✗ No encuentro package.json en esta carpeta.${NC}"
  echo "  Asegurate de correr este script DESDE la carpeta vitucakes/"
  echo "  Ej: cd /ruta/a/vitucakes && bash arrancar.sh"
  exit 1
fi

# Validar que el package.json es de Vitucakes
if ! grep -q '"name": "vitucakes"' package.json; then
  echo -e "${RED}✗ El package.json no parece ser de Vitucakes.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Carpeta correcta${NC}"

# 2. Verificar Node
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js no está instalado.${NC}"
  echo ""
  echo "  Bajá la versión LTS desde: https://nodejs.org/"
  echo "  Después cerrá y abrí una terminal nueva, y volvé a correr este script."
  exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${RED}✗ Tu Node es viejo (v${NODE_VERSION}). Necesitás v20 o superior.${NC}"
  echo ""
  echo "  Bajá la última LTS desde: https://nodejs.org/"
  echo "  Si usás nvm: 'nvm install 20 && nvm use 20'"
  exit 1
fi

echo -e "${GREEN}✓ Node $(node --version) (>= v20)${NC}"

# 3. Instalar dependencias si falta node_modules
if [ ! -d "node_modules" ]; then
  echo ""
  echo -e "${YELLOW}▸ Falta node_modules. Instalando dependencias...${NC}"
  echo "  (Esto tarda ~30-60 segundos la primera vez. Necesita internet.)"
  echo ""
  npm install
  echo ""
  echo -e "${GREEN}✓ Dependencias instaladas${NC}"
else
  echo -e "${GREEN}✓ Dependencias presentes${NC}"
fi

echo ""
echo -e "${CYAN}=== Arrancando app ===${NC}"
echo ""
echo "  La app va a estar en: http://localhost:5173/vitucakes/"
echo "  Para detenerla: Ctrl+C"
echo ""

# 4. Arrancar Vite
npm run dev
