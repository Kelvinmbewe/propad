#!/usr/bin/env bash
set -euo pipefail

MODE="report"
CI_MODE=false
MANAGER_OVERRIDE=""
SCOPE_FILTER=""
ASSUME_YES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --report) MODE="report" ;;
    --fix) MODE="fix" ;;
    --migrate) MODE="migrate" ;;
    --ci) CI_MODE=true ;;
    --manager=*) MANAGER_OVERRIDE="${1#*=}" ;;
    --scope=*) SCOPE_FILTER="${1#*=}" ;;
    --yes) ASSUME_YES=true ;;
    --help)
      cat <<'USAGE'
Usage: scripts/deps-doctor.sh [--report|--fix|--migrate] [--ci] [--manager=<npm|pnpm|yarn>] [--scope=<glob>] [--yes]

Scans all workspaces for deprecated packages and produces a remediation plan.
USAGE
      exit 0
      ;;
    *)
      echo "Unknown flag: $1" >&2
      exit 1
      ;;
  esac
  shift
done

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
LOG_FILE="$SCRIPT_DIR/deps-doctor.log"
mkdir -p "$SCRIPT_DIR"
: > "$LOG_FILE"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

bold() { printf '\033[1m%s\033[0m' "$1"; }
blue() { printf '\033[34m%s\033[0m' "$1"; }
green() { printf '\033[32m%s\033[0m' "$1"; }
yellow() { printf '\033[33m%s\033[0m' "$1"; }
red() { printf '\033[31m%s\033[0m' "$1"; }

log() {
  local level="$1"; shift
  case "$level" in
    info) printf "%s %s\n" "$(blue "[doctor]")" "$*" ;;
    warn) printf "%s %s\n" "$(yellow "[doctor]")" "$*" ;;
    error) printf "%s %s\n" "$(red "[doctor]")" "$*" ;;
    success) printf "%s %s\n" "$(green "[doctor]")" "$*" ;;
  esac
}

cd "$REPO_ROOT"

if [[ ! -f package.json ]]; then
  log error "No package.json found at repository root"
  exit 10
fi

load_nvm() {
  if command -v nvm >/dev/null 2>&1; then
    return
  fi
  if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
    source "$HOME/.nvm/nvm.sh"
    return
  fi
  if [[ -s "$HOME/.nvm/bash_completion" ]]; then
    source "$HOME/.nvm/bash_completion"
  fi
}

install_nvm() {
  log info "Installing nvm (local user)"
  if ! command -v curl >/dev/null 2>&1; then
    log error "curl is required to bootstrap nvm"
    exit 20
  fi
  export NVM_DIR="$HOME/.nvm"
  mkdir -p "$NVM_DIR"
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  source "$NVM_DIR/nvm.sh"
}

ensure_node() {
  export NVM_DIR="$HOME/.nvm"
  load_nvm
  if ! command -v nvm >/dev/null 2>&1; then
    install_nvm
  fi
  if ! command -v nvm >/dev/null 2>&1; then
    log error "Unable to load nvm"
    exit 20
  fi
  echo "20" > .nvmrc
  nvm install 20 >/dev/null
  nvm use 20 >/dev/null
  export PATH="$NVM_DIR/versions/node/$(nvm version)/bin:$PATH"
  log success "Using Node $(node -v)"
  if command -v corepack >/dev/null 2>&1; then
    corepack enable >/dev/null 2>&1 || true
  fi
}

ensure_node

PACKAGE_MANAGER=""

detect_manager() {
  if [[ -n "$MANAGER_OVERRIDE" ]]; then
    PACKAGE_MANAGER="$MANAGER_OVERRIDE"
    return
  fi
  if [[ -f pnpm-lock.yaml ]]; then
    PACKAGE_MANAGER="pnpm"
  elif [[ -f yarn.lock ]]; then
    PACKAGE_MANAGER="yarn"
  elif [[ -f package-lock.json ]]; then
    PACKAGE_MANAGER="npm"
  else
    PACKAGE_MANAGER="pnpm"
  fi
}

detect_manager

prepare_manager() {
  case "$PACKAGE_MANAGER" in
    pnpm)
      corepack prepare pnpm@9 --activate >/dev/null 2>&1 || true
      ;;
    yarn)
      corepack prepare yarn@4 --activate >/dev/null 2>&1 || true
      ;;
    npm)
      ;;
    *)
      log warn "Unknown package manager $PACKAGE_MANAGER"
      ;;
  esac
  log success "Using package manager: $PACKAGE_MANAGER"
}

prepare_manager

WORKSPACE_PATTERNS=()

readarray -t WORKSPACE_PATTERNS < <(node <<'NODE'
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!pkg.workspaces) {
  process.exit(10);
}
let patterns;
if (Array.isArray(pkg.workspaces)) {
  patterns = pkg.workspaces;
} else if (pkg.workspaces && Array.isArray(pkg.workspaces.packages)) {
  patterns = pkg.workspaces.packages;
} else {
  patterns = [];
}
patterns.forEach(p => console.log(p));
NODE
) || true

if [[ ${#WORKSPACE_PATTERNS[@]} -eq 0 ]]; then
  log error "No workspaces defined in package.json"
  exit 10
fi

IFS=',' read -r -a SCOPE_PATTERNS <<< "$SCOPE_FILTER"

matches_scope() {
  local path="$1"
  if [[ -z "$SCOPE_FILTER" ]]; then
    return 0
  fi
  for pattern in "${SCOPE_PATTERNS[@]}"; do
    [[ -z "$pattern" ]] && continue
    if [[ "$path" == $pattern ]] || [[ "$path" == $pattern/* ]]; then
      return 0
    fi
    if [[ "$path" == *${pattern#*/}* ]]; then
      return 0
    fi
  done
  return 1
}

WORKSPACES=(".")
shopt -s nullglob
for pattern in "${WORKSPACE_PATTERNS[@]}"; do
  for dir in $pattern; do
    [[ -d "$dir" && -f "$dir/package.json" ]] || continue
    if matches_scope "$dir"; then
      WORKSPACES+=("$dir")
    fi
  done
done
shopt -u nullglob

if [[ ${#WORKSPACES[@]} -eq 0 ]]; then
  log error "No workspace package.json files found"
  exit 10
fi

if [[ "$MODE" != "report" ]]; then
  BRANCH="chore/deps-doctor-$(date +%Y%m%d-%H%M)"
  if git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
    BRANCH+="-$(date +%s)"
  fi
  git checkout -b "$BRANCH"
  log success "Created branch $BRANCH"
fi

TMP_DIR=$(mktemp -d)
BACKUPS=()
UPDATED_PACKAGES=()
CHANGES_NEED_INSTALL=false

cleanup() {
  local exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    log warn "Restoring package.json backups due to failure"
    for backup in "${BACKUPS[@]}"; do
      IFS='|' read -r original file <<<"$backup"
      cp "$file" "$original"
    done
  fi
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

PIN_RULES=$(cat "$SCRIPT_DIR/maps/pin-rules.json")
DEPRECATED_MAP=$(cat "$SCRIPT_DIR/maps/deprecated-map.json")

get_pin_version() {
  node <<'NODE' "$PIN_RULES" "$1"
const map = JSON.parse(process.argv[2]);
const name = process.argv[3];
if (Object.prototype.hasOwnProperty.call(map, name)) {
  console.log(map[name]);
}
NODE
}

lookup_deprecated() {
  node <<'NODE' "$DEPRECATED_MAP" "$1" "$2"
const map = JSON.parse(process.argv[2]);
const name = process.argv[3];
const version = process.argv[4] || '';
const clean = (range) => {
  if (!range) return '';
  const match = range.match(/(\d+\.\d+\.\d+)/);
  if (!match) return '';
  return match[1];
};
const cmp = (a, b) => {
  const ap = a.split('.').map(Number);
  const bp = b.split('.').map(Number);
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    const av = ap[i] || 0;
    const bv = bp[i] || 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
};
const matchesPattern = (pattern, pkg) => {
  if (pattern.includes('*')) {
    const esc = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${esc}$`).test(pkg);
  }
  return pattern === pkg;
};
for (const [key, value] of Object.entries(map)) {
  let pattern = key;
  let limit = null;
  if (key.includes('@<')) {
    const parts = key.split('@<');
    pattern = parts[0];
    limit = parts[1];
  }
  if (!matchesPattern(pattern, name)) continue;
  if (limit) {
    const current = clean(version);
    if (!current) continue;
    const limitClean = clean(limit);
    if (!limitClean) continue;
    if (cmp(current, limitClean) >= 0) continue;
  }
  console.log(JSON.stringify(value));
  process.exit(0);
}
NODE
}

collect_dependencies() {
  local pkg="$1"
  node <<'NODE' "$pkg"
const fs = require('fs');
const file = process.argv[2];
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
const sections = ['dependencies', 'devDependencies', 'peerDependencies'];
for (const section of sections) {
  const deps = pkg[section] || {};
  for (const [name, range] of Object.entries(deps)) {
    console.log(`${section}|${name}|${range}`);
  }
}
NODE
}

update_dependency() {
  local pkg="$1" section="$2" dep="$3" new_name="$4" new_version="$5"
  node <<'NODE' "$pkg" "$section" "$dep" "$new_name" "$new_version"
const fs = require('fs');
const file = process.argv[2];
const section = process.argv[3];
const dep = process.argv[4];
const newName = process.argv[5];
const newVersion = process.argv[6];
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!pkg[section]) pkg[section] = {};
if (dep !== newName) {
  delete pkg[section][dep];
}
pkg[section][newName] = newVersion;
const content = JSON.stringify(pkg, null, 2) + '\n';
fs.writeFileSync(file, content);
NODE
}

remove_dependency() {
  local pkg="$1" section="$2" dep="$3"
  node <<'NODE' "$pkg" "$section" "$dep"
const fs = require('fs');
const file = process.argv[2];
const section = process.argv[3];
const dep = process.argv[4];
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
if (pkg[section] && Object.prototype.hasOwnProperty.call(pkg[section], dep)) {
  delete pkg[section][dep];
}
const content = JSON.stringify(pkg, null, 2) + '\n';
fs.writeFileSync(file, content);
NODE
}

get_package_name() {
  node <<'NODE' "$1"
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
console.log(pkg.name || '');
NODE
}

is_private_package() {
  node <<'NODE' "$1"
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (pkg.private) process.exit(0);
process.exit(1);
NODE
}

classifications=(DEPRECATED RETIRED INCOMPATIBLE OUTDATED)
declare -A COUNTS
for key in "${classifications[@]}"; do
  COUNTS[$key]=0
 done

REPORT_SECTIONS=()
MANUAL_NOTES=()

run_ncu() {
  local dir="$1"
  (cd "$dir" && npx --yes npm-check-updates --jsonUpgraded --silent --configFilePath "$REPO_ROOT/.ncurc.json") 2>/dev/null || echo '{}'
}

run_outdated() {
  local dir="$1"
  case "$PACKAGE_MANAGER" in
    pnpm)
      pnpm --dir "$dir" outdated --json 2>/dev/null || true
      ;;
    yarn)
      yarn --cwd "$dir" npm outdated --json 2>/dev/null || true
      ;;
    npm)
      (cd "$dir" && npm outdated --json 2>/dev/null || true)
      ;;
    *)
      (cd "$dir" && npm outdated --json 2>/dev/null || true)
      ;;
  esac
}

workspace_reports=()
process_workspace() {
  local dir="$1"
  local pkg_path
  if [[ "$dir" == "." ]]; then
    pkg_path="$REPO_ROOT/package.json"
  else
    pkg_path="$REPO_ROOT/$dir/package.json"
  fi
  log info "Inspecting $dir"
  local upgrades_json
  upgrades_json=$(run_ncu "$dir")
  local outdated_json
  outdated_json=$(run_outdated "$dir")
  local table="| Package | Current | Target | Action | Reason |\n| --- | --- | --- | --- | --- |"
  while IFS='|' read -r section name range; do
    [[ -z "$name" ]] && continue
    local current_range="$range"
    local replacement
    replacement=$(lookup_deprecated "$name" "$range" || true)
    local pin
    pin=$(get_pin_version "$name" || true)
    local target=""
    local action=""
    local reason=""
    local classification=""
    local deprecation_msg=""
    if [[ -n "$replacement" ]]; then
      action="Replace"
      reason=$(node -e "const item=$replacement; console.log(item.reason || '')")
      target=$(node -e "const item=$replacement; console.log(item.replaceWith || '')")
      classification="DEPRECATED"
      COUNTS[DEPRECATED]=$((COUNTS[DEPRECATED]+1))
    elif [[ -n "$pin" ]]; then
      action="Pin"
      target="$pin"
      reason="Pinned for compatibility"
      classification="INCOMPATIBLE"
      COUNTS[INCOMPATIBLE]=$((COUNTS[INCOMPATIBLE]+1))
    fi
    if [[ -z "$target" ]]; then
      target=$(node <<'NODE' "$upgrades_json" "$name"
const upgrades = JSON.parse(process.argv[2]);
const dep = process.argv[3];
console.log(upgrades[dep] || '');
NODE
)
      if [[ -n "$target" ]]; then
        action=${action:-"Update"}
        classification=${classification:-"OUTDATED"}
        COUNTS[OUTDATED]=$((COUNTS[OUTDATED]+1))
      fi
    fi
    if [[ -z "$target" ]]; then
      target="$range"
      action=${action:-"Skip"}
    fi
    deprecation_msg=$(npm view "$name" deprecated 2>/dev/null || true)
    if [[ -n "$deprecation_msg" && "$deprecation_msg" != "undefined" ]]; then
      classification="DEPRECATED"
      action="Replace"
      COUNTS[DEPRECATED]=$((COUNTS[DEPRECATED]+1))
      reason=${reason:-$deprecation_msg}
    fi
    table+=$'\n'"| $name | $current_range | $target | $action | ${reason:-''} |"
    if [[ "$MODE" != "report" && ( "$action" == "Replace" || "$action" == "Pin" || "$action" == "Update" ) ]]; then
      apply_change "$dir" "$pkg_path" "$section" "$name" "$current_range" "$target"
    fi
  done < <(collect_dependencies "$pkg_path")
  workspace_reports+=("## Workspace: ${dir}

${table}
")
  if [[ -n "$outdated_json" ]]; then
    workspace_reports+=("<details><summary>Outdated snapshot</summary>\n\n\`\`\`json\n${outdated_json}\n\`\`\`\n</details>\n")
  fi
}
apply_change() {
  local dir="$1" pkg_path="$2" section="$3" name="$4" current="$5" target="$6"
  [[ "$target" == "$current" ]] && return
  local new_name="$name"
  local new_version="$target"
  if [[ "$target" == *"@"* && "$target" == "$name" ]]; then
    new_version="${target#*@}"
  fi
  if [[ "$MODE" == "report" ]]; then
    return
  fi
  local backup="$TMP_DIR/$(echo "$pkg_path" | tr '/' '_').bak"
  if [[ ! -f "$backup" ]]; then
    cp "$pkg_path" "$backup"
    BACKUPS+=("$pkg_path|$backup")
  fi
  if [[ "$new_name" != "$name" ]]; then
    remove_dependency "$pkg_path" "$section" "$name"
    update_dependency "$pkg_path" "$section" "$new_name" "$new_name" "$new_version"
  else
    update_dependency "$pkg_path" "$section" "$name" "$new_name" "$new_version"
  fi
  CHANGES_NEED_INSTALL=true
  local pkg_name
  pkg_name=$(get_package_name "$pkg_path")
  UPDATED_PACKAGES+=("$pkg_name")
}

for dir in "${WORKSPACES[@]}"; do
  process_workspace "$dir"
done
install_dependencies() {
  if [[ "$MODE" == "report" || "$CHANGES_NEED_INSTALL" != true ]]; then
    return
  fi
  log info "Installing dependencies with $PACKAGE_MANAGER"
  case "$PACKAGE_MANAGER" in
    pnpm)
      pnpm install --no-frozen-lockfile
      ;;
    yarn)
      yarn install --mode update-lockfile
      ;;
    npm)
      npm install
      ;;
  esac
}

install_dependencies

if [[ "$MODE" == "migrate" ]]; then
  COD_FLAGS=()
  if rg "from 'next'" -g'*.{ts,tsx,js,jsx}' >/dev/null 2>&1; then COD_FLAGS+=(--next); fi
  if rg "@tanstack/react-query" >/dev/null 2>&1; then COD_FLAGS+=(--rq); fi
  if rg "@nestjs/core" >/dev/null 2>&1; then COD_FLAGS+=(--nest); fi
  if rg "prisma" -g'schema.prisma' prisma >/dev/null 2>&1; then COD_FLAGS+=(--prisma); fi
  if rg "tailwind" -g'tailwind.config.*' >/dev/null 2>&1; then COD_FLAGS+=(--tailwind); fi
  if rg "eslint" -g'.eslintrc*' >/dev/null 2>&1; then COD_FLAGS+=(--eslint); fi
  if [[ ${#COD_FLAGS[@]} -gt 0 ]]; then
    bash "$SCRIPT_DIR/codemods/run-codemods.sh" "${COD_FLAGS[@]}" || { log error "Codemods failed"; exit 31; }
  else
    log info "No codemods required"
  fi
fi
create_changeset() {
  [[ "$MODE" == "report" ]] && return
  local non_private=()
  for pkg in "${UPDATED_PACKAGES[@]}"; do
    [[ -z "$pkg" ]] && continue
    local path
    path=$(rg --files-with-matches "\"name\": \"$pkg\"" -g'package.json' || true)
    if [[ -n "$path" ]]; then
      if ! is_private_package "$path"; then
        non_private+=("$pkg")
      fi
    fi
  done
  if [[ ${#non_private[@]} -eq 0 ]]; then
    return
  fi
  local file=".changeset/deps-doctor-$(date +%Y%m%d%H%M).md"
  {
    echo "---"
    for pkg in "${non_private[@]}"; do
      echo "$pkg: patch"
    done
    echo "---"
    echo
    echo "Upgrade dependencies via deps doctor."
  } > "$file"
  git add "$file"
}

create_changeset
REPORT_PATH="$SCRIPT_DIR/DEPS_REPORT.md"
{
  echo "# Dependency Doctor Report"
  echo
  echo "> Generated $(date -Iseconds) via scripts/deps-doctor.sh ($MODE mode)."
  echo
  echo "## Executive Summary"
  echo
  echo "| Status | Count |"
  echo "| --- | --- |"
  for key in "${classifications[@]}"; do
    echo "| $key | ${COUNTS[$key]} |"
  done
  echo
  echo "## Workspace Findings"
  echo
  for section in "${workspace_reports[@]}"; do
    echo "$section"
  done
  echo "## Migration Notes"
  cat <<'NOTES'

- ESLint 9 requires flat configuration (`eslint.config.js`). Convert legacy `.eslintrc.*` files via `npx @eslint/migrate-config`.
- Next.js 14 adopts the App Router. Review mixed `/pages` and `/app` routing; the doctor leaves both in place but recommends consolidating gradually.
- React 18 enables Strict Mode double-invocation. Audit side-effects and convert to `useEffect` safe patterns. React Query v5 changes the default exports; run the provided codemod when upgrading.
- Tailwind CSS 3.4 deprecates several plugin helpers (`@tailwindcss/custom-forms`). Swap to official `forms`/`typography` packages.
- Prisma 5 updates the query engine. Always run `npx prisma generate` after dependency bumps.
- Node 20 enforces ESM semantics for packages like `chalk` and `undici`. Update import syntax to `import chalk from 'chalk'`.

## Manual Follow-ups

NOTES
  if [[ ${#MANUAL_NOTES[@]} -gt 0 ]]; then
    for note in "${MANUAL_NOTES[@]}"; do
      echo "- $note"
    done
  else
    echo "- None"
  fi
  cat <<'COMMANDS'

## Commands

- Re-run report: `scripts/deps-doctor.sh --report`
- Apply fixes: `scripts/deps-doctor.sh --fix`
- Apply fixes + codemods: `scripts/deps-doctor.sh --migrate`
- Revert changes: `git reset --hard && git clean -fd`

## Next Steps

1. Review this report.
2. Execute fixes if acceptable.
3. Run migrations and codemods as required.
4. Smoke test each workspace application.
5. Push the `chore/deps-doctor-*` branch and open a PR.
COMMANDS
} > "$REPORT_PATH"

git add "$REPORT_PATH" "$SCRIPT_DIR/maps/deprecated-map.json" "$SCRIPT_DIR/maps/pin-rules.json" "$SCRIPT_DIR/codemods/run-codemods.sh" .ncurc.json .changeset/README.md >/dev/null 2>&1 || true

if [[ "$MODE" != "report" ]]; then
  git add package.json **/package.json 2>/dev/null || true
  install_dependencies
  git add pnpm-lock.yaml yarn.lock package-lock.json 2>/dev/null || true
fi

if [[ "$CI_MODE" == true && ${COUNTS[DEPRECATED]} -gt 0 ]]; then
  log error "Deprecated packages detected"
  exit 32
fi

log success "Dependency doctor completed"

if [[ "$MODE" != "report" ]]; then
  log info "Run git status to review changes, then commit."
fi
