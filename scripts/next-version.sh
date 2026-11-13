#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 || $# -gt 3 ]]; then
  echo "uso: next-version.sh MAJOR.MINOR.PATCH TITULOS [CORPOS]" >&2
  exit 2
fi

base_version="$1"
subjects="$2"
bodies="${3:-}"

if [[ ! "$base_version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  echo "versão base inválida: $base_version" >&2
  exit 2
fi

major="${BASH_REMATCH[1]}"
minor="${BASH_REMATCH[2]}"
patch="${BASH_REMATCH[3]}"

has_major=false
has_minor=false
while IFS= read -r subject; do
  [[ -n "$subject" ]] || continue
  header="${subject%%:*}"
  if [[ "$header" == *'!' ]]; then
    has_major=true
  fi
  type="${header%%(*}"
  case "$type" in
    feat|improve|improvement)
      has_minor=true
      ;;
  esac
done <<< "$subjects"

if [[ "$has_major" == true ]] || [[ "$bodies" == *"BREAKING CHANGE:"* ]]; then
  major=$((major + 1))
  minor=0
  patch=0
elif [[ "$has_minor" == true ]]; then
  minor=$((minor + 1))
  patch=0
else
  patch=$((patch + 1))
fi

printf '%s.%s.%s\n' "$major" "$minor" "$patch"
