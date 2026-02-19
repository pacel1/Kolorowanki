# Fly.io Worker Deployment

This guide covers deploying the worker to Fly.io.

## Prerequisites

- Fly CLI installed: `brew install flyctl`
- Docker installed (for building)
- Git repository with the monorepo

## Setup

### 1. Create the Fly app

```bash
flyctl apps create coloring-worker
```

### 2. Set secrets

```bash
flyctl secrets set DATABASE_URL="your-postgres-connection-string" -a coloring-worker
flyctl secrets set REDIS_URL="your-redis-connection-string" -a coloring-worker
flyctl secrets set OPENAI_API_KEY="your-openai-key" -a coloring-worker

# R2 storage (optional - worker falls back to local storage if not configured)
flyctl secrets set R2_ENDPOINT="your-r2-endpoint" -a coloring-worker
flyctl secrets set R2_ACCESS_KEY_ID="your-access-key" -a coloring-worker
flyctl secrets set R2_SECRET_ACCESS_KEY="your-secret-key" -a coloring-worker
flyctl secrets set R2_BUCKET="your-bucket-name" -a coloring-worker
flyctl secrets set R2_PUBLIC_BASE_URL="https://your-bucket.r2.cloudflarestorage.com" -a coloring-worker

# Web app URL (for PDF URL generation)
flyctl secrets set WEB_BASE_URL="https://your-domain.com" -a coloring-worker

# Revalidation secret (for Next.js ISR)
flyctl secrets set REVALIDATE_SECRET="your-secret" -a coloring-worker
```

### 3. Deploy

```bash
flyctl deploy -c fly.worker.toml
```

## Operations

### View logs

```bash
flyctl logs -a coloring-worker
```

### Check status

```bash
flyctl status -a coloring-worker
```

### SSH into container (if needed)

```bash
flyctl ssh issue -a coloring-worker
```

### Restart

```bash
flyctl restart -a coloring-worker
```

## Troubleshooting

- If the worker fails to start, check logs: `flyctl logs -a coloring-worker`
- Verify secrets are set: `flyctl secrets list -a coloring-worker`
- Ensure DATABASE_URL and REDIS_URL are accessible from Fly's network
