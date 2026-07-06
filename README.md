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

## Testing

```bash
npm test
```

## Project structure

```
CreaDashboard/
├── frontend/   # React dashboard UI
├── backend/    # Express API + Temporal worker
├── deploy/     # systemd units + nginx config templates
└── scripts/    # dev setup and deploy scripts
```

## Deployment (Debian server, LAN-only)

The API and Temporal worker run as native **systemd** services; Postgres, Temporal server,
and Temporal UI run in Docker. The dashboard is served by nginx bound to the local network IP
only — not exposed on the public internet.

| Service | URL |
|---------|-----|
| Dashboard | http://192.168.1.135:3080 |
| Temporal UI | http://192.168.1.135:8080 |

```bash
# from your dev machine (LAN)
./scripts/deploy.sh

# via public hostname (SSH only — used by GitHub Actions)
./scripts/deploy.sh --remote
```

Override any of: `SERVER_HOST`, `SSH_USER`, `REMOTE_APP_DIR`, `API_SERVICE_NAME`,
`WORKER_SERVICE_NAME`, `DASHBOARD_HTTP_PORT`, `TEMPORAL_UI_HTTP_PORT`, `LAN_BIND_IP`.

Set optional `DEPLOY_PASSWORD` in local `.env` (or export it) to skip SSH/sudo prompts during
deploy; you need `sshpass` installed locally. When `DEPLOY_PASSWORD` is unset, deploy asks for
passwords interactively.

The deploy script reuses one SSH connection and one `sudo` session on the server. For zero
prompts, use SSH keys and passwordless sudo for the deploy user, or `DEPLOY_PASSWORD` with
`sshpass`.

Make sure `backend/.env` exists in `REMOTE_APP_DIR` on the server (the deploy script never
overwrites it). Production values should include:

```
DATABASE_URL=postgresql://crea:<password>@127.0.0.1:5435/crea_dashboard
TEMPORAL_ADDRESS=127.0.0.1:7233
PORT=3001
NODE_ENV=production
LOG_LEVEL=info
```

The Postgres password in `DATABASE_URL` must match `POSTGRES_PASSWORD` used by
`docker-compose.prod.yml` (set via environment or defaults).

### GitHub Actions CI/CD

Merging into `main` triggers an automatic deploy via [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml).

**On every push and pull request:** the `test` job runs `npm ci` and `npm test`.

**On push to `main` only:** the `deploy` job runs after tests pass:

1. Writes the deploy SSH private key from GitHub Secrets
2. Opens an SSH ControlMaster socket authenticated with that key
3. Calls `./scripts/deploy.sh --remote`, which rsyncs the project and runs the remote build

Required GitHub Secrets (Settings → Secrets and variables → Actions):

| Secret | Purpose |
|--------|---------|
| `DEPLOY_SSH_KEY` | Private deploy key (matching the public key in server `authorized_keys`) |
| `DEPLOY_HOST` | Server hostname, for example `crearec.app` |
| `DEPLOY_USER` | SSH user, for example `crearec` |

These are the same secrets used by TripPlanner.

**Server prerequisites for CI deploy** (one-time setup):

- Public deploy key in `~/.ssh/authorized_keys` for the deploy user
- Passwordless sudo for deploy commands. **The sudoers username must match `DEPLOY_USER` exactly.**

  ```sh
  DEPLOY_USER=crearec
  sudo tee "/etc/sudoers.d/${DEPLOY_USER}-deploy" > /dev/null <<EOF
  ${DEPLOY_USER} ALL=(ALL) NOPASSWD: /bin/cp, /usr/bin/cp, /bin/mkdir, /usr/bin/mkdir, /bin/systemctl, /usr/bin/systemctl, /usr/bin/journalctl, /usr/sbin/nginx, /usr/bin/nginx
  EOF
  sudo chmod 440 "/etc/sudoers.d/${DEPLOY_USER}-deploy"
  sudo visudo -c -f "/etc/sudoers.d/${DEPLOY_USER}-deploy"
  ```

- Node.js 20+ and npm on the server
- Deploy user in the `docker` group (for `docker compose up -d`)
- Remote `backend/.env` in `/home/crearec/crea-dashboard/backend/.env`

`DEPLOY_PASSWORD` is not used in CI. The workflow never overwrites `backend/.env` on the server.

Prisma migrations are applied during deploy (`npm run db:migrate`), not on every service restart.
