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
