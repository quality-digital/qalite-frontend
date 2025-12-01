#!/usr/bin/env bash

BRANCH=$(git rev-parse --abbrev-ref HEAD)
PROTECTED_BRANCHES="^(main|master|develop)$"

# Libera semantic-release rodando no CI (GitHub Actions)
if [ "$GITHUB_ACTIONS" = "true" ] && [ "$SEMANTIC_RELEASE" = "true" ]; then
  exit 0
fi

# Bloqueia commits normais na main/master/develop
if [[ "$BRANCH" =~ $PROTECTED_BRANCHES ]]; then
  echo "🚫 Commit/PUSH bloqueado na branch protegida: $BRANCH"
  echo "Crie a sua branch e abra PR."
  exit 1
fi

exit 0
