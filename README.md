# Backend Scroll

Secure Node.js backend starter using:
- pnpm
- Express
- TypeScript
- MongoDB (Mongoose)

## Features
- Environment validation with `zod`
- Secure HTTP headers via `helmet`
- CORS policy configuration
- Rate limiting (`express-rate-limit`)
- Mongo query sanitization (`express-mongo-sanitize`)
- HTTP parameter pollution protection (`hpp`)
- Request payload size limits
- Compression for responses
- Centralized 404 + error handling
- Graceful shutdown on `SIGINT`/`SIGTERM`

## Project Structure
```txt
src/
  app.ts
  server.ts
  config/
    env.ts
    database.ts
  middlewares/
    error-handler.ts
    security.ts
  routes/
    health.route.ts
    index.ts
```

## Setup
1. Copy environment variables:
```bash
cp .env.example .env
```

2. Install dependencies:
```bash
pnpm install
```

3. Run in development:
```bash
pnpm dev
```

## Build and Start
```bash
pnpm build
pnpm start
```

## Health Check
`GET /api/v1/health`

## Production Notes
- Set `NODE_ENV=production`
- Use a strong `MONGODB_URI` with auth/TLS
- Set `CLIENT_ORIGIN` to your frontend domain
- Put the app behind a reverse proxy/load balancer
- Set `TRUST_PROXY=true` when behind a trusted proxy
