# Docker + GHCR deployment

Production runs the full stack in Docker on Debian. Releases are published to
GitHub Container Registry (GHCR) and pulled by GitHub Actions when changes land
on `main`. There is no local deploy script.

Images:

- `ghcr.io/crearec/crea-dashboard` — API, Temporal worker, Prisma migrate
- `ghcr.io/crearec/crea-dashboard-web` — nginx + frontend static assets

## How a release works

1. Merge or push to `main`.
2. Actions runs tests and builds both images (no push on PRs).
3. Actions pushes tags `main` and `sha-<short>` for both images to GHCR.
4. Actions copies `docker-compose.prod.yml` to the server, sets `IMAGE_TAG`, then
   runs `docker compose -f docker-compose.prod.yml pull && up -d`.
5. Deploy also disables legacy systemd units `crea-dashboard-api` /
   `crea-dashboard-worker` if they still exist.

Secrets and LAN settings stay on the server in `.env`. Postgres data stays in
`data/postgres` (never overwritten by Actions).

## One-time server bootstrap

Use the same Linux user that already runs Docker/Portainer (`crearec`).

### 1. GitHub / GHCR

After the first successful `publish` job:

1. Open the `crea-dashboard` and `crea-dashboard-web` packages under your GitHub user.
2. Link them to this repository if needed.
3. Keep the packages **Private**.
4. Create a PAT with `read:packages` for the server to pull images (reuse the
   TelegramVideo PAT if it already has access).

### 2. Docker login on the server

```sh
echo "$GHCR_TOKEN" | docker login ghcr.io -u CreaRec --password-stdin
docker compose version
```

### 3. Deploy directory

Default path: `/home/crearec/crea-dashboard`

```sh
mkdir -p /home/crearec/crea-dashboard/data
cd /home/crearec/crea-dashboard
```

Create `.env` from [`.env.example`](../.env.example). Copy app secrets from the
previous `backend/.env` if migrating, then add:

```sh
IMAGE=ghcr.io/crearec/crea-dashboard
WEB_IMAGE=ghcr.io/crearec/crea-dashboard-web
IMAGE_TAG=main

LAN_BIND_IP=192.168.1.135
DASHBOARD_HTTP_PORT=3080
TEMPORAL_UI_HTTP_PORT=8080
TEMPORAL_CORS_ORIGIN=http://192.168.1.135:8080

POSTGRES_USER=crea
POSTGRES_PASSWORD=crea
POSTGRES_DB=crea_dashboard
```

`POSTGRES_PASSWORD` must match the password embedded in any `DATABASE_URL` you
keep for reference. Compose overrides `DATABASE_URL` and `TEMPORAL_ADDRESS` for
`migrate` / `api` / `worker` to the Docker service hostnames (`postgres`,
`temporal`).

Do **not** delete `data/postgres` — that is the production database volume.

### 4. Stop the old host services (after first successful Docker deploy)

CI disables the systemd units. After the dashboard responds on
`http://192.168.1.135:3080`, remove the host nginx site if it is still present:

```sh
sudo rm -f /etc/nginx/sites-enabled/crea-dashboard /etc/nginx/sites-available/crea-dashboard
sudo nginx -t && sudo systemctl reload nginx
```

You can then remove any leftover full source checkout (`backend/`, `frontend/`,
`node_modules/`, etc.) and keep only:

```text
.env
data/
docker-compose.prod.yml
```

### 5. First start

Either merge to `main` and let Actions deploy, or:

```sh
cd /home/crearec/crea-dashboard
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

## Day-to-day operations

Deploy: merge to `main`.

On the server (or via Portainer):

```sh
cd /home/crearec/crea-dashboard
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml logs --tail=100 api worker web
docker compose -f docker-compose.prod.yml restart api worker
```

## GitHub Actions secrets

| Secret | Purpose |
|--------|---------|
| `DEPLOY_SSH_KEY` | Private deploy key on the server |
| `DEPLOY_HOST` | Server hostname (for example `crearec.app`) |
| `DEPLOY_USER` | SSH user (for example `crearec`) |

Server needs: Docker Engine + Compose plugin, `crearec` in the `docker` group,
GHCR login, and passwordless sudo for `systemctl` only while migrating off the
old units.
