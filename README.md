# AgriRevolution

Agri-fintech platform for smallholder farmers in Tamale Metro and its environs —
climate-smart planting guidance, on-demand mechanized equipment paid via MoMo,
AI-graded produce sales, and a voice/USSD interface for low-literacy access.

This is a monorepo with three deployable pieces:

```
agrirevolution/
├── backend/    Django REST API (Railway) — six apps, one per solution-statement pillar
├── frontend/   React + TypeScript web dashboard (dealers, buyers, admin)
├── mobile/     Expo React Native app (farmer-facing, primary interface)
└── docs/       Architecture notes, ADRs
```

## How the apps map to the solution

| Solution statement piece                        | Backend app     | Consumed by |
|--------------------------------------------------|-----------------|-------------|
| AI climate/weather predictions for timing        | `weather`       | mobile (Weather tab), USSD menu 1 |
| On-demand mechanized equipment, pay via MoMo      | `equipment`, `payments` | mobile (Equipment tab), USSD menu 2 |
| AI photo grading + fair price bands for produce   | `marketplace`   | mobile (Marketplace tab), USSD menu 3, frontend (buyer portal) |
| Voice/USSD interface for low-literacy access      | `ussd`          | Africa's Talking webhooks |
| Cross-cutting alerts                              | `notifications` | SMS / push / voice |
| Users: farmers, dealers, buyers, admin            | `accounts`      | all three clients |

## Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in AT_*, HUBTEL_*, ANTHROPIC_API_KEY, etc.
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Deploys to Railway via `Procfile` / `railway.json` (Postgres auto-provisions `DATABASE_URL`).

## Frontend (web dashboard — admin, dealers, buyers)

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Role-based routing lives in `src/App.tsx`; portals under `src/portals/{admin,dealer,buyer,farmer}`.

## Mobile (farmer-facing app)

```bash
cd mobile
npm install
cp .env.example .env
npx expo start
```

Tab structure in `src/navigation/RootNavigator.tsx` mirrors the farming-cycle flow:
Weather → Equipment → Marketplace → Account.

## USSD / Voice (Africa's Talking)

Webhook endpoints live at `backend/apps/ussd/`:
- `POST /api/ussd/webhook/` — USSD menu (state machine in `menu.py`)
- `POST /api/ussd/voice-webhook/` — Voice/IVR

Point your Africa's Talking sandbox/production USSD code and voice number at these
once the backend is deployed.

## Status

Structural scaffold: models, serializers, viewsets, URL routing, and Railway deploy
config are wired and verified (`manage.py check`, `makemigrations`, frontend/mobile
type-check + build all pass). AI integration points (`services.py` in `weather`,
`marketplace`, `payments`, `notifications`) and the USSD menu branches are stubbed
with `NotImplementedError` — next build phase fills those in.
