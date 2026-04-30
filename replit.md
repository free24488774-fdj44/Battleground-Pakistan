# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Ranjha (Battle Royale prototype)

Located at `artifacts/ranjha`. React + Vite + Tailwind v4, wouter, framer-motion, lucide-react. State persisted to `localStorage` via `GameContext`.

Key gameplay systems:
- **Economy** — coins + diamonds. New players start at level 1 with 10,000 coins, 0 diamonds, and free starter items: Ranjha (char_1), Squirrel pet, AK-47, Glock-18, Mughal Fury & Sindhi Shield skills.
  - Character price formula: `12,000 + pow(unlockLevel, 2.4) * 30`, capped at 10,000,000 (Lvl 200).
  - Pet price by rarity: Common 500c+30d → Mythic 500,000c+5,000d.
  - Gun price by category: Pistols 1,000c → Snipers 30,000c.
  - Skills: first two free; rest 8,000–20,000 coins.
  - Battle rewards: 50 coins + 25 XP per kill, +100c/50xp top-10, +500c/250xp win, +50c/25xp survive. Level-up grants +50 diamonds. `xpForLevel(level) = 500 * level`.
- **Ownership tracking** — `ownedCharacters/Pets/Guns/Skills` arrays in profile; `purchaseX` returns `PurchaseResult`; legacy saves migrated automatically.
- **AI Bots** — solo mode opponents are labeled "AI Bots" (Bot icon in killfeed + lobby badge); enemy damage tick 5.5s vs 7s, multiplier 1.3x, kill feed cadence 3.2s vs 4.5s.
