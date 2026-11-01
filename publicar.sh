#!/usr/bin/env bash
# Publica o app no GitHub Pages usando o GitHub CLI (gh) já autenticado no seu computador.
# Uso: bash publicar.sh [nome-do-repositorio]
set -euo pipefail
REPO="${1:-caderno-ana-luisa}"
cd "$(dirname "$0")/caderno-ana-luisa-app"
command -v gh >/dev/null || { echo "Instale o GitHub CLI (https://cli.github.com) e rode: gh auth login"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Rode antes: gh auth login"; exit 1; }
USER_GH=$(gh api user -q .login)
[ -d .git ] || git init -q -b main
git add -A
git -c user.name="$(git config user.name || echo "$USER_GH")" -c user.email="$(git config user.email || echo "$USER_GH@users.noreply.github.com")" commit -q -m "Caderno Ana Luisa Peretti (demo, PWA)" || true
gh repo create "$REPO" --public --source=. --remote=origin --push
gh api -X POST "repos/$USER_GH/$REPO/pages" -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 || echo "(O Pages já estava ativo, ou ative em Settings > Pages: main, raiz)"
echo "Pronto. Em 1 a 2 minutos o app abre em: https://$(echo "$USER_GH" | tr 'A-Z' 'a-z').github.io/$REPO/"
