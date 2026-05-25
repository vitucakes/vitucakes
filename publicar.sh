#!/usr/bin/env bash
# publicar.sh — buildea la app y te muestra cómo publicarla online sin GitHub
# Uso: bash publicar.sh

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${CYAN}=== Vitucakes — publicar ===${NC}"
echo ""

# Verificar que estamos en la carpeta correcta
if [ ! -f "package.json" ] || ! grep -q '"name": "vitucakes"' package.json; then
  echo -e "${RED}✗ No estás en la carpeta vitucakes/${NC}"
  exit 1
fi

# Verificar que node_modules existe
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}▸ Falta node_modules. Instalando...${NC}"
  npm install
fi

echo -e "${YELLOW}▸ Generando build de producción...${NC}"
npm run build

echo ""
echo -e "${GREEN}✓ Build listo en la carpeta dist/${NC}"
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
echo -e "${BLUE} Ahora subila a Netlify (gratis, sin cuenta)${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════${NC}"
echo ""
echo "  1. Abrí en el browser: https://app.netlify.com/drop"
echo ""
echo "  2. Arrastrá la carpeta 'dist/' desde Finder/Explorador al sitio."
echo ""
echo "  3. En ~30 segundos te da una URL pública tipo:"
echo "     https://nombre-random.netlify.app/"
echo ""
echo "  4. Esa URL la podés compartir con Vitu / quien quieras."
echo ""
echo -e "${YELLOW}  ⚠️  Importante:${NC} si querés que la URL termine en /vitucakes/"
echo "      tenés que editar vite.config.js antes de buildear:"
echo "        base: '/vitucakes/'   ← por default está así"
echo "      Si la URL nueva está en la raíz (sin /vitucakes/), cambialo a:"
echo "        base: '/'"
echo "      Y volvé a correr bash publicar.sh"
echo ""
echo -e "${YELLOW}  ⚠️  Los datos de Vitu:${NC} la app nueva arranca con la precarga de"
echo "      fábrica. Vitu tiene que volver a importar su backup en el browser"
echo "      que use con la URL nueva (botón 💾 → Restaurar)."
echo ""
echo -e "${CYAN}══════════════════════════════════════════════════${NC}"

# Mostrar tamaño del dist
DIST_SIZE=$(du -sh dist | cut -f1)
echo ""
echo "  📦 Tamaño del build: $DIST_SIZE"
echo "  📂 Ruta absoluta: $(pwd)/dist"
echo ""

# Si está macOS, abrimos Finder en la carpeta dist para facilitar el drag
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "  ▸ Abriendo Finder en la carpeta dist/..."
  open dist
fi
