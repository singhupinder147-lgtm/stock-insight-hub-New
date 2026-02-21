# TradeVault - Stock Research & Management Platform

## Overview

TradeVault is a stock research and management web application that allows users to manage unlimited stock symbols, organize them into custom watchlists/shortlists, view fundamental financial data (shareholding patterns, quarterly results, profit/loss), calculate risk-reward metrics, and open TradingView charts via external links. The app targets Indian NSE stocks and uses a TradingView-inspired dark theme.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (dark theme by default, TradingView-inspired)
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers
- **Build Tool**: Vite
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend
- **Runtime**: Node.js with TypeScript (tsx for dev, esbuild for production)
- **Framework**: Express 5
- **API Pattern**: REST API with routes defined in `shared/routes.ts` as a typed contract (method, path, input/output schemas)
- **Validation**: Zod schemas shared between client and server via `shared/` directory

### Data Layer
- **Database**: PostgreSQL (required, connection via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema-to-validation integration
- **Schema Location**: `shared/schema.ts` — defines all tables, relations, and insert schemas
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization

### Database Schema
Four main tables:
1. **stocks** — `id`, `symbol` (unique), `name`, `addedAt`
2. **lists** — `id`, `name`, `description`, `createdAt` (custom watchlists/shortlists)
3. **list_items** — `id`, `listId`, `stockId`, `addedAt` (many-to-many join between stocks and lists)
4. **fundamentals** — `id`, `stockId` (unique), `shareholding` (JSONB), `quarterlyResults` (JSONB), `profitLoss` (JSONB), `updatedAt`

### API Structure
All API endpoints are prefixed with `/api/`:
- **Stocks**: `GET /api/stocks`, `GET /api/stocks/:id`, `POST /api/stocks/bulk`, `DELETE /api/stocks/:id`, `GET /api/stocks/search?query=`
- **Lists**: `GET /api/lists`, `POST /api/lists`, `DELETE /api/lists/:id`, `GET /api/lists/:id/items`, `POST /api/lists/:id/items`, `DELETE /api/lists/:listId/items/:stockId`
- **Fundamentals**: Returned embedded in stock detail responses

### Key Pages
- **Dashboard** (`/` and `/lists/:id`): Shows all stocks or stocks in a specific list, with search filtering and bulk add capability
- **Stock Detail** (`/stocks/:id`): Shows individual stock info, fundamentals viewer, risk calculator, and TradingView external link
- **Not Found**: 404 fallback page

### Shared Code (`shared/` directory)
- `schema.ts`: Drizzle table definitions, relations, Zod insert schemas — shared between frontend and backend
- `routes.ts`: Typed API contract with paths, methods, input schemas, and response schemas — used by both client hooks and server route handlers

### Build & Development
- **Dev**: `npm run dev` — runs tsx with Vite dev server middleware for HMR
- **Build**: `npm run build` — Vite builds client to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Production**: `npm start` — serves built assets via Express static middleware with SPA fallback
- **DB Push**: `npm run db:push` — pushes schema changes to PostgreSQL via Drizzle Kit

## External Dependencies

- **PostgreSQL**: Primary database, connected via `DATABASE_URL` environment variable. Uses `pg` (node-postgres) connection pool with `connect-pg-simple` for session storage capability.
- **TradingView**: External links only (no embedded charts). Stock symbols link to `https://www.tradingview.com/chart/?symbol=NSE:{SYMBOL}` opening in new tabs.
- **Google Fonts**: Inter and JetBrains Mono fonts loaded via CSS import and Google Fonts link tags.
- **Replit Plugins**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` — development-only Replit integration plugins.