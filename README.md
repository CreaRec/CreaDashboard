# CreaDashboard

Home dashboard for utility expenses, calendar events, reminders, and notes.

## Stack

- **Frontend:** React + Webpack + TypeScript + Tailwind CSS + Recharts
- **Backend:** Node.js + Express + TypeScript + Prisma + Temporal

## Getting started

```bash
npm install
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Temporal UI (dev): http://localhost:8080

Local Postgres/Temporal: `npm run db:up` (uses [`docker-compose.yml`](docker-compose.yml)).

## Testing

```bash
npm test
```

## Project structure

```
CreaDashboard/
├── frontend/              # React dashboard UI
├── backend/               # Express API + Temporal worker
├── deploy/nginx/          # nginx config for the web container
├── docs/                  # Docker / server notes
├── scripts/               # local dev helpers
├── Dockerfile.backend     # API + worker + migrate image
├── Dockerfile.web         # nginx + frontend image
├── docker-compose.yml     # local infra only
└── docker-compose.prod.yml  # full production stack
```

## Deployment (Debian server, LAN-only)

Production is fully Dockerized: API, Temporal worker, migrate, web (nginx),
Postgres, Temporal server, and Temporal UI. Releases go through GHCR; GitHub
Actions runs `docker compose pull && up -d` on the server.

| Service | URL |
|---------|-----|
| Dashboard | http://192.168.1.135:3080 |
| Temporal UI | http://192.168.1.135:8080 |

See [docs/docker.md](docs/docker.md) for bootstrap, `.env`, cutover from systemd,
and day-to-day commands.

### GitHub Actions CI/CD

**On every push and pull request:** `npm ci`, `npm test`, and smoke-build both
Docker images (no push).

**On push to `main` only:** publish both images to GHCR (`main` + `sha-<short>`),
join Tailscale (`tag:ci`), SCP `docker-compose.prod.yml`, update `IMAGE_TAG`, then `pull && up -d`.

Required GitHub Secrets:

| Secret | Purpose |
|--------|---------|
| `DEPLOY_SSH_KEY` | Private deploy key |
| `DEPLOY_HOST` | Tailscale IP or MagicDNS hostname (for example `100.118.169.52`) |
| `DEPLOY_USER` | SSH user |
| `TS_OAUTH_CLIENT_ID` | Tailscale OAuth client ID (Trust credentials) for ephemeral CI nodes |
| `TS_OAUTH_SECRET` | Tailscale OAuth client secret (Trust credentials) |

Actions never overwrites the server `.env` except `IMAGE_TAG`. Prisma migrations
run via the one-shot `migrate` compose service (`prisma migrate deploy`).
