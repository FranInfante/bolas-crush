#!/usr/bin/env bash
# Publica la rama stage en GitHub Pages (rama gh-pages): https://franinfante.github.io/bolas-crush/
# Uso: desde la rama stage, sin cambios a medias: bash scripts/publicar.sh
set -euo pipefail
[ "$(git branch --show-current)" = stage ] || { echo "Ponte en la rama stage" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Hay cambios sin guardar" >&2; exit 1; }
npm test >/dev/null
npm run build -- --base=./
SHA=$(git rev-parse --short HEAD)
DIR=$(mktemp -d)
trap 'git worktree remove --force "$DIR" 2>/dev/null || true' EXIT
git fetch -q github gh-pages 2>/dev/null || true
if git rev-parse -q --verify github/gh-pages >/dev/null; then git worktree add -q -B gh-pages "$DIR" github/gh-pages
else git worktree add -q --orphan -b gh-pages "$DIR"; fi
find "$DIR" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r dist/. "$DIR/" && touch "$DIR/.nojekyll"
git -C "$DIR" add -A
git -C "$DIR" commit -q -m "Publicar stage $SHA" || echo "Sin cambios"
git -C "$DIR" push -q github gh-pages
echo "Publicado $SHA en https://franinfante.github.io/bolas-crush/"
