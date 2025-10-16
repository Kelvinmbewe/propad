#!/usr/bin/env bash
set -uo pipefail

START_DIR=$(pwd -P)

TMP_LOG=$(mktemp)
LOG_FILE=""

cleanup() {
  if [[ -n "${TMP_LOG:-}" && -f "$TMP_LOG" ]]; then
    rm -f "$TMP_LOG"
  fi
}
trap cleanup EXIT

exec > >(tee -a "$TMP_LOG") 2>&1

COLOR_RESET="\033[0m"
COLOR_INFO="\033[1;34m"
COLOR_WARN="\033[1;33m"
COLOR_ERROR="\033[1;31m"

print_info() {
  printf "%b%s%b\n" "$COLOR_INFO" "$1" "$COLOR_RESET"
}

print_warn() {
  printf "%b%s%b\n" "$COLOR_WARN" "$1" "$COLOR_RESET"
}

print_error() {
  printf "%b%s%b\n" "$COLOR_ERROR" "$1" "$COLOR_RESET" >&2
}

usage() {
  cat <<USAGE
Usage: workspace-fix.sh [options]

Options:
  --force-pnpm      Force pnpm usage regardless of lockfile
  --force-yarn      Force yarn usage regardless of lockfile
  --clean           Remove root node_modules before installing
  --yes             Skip confirmation prompts
  --help            Show this message
USAGE
}

version_ge() {
  local v1="$1" v2="$2"
  if [[ "$v1" == "$v2" ]]; then
    return 0
  fi
  local sorted
  sorted=$(printf '%s\n%s\n' "$v1" "$v2" | sort -V | tail -n1)
  [[ "$sorted" == "$v1" ]]
}

find_repo_root() {
  local dir=$(pwd)
  local candidate=""
  while :; do
    if [[ -f "$dir/package.json" ]] && grep -q '"workspaces"' "$dir/package.json" 2>/dev/null; then
      candidate="$dir"
    fi
    if [[ "$dir" == "/" ]]; then
      break
    fi
    dir=$(dirname "$dir")
  done
  if [[ -n "$candidate" ]]; then
    printf '%s' "$candidate"
    return 0
  fi
  return 1
}

FORCE_MANAGER=""
CLEAN_NODE_MODULES=false
ASSUME_YES=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force-pnpm)
      if [[ "$FORCE_MANAGER" == "yarn" ]]; then
        print_error "Cannot use --force-pnpm and --force-yarn together."
        exit 1
      fi
      FORCE_MANAGER="pnpm"
      ;;
    --force-yarn)
      if [[ "$FORCE_MANAGER" == "pnpm" ]]; then
        print_error "Cannot use --force-pnpm and --force-yarn together."
        exit 1
      fi
      FORCE_MANAGER="yarn"
      ;;
    --clean)
      CLEAN_NODE_MODULES=true
      ;;
    --yes)
      ASSUME_YES=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      print_error "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

REPO_ROOT=""
if REPO_ROOT=$(find_repo_root); then
  :
else
  print_error "No monorepo root with workspaces found from current directory."
  if [[ -n "${TMP_LOG:-}" && -f "$TMP_LOG" ]]; then
    local_fallback="$(pwd)/scripts/workspace-fix.log"
    mkdir -p "$(dirname "$local_fallback")"
    cat "$TMP_LOG" >> "$local_fallback"
    print_warn "Log captured at $local_fallback"
  fi
  exit 10
fi

LOG_FILE="$REPO_ROOT/scripts/workspace-fix.log"
mkdir -p "$(dirname "$LOG_FILE")"
cat "$TMP_LOG" >> "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1
rm -f "$TMP_LOG"
TMP_LOG=""

print_info "Monorepo root detected at: $REPO_ROOT"

if [[ ! -f "$REPO_ROOT/.nvmrc" ]] || [[ $(tr -d ' \n\r' < "$REPO_ROOT/.nvmrc") != "20" ]]; then
  print_info "Writing Node version 20 to $REPO_ROOT/.nvmrc"
  printf '20\n' > "$REPO_ROOT/.nvmrc"
fi

load_nvm() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
    if [[ -s "$NVM_DIR/bash_completion" ]]; then
      # shellcheck disable=SC1090
      . "$NVM_DIR/bash_completion"
    fi
    return 0
  fi
  return 1
}

ensure_nvm() {
  if command -v nvm >/dev/null 2>&1; then
    load_nvm && return 0
  fi
  print_warn "nvm not found. Installing nvm to manage Node 20 locally."
  if ! command -v curl >/dev/null 2>&1; then
    print_error "curl is required to install nvm."
    exit 20
  fi
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  if [[ -s "$HOME/.bashrc" ]]; then
    # shellcheck disable=SC1090
    . "$HOME/.bashrc"
  fi
  if [[ -s "$HOME/.profile" ]]; then
    # shellcheck disable=SC1090
    . "$HOME/.profile"
  fi
  if ! load_nvm; then
    print_error "Failed to load nvm after installation."
    exit 20
  fi
}

ensure_nvm

if ! nvm install 20; then
  print_error "nvm failed to install Node 20."
  exit 20
fi
if ! nvm use 20; then
  print_error "nvm failed to activate Node 20."
  exit 20
fi

NODE_VERSION=$(node -v 2>/dev/null || true)
if [[ -z "$NODE_VERSION" ]]; then
  print_error "Node executable not found after nvm setup."
  exit 20
fi
NODE_VERSION_STRIPPED="${NODE_VERSION#v}"
if ! version_ge "$NODE_VERSION_STRIPPED" "18"; then
  print_error "Node version $NODE_VERSION is below the required minimum of 18."
  exit 20
fi

print_info "Node active version: $NODE_VERSION"

if ! command -v corepack >/dev/null 2>&1; then
  print_error "corepack command not found. It should be bundled with Node 20."
  exit 20
fi

if ! corepack enable; then
  print_warn "corepack enable reported an issue. Continuing regardless."
fi

SELECTED_MANAGER=""
LOCK_SOURCE=""
if [[ -n "$FORCE_MANAGER" ]]; then
  SELECTED_MANAGER="$FORCE_MANAGER"
  print_warn "Package manager force-selected via flag: $SELECTED_MANAGER"
else
  if [[ -f "$REPO_ROOT/pnpm-lock.yaml" ]]; then
    SELECTED_MANAGER="pnpm"
    LOCK_SOURCE="pnpm-lock.yaml"
  elif [[ -f "$REPO_ROOT/yarn.lock" ]]; then
    SELECTED_MANAGER="yarn"
    LOCK_SOURCE="yarn.lock"
  elif [[ -f "$REPO_ROOT/package-lock.json" ]]; then
    SELECTED_MANAGER="npm"
    LOCK_SOURCE="package-lock.json"
  else
    SELECTED_MANAGER="npm"
    LOCK_SOURCE="(no lockfile detected; defaulting to npm)"
  fi
fi

if [[ -z "$SELECTED_MANAGER" ]]; then
  print_error "Unable to determine a package manager."
  exit 30
fi

if [[ -n "$LOCK_SOURCE" ]]; then
  print_info "Lockfile decision: $LOCK_SOURCE -> $SELECTED_MANAGER"
fi

case "$SELECTED_MANAGER" in
  pnpm)
    if ! corepack prepare pnpm@9 --activate; then
      print_error "Failed to activate pnpm via corepack."
      exit 30
    fi
    PM_VERSION=$(pnpm --version 2>/dev/null || true)
    ;;
  yarn)
    if ! corepack prepare yarn@stable --activate; then
      print_error "Failed to activate yarn via corepack."
      exit 30
    fi
    PM_VERSION=$(yarn --version 2>/dev/null || true)
    ;;
  npm)
    PM_VERSION=$(npm --version 2>/dev/null || true)
    if [[ -z "$PM_VERSION" ]]; then
      print_error "npm is not available."
      exit 30
    fi
    if ! version_ge "$PM_VERSION" "9"; then
      print_error "npm $PM_VERSION is too old for workspace support."
      print_warn "Run: sudo npm i -g npm@latest"
      print_warn "Or switch to pnpm: corepack prepare pnpm@9 --activate && pnpm install"
      exit 30
    fi
    ;;
  *)
    print_error "Unknown package manager selection: $SELECTED_MANAGER"
    exit 30
    ;;
 esac

cd "$REPO_ROOT"

if [[ "$START_DIR" != "$REPO_ROOT" ]]; then
  case "$START_DIR" in
    "$REPO_ROOT"/*)
      REL_PATH="${START_DIR#$REPO_ROOT/}"
      if [[ "$REL_PATH" == apps/* || "$REL_PATH" == packages/* ]]; then
        print_warn "Detected execution from $REL_PATH. Dependency installs run at repository root ($REPO_ROOT)."
      else
        print_info "Running install from repository root ($REPO_ROOT)."
      fi
      ;;
    *)
      print_warn "Script invoked outside of repository root. Operations run from $REPO_ROOT."
      ;;
  esac
fi

if $CLEAN_NODE_MODULES; then
  if [[ -d "$REPO_ROOT/node_modules" ]]; then
    if $ASSUME_YES; then
      RESPONSE="y"
    else
      read -r -p "Remove $REPO_ROOT/node_modules before reinstall? [y/N] " RESPONSE
    fi
    case "$RESPONSE" in
      y|Y|yes|YES)
        print_warn "Removing $REPO_ROOT/node_modules"
        rm -rf "$REPO_ROOT/node_modules"
        ;;
      *)
        print_info "Skipping node_modules removal."
        ;;
    esac
  else
    print_info "No root node_modules directory to remove."
  fi
fi

INSTALL_CMD=("$SELECTED_MANAGER" "install")
if [[ "$SELECTED_MANAGER" == "npm" ]]; then
  INSTALL_CMD=("npm" "install")
fi

print_info "Running install using ${INSTALL_CMD[*]}"
if ! "${INSTALL_CMD[@]}"; then
  print_error "Dependency installation failed with $SELECTED_MANAGER."
  print_warn "Last 50 lines from $LOG_FILE:"
  tail -n 50 "$LOG_FILE" || true
  exit 30
fi

print_info "Install completed successfully."

case "$SELECTED_MANAGER" in
  pnpm)
    PM_VERSION=$(pnpm --version 2>/dev/null || echo "unknown")
    ;;
  yarn)
    PM_VERSION=$(yarn --version 2>/dev/null || echo "unknown")
    ;;
  npm)
    PM_VERSION=$(npm --version 2>/dev/null || echo "unknown")
    ;;
 esac

print_info "Summary:"
print_info "  Node version  : $NODE_VERSION"
print_info "  Manager       : $SELECTED_MANAGER ${PM_VERSION:+(v$PM_VERSION)}"
print_info "  Monorepo root : $REPO_ROOT"
print_info "Next steps: run your package manager scripts from the monorepo root."

exit 0
