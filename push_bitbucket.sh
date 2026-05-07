#!/bin/bash
# ============================================================
# push_bitbucket.sh — Commit e push para Bitbucket
# Uso: bash push_bitbucket.sh "mensagem do commit"
#      bash push_bitbucket.sh          (usa mensagem automática)
# ============================================================

set -e

REMOTE_NAME="bitbucket"
BRANCH="main"

# ─── Cor para output ────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }

# ─── 1. Verificar/configurar remote Bitbucket ───────────────
if ! git remote get-url "$REMOTE_NAME" &>/dev/null; then
    warn "Remote '$REMOTE_NAME' não configurado."
    echo ""
    echo "Cole a URL do seu repositório Bitbucket."
    echo "Formato HTTPS: https://SEU_USUARIO@bitbucket.org/WORKSPACE/REPO.git"
    echo "Formato SSH  : git@bitbucket.org:WORKSPACE/REPO.git"
    echo ""
    read -rp "URL do Bitbucket: " BITBUCKET_URL
    if [ -z "$BITBUCKET_URL" ]; then
        err "URL não informada. Abortando."
    fi
    git remote add "$REMOTE_NAME" "$BITBUCKET_URL"
    ok "Remote '$REMOTE_NAME' adicionado: $BITBUCKET_URL"
else
    CURRENT_URL=$(git remote get-url "$REMOTE_NAME")
    ok "Remote '$REMOTE_NAME' já configurado: $CURRENT_URL"
fi

# ─── 2. Configurar identidade git (se não tiver) ────────────
if [ -z "$(git config user.email)" ]; then
    git config user.email "deploy@bennu.finance"
    git config user.name  "Bennu Deploy"
fi

# ─── 3. Status dos arquivos modificados ─────────────────────
echo ""
echo "📋 Arquivos modificados:"
git status --short
echo ""

CHANGED=$(git status --short | wc -l | tr -d ' ')
if [ "$CHANGED" -eq 0 ]; then
    warn "Nenhuma alteração para commitar."
    echo ""
    echo "Deseja fazer push do commit atual mesmo assim? (s/N)"
    read -rp "" FORCE_PUSH
    if [[ "$FORCE_PUSH" =~ ^[Ss]$ ]]; then
        git push "$REMOTE_NAME" "$BRANCH" && ok "Push realizado!" || err "Falha no push."
    else
        ok "Nada a fazer. Saindo."
    fi
    exit 0
fi

# ─── 4. Mensagem do commit ──────────────────────────────────
if [ -n "$1" ]; then
    MSG="$1"
else
    TIMESTAMP=$(date '+%d/%m/%Y %H:%M')
    MSG="deploy: atualizações Bennu Finance ($TIMESTAMP)"
fi

echo "💬 Mensagem do commit: \"$MSG\""
echo ""

# ─── 5. Stage + commit ──────────────────────────────────────
git add -A
git commit -m "$MSG"
ok "Commit criado: $MSG"

# ─── 6. Push para Bitbucket ─────────────────────────────────
echo ""
echo "🚀 Enviando para Bitbucket ($REMOTE_NAME/$BRANCH)..."
git push "$REMOTE_NAME" "$BRANCH"
ok "Push concluído com sucesso!"

echo ""
echo "─────────────────────────────────────────"
echo "  Repositório atualizado no Bitbucket ✔"
echo "─────────────────────────────────────────"
