# COSMO Golden Spin - Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Preparation

```bash
# Install production dependencies
npm install --production

# Clean up dev dependencies
npm prune --production

# Verify Node.js version
node --version  # Should be v14+ or v16+

# Check npm version
npm --version   # Should be v6+
```

### 2. Environment Variables

Create `.env` file:

```env
# Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=sqlite:./db/database.db
# For production, use PostgreSQL:
# DATABASE_URL=postgresql://user:password@prod-db:5432/cosmo_spin

# Security
JWT_SECRET=your-secret-key-here
API_RATE_LIMIT=100  # requests per minute

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
DATADOG_API_KEY=your-datadog-key

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Database Preparation

```sql
-- Production database setup (PostgreSQL)

-- Create database
CREATE DATABASE cosmo_spin;

-- Connect to database
\c cosmo_spin

-- Create tables
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(10) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rewards (
  id SERIAL PRIMARY KEY,
  reward VARCHAR(50) NOT NULL,
  weight INTEGER NOT NULL,
  remaining INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE claims (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(10) UNIQUE NOT NULL,
  reward VARCHAR(50) NOT NULL,
  segment INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

-- Create indexes for performance
CREATE INDEX idx_claims_employee_id ON claims(employee_id);
CREATE INDEX idx_claims_created_at ON claims(created_at);
CREATE INDEX idx_rewards_remaining ON rewards(remaining);

-- Enable foreign key constraints
ALTER TABLE claims
ADD CONSTRAINT fk_employee
FOREIGN KEY (employee_id) REFERENCES employees(employee_id);
```

### 4. Seed Initial Data

```bash
# Run seed script
node scripts/seed-production.js

# Verify seeding
sqlite3 db/database.db "SELECT COUNT(*) FROM employees;"
sqlite3 db/database.db "SELECT COUNT(*) FROM rewards;"
```

### 5. SSL/TLS Certificate

```bash
# For self-signed (development/staging)
openssl req -x509 -newkey rsa:4096 -nodes \
  -out cert.pem -keyout key.pem -days 365

# For production (use Let's Encrypt via Certbot)
certbot certonly --standalone -d your-domain.com

# Verify certificate
openssl x509 -in cert.pem -text -noout
```

---

## Deployment Options

### Option 1: Docker Deployment

```dockerfile
# Dockerfile
FROM node:16-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/dashboard', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start application
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://cosmo:password@db:5432/cosmo_spin
      LOG_LEVEL: info
    depends_on:
      - db
    volumes:
      - ./logs:/app/logs
    restart: always

  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: cosmo_spin
      POSTGRES_USER: cosmo
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - app
    restart: always

volumes:
  postgres_data:
```

```bash
# Deploy with Docker
docker-compose up -d

# View logs
docker-compose logs -f app

# Scale application
docker-compose up -d --scale app=3

# Stop deployment
docker-compose down
```

### Option 2: Traditional Server Deployment

```bash
# SSH into production server
ssh user@prod-server.com

# Clone repository
git clone https://github.com/your-org/cosmo-spin.git
cd cosmo-spin

# Install dependencies
npm ci --production

# Create systemd service
sudo tee /etc/systemd/system/cosmo-spin.service > /dev/null << EOF
[Unit]
Description=COSMO Golden Spin
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/cosmo-spin
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/cosmo-spin/app.log
StandardError=append:/var/log/cosmo-spin/error.log

[Install]
WantedBy=multi-user.target
EOF

# Create log directory
sudo mkdir -p /var/log/cosmo-spin
sudo chown www-data:www-data /var/log/cosmo-spin

# Start service
sudo systemctl daemon-reload
sudo systemctl enable cosmo-spin
sudo systemctl start cosmo-spin

# Check status
sudo systemctl status cosmo-spin

# View logs
sudo tail -f /var/log/cosmo-spin/app.log
```

### Option 3: Heroku Deployment

```bash
# Login to Heroku
heroku login

# Create Heroku app
heroku create cosmo-spin-prod

# Add PostgreSQL add-on
heroku addons:create heroku-postgresql:standard-0 -a cosmo-spin-prod

# Set environment variables
heroku config:set NODE_ENV=production -a cosmo-spin-prod
heroku config:set LOG_LEVEL=info -a cosmo-spin-prod

# Deploy
git push heroku main

# View logs
heroku logs --tail -a cosmo-spin-prod

# Scale dynos
heroku ps:scale web=2:standard-1x -a cosmo-spin-prod
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Basic connectivity
curl -v http://localhost:3000

# API status
curl http://localhost:3000/api/dashboard

# Expected response:
# {"totalSpins": 0, "totalWinners": 0, "rewards": [], "remaining": [...]}
```

### 2. Database Verification

```bash
# Connect to database
psql -U cosmo -d cosmo_spin

# Verify tables exist
\dt

# Check data
SELECT COUNT(*) FROM employees;
SELECT COUNT(*) FROM rewards;
SELECT COUNT(*) FROM claims;
```

### 3. Performance Baseline

```bash
# Load testing
npm install -g artillery

# Create load test
cat > load-test.yml << EOF
config:
  target: http://localhost:3000
  phases:
    - duration: 10
      arrivalRate: 1
    - duration: 30
      arrivalRate: 5
    - duration: 20
      arrivalRate: 10

scenarios:
  - name: Spin Workflow
    flow:
      - post:
          url: /api/check-id
          json:
            employeeId: EMP001
      - post:
          url: /api/spin
          json:
            employeeId: EMP001
EOF

# Run load test
artillery run load-test.yml
```

### 4. Security Verification

```bash
# Check HTTPS redirect
curl -I http://your-domain.com
# Should redirect to HTTPS

# Test SSL certificate
curl --insecure -v https://your-domain.com
# Should show valid certificate info

# Check security headers
curl -I https://your-domain.com
# Should include:
# - Strict-Transport-Security
# - X-Content-Type-Options
# - X-Frame-Options
# - Content-Security-Policy
```

---

## Monitoring & Logging

### 1. Application Logging

```javascript
// Add logging to server.js
const winston = require("winston");

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
    new winston.transports.Console(),
  ],
});

app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({
    type: "unhandledRejection",
    reason,
  });
});
```

### 2. Error Tracking

```javascript
// Sentry integration
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### 3. Performance Monitoring

```javascript
// DataDog APM
const tracer = require("dd-trace").init();

// Or New Relic
require("newrelic");
```

### 4. Alerting

```yaml
# PagerDuty Integration
rules:
  - alert: HighErrorRate
    expr: rate(errors_total[5m]) > 0.05
    for: 5m
    annotations:
      summary: "High error rate detected"

  - alert: DatabaseDown
    expr: up{job="database"} == 0
    for: 1m
    annotations:
      summary: "Database is down"

  - alert: HighCPU
    expr: rate(cpu_usage[5m]) > 0.8
    for: 10m
    annotations:
      summary: "High CPU usage"
```

---

## Backup & Disaster Recovery

### 1. Database Backups

```bash
# Daily backup script (backup.sh)
#!/bin/bash

BACKUP_DIR="/backup/cosmo-spin"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_NAME="cosmo_spin"
DB_USER="cosmo"

# Create backup
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$TIMESTAMP.sql.gz \
  s3://your-bucket/backups/

echo "Backup completed: $TIMESTAMP"
```

```bash
# Restore from backup
gunzip -c backup_20260602_120000.sql.gz | psql -U cosmo -d cosmo_spin
```

### 2. Disaster Recovery Plan

```markdown
## RTO (Recovery Time Objective): 1 hour
## RPO (Recovery Point Objective): 1 hour

### Step 1: Detect Issue
- [ ] Application logs show errors
- [ ] Monitoring alerts triggered
- [ ] Team notified

### Step 2: Assess Damage
- [ ] Check database integrity
- [ ] Verify backup status
- [ ] Identify root cause

### Step 3: Restore Service
- [ ] Restore from last good backup
- [ ] Verify data consistency
- [ ] Bring application back online
- [ ] Verify health checks pass

### Step 4: Post-Incident
- [ ] Root cause analysis
- [ ] Document lessons learned
- [ ] Implement preventive measures
- [ ] Update runbooks
```

---

## Scaling Strategy

### Horizontal Scaling

```bash
# Load balancer configuration (Nginx)
upstream app {
  server app1:3000;
  server app2:3000;
  server app3:3000;
  keepalive 32;
}

server {
  listen 80;
  server_name api.cosmo-spin.com;

  location / {
    proxy_pass http://app;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

### Vertical Scaling

```yaml
# Increase server resources
Before:
  - CPU: 2 cores
  - RAM: 4GB
  - Disk: 50GB

After:
  - CPU: 4 cores
  - RAM: 8GB
  - Disk: 100GB
```

### Database Optimization

```sql
-- Add missing indexes
CREATE INDEX idx_rewards_weight ON rewards(weight);
CREATE INDEX idx_claims_employee_timestamp ON claims(employee_id, created_at);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM claims WHERE created_at > NOW() - INTERVAL '1 day';

-- Optimize slow queries
-- Before: SELECT * FROM rewards WHERE remaining > 0 ORDER BY weight DESC
-- After: SELECT id, reward, weight FROM rewards WHERE remaining > 0 ORDER BY weight DESC

-- Archive old data
-- Consider archiving claims older than 1 year to separate table
```

---

## Rollback Procedure

### If Deployment Goes Wrong

```bash
# Quick Rollback (within 5 minutes)
git revert HEAD
git push origin main
docker-compose up -d --build

# Full Rollback (known working version)
git checkout v1.0.0
git push origin main -f
docker-compose up -d --build

# Service Rollback (run previous version)
sudo systemctl stop cosmo-spin
cd /opt/cosmo-spin-v1.0.0
npm start
```

---

## Maintenance Windows

### Scheduled Maintenance

```bash
# Maintenance mode
curl -X POST http://localhost:3000/admin/maintenance \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"enabled": true, "message": "Maintenance in progress"}'

# Backup before maintenance
npm run backup

# Run migrations
npm run migrate:latest

# Clear cache
npm run cache:clear

# Disable maintenance mode
curl -X POST http://localhost:3000/admin/maintenance \
  -d '{"enabled": false}'
```

---

## Support & Troubleshooting

### Common Issues

**Issue: Application won't start**
```bash
# Check logs
tail -f /var/log/cosmo-spin/error.log

# Verify environment variables
env | grep NODE_ENV

# Check database connection
npm run db:test
```

**Issue: High memory usage**
```bash
# Check for memory leaks
node --inspect server.js
# Open chrome://inspect

# Enable heap snapshots
kill -USR2 $(pgrep -f "node server.js")
```

**Issue: Database connection timeout**
```bash
# Check database status
pg_isready -h localhost -p 5432

# Verify connection string
echo $DATABASE_URL

# Check network connectivity
nc -zv db-host 5432
```

---

**Deployment Status:** ✅ Ready for Production
**Last Updated:** June 2, 2026
**Next Review:** Monthly