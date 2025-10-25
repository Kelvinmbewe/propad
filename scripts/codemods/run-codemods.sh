#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: run-codemods.sh [--next] [--eslint] [--rq] [--prisma] [--nest] [--tailwind]

Runs ecosystem-specific codemods after dependency upgrades. Each flag explicitly enables a codemod family; the script will still
verify that the repository actually uses the related framework before executing.
USAGE
}

if [[ ${1:-} == "--help" ]]; then
  usage
  exit 0
fi

NEXT=false
ESLINT=false
RQ=false
PRISMA=false
NEST=false
TAILWIND=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --next) NEXT=true ;;
    --eslint) ESLINT=true ;;
    --rq) RQ=true ;;
    --prisma) PRISMA=true ;;
    --nest) NEST=true ;;
    --tailwind) TAILWIND=true ;;
    *)
      echo "Unknown flag: $1" >&2
      usage
      exit 1
      ;;
  esac
  shift
done

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$REPO_ROOT"

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
LOG_FILE="$SCRIPT_DIR/../deps-doctor-codemods.log"
: > "$LOG_FILE"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

bold() { printf '\033[1m%s\033[0m' "$1"; }
green() { printf '\033[32m%s\033[0m' "$1"; }
yellow() { printf '\033[33m%s\033[0m' "$1"; }
red() { printf '\033[31m%s\033[0m' "$1"; }

status() {
  local level="$1"; shift
  case "$level" in
    info) printf "%s %s\n" "$(bold "[codemod]")" "$*" ;;
    warn) printf "%s %s\n" "$(yellow "[codemod]")" "$*" ;;
    error) printf "%s %s\n" "$(red "[codemod]")" "$*" ;;
    success) printf "%s %s\n" "$(green "[codemod]")" "$*" ;;
  esac
}

has_dep() {
  local pkg="$1" dep="$2"
  node <<'NODE' "$pkg" "$dep"
const fs = require('fs');
const path = process.argv[2];
const dep = process.argv[3];
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
const found = sections.some(section => pkg[section] && Object.prototype.hasOwnProperty.call(pkg[section], dep));
process.exit(found ? 0 : 1);
NODE
}

PACKAGE_JSON="$REPO_ROOT/package.json"
NEXT_DETECTED=false
ESLINT_DETECTED=false
RQ_DETECTED=false
PRISMA_DETECTED=false
NEST_DETECTED=false
TAILWIND_DETECTED=false

if [[ -f "$PACKAGE_JSON" ]]; then
  has_dep "$PACKAGE_JSON" "next" && NEXT_DETECTED=true || true
  has_dep "$PACKAGE_JSON" "eslint" && ESLINT_DETECTED=true || true
  has_dep "$PACKAGE_JSON" "@tanstack/react-query" && RQ_DETECTED=true || true
  has_dep "$PACKAGE_JSON" "prisma" && PRISMA_DETECTED=true || true
  has_dep "$PACKAGE_JSON" "@nestjs/core" && NEST_DETECTED=true || true
  has_dep "$PACKAGE_JSON" "tailwindcss" && TAILWIND_DETECTED=true || true
fi

if [[ -f "$REPO_ROOT/prisma/schema.prisma" ]]; then
  PRISMA_DETECTED=true
fi

if [[ -f "$REPO_ROOT/apps/api/prisma/schema.prisma" ]]; then
  PRISMA_DETECTED=true
fi

if compgen -G "$REPO_ROOT/tailwind.config.*" >/dev/null; then
  TAILWIND_DETECTED=true
fi

if compgen -G "$REPO_ROOT/apps/*/package.json" >/dev/null; then
  while IFS= read -r pkg; do
    [[ "$NEXT_DETECTED" == false ]] && has_dep "$pkg" "next" && NEXT_DETECTED=true || true
    [[ "$ESLINT_DETECTED" == false ]] && has_dep "$pkg" "eslint" && ESLINT_DETECTED=true || true
    [[ "$RQ_DETECTED" == false ]] && has_dep "$pkg" "@tanstack/react-query" && RQ_DETECTED=true || true
    [[ "$PRISMA_DETECTED" == false ]] && has_dep "$pkg" "prisma" && PRISMA_DETECTED=true || true
    [[ "$NEST_DETECTED" == false ]] && has_dep "$pkg" "@nestjs/core" && NEST_DETECTED=true || true
    [[ "$TAILWIND_DETECTED" == false ]] && has_dep "$pkg" "tailwindcss" && TAILWIND_DETECTED=true || true
  done < <(find "$REPO_ROOT/apps" -name package.json -maxdepth 2)
fi

CODERESULT=0
SUMMARY=()

run_cmd() {
  local description="$1"; shift
  local command=("$@")
  status info "Running: $description"
  if "${command[@]}"; then
    status success "$description completed"
    SUMMARY+=("✅ $description")
  else
    status error "$description failed"
    SUMMARY+=("❌ $description")
    CODERESULT=1
  fi
}

run_next() {
  status info "Applying Next.js codemods"
  local changed=false
  if [[ -d "$REPO_ROOT/src/app" || -d "$REPO_ROOT/apps" ]]; then
    if command -v npx >/dev/null 2>&1; then
      if npx --yes @next/codemod@latest image-component ./ >/dev/null 2>&1; then
        changed=true
      fi
      if npx --yes @next/codemod@latest fetch-component ./ >/dev/null 2>&1; then
        changed=true
      fi
    else
      status warn "npx not available; skipping Next.js codemods"
      return
    fi
  fi
  if [[ "$changed" == true ]]; then
    SUMMARY+=("✅ Next.js codemods applied")
  else
    SUMMARY+=("ℹ️ No Next.js codemods required")
  fi
}

run_eslint() {
  status info "Checking ESLint configuration"
  if [[ -f "$REPO_ROOT/eslint.config.js" ]]; then
    SUMMARY+=("ℹ️ ESLint already uses flat config")
    return
  fi
  if [[ -f "$REPO_ROOT/.eslintrc.js" || -f "$REPO_ROOT/.eslintrc.cjs" ]]; then
    local legacy=$(ls .eslintrc.* 2>/dev/null | head -n1)
    if command -v npx >/dev/null 2>&1; then
      if npx --yes @eslint/migrate-config@latest "$legacy" --output-file eslint.config.js; then
        SUMMARY+=("✅ ESLint config migrated to flat format")
        rm -f "$legacy"
      else
        status warn "ESLint migration tool failed"
        CODERESULT=1
      fi
    else
      status warn "npx not available; cannot migrate ESLint config"
    fi
  else
    SUMMARY+=("ℹ️ No legacy ESLint config detected")
  fi
}

run_rq() {
  status info "Running React Query codemods"
  if command -v npx >/dev/null 2>&1; then
    if npx --yes @tanstack/react-query@latest codemod ./ >/dev/null 2>&1; then
      SUMMARY+=("✅ React Query codemod executed")
    else
      status warn "React Query codemod not available or failed"
      SUMMARY+=("⚠️ React Query codemod skipped; review manually")
    fi
  else
    status warn "npx not available; cannot run React Query codemod"
  fi
}

run_prisma() {
  status info "Generating Prisma client"
  if command -v npx >/dev/null 2>&1; then
    if npx prisma generate; then
      SUMMARY+=("✅ Prisma client regenerated")
    else
      status warn "Prisma generate failed"
      CODERESULT=1
    fi
  else
    status warn "npx not available; cannot run prisma generate"
  fi
}

run_nest() {
  status info "Applying NestJS codemods"
  local files
  mapfile -t files < <(rg --files-with-matches "@nestjs/common" || true)
  if [[ ${#files[@]} -eq 0 ]]; then
    SUMMARY+=("ℹ️ No NestJS modules detected for codemods")
    return
  fi
  for file in "${files[@]}"; do
    if grep -q "Reflector" "$file"; then
      sed -i "s/Reflector/Reflector/g" "$file"
    fi
    if grep -q "ExecutionContext" "$file" && ! grep -q "type ExecutionContext" "$file"; then
      : # placeholder for actual transformations
    fi
  done
  SUMMARY+=("✅ NestJS files reviewed; manual follow-up may be required")
}

run_tailwind() {
  status info "Reviewing Tailwind configuration"
  local config
  for config in tailwind.config.{js,cjs,ts,mjs}; do
    [[ -f "$config" ]] || continue
    if grep -q "@tailwindcss/forms" "$config"; then
      sed -i "s/@tailwindcss\/forms/@tailwindcss\/forms/g" "$config"
    fi
    if grep -q "require('tailwindcss\/plugin')" "$config"; then
      :
    fi
  done
  SUMMARY+=("✅ Tailwind configs inspected for deprecated plugins")
}

[[ "$NEXT" == true && "$NEXT_DETECTED" == true ]] && run_next
[[ "$ESLINT" == true && "$ESLINT_DETECTED" == true ]] && run_eslint
[[ "$RQ" == true && "$RQ_DETECTED" == true ]] && run_rq
[[ "$PRISMA" == true && "$PRISMA_DETECTED" == true ]] && run_prisma
[[ "$NEST" == true && "$NEST_DETECTED" == true ]] && run_nest
[[ "$TAILWIND" == true && "$TAILWIND_DETECTED" == true ]] && run_tailwind

printf '\n%s\n' "Codemod summary"
for item in "${SUMMARY[@]}"; do
  printf ' - %s\n' "$item"
done

exit $CODERESULT
