#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "uso: next-version.sh MAJOR.MINOR.PATCH TITULO [CORPO]" >&2
  exit 2
fi

base_version="$1"
subject="$2"
body="${3:-}"

if [[ ! "$base_version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  echo "versão base inválida: $base_version" >&2
  exit 2
fi

major="${BASH_REMATCH[1]}"
minor="${BASH_REMATCH[2]}"
patch="${BASH_REMATCH[3]}"

header="${subject%%:*}"
if [[ "$header" == *'!' ]] || [[ "$body" == *"BREAKING CHANGE:"* ]]; then
  major=$((major + 1))
  minor=0
  patch=0
else
  type="${header%%(*}"
  case "$type" in
    feat|improve|improvement)
      minor=$((minor + 1))
      patch=0
      ;;
    *)
      patch=$((patch + 1))
      ;;
  esac
fi

printf '%s.%s.%s\n' "$major" "$minor" "$patch"
