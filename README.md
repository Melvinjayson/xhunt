# X-hunt — AI Mission Operating System

Turn goals into verified outcomes at scale. X-hunt is a full-stack AI-native platform that orchestrates mission programmes, validates real-world outcomes, manages outcome-based escrow payments, and generates revenue intelligence — for enterprises, brands, educators, and government.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.7 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (`@theme` block in `globals.css`) |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Database | Supabase (PostgreSQL + Realtime) |
| Payments | Stripe (subscriptions, checkout, webhooks) |
| AI — Consumer | Groq SDK (`llama-3.1-8b` trial · `llama-3.3-70b` pro) |
| AI — Admin Agents | Anthropic SDK (Claude) |
| Animations | Framer Motion 12 |
| Icons | Lucide React |

---

## Repository Structure

```
xhunt/
├── src/
│   ├── app/
│   │   ├── (marketing)/          # Public marketing site — all unauthenticated
│   │   │   ├── page.tsx          # Homepage — /
│   │   │   ├── consumer/         # /consumer
│   │   │   ├── enterprise/       # /enterprise
│   │   │   ├── use-cases/        # /use-cases
│   │   │   ├── marketplace/      # /marketplace
│   │   │   ├── mission-control/  # /mission-control
│   │   │   ├── pricing/          # /pricing
│   │   │   ├── about/            # /about
│   │   │   ├── contact/          # /contact
│   │   │   ├── developers/       # /developers
│   │   │   └── developers/api/   # /developers/api
│   │   ├── admin/                # Tenant admin dashboard — role-gated
│   │   │   ├── layout.tsx        # Role check: platform_admin | tenant_admin | mission_creator | analyst
│   │   │   ├── page.tsx          # /admin — overview
│   │   │   ├── missions/         # /admin/missions  (list, new, [id])
│   │   │   ├── agents/           # /admin/agents    — AI agent console
│   │   │   ├── outcomes/         # /admin/outcomes  — MEI leaderboard
│   │   │   │   └── validation/   # /admin/outcomes/validation — validation queue
│   │   │   ├── revenue/          # /admin/revenue   — Revenue Manager
│   │   │   ├── escrow/           # /admin/escrow    — Escrow Services
│   │   │   ├── knowledge-graph/  # /admin/knowledge-graph
│   │   │   ├── analytics/        # /admin/analytics
│   │   │   ├── governance/       # /admin/governance
│   │   │   ├── audience/         # /admin/audience
│   │   │   ├── rewards/          # /admin/rewards
│   │   │   ├── users/            # /admin/users
│   │   │   └── settings/         # /admin/settings
│   │   ├── api/                  # API routes
│   │   │   ├── agents/           # AI agent endpoints (6 specialised agents)
│   │   │   ├── ai-assist/        # Groq-powered chat (rate-limited, tiered)
│   │   │   ├── adapt-step/       # Adaptive step generation
│   │   │   ├── generate-hunts/   # Mission generation (Groq)
│   │   │   ├── mei/compute/      # POST — recompute MEI for all tenant missions
│   │   │   ├── outcomes/
│   │   │   │   └── validations/  # GET list + POST create; PATCH [id] (review)
│   │   │   ├── escrow/           # GET list + POST create; POST [id]/release; POST [id]/dispute
│   │   │   ├── revenue/          # GET summary + records + POST record; /invoices GET + POST
│   │   │   ├── recommendations/  # Personalised mission recommendations
│   │   │   ├── stripe/           # /checkout POST; /webhook POST
│   │   │   ├── subscription/     # /status GET
│   │   │   ├── trial/            # /start POST
│   │   │   ├── live/             # Live session CRUD + step advance
│   │   │   └── timeline/         # Feed, post, react
│   │   ├── auth/                 # /auth/login, /signup, /callback
│   │   ├── home/                 # /home — consumer dashboard
│   │   ├── missions/             # /missions — mission browser (freemium-gated)
│   │   ├── hunt/[id]/            # /hunt/:id — active mission
│   │   ├── complete/[id]/        # /complete/:id — mission completion + share
│   │   ├── timeline/             # /timeline — TikTok-style experience feed
│   │   ├── live/[id]/            # /live/:id — live session viewer
│   │   ├── explore/              # /explore — mission discovery
│   │   ├── profile/              # /profile — user profile
│   │   ├── upgrade/              # /upgrade — plan selection (free → trial → pro)
│   │   ├── get-started/          # /get-started — consumer onboarding
│   │   └── onboard/              # /onboard — workspace/tenant setup
│   ├── components/
│   │   ├── marketing/            # Nav.tsx, Footer.tsx (both 'use client')
│   │   ├── admin/                # AdminSidebar.tsx
│   │   ├── AIAssistant.tsx       # Floating AI chat (Groq-powered)
│   │   ├── BottomNav.tsx         # Consumer app bottom nav (5 items)
│   │   └── HuntCard.tsx          # Mission card component
│   └── lib/
│       ├── supabase/             # client.ts, server.ts, types.ts, events.ts
│       ├── agents/               # auth.ts, prompts.ts, types.ts
│       ├── ai-router.ts          # Anthropic SDK wrapper
│       ├── groq.ts               # Groq client + modelForTier()
│       ├── freemium.ts           # getUserTierInfo()
│       ├── rate-limit.ts         # checkAndIncrementRateLimit()
│       ├── stripe.ts             # Stripe client + STRIPE_PRICES
│       ├── schemas.ts            # Zod schemas
│       ├── store.ts              # localStorage AppState
│       ├── mockHunts.ts          # Mock data fallback
│       ├── types.ts              # Shared types
│       └── cn.ts                 # clsx + tailwind-merge
├── supabase/
│   ├── migrations/
│   │   ├── 002_sprint2.sql
│   │   ├── 003_phase2.sql
│   │   ├── 004_production.sql
│   │   ├── 005_public_read.sql
│   │   ├── 006_freemium.sql       # subscription_tier, trial, rate_limit_config
│   │   ├── 007_stripe.sql         # stripe_customer_id, subscription fields
│   │   ├── 008_timeline.sql       # experience_posts, live_sessions, post_reactions
│   │   ├── 009_reminder.sql       # trial_reminder_sent, pg_cron
│   │   ├── 010_outcomes_validation.sql  # outcome_validations + RLS
│   │   └── 011_revenue_escrow.sql       # escrow_accounts, escrow_transactions,
│   │                                    # revenue_records, invoices + RLS
│   └── functions/
│       └── trial-reminder/       # Deno edge function — Resend email via pg_cron
└── public/
    └── manifest.json             # PWA manifest
```

---

## Route Access Matrix

| Route group | Auth required | Roles |
|---|---|---|
| `(marketing)/*` | No | Public |
| `/get-started`, `/auth/*` | No | Public |
| `/home`, `/missions`, `/timeline`, `/live/*`, `/hunt/*`, `/complete/*`, `/explore`, `/profile`, `/upgrade` | Yes | Any authenticated user |
| `/admin/*`, `/onboard` | Yes | platform_admin · tenant_admin · mission_creator · analyst |
| `/api/outcomes/validations` (PATCH) | Yes | platform_admin · tenant_admin · analyst |
| `/api/escrow` (POST) | Yes | platform_admin · tenant_admin |
| `/api/escrow/[id]/release` | Yes | platform_admin · tenant_admin |
| `/api/escrow/[id]/dispute` | Yes | Any tenant member |
| `/api/revenue` (POST) | Yes | platform_admin · tenant_admin |
| `/api/stripe/webhook` | No (Stripe signature) | Stripe only |

---

## Modules

### Outcomes Intelligence & Validation

Every mission outcome goes through a structured validation pipeline before being counted in the MEI.

**Validation types:** `self_reported` · `peer_verified` · `automated` · `manager_verified`

**Evidence types:** `screenshot` · `document` · `url` · `metric` · `attestation` · `certificate`

**Validation lifecycle:**
```
submitted → pending → under_review → approved / rejected / requires_evidence
```

**Confidence score:** Reviewers assign 0–100% confidence during approval. Scores feed into the MEI `outcome_score` component.

**Admin interface:** `/admin/outcomes/validation` — queue with expand/collapse evidence panels, reviewer notes, confidence slider.

**API:**
```
POST   /api/outcomes/validations          Create validation submission
GET    /api/outcomes/validations          List (filter: status, mission_id)
GET    /api/outcomes/validations/:id      Single validation detail
PATCH  /api/outcomes/validations/:id      Review (approve / reject / request evidence)
```

---

### Mission Effectiveness Index (MEI)

Composite score recomputed on demand via `POST /api/mei/compute`.

| Component | Weight | Source |
|---|---|---|
| Completion Rate | 40% | `mission_progress.completed_at` |
| Engagement Depth | 25% | avg completed steps / target steps |
| Retention Rate | 20% | users who returned for 2+ missions |
| Outcome Score | 15% | `outcome_events` / completions |

Scores are persisted in `mission_scores` and surfaced in `/admin/outcomes`.

---

### Revenue Manager

Tracks all revenue streams, generates invoices, and provides period summaries.

**Revenue categories:** `subscription` · `mission_fee` · `outcome_bonus` · `escrow_release` · `api_usage` · `professional_services`

Escrow releases **automatically** write a `revenue_records` entry with `category: 'escrow_release'`.

Invoice numbers follow the pattern `INV-YYYY-NNNN` (tenant-scoped).

**Admin interface:** `/admin/revenue` — summary cards (Total / MRR / ARR / Open Invoices), category bar chart, records table, invoice modal.

**API:**
```
GET    /api/revenue                       Summary + records (filter: category, from, to)
POST   /api/revenue                       Manual record
GET    /api/revenue/invoices              Invoice list (filter: status)
POST   /api/revenue/invoices              Generate invoice with line items
```

---

### Escrow Services

Outcome-gated payment escrow. Funds are held until release conditions are satisfied.

**Release conditions:**

| Condition | Config |
|---|---|
| `mei_threshold` | `{ threshold: 75 }` — release when MEI ≥ threshold |
| `outcome_count` | `{ count: 10 }` — release when N outcomes validated |
| `manual_approval` | No config — admin manually releases |
| `deadline_based` | `{ deadline: "2025-09-30" }` — release at date |
| `hybrid` | `{ mei_threshold: 70, outcome_count: 5 }` — both conditions |

**Escrow lifecycle:**
```
created → funded → locked → partially_released / fully_released
                         ↘ disputed → (admin resolution) → refunded / released
```

Every action writes an `escrow_transactions` row (audit trail). Release auto-writes `revenue_records`.

**Admin interface:** `/admin/escrow` — progress rings, release/dispute workflow, create modal.

**API:**
```
GET    /api/escrow                         List accounts (filter: status, mission_id)
POST   /api/escrow                         Create escrow account
POST   /api/escrow/:id/release             Release funds (full or partial)
POST   /api/escrow/:id/dispute             Open dispute with reason
```

---

### Freemium & Subscriptions

| Tier | AI requests/day | Missions | Model |
|---|---|---|---|
| `free` | 0 | Public only | — |
| `trial` | 50 | All incl. premium | llama-3.1-8b |
| `pro` | 500 | All incl. premium | llama-3.3-70b |

Trial starts via `POST /api/trial/start` (14-day window). Pro upgrade flows through Stripe checkout (`POST /api/stripe/checkout`). Webhook at `POST /api/stripe/webhook` handles subscription lifecycle.

---

### AI Agents

Six specialised agents powered by Anthropic Claude (admin) and Groq (consumer):

| Agent | Route | Role |
|---|---|---|
| Mission Architect | `/api/agents/mission-architect` | Decomposes goals into structured missions |
| Outcome Planner | `/api/agents/outcome-planner` | Maps goals to measurable KPIs |
| Experience Designer | `/api/agents/experience-designer` | Engagement layer, rewards, narrative |
| Behavioral Analyst | `/api/agents/behavioral-analyst` | Dynamic adaptation from participant signals |
| Knowledge Agent | `/api/agents/knowledge-agent` | Contextual knowledge surfacing |
| Insight Analyst | `/api/agents/insight-analyst` | Synthesis and predictive insights |

---

### Timeline & Live Sessions

- **`/timeline`** — TikTok-style vertical feed of completions, moments, highlights
- **`/live/[id]`** — Real-time live session via Supabase Realtime (postgres_changes)
- **Go Live** — Pro-only; host live mission sessions with step-advance controls
- **Share Moment** — Any authenticated user can post to the timeline

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PRO_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# AI
GROQ_API_KEY=                   # gsk_... — consumer AI (freemium)
ANTHROPIC_API_KEY=              # sk-ant-... — admin AI agents

# Email (trial reminders via edge function)
RESEND_API_KEY=
FROM_EMAIL=
APP_URL=
```

---

## Database Migrations

Apply in order via Supabase dashboard SQL editor or `supabase db push`:

```bash
supabase db push
```

| Migration | Content |
|---|---|
| `002_sprint2.sql` | Audience segments, reward configs, audit logs, mission approvals |
| `003_phase2.sql` | Knowledge graph (kg_nodes, kg_edges), mission scores, outcome events/roadmaps |
| `004_production.sql` | Production hardening, indexes |
| `005_public_read.sql` | Public read policies for published missions |
| `006_freemium.sql` | subscription_tier, trial timestamps, AI rate limits |
| `007_stripe.sql` | Stripe customer/subscription fields on user_profiles |
| `008_timeline.sql` | experience_posts, live_sessions, post_reactions + REPLICA IDENTITY FULL |
| `009_reminder.sql` | trial_reminder_sent flag + pg_cron setup comments |
| `010_outcomes_validation.sql` | outcome_validations table with RLS |
| `011_revenue_escrow.sql` | escrow_accounts, escrow_transactions, revenue_records, invoices with RLS |

---

## Development

```bash
npm install
npm run dev          # Turbopack dev server → http://localhost:3000
npm run build        # Production build
npm run lint
```

> **Note:** This project uses Next.js 16 with breaking changes from 15. `params` in dynamic routes is a `Promise` — use `useParams()` in client components or `await params` in server components. Middleware is at `src/proxy.ts` (not `middleware.ts`). See `AGENTS.md` for full details.

---

## Supabase Edge Functions

```bash
supabase functions deploy trial-reminder
# Requires: RESEND_API_KEY, FROM_EMAIL, APP_URL in Supabase secrets
# Triggered daily by pg_cron (see 009_reminder.sql)
```

---

## PWA

`public/manifest.json` is present. Add the following assets to `/public/` for full PWA support:
- `icon-192.png`
- `icon-512.png`
- `og-image.png`
