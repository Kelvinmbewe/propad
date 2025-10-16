# Workspace Fix (Monorepo)

## What this does
- Ensures Node 20 via **nvm** (user-space, no sudo)
- Enables **Corepack** and selects the correct package manager based on the lockfile:
  - `pnpm-lock.yaml` → pnpm
  - `yarn.lock` → yarn
  - `package-lock.json` + "workspaces" → npm (requires npm ≥ 9)
- Installs dependencies **from the monorepo root**, not from app subfolders.

## Quick Start
```bash
chmod +x scripts/workspace-fix.sh
bash scripts/workspace-fix.sh
```

## Helpful Flags
- `--clean` – remove root `node_modules` before installing (prompts unless `--yes`)
- `--force-pnpm` / `--force-yarn` – override the lockfile decision
- `--yes` – auto-confirm cleanup prompts
