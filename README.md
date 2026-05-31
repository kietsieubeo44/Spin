# COSMO Golden Spin

Premium event lucky wheel for COSMO Anniversary. Designed for large vertical standees and kiosks.

Run locally with Docker:

```powershell
docker compose up -d --build

# open http://localhost:3000
# admin: http://localhost:3000/admin
```

Project structure:
- Dockerfile
- docker-compose.yml
- package.json
- server.js
- data/rewards.json
- db/
- exports/
- public/
  - index.html
  - style.css
  - app.js
  - admin.html
# COSMO GOLDEN SPIN

Premium enterprise lucky wheel web application for COSMO Anniversary Celebration.

Run with Docker Compose:

```bash
docker compose up -d --build
```

App listens on port 80 via Nginx reverse proxy. Data persisted in Docker volumes `/db` and `/exports`.

Endpoints:
- `POST /api/check-id` { employeeId }
- `POST /api/spin` { employeeId }
- `POST /api/claim` { employeeId }
- `GET /api/winners`
- `GET /api/export`
- `GET /api/dashboard`
- `POST /api/reset`

Admin UI: `/admin`
