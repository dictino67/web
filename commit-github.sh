#!/bin/sh
set -eu

REPOSITORY_ROOT=$(git rev-parse --show-toplevel)
cd "$REPOSITORY_ROOT"

REMOTE_NAME=${GITHUB_REMOTE:-origin}
TARGET_BRANCH=${GITHUB_BRANCH:-main}
COMMIT_MESSAGE=${1:-}

if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  printf 'Erreur : le remote Git "%s" est introuvable.\n' "$REMOTE_NAME" >&2
  exit 1
fi

if [ -z "$COMMIT_MESSAGE" ]; then
  printf 'Message du commit [Mise à jour du projet web] : '
  read -r COMMIT_MESSAGE
  COMMIT_MESSAGE=${COMMIT_MESSAGE:-Mise à jour du projet web}
fi

printf 'Ajout des modifications...\n'
git add -A

SENSITIVE_FILES=$(git diff --cached --name-only | grep -E '(^|/)(\.env|.*\.(key|crt))$' || true)
if [ -n "$SENSITIVE_FILES" ]; then
  printf 'Erreur : des fichiers sensibles sont prêts à être commités :\n%s\n' "$SENSITIVE_FILES" >&2
  git reset -- "$SENSITIVE_FILES"
  exit 1
fi

if git diff --cached --quiet; then
  printf 'Aucune modification à committer.\n'
  exit 0
fi

git commit -m "$COMMIT_MESSAGE"
printf 'Envoi vers %s/%s...\n' "$REMOTE_NAME" "$TARGET_BRANCH"
git push "$REMOTE_NAME" "HEAD:$TARGET_BRANCH"
printf 'Commit publié avec succès.\n'
